/**
 * VideoPlayer_v3.js  (v4 architecture, kept as v3 filename for compatibility)
 *
 * Key improvements over previous version:
 *  - Uses useWebRTC hook for all RTCPeerConnection logic (ICE buffering, perfect negotiation)
 *  - Uses useVideoSync hook for latency-compensated sync (RTT + playback rate adjustment)
 *  - Fixes audio: uses video.captureStream() for file playback (not canvas — canvas has no audio)
 *  - Fixes flicker: srcObject only assigned when stream ID changes
 *  - Prevents re-renders: conn status uses useRef + direct DOM mutation, not useState
 *  - All event handlers wrapped in useCallback to avoid re-registration on every render
 *  - Viewer controls are read-only overlays (no native controls) to prevent echo events
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import socket from "../socket";
import { useWebRTC } from "../hooks/useWebRTC";
import { useVideoSync } from "../hooks/useVideoSync";

export default function VideoPlayer({ roomId, username = "Viewer" }) {
  const videoRef = useRef(null);
  const statusDotRef = useRef(null);   // DOM ref for status indicator — avoids re-render
  const statusTextRef = useRef(null);

  // Stream role state (drives conditional rendering — OK to be state)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerId, setStreamerId] = useState(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [videoSource, setVideoSource] = useState(null);
  const [userList, setUserList] = useState([]);

  const cleanRoomId = useMemo(
    () => (roomId ? roomId.trim().toUpperCase() : ""),
    [roomId]
  );

  const amIStreamer = streamerId === socket.id;

  // ── Update status indicator without triggering re-render ─────────────────
  const setStatus = useCallback((text, isLive = false) => {
    if (statusTextRef.current) statusTextRef.current.textContent = text;
    if (statusDotRef.current) {
      statusDotRef.current.style.background = isLive ? "#4caf50" : "#ffc107";
    }
  }, []);

  // ── WebRTC hook ───────────────────────────────────────────────────────────
  const { startStream, stopStream, remoteStream, peerStates, usingFallback } =
    useWebRTC({ roomId: cleanRoomId, socket });

  // ── Sync hook ─────────────────────────────────────────────────────────────
  const {
    emitPlay,
    emitPause,
    emitSeek,
    emitVolumeChange,
    startHeartbeat,
    stopHeartbeat,
    isSyncing,
  } = useVideoSync({
    socket,
    roomId: cleanRoomId,
    videoRef,
    isHost: amIStreamer,
  });

  // ── Assign remote stream to video element (viewer side) ───────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !remoteStream || amIStreamer) return;
    // Only reassign if stream actually changed → prevents flicker
    if (video.srcObject?.id === remoteStream.id) return;

    console.log("[VideoPlayer] Assigning remote stream to video element");
    video.srcObject = remoteStream;

    const tryPlay = () => {
      if (!video.paused) return;
      video
        .play()
        .then(() => {
          setStatus("Live", true);
          setNeedsInteraction(false);
        })
        .catch((e) => {
          if (e.name === "NotAllowedError") {
            // Browser blocked autoplay — show click-to-play overlay
            video.muted = true;
            video
              .play()
              .then(() => {
                setStatus("Live (Muted — click 🔊)", true);
                setNeedsInteraction(false);
              })
              .catch(() => {
                setStatus("Click to Play", false);
                setNeedsInteraction(true);
              });
          }
        });
    };

    video.onloadedmetadata = tryPlay;
    tryPlay();

    return () => {
      video.onloadedmetadata = null;
    };
  }, [remoteStream, amIStreamer, setStatus]);

  // ── Update status when peer connection status changes ─────────────────────
  useEffect(() => {
    const states = Object.values(peerStates);
    if (states.includes("connected")) {
      setStatus(amIStreamer ? "Hosting" : "Live", true);
    } else if (states.includes("connecting")) {
      setStatus("Connecting…", false);
    } else if (states.includes("failed")) {
      setStatus(usingFallback ? "Sync Only (WebRTC failed)" : "Failed", false);
    }
  }, [peerStates, amIStreamer, usingFallback, setStatus]);

  // ── Socket room events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!cleanRoomId) return;

    const handleStreamStatus = ({ isStreaming: active, streamerId: id }) => {
      setIsStreaming(active);
      setStreamerId(id);
      if (active && id !== socket.id) {
        setStatus("Connecting…", false);
        // Ask new host to initiate WebRTC connection to us
        setTimeout(() => socket.emit("request-stream", cleanRoomId), 400);
        // Also request latest sync state
        socket.emit("request-sync", cleanRoomId);
      }
    };

    const handleStreamStarted = ({ streamerId: id }) => {
      setIsStreaming(true);
      setStreamerId(id);
      if (id !== socket.id) {
        setStatus("Connecting…", false);
        setTimeout(() => socket.emit("request-stream", cleanRoomId), 400);
        socket.emit("request-sync", cleanRoomId);
      }
    };

    const handleStreamStopped = () => {
      setIsStreaming(false);
      setStreamerId(null);
      setNeedsInteraction(false);
      setStatus("Idle", false);
      stopStream();
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.src = "";
        video.pause();
      }
    };

    const handleUserList = (list) => setUserList(list);

    socket.on("stream-status", handleStreamStatus);
    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("user-list", handleUserList);

    socket.emit("join-room", { roomId: cleanRoomId, username: "Viewer" });

    return () => {
      socket.off("stream-status", handleStreamStatus);
      socket.off("stream-started", handleStreamStarted);
      socket.off("stream-stopped", handleStreamStopped);
      socket.off("user-list", handleUserList);
    };
  }, [cleanRoomId, setStatus, stopStream]);

  // ── Capture stream from local video file ─────────────────────────────────
  // CRITICAL FIX: use video.captureStream() directly (includes audio).
  // Do NOT use canvas.captureStream() — canvas has no audio tracks.
  const beginFileStream = useCallback(
    (videoEl) => {
      // captureStream returns a MediaStream with video + audio
      if (!videoEl.captureStream && !videoEl.mozCaptureStream) {
        console.error("[VideoPlayer] captureStream not supported in this browser");
        return;
      }
      const stream =
        videoEl.captureStream?.() ?? videoEl.mozCaptureStream?.();

      console.log(
        "[VideoPlayer] captureStream tracks:",
        stream.getTracks().map((t) => t.kind)
      );

      startStream(stream);
      socket.emit("start-stream", cleanRoomId);
      setStatus("Hosting File", true);
      startHeartbeat();

      // HOST-side video event listeners
      let lastPlayState = null;

      videoEl.onplay = () => {
        if (lastPlayState === "playing") return;
        lastPlayState = "playing";
        emitPlay();
      };

      videoEl.onpause = () => {
        if (lastPlayState === "paused") return;
        lastPlayState = "paused";
        emitPause();
      };

      videoEl.onseeked = () => {
        emitSeek(videoEl.currentTime);
      };

      videoEl.onvolumechange = () => {
        emitVolumeChange({ muted: videoEl.muted, volume: videoEl.volume });
      };
    },
    [cleanRoomId, startStream, startHeartbeat, emitPlay, emitPause, emitSeek, emitVolumeChange, setStatus]
  );

  // ── File input handler ────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setIsStreaming(true);
      setStreamerId(socket.id);

      // Let state update propagate before accessing video element
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.src = url;
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => {
              beginFileStream(video);
            })
            .catch((err) => console.error("[VideoPlayer] File play error:", err));
        };
      });
    },
    [beginFileStream]
  );

  // ── Screen share handler ──────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });

      startStream(stream);
      socket.emit("start-stream", cleanRoomId);
      setIsStreaming(true);
      setStreamerId(socket.id);
      setStatus("Hosting Screen", true);
      startHeartbeat();

      // Show local preview
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => { });
      }

      // Detect when user stops screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        handleStopStreaming();
      };
    } catch (err) {
      console.error("[VideoPlayer] Screen share error:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanRoomId, startStream, startHeartbeat, setStatus]);

  // ── Stop streaming handler ────────────────────────────────────────────────
  const handleStopStreaming = useCallback(() => {
    stopStream();
    stopHeartbeat();
    socket.emit("stop-stream", cleanRoomId);

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = "";
      video.pause();
      video.onplay = null;
      video.onpause = null;
      video.onseeked = null;
      video.onvolumechange = null;
    }

    setVideoSource(null);
    setIsStreaming(false);
    setStreamerId(null);
    setStatus("Idle", false);
  }, [cleanRoomId, stopStream, stopHeartbeat, setStatus]);

  // ── Click-to-play overlay handler ────────────────────────────────────────
  const handleClickToPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video
      .play()
      .then(() => {
        setNeedsInteraction(false);
        setStatus("Live", true);
      })
      .catch(() => {
        video.muted = true;
        video.play().catch(() => { });
        setNeedsInteraction(false);
        setStatus("Live (Muted)", true);
      });
  }, [setStatus]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          padding: "8px 16px",
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.78rem",
          borderBottom: "1px solid var(--border-color, #333)",
          flexShrink: 0,
        }}
      >
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            ref={statusDotRef}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ffc107",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "var(--text-secondary, #aaa)" }}>Status:</span>
          <span
            ref={statusTextRef}
            style={{ color: "var(--accent-color, #d4af37)", fontWeight: "bold" }}
          >
            Idle
          </span>
          {usingFallback && (
            <span
              style={{
                marginLeft: 8,
                fontSize: "0.68rem",
                color: "#ff9800",
                border: "1px solid #ff9800",
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              Sync-only mode
            </span>
          )}
        </div>

        {/* Controls */}
        {isStreaming ? (
          amIStreamer && (
            <button
              onClick={handleStopStreaming}
              className="royal-button"
              style={{
                padding: "4px 12px",
                fontSize: "0.72rem",
                background: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Stop Streaming
            </button>
          )
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="royal-button"
              style={{
                padding: "4px 12px",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              📁 Local File
            </label>
            <button
              onClick={startScreenShare}
              className="royal-button"
              style={{
                padding: "4px 12px",
                fontSize: "0.72rem",
                background: "transparent",
                border: "1px solid var(--accent-color, #d4af37)",
                color: "var(--accent-color, #d4af37)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              🖥 Screen Share
            </button>
          </div>
        )}
      </div>

      {/* ── Video Area ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src={videoSource || undefined}
          style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
          controls={amIStreamer}   // only host gets native controls
          autoPlay
          playsInline
          muted={amIStreamer && !!videoSource} // host mutes self to avoid echo
        />

        {/* Viewer "Synced" badge */}
        {!amIStreamer && isStreaming && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              padding: "3px 8px",
              background: "rgba(0,0,0,0.7)",
              color: "var(--accent-color, #d4af37)",
              fontSize: "0.68rem",
              borderRadius: 4,
              border: "1px solid var(--accent-color, #d4af37)",
              pointerEvents: "none",
            }}
          >
            👥 Synced
          </div>
        )}

        {/* Peer count badge (host) */}
        {amIStreamer && userList.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 8px",
              background: "rgba(0,0,0,0.7)",
              color: "#4caf50",
              fontSize: "0.68rem",
              borderRadius: 4,
              border: "1px solid #4caf50",
              pointerEvents: "none",
            }}
          >
            👤 {userList.length - 1} viewer{userList.length !== 2 ? "s" : ""}
          </div>
        )}

        {/* Click-to-play overlay */}
        {needsInteraction && (
          <div
            onClick={handleClickToPlay}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(0,0,0,0.88)",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "var(--accent-color, #d4af37)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 4px 24px rgba(212,175,55,0.5)",
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p
              style={{
                color: "var(--accent-color, #d4af37)",
                fontSize: "1.2rem",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Click to Watch
            </p>
            <p
              style={{
                color: "#aaa",
                fontSize: "0.85rem",
                textAlign: "center",
                maxWidth: "75%",
              }}
            >
              Browser security requires a click before audio plays.
            </p>
          </div>
        )}

        {/* No stream idle placeholder */}
        {!isStreaming && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: "#555",
              pointerEvents: "none",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: 16, opacity: 0.3 }}
            >
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            <p style={{ fontSize: "0.9rem" }}>Select a video to begin the show</p>
          </div>
        )}
      </div>
    </div>
  );
}
