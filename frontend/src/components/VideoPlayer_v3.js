import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";

export default function VideoPlayer({ roomId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const streamerIdRef = useRef(null);
  const animationFrameRef = useRef(null);
  const playPromiseRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerId, setStreamerId] = useState(null);
  const [connStatus, setConnStatus] = useState("Idle");
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [videoSource, setVideoSource] = useState(null);

  const iceConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  useEffect(() => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[VIDEO] Initializing for Room: ${cleanRoomId}`);

    const handleStreamStatus = ({ isStreaming: streaming, streamerId: id }) => {
      console.log("[VIDEO] Status update:", { streaming, id, myId: socket.id });
      setIsStreaming(streaming);
      setStreamerId(id);
      streamerIdRef.current = id;
      
      if (streaming && id !== socket.id) {
        setConnStatus("Connecting...");
        console.log("[VIDEO] Requesting stream from:", id);
        setTimeout(() => {
          socket.emit("request-stream", cleanRoomId);
        }, 300);
      }
    };

    const handleStreamStarted = ({ streamerId: id }) => {
      console.log("[VIDEO] Stream started by:", id, "myId:", socket.id);
      setIsStreaming(true);
      setStreamerId(id);
      streamerIdRef.current = id;
      
      if (id !== socket.id) {
        setConnStatus("Connecting...");
        console.log("[VIDEO] Requesting stream from:", id);
        setTimeout(() => {
          socket.emit("request-stream", cleanRoomId);
        }, 300);
      }
    };

    const handleStreamStopped = () => {
      console.log("[VIDEO] Stream stopped");
      setIsStreaming(false);
      setStreamerId(null);
      streamerIdRef.current = null;
      setConnStatus("Idle");
      setNeedsInteraction(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
      
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };

    // Playback sync events
    const handlePlayVideo = () => {
      console.log("[SYNC] Play command received");
      if (videoRef.current && !amIStreamer) {
        // Cancel any pending play promise to prevent race conditions
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {}); // Suppress rejection
          playPromiseRef.current = null;
        }
        
        // Only attempt play if video is actually paused
        if (videoRef.current.paused) {
          playPromiseRef.current = videoRef.current.play()
            .then(() => {
              console.log("[SYNC] Playback started successfully");
              setConnStatus("Live");
              setNeedsInteraction(false);
              playPromiseRef.current = null;
            })
            .catch(e => {
              console.warn("[SYNC] Play blocked by browser:", e.message);
              // Handle autoplay blocking
              if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
                setConnStatus("Live - Click to Play");
                setNeedsInteraction(true);
              }
              playPromiseRef.current = null;
            });
        }
      }
    };

    const handlePauseVideo = () => {
      console.log("[SYNC] Pause command received");
      if (videoRef.current && !amIStreamer) {
        // Cancel any pending play promise
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {}); // Suppress rejection
          playPromiseRef.current = null;
        }
        
        videoRef.current.pause();
      }
    };

    const handleSeekVideo = (time) => {
      console.log("[SYNC] Seek to:", time);
      if (videoRef.current && !amIStreamer) {
        // Debounce seek to avoid rapid fire
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          videoRef.current.currentTime = time;
        }, 100);
      }
    };

    const handleVolumeChange = ({ muted, volume }) => {
      console.log("[SYNC] Volume change - muted:", muted, "volume:", volume);
      if (videoRef.current && !amIStreamer) {
        videoRef.current.muted = muted;
        if (!muted) {
          videoRef.current.volume = volume;
        }
      }
    };

    const handleRequestStream = async ({ from }) => {
      console.log("[VIDEO] 🔔 Request-stream from:", from);
      
      if (!localStreamRef.current) {
        console.error("[VIDEO] ❌ No local stream available!");
        return;
      }
      
      console.log("[VIDEO] Local stream tracks:", localStreamRef.current.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      // Close existing connection to this peer if any
      if (peerConnections.current[from]) {
        console.log("[VIDEO] Closing existing connection to:", from);
        peerConnections.current[from].close();
        delete peerConnections.current[from];
      }
      
      const pc = createPeerConnection(from);
      
      try {
        console.log("[VIDEO] Creating offer for:", from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("[VIDEO] ✅ Sending offer to:", from);
        socket.emit("webrtc-offer", { roomId: cleanRoomId, offer, to: from });
      } catch (err) {
        console.error("[VIDEO] ❌ Error creating offer:", err);
      }
    };

    socket.on("stream-status", handleStreamStatus);
    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("request-stream", handleRequestStream);
    socket.on("play-video", handlePlayVideo);
    socket.on("pause-video", handlePauseVideo);
    socket.on("seek-video", handleSeekVideo);
    socket.on("volume-change", handleVolumeChange);
    
    socket.on("webrtc-offer", async ({ offer, from }) => {
      console.log("[VIDEO] 📩 Offer received from:", from);
      
      // Close existing connection if any
      if (peerConnections.current[from]) {
        console.log("[VIDEO] Closing existing connection before new offer");
        peerConnections.current[from].close();
        delete peerConnections.current[from];
      }
      
      const pc = createPeerConnection(from);
      
      try {
        console.log("[VIDEO] Setting remote description...");
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("[VIDEO] Creating answer...");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("[VIDEO] ✅ Sending answer to:", from);
        socket.emit("webrtc-answer", { to: from, answer });
      } catch (err) {
        console.error("[VIDEO] ❌ Error handling offer:", err);
      }
    });

    socket.on("webrtc-answer", async ({ answer, from }) => {
      console.log("[VIDEO] Answer received from:", from);
      const pc = peerConnections.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("[VIDEO] Answer applied");
        } catch (err) {
          console.error("[VIDEO] Error applying answer:", err);
        }
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[VIDEO] ICE Error:", err);
        }
      }
    });

    socket.emit("join-room", { roomId: cleanRoomId, username: "System" });

    return () => {
      socket.off("stream-status");
      socket.off("stream-started");
      socket.off("stream-stopped");
      socket.off("request-stream");
      socket.off("play-video");
      socket.off("pause-video");
      socket.off("seek-video");
      socket.off("volume-change");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}); // Suppress unhandled rejections
      }
    };
  }, [roomId]);

  const createPeerConnection = (userId) => {
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close();
    }
    
    console.log("[VIDEO] Creating PC for:", userId);
    const pc = new RTCPeerConnection(iceConfig);
    peerConnections.current[userId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { roomId, candidate: event.candidate, to: userId });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[VIDEO] ICE state:", pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      console.log("[VIDEO] Track received:", event.track.kind);
      
      const stream = event.streams[0];
      
      if (videoRef.current && !amIStreamer) {
        console.log("[VIDEO] Setting stream on video element");
        videoRef.current.srcObject = stream;
        
        // Clear any existing play promise
        if (playPromiseRef.current) {
          playPromiseRef.current.catch(() => {});
          playPromiseRef.current = null;
        }
        
        // Try to play immediately - most aggressive approach
        const tryPlayImmediately = () => {
          if (videoRef.current && videoRef.current.paused) {
            playPromiseRef.current = videoRef.current.play()
              .then(() => {
                console.log("[VIDEO] Immediate playback started");
                setConnStatus("Live");
                setNeedsInteraction(false);
                playPromiseRef.current = null;
              })
              .catch(e => {
                console.warn("[VIDEO] Immediate autoplay failed:", e.message);
                // Try with muted audio as fallback
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  playPromiseRef.current = videoRef.current.play()
                    .then(() => {
                      console.log("[VIDEO] Muted playback started");
                      setConnStatus("Live (Muted)");
                      setNeedsInteraction(false);
                      playPromiseRef.current = null;
                    })
                    .catch(e2 => {
                      console.warn("[VIDEO] Even muted play failed:", e2.message);
                      setConnStatus("Live - Click to Play");
                      setNeedsInteraction(true);
                      playPromiseRef.current = null;
                    });
                }
              });
          }
        };
        
        // Try immediately
        setTimeout(tryPlayImmediately, 100);
        
        // Also try on metadata load
        videoRef.current.onloadedmetadata = () => {
          console.log("[VIDEO] Metadata loaded, trying playback");
          setTimeout(tryPlayImmediately, 100);
        };
        
        // Try periodically for a few seconds to catch any late arrivals
        let attempts = 0;
        const interval = setInterval(() => {
          if (attempts < 10 && videoRef.current && videoRef.current.srcObject) {
            tryPlayImmediately();
            attempts++;
          } else {
            clearInterval(interval);
          }
        }, 500);
        
        // Clean up interval after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log("[VIDEO] Adding track:", track.kind, track.enabled);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  };

  const captureVideoToCanvas = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    console.log("[CANVAS] Starting capture at", canvas.width, "x", canvas.height);
    
    const drawFrame = () => {
      if (!video.paused && !video.ended && localStreamRef.current) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      } else {
        console.log("[CANVAS] Stopped drawing - paused:", video.paused, "ended:", video.ended);
      }
    };
    
    drawFrame();
    
    // Capture stream from canvas
    const stream = canvas.captureStream(30);
    
    // Add audio from video element
    if (video.captureStream) {
      const videoStream = video.captureStream();
      const audioTracks = videoStream.getAudioTracks();
      audioTracks.forEach(track => stream.addTrack(track));
    }
    
    return stream;
  };

  const resumeCanvasCapture = () => {
    if (!videoRef.current || !canvasRef.current || !localStreamRef.current) return;
    
    console.log("[CANVAS] Resuming capture");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const drawFrame = () => {
      if (!video.paused && !video.ended && localStreamRef.current) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      }
    };
    
    drawFrame();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("[VIDEO] File selected:", file.name);
    const url = URL.createObjectURL(file);
    setVideoSource(url);
    
    setIsStreaming(true);
    setStreamerId(socket.id);
    streamerIdRef.current = socket.id;
    
    setTimeout(() => {
      if (videoRef.current && canvasRef.current) {
        videoRef.current.src = url;
        
        videoRef.current.onloadedmetadata = async () => {
          console.log("[VIDEO] Metadata loaded");
          
          try {
            await videoRef.current.play();
            console.log("[VIDEO] Video playing");
            
            // Capture stream using canvas
            const stream = captureVideoToCanvas();
            
            if (stream) {
              console.log("[VIDEO] Stream captured:", stream.getTracks().map(t => t.kind));
              localStreamRef.current = stream;
              socket.emit("start-stream", roomId.trim().toUpperCase());
              setConnStatus("Hosting File");
            }
          } catch (err) {
            console.error("[VIDEO] Setup error:", err);
          }
        };
        
        // Sync events - only for host
        let lastPlayState = null;
        let lastSeekTime = null;
        
        videoRef.current.onplay = () => {
          console.log("[HOST] Play event");
          if (lastPlayState === 'playing') return; // Prevent duplicate events
          lastPlayState = 'playing';
          resumeCanvasCapture(); // Resume canvas drawing
          socket.emit("play-video", roomId.trim().toUpperCase());
        };
        
        videoRef.current.onpause = () => {
          console.log("[HOST] Pause event");
          if (lastPlayState === 'paused') return; // Prevent duplicate events
          lastPlayState = 'paused';
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          socket.emit("pause-video", roomId.trim().toUpperCase());
        };
        
        videoRef.current.onseeked = () => {
          const currentTime = videoRef.current.currentTime;
          if (Math.abs(currentTime - lastSeekTime) < 0.5) return; // Prevent duplicate seeks
          lastSeekTime = currentTime;
          console.log("[HOST] Seek event to:", currentTime);
          socket.emit("seek-video", { 
            roomId: roomId.trim().toUpperCase(), 
            time: currentTime 
          });
        };
        
        videoRef.current.onvolumechange = () => {
          console.log("[HOST] Volume change - muted:", videoRef.current.muted, "volume:", videoRef.current.volume);
          socket.emit("volume-change", {
            roomId: roomId.trim().toUpperCase(),
            muted: videoRef.current.muted,
            volume: videoRef.current.volume
          });
        };
      }
    }, 100);
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, 
        audio: true 
      });
      
      console.log("[VIDEO] Screen share started");
      localStreamRef.current = stream;
      
      setIsStreaming(true);
      setStreamerId(socket.id);
      streamerIdRef.current = socket.id;
      socket.emit("start-stream", roomId.trim().toUpperCase());
      setConnStatus("Hosting Screen");
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("[VIDEO] Screen share error:", err);
    }
  };

  const stopStreaming = () => {
    console.log("[VIDEO] Stopping stream");
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
      videoRef.current.pause();
    }
    
    setVideoSource(null);
    socket.emit("stop-stream", roomId.trim().toUpperCase());
    
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    
    setIsStreaming(false);
    setStreamerId(null);
    streamerIdRef.current = null;
    setConnStatus("Idle");
  };

  const handlePlayClick = () => {
    if (videoRef.current && needsInteraction) {
      console.log("[VIDEO] User clicked play button");
      
      // Cancel any existing play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      
      // Try multiple approaches for user-initiated play
      const tryUserPlay = () => {
        if (!videoRef.current) return;
        
        // Approach 1: Normal play
        playPromiseRef.current = videoRef.current.play()
          .then(() => {
            console.log("[VIDEO] Normal play succeeded");
            setNeedsInteraction(false);
            setConnStatus("Live");
            playPromiseRef.current = null;
          })
          .catch(e1 => {
            console.warn("[VIDEO] Normal play failed:", e1.message);
            
            // Approach 2: Try with muted audio
            if (videoRef.current) {
              const wasMuted = videoRef.current.muted;
              videoRef.current.muted = true;
              
              playPromiseRef.current = videoRef.current.play()
                .then(() => {
                  console.log("[VIDEO] Muted play succeeded");
                  setNeedsInteraction(false);
                  setConnStatus("Live (Muted)");
                  // Restore mute state after a delay
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.muted = wasMuted;
                      if (!wasMuted) {
                        setConnStatus("Live");
                      }
                    }
                  }, 1000);
                  playPromiseRef.current = null;
                })
                .catch(e2 => {
                  console.warn("[VIDEO] Muted play also failed:", e2.message);
                  // Keep needsInteraction true - user may need to interact more
                  playPromiseRef.current = null;
                });
            }
          });
      };
      
      // Try immediately
      tryUserPlay();
      
      // Try again after a short delay
      setTimeout(tryUserPlay, 300);
    }
  };

  const amIStreamer = streamerId === socket.id;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Hidden canvas for video capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div style={{ 
        padding: "10px 20px", 
        background: "rgba(0,0,0,0.8)", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        fontSize: "0.8rem",
        borderBottom: "1px solid var(--border-color)"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (connStatus === 'Live' || connStatus.includes('Hosting')) ? '#4caf50' : '#ffc107' }}></div>
          <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
          <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{connStatus}</span>
        </div>
        
        {isStreaming ? (
          amIStreamer && (
            <button onClick={stopStreaming} className="royal-button" style={{ padding: "5px 12px", fontSize: "0.75rem", background: '#dc3545', color: '#fff' }}>
              Stop Streaming
            </button>
          )
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="file" accept="video/*" onChange={handleFileChange} style={{ display: "none" }} id="video-upload" />
            <label htmlFor="video-upload" className="royal-button" style={{ padding: "5px 12px", fontSize: "0.75rem" }}>
              Local File
            </label>
            <button onClick={startScreenShare} className="royal-button" style={{ padding: "5px 12px", fontSize: "0.75rem", background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}>
              Screen Share
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <video
          ref={videoRef}
          src={videoSource}
          style={{ 
            width: '100%', 
            maxHeight: '70vh', 
            objectFit: 'contain'
          }}
          controls // Everyone gets controls
          autoPlay
          playsInline
          muted={amIStreamer}
          onPlay={() => {
            if (!amIStreamer) {
              console.log("[VIEWER] Play clicked");
              socket.emit("play-video", roomId.trim().toUpperCase());
            }
          }}
          onPause={() => {
            if (!amIStreamer) {
              console.log("[VIEWER] Pause clicked");
              socket.emit("pause-video", roomId.trim().toUpperCase());
            }
          }}
          onSeeked={() => {
            if (!amIStreamer && videoRef.current) {
              console.log("[VIEWER] Seeked to:", videoRef.current.currentTime);
              socket.emit("seek-video", { 
                roomId: roomId.trim().toUpperCase(), 
                time: videoRef.current.currentTime 
              });
            }
          }}
        />
        
        {/* Status indicator for viewers */}
        {!amIStreamer && isStreaming && (
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px',
            padding: '4px 8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'var(--accent-color)',
            fontSize: '0.7rem',
            borderRadius: '4px',
            border: '1px solid var(--accent-color)'
          }}>
            👥 Synced
          </div>
        )}
        
        {needsInteraction && (
          <div 
            onClick={handlePlayClick}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              background: 'rgba(0,0,0,0.9)',
              cursor: 'pointer',
              zIndex: 10,
              backdropFilter: 'blur(5px)'
            }}
          >
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: 'var(--accent-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '25px',
              boxShadow: '0 6px 25px rgba(212, 175, 55, 0.6)',
              transform: 'scale(1)',
              transition: 'transform 0.2s ease',
              ':hover': {
                transform: 'scale(1.05)'
              }
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p style={{ color: 'var(--accent-color)', fontSize: '1.3rem', fontWeight: '600', marginBottom: '10px' }}>Click to Play Stream</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '80%' }}>
              Due to browser security policies, please click to start watching the stream.
              <br />Your click helps us bypass autoplay restrictions.
            </p>
            <div style={{ 
              marginTop: '20px', 
              padding: '8px 20px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '20px', 
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              fontSize: '0.8rem'
            }}>
              Click anywhere on this screen
            </div>
          </div>
        )}
        
        {!isStreaming && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.2 }}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
            <p>Select a video to begin the show</p>
          </div>
        )}
      </div>
    </div>
  );
}
