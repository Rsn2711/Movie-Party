import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";

export default function VideoPlayer({ roomId }) {
  const hostVideoRef = useRef(null); // For host preview
  const viewerVideoRef = useRef(null); // For viewer display
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const streamerIdRef = useRef(null);

  const [videoSource, setVideoSource] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerId, setStreamerId] = useState(null);
  const [connStatus, setConnStatus] = useState("Idle");
  const [needsInteraction, setNeedsInteraction] = useState(false);

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
      console.log("[VIDEO] Status update:", { streaming, id });
      setIsStreaming(streaming);
      setStreamerId(id);
      streamerIdRef.current = id;
      
      if (streaming && id !== socket.id) {
        setConnStatus("Requesting stream...");
        setTimeout(() => socket.emit("request-stream", cleanRoomId), 500);
      }
    };

    const handleStreamStarted = ({ streamerId: id }) => {
      console.log("[VIDEO] Stream started by:", id);
      setIsStreaming(true);
      setStreamerId(id);
      streamerIdRef.current = id;
      
      if (id !== socket.id) {
        setConnStatus("Requesting stream...");
        setTimeout(() => socket.emit("request-stream", cleanRoomId), 500);
      }
    };

    const handleStreamStopped = () => {
      console.log("[VIDEO] Stream stopped - cleaning up");
      setIsStreaming(false);
      setStreamerId(null);
      streamerIdRef.current = null;
      setConnStatus("Idle");
      setNeedsInteraction(false);
      
      if (viewerVideoRef.current) {
        viewerVideoRef.current.srcObject = null;
        viewerVideoRef.current.pause();
      }
      
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };

    const handleRequestStream = async ({ from }) => {
      console.log("[VIDEO] 🔔 Request-stream received from:", from);
      
      if (!localStreamRef.current) {
        console.error("[VIDEO] ❌ No local stream to share!");
        return;
      }
      
      console.log("[VIDEO] Local stream tracks:", localStreamRef.current.getTracks().map(t => `${t.kind}: ${t.enabled}, readyState: ${t.readyState}`));
      console.log("[VIDEO] Creating offer for:", from);
      
      const pc = createPeerConnection(from);
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("[VIDEO] ✅ Offer created and set, sending to:", from);
        socket.emit("webrtc-offer", { roomId: cleanRoomId, offer, to: from });
      } catch (err) {
        console.error("[VIDEO] ❌ Error creating offer:", err);
      }
    };

    socket.on("stream-status", handleStreamStatus);
    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("request-stream", handleRequestStream);
    
    socket.on("webrtc-offer", async ({ offer, from }) => {
      console.log("[VIDEO] 📩 Received offer from:", from);
      const pc = createPeerConnection(from);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("[VIDEO] Remote description set, creating answer...");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("[VIDEO] ✅ Answer created and set, sending to:", from);
        socket.emit("webrtc-answer", { to: from, answer });
      } catch (err) {
        console.error("[VIDEO] ❌ Error handling offer:", err);
      }
    });

    socket.on("webrtc-answer", async ({ answer, from }) => {
      console.log("[VIDEO] 📩 Received answer from:", from);
      const pc = peerConnections.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("[VIDEO] ✅ Answer applied successfully");
        } catch (err) {
          console.error("[VIDEO] ❌ Error applying answer:", err);
        }
      } else {
        console.error("[VIDEO] ❌ No peer connection found for:", from);
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
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
    };
  }, [roomId]);

  const createPeerConnection = (userId) => {
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close();
    }
    
    console.log("[VIDEO] Creating fresh PC for:", userId);
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
      console.log("[VIDEO] ✅ Track received:", event.track.kind, "enabled:", event.track.enabled);
      
      const stream = event.streams[0];
      console.log("[VIDEO] Stream info:", {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      // Detailed video track info
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log("[VIDEO] Video track details:", {
          enabled: videoTrack.enabled,
          muted: videoTrack.muted,
          readyState: videoTrack.readyState,
          label: videoTrack.label
        });
      }

      // Display on viewer video element
      if (viewerVideoRef.current) {
        console.log("[VIDEO] Setting srcObject on viewer video element");
        viewerVideoRef.current.srcObject = stream;
        
        // Log video element state
        console.log("[VIDEO] Viewer video element:", {
          srcObject: !!viewerVideoRef.current.srcObject,
          paused: viewerVideoRef.current.paused,
          videoWidth: viewerVideoRef.current.videoWidth,
          videoHeight: viewerVideoRef.current.videoHeight
        });
        
        viewerVideoRef.current.play().then(() => {
          console.log("[VIDEO] ✅ Playback started successfully");
          console.log("[VIDEO] Final video dimensions:", viewerVideoRef.current.videoWidth, "x", viewerVideoRef.current.videoHeight);
          setConnStatus("Live");
          setNeedsInteraction(false);
        }).catch(e => {
          console.error("[VIDEO] Autoplay blocked:", e);
          setConnStatus("Live - Click to Play");
          setNeedsInteraction(true);
        });
      } else {
        console.error("[VIDEO] ❌ viewerVideoRef.current is null!");
      }
    };

    // Add local tracks if streaming
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log("[VIDEO] Adding track to PC:", track.kind, "enabled:", track.enabled, "readyState:", track.readyState);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("[VIDEO] File selected:", file.name);
    const url = URL.createObjectURL(file);
    setVideoSource(url);
    
    // Mark as streamer immediately so hostVideoRef gets rendered
    setIsStreaming(true);
    setStreamerId(socket.id);
    streamerIdRef.current = socket.id;
    
    // Wait for next render cycle for ref to be available
    setTimeout(() => {
      if (hostVideoRef.current) {
        console.log("[VIDEO] Setting video source:", url);
        hostVideoRef.current.src = url;
        
        hostVideoRef.current.onloadedmetadata = async () => {
          console.log("[VIDEO] Video metadata loaded, capturing stream...");
          
          try {
            // Play the video
            await hostVideoRef.current.play();
            console.log("[VIDEO] Video playing");
            
            // Capture stream
            let stream;
            if (hostVideoRef.current.captureStream) {
              stream = hostVideoRef.current.captureStream(30);
            } else if (hostVideoRef.current.mozCaptureStream) {
              stream = hostVideoRef.current.mozCaptureStream(30);
            }
            
            if (stream) {
              const tracks = stream.getTracks();
              console.log("[VIDEO] Captured tracks:", tracks.map(t => `${t.kind}: ${t.enabled}`));
              
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                console.log("[VIDEO] Video track state:", {
                  enabled: videoTrack.enabled,
                  muted: videoTrack.muted,
                  readyState: videoTrack.readyState,
                  settings: videoTrack.getSettings()
                });
              }
              
              localStreamRef.current = stream;
              socket.emit("start-stream", roomId.trim().toUpperCase());
              setConnStatus("Hosting File");
              console.log("[VIDEO] ✅ Stream broadcast started");
            } else {
              console.error("[VIDEO] ❌ Failed to capture stream");
            }
          } catch (err) {
            console.error("[VIDEO] ❌ Error during file streaming setup:", err);
          }
        };
        
        hostVideoRef.current.onerror = (e) => {
          console.error("[VIDEO] ❌ Video error:", e);
        };
      } else {
        console.error("[VIDEO] ❌ hostVideoRef.current is null after timeout");
      }
    }, 100);
  };

  const startScreenShare = async () => {
    try {
      console.log("[VIDEO] Requesting screen share...");
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }, 
        audio: true 
      });
      
      console.log("[VIDEO] Screen capture tracks:", stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      localStreamRef.current = stream;
      
      // Mark as streamer immediately
      setIsStreaming(true);
      setStreamerId(socket.id);
      streamerIdRef.current = socket.id;
      socket.emit("start-stream", roomId.trim().toUpperCase());
      setConnStatus("Hosting Screen");
      
      // Wait for next render cycle
      setTimeout(() => {
        if (hostVideoRef.current) {
          hostVideoRef.current.srcObject = stream;
          hostVideoRef.current.play().catch(e => console.error("[VIDEO] Play error:", e));
        }
      }, 100);
      
      console.log("[VIDEO] ✅ Screen share started");
    } catch (err) {
      console.error("[VIDEO] ❌ Screen share error:", err);
    }
  };

  const stopStreaming = () => {
    console.log("[VIDEO] Stopping stream...");
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log("[VIDEO] Stopping track:", track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (hostVideoRef.current) {
      hostVideoRef.current.srcObject = null;
      hostVideoRef.current.src = "";
      hostVideoRef.current.pause();
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
    if (viewerVideoRef.current && needsInteraction) {
      viewerVideoRef.current.play().then(() => {
        console.log("[VIDEO] Manual play successful");
        setNeedsInteraction(false);
        setConnStatus("Live");
      }).catch(e => {
        console.error("[VIDEO] Manual play failed:", e);
      });
    }
  };

  const amIStreamer = streamerId === socket.id;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
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
        {/* Host preview video */}
        {amIStreamer && (
          <video
            ref={hostVideoRef}
            style={{ 
              width: '100%', 
              maxHeight: '70vh', 
              objectFit: 'contain'
            }}
            controls
            autoPlay
            playsInline
            muted
          />
        )}
        
        {/* Viewer video */}
        {!amIStreamer && (
          <video
            ref={viewerVideoRef}
            style={{ 
              width: '100%', 
              maxHeight: '70vh', 
              objectFit: 'contain',
              background: '#000'
            }}
            controls
            autoPlay
            playsInline
          />
        )}
        
        {/* Click to Play Overlay */}
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
              background: 'rgba(0,0,0,0.85)',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--accent-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p style={{ color: 'var(--accent-color)', fontSize: '1.1rem', fontWeight: '500' }}>Click to Play</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>Browser requires interaction to play video</p>
          </div>
        )}
        
        {!isStreaming && !videoSource && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.2 }}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
            <p>Select a video to begin the show</p>
          </div>
        )}
      </div>
    </div>
  );
}
