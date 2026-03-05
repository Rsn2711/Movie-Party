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
import { MonitorPlay, Upload, Square } from "lucide-react";

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
  const [volume, setVolume] = useState(0.5);
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
    // Only reassign if stream instance actually changed
    // Comparing ID is unreliable if PC is recreated with same stream ID
    if (video.srcObject === remoteStream) return;

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

    const handleRequestSync = ({ from }) => {
      const video = videoRef.current;
      if (!video || !amIStreamer) return;
      socket.emit("sync-response", {
        to: from,
        playing: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration || 0,
      });
    };

    socket.on("stream-status", handleStreamStatus);
    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("user-list", handleUserList);
    socket.on("request-sync", handleRequestSync);

    // Note: join-room is handled by the parent Room component before VideoPlayer mounts

    return () => {
      socket.off("stream-status", handleStreamStatus);
      socket.off("stream-started", handleStreamStarted);
      socket.off("stream-stopped", handleStreamStopped);
      socket.off("user-list", handleUserList);
      socket.off("request-sync", handleRequestSync);
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

        // — Initial Volume —
        videoEl.volume = volume;
        videoEl.muted = isMuted;

        // — Autoplay —
        // The user wants the video to automatically play.
        // We previously paused it here; now we let it continue playing.
        // videoEl.pause(); 
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
  const seekPct = roomDuration > 0 ? (localSeekTime / roomDuration) * 100 : 0;
  const volPct = (isMuted ? 0 : volume) * 100;

  return (
    <div
      ref={videoContainerRef}
      onMouseMove={handleMouseMove}
      className="relative flex flex-col w-full h-full bg-black"
    >
      {/* ── Toolbar ── */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-1.5 sm:px-4 sm:py-2
                   bg-bg-base/95 backdrop-blur-md
                   border-b border-border flex-shrink-0 z-10"
        role="toolbar"
        aria-label="Video controls toolbar"
      >
        {/* Status indicator — hidden on very small mobile if idle */}
        <div className="flex items-center gap-2 group" role="status" aria-live="polite">
          <div
            ref={statusDotRef}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-brand flex-shrink-0 shadow-[0_0_8px_rgba(229,9,20,0.5)]"
            style={{ background: '#E50914' }}
            aria-hidden="true"
          />
          <span className="hidden xs:inline text-text-muted text-[10px] sm:text-xs">Status:</span>
          <span ref={statusTextRef} className="text-white text-[10px] sm:text-xs font-semibold">
            Idle
          </span>
          {usingFallback && (
            <span className="ml-1 text-[9px] sm:text-[10px] text-red-brand border border-red-brand/30 bg-red-muted px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
              Fallback
            </span>
          )}
        </div>

        {/* Source controls */}
        {isStreaming ? (
          amIStreamer && (
            <button
              onClick={handleStopStreaming}
              aria-label="Stop streaming"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5
                         bg-red-muted hover:bg-red-brand/20 text-red-brand
                         border border-red-brand/30 hover:border-red-brand/50
                         rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider
                         transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-red-brand/50"
            >
              <Square size={10} fill="currentColor" aria-hidden="true" />
              Stop
            </button>
          )
        ) : (
          <div className="flex gap-1.5 sm:gap-2">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="sr-only"
              id="video-upload"
              aria-label="Upload a local video file"
            />
            <label
              htmlFor="video-upload"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5
                         bg-red-brand hover:bg-red-hover text-white
                         rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider 
                         cursor-pointer transition-all duration-200
                         focus-within:ring-2 focus-within:ring-red-brand/50
                         shadow-[0_4px_12px_rgba(229,9,20,0.2)]"
            >
              <Upload size={11} aria-hidden="true" />
              <span className="xs:inline">Local File</span>
            </label>
            <button
              onClick={startScreenShare}
              aria-label="Share your screen"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5
                         bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-white
                         border border-border hover:border-border-bright
                         rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider
                         transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-white/20 shadow-sm"
            >
              <MonitorPlay size={11} aria-hidden="true" />
              <span className="hidden xs:inline">Screen Share</span>
              <span className="xs:hidden">Screen</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Video Area ── */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          src={videoSource || undefined}
          className="w-full object-contain select-none"
          style={{
            height: isFullscreen ? '100dvh' : 'auto',
            maxHeight: isFullscreen ? '100dvh' : '85vh',
          }}
          controls={false}
          autoPlay
          playsInline
          muted={isMuted}
          aria-label="Video player"
        />

        {/* Empty State / Standby */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-bg-surface/50 border border-border/50 flex items-center justify-center mb-2">
              <MonitorPlay size={32} className="text-text-dim opacity-40" />
            </div>
            <h3 className="text-white font-bold text-lg tracking-tight">Ready to Sync</h3>
            <p className="text-text-muted text-sm max-w-[280px]">
              Load a local video or share your screen to start the watch party.
            </p>
          </div>
        )}

        {/* ── Control Bar ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2
                     flex flex-col gap-2.5 w-[calc(100%-1rem)] max-w-[920px]
                     px-3 py-2.5 sm:px-5 sm:py-3.5
                     bg-black/90 backdrop-blur-2xl
                     rounded-xl border border-red-brand/15
                     shadow-[0_-4px_40px_rgba(229,9,20,0.07),0_16px_48px_rgba(0,0,0,0.9)]
                     transition-all duration-300 z-[100]"
          style={{
            bottom: isFullscreen ? 24 : 12,
            transform: `translateX(-50%) translateY(${showControls ? '0' : '150%'})`,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
          }}
          role="group"
          aria-label="Playback controls"
        >
          {/* Seek Bar — host only */}
          {amIStreamer && (
            <div className="w-full flex items-center px-1">
              <input
                type="range"
                className="seek-bar"
                min="0"
                max={roomDuration || 100}
                step="0.1"
                value={localSeekTime}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                aria-label={`Seek: ${formatTime(localSeekTime)} of ${formatTime(roomDuration)}`}
                aria-valuemin={0}
                aria-valuemax={roomDuration || 100}
                aria-valuenow={localSeekTime}
                style={{
                  width: '100%',
                  background: `linear-gradient(to right, #E50914 0%, #E50914 ${seekPct}%, #2a2a2a ${seekPct}%, #2a2a2a 100%)`,
                }}
              />
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left: Play + Volume + Time */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Play/Pause — host only */}
              {amIStreamer && (
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-1 flex items-center text-white hover:text-white/80
                             transition-colors focus:outline-none rounded"
                >
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Volume — hidden on smaller mobile to save space */}
              <div className="hidden xs:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  className="flex items-center text-white hover:text-white/80
                             transition-colors focus:outline-none rounded"
                >
                  {isMuted || volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  className="volume-bar"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleLocalVolumeChange}
                  aria-label="Volume"
                  style={{
                    width: '60px',
                    background: `linear-gradient(to right, #E50914 ${volPct}%, #2a2a2a ${volPct}%)`,
                  }}
                />
              </div>

              {/* Time */}
              <div className="text-white/90 text-xs sm:text-sm tabular-nums font-medium select-none ml-1">
                {formatTime(roomTime)} <span className="text-white/40 mx-0.5">/</span> {formatTime(roomDuration)}
              </div>
            </div>

            {/* Right: Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="p-1 flex items-center text-white hover:text-white/80
                           transition-colors focus:outline-none rounded"
              >
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* LIVE badge — viewer, when controls hidden */}
        {!amIStreamer && isStreaming && !showControls && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5
                       px-2.5 py-1 bg-red-muted border border-red-brand/30
                       text-red-brand text-[10px] font-bold tracking-widest uppercase
                       rounded pointer-events-none"
            aria-label="Live stream active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-brand animate-pulse-red" aria-hidden="true" />
            LIVE
          </div>
        )}

        {/* Host viewer count badge */}
        {amIStreamer && userList.length > 1 && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5
                       px-2.5 py-1 bg-red-muted border border-red-brand/25
                       text-red-brand text-[10px] font-bold tracking-wide uppercase
                       rounded pointer-events-none"
            aria-live="polite"
            aria-label={`Hosting for ${userList.length - 1} viewer${userList.length !== 2 ? 's' : ''}`}
          >
            🎬 Host · {userList.length - 1} viewer{userList.length !== 2 ? 's' : ''}
          </div>
        )}

        {/* Click-to-play overlay */}
        {needsInteraction && (
          <button
            onClick={handleClickToPlay}
            aria-label="Click to start playback (browser requires interaction before audio)"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5
                       bg-black/90 backdrop-blur-lg cursor-pointer z-10
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-red-brand/60"
          >
            <div
              className="w-20 h-20 rounded-full bg-red-brand flex items-center justify-center
                         shadow-red-lg"
              aria-hidden="true"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg mb-1.5">Resume Playback</p>
              <p className="text-text-secondary text-sm max-w-[280px] leading-relaxed">
                Browser security requires a click before audio can play.
              </p>
            </div>
          </button>
        )}

      </div>
    </div>
  );
}
