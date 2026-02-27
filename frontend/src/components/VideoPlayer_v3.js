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
  const videoContainerRef = useRef(null);
  const statusDotRef = useRef(null);   // DOM ref for status indicator — avoids re-render
  const statusTextRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Stream role state (drives conditional rendering — OK to be state)
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerId, setStreamerId] = useState(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [videoSource, setVideoSource] = useState(null);
  const [userList, setUserList] = useState([]);

  // Local UI state (local only, not synced)
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  // We keep local time state only for the host to handle its own slider interaction smoothly
  // Viewers will strictly use roomTime from the sync hook.
  const [localSeekTime, setLocalSeekTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

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
    roomTime,
    roomDuration,
  } = useVideoSync({
    socket,
    roomId: cleanRoomId,
    videoRef,
    isHost: amIStreamer,
  });

  // Sync internal state for host's seek bar when not interacting
  useEffect(() => {
    if (amIStreamer && !isSeeking) {
      setLocalSeekTime(roomTime);
    }
  }, [roomTime, amIStreamer, isSeeking]);

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
          setIsPlaying(true);
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
                setIsPlaying(true);
              })
              .catch(() => {
                setStatus("Click to Play", false);
                setNeedsInteraction(true);
                setIsPlaying(false);
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
  // Uses video.captureStream() which captures decoded audio + video directly.
  // captureStream() MUST be called after the video has started playing —
  // calling it on a paused/unstarted video returns empty/inactive tracks.
  const beginFileStream = useCallback(
    (videoEl) => {
      if (!videoEl.captureStream && !videoEl.mozCaptureStream) {
        console.error("[VideoPlayer] captureStream() not supported in this browser");
        return;
      }

      // Wait 200 ms after play() so the decoder produces live track frames
      // before we hand the stream to RTCPeerConnection.
      setTimeout(() => {
        const stream =
          videoEl.captureStream?.() ?? videoEl.mozCaptureStream?.();

        const tracks = stream.getTracks();
        console.log(
          "[VideoPlayer] captureStream tracks:",
          tracks.map((t) => `${t.kind}:${t.readyState}`)
        );

        if (tracks.length === 0) {
          console.error("[VideoPlayer] captureStream() returned no tracks! Video may not be playing.");
          return;
        }

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        if (audioTracks.length === 0) {
          console.warn("[VideoPlayer] No audio track captured (file may have no audio, or browser restriction).");
        }

        // Hint the browser codec selection: "motion" is better for video files
        videoTracks.forEach((t) => { try { t.contentHint = "motion"; } catch (_) { } });
        audioTracks.forEach((t) => { try { t.contentHint = "music"; } catch (_) { } });

        startStream(stream);
        socket.emit("start-stream", cleanRoomId);
        setStatus("Hosting File", true);
        startHeartbeat();

        // HOST-side video event listeners
        let lastPlayState = null;

        videoEl.onplay = () => {
          setIsPlaying(true);
          if (lastPlayState === "playing") return;
          lastPlayState = "playing";
          emitPlay();
        };

        videoEl.onpause = () => {
          setIsPlaying(false);
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

        // Initial duration for host state
        setLocalSeekTime(videoEl.currentTime);

        // — Initial Pause —
        // The user wants the video to be paused initially after adding it.
        // We play it briefly just to ensure captureStream tracks are active,
        // then pause it so the user can click "Play/Resume" manually.
        videoEl.pause();
      }, 200);
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

  // ── Auto-hide controls ──────────────────────────────────────────────────
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleLocalVolumeChange = useCallback((e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  }, [isMuted, volume]);

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !amIStreamer) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [amIStreamer]);

  const handleSeekChange = useCallback((e) => {
    const video = videoRef.current;
    if (!video || !amIStreamer) return;
    const newTime = parseFloat(e.target.value);
    setLocalSeekTime(newTime);
    setIsSeeking(true);
    // Don't update video.currentTime here to avoid lag; do it on mouseUp or use a debounce
    // Actually, updating currentTime here gives better visual feedback if the video is fast.
    video.currentTime = newTime;
  }, [amIStreamer]);

  const handleSeekEnd = useCallback(() => {
    setIsSeeking(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={videoContainerRef}
      onMouseMove={handleMouseMove}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        position: "relative",
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
          zIndex: 5,
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
          style={{
            width: "100%",
            height: isFullscreen ? "100vh" : "auto",
            maxHeight: isFullscreen ? "100vh" : "70vh",
            objectFit: "contain",
          }}
          controls={false} // Custom controls instead
          autoPlay
          playsInline
          muted={amIStreamer && !!videoSource} // host mutes self to avoid echo
        />

        {/* ── Custom Control Bar (Professional Glassmorphism) ── */}
        <div
          style={{
            position: "absolute",
            bottom: isFullscreen ? 30 : 20,
            left: "50%",
            transform: `translate(-50%, ${showControls ? "0" : "100px"})`,
            width: "calc(100% - 40px)",
            maxWidth: "900px",
            padding: "16px 24px",
            background: "rgba(10, 10, 10, 0.75)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s",
            opacity: showControls ? 1 : 0,
            zIndex: 100,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* Row 1: Professional Seek Bar (Host Only) */}
          {amIStreamer && (
            <div style={{ width: "100%", display: "flex", alignItems: "center", position: "relative" }}>
              <input
                type="range"
                min="0"
                max={roomDuration || 100}
                step="0.1"
                value={localSeekTime}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                style={{
                  width: "100%",
                  height: "5px",
                  borderRadius: "5px",
                  background: `linear-gradient(to right, #ff0000 0%, #ff0000 ${roomDuration > 0 ? (localSeekTime / roomDuration) * 100 : 0
                    }%, #444 ${roomDuration > 0 ? (localSeekTime / roomDuration) * 100 : 0
                    }%, #444 100%)`,
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              />
            </div>
          )}

          {/* Row 2: Controls Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Left side: Play, Volume, Time */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              {/* Play/Pause Button (Host Only) */}
              {amIStreamer && (
                <button
                  onClick={togglePlay}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    color: "white",
                  }}
                >
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Volume Control */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={toggleMute}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    color: "white",
                  }}
                >
                  {isMuted || volume === 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleLocalVolumeChange}
                  style={{
                    width: "70px",
                    cursor: "pointer",
                    accentColor: "#fff",
                    height: "3px",
                  }}
                />
              </div>

              {/* Time Display */}
              <div style={{ color: "white", fontSize: "0.85rem", fontWeight: "400", opacity: 0.9 }}>
                {formatTime(roomTime)} / {formatTime(roomDuration)}
              </div>
            </div>

            {/* Right side: Placeholder icons and Fullscreen */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {/* CC Icon (Placeholder) */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
              </svg>

              {/* Settings Icon (Placeholder) */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  color: "white",
                }}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Viewer "Synced" badge (only top-right) */}
        {!amIStreamer && isStreaming && !showControls && (
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
              transition: "opacity 0.3s",
              opacity: 1,
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
