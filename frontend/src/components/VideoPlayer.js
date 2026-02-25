import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";

export default function VideoPlayer({ roomId }) {
  const videoRef = useRef(null);
  const peerConnections = useRef({});
  const signalingQueue = useRef({});
  const localStreamRef = useRef(null);
  const streamerIdRef = useRef(null);

  const [videoSource, setVideoSource] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamerId, setStreamerId] = useState(null);
  const [connStatus, setConnStatus] = useState("Idle");
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const iceConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

  const processSignaling = async (from, task) => {
    if (!signalingQueue.current[from]) {
      signalingQueue.current[from] = Promise.resolve();
    }
    signalingQueue.current[from] = signalingQueue.current[from].then(task).catch(err => {
      console.error(`Signaling error for ${from}:`, err);
    });
    return signalingQueue.current[from];
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
        setConnStatus("Connecting...");
        socket.emit("request-stream", cleanRoomId);
      }
    };

    const handleStreamStarted = ({ streamerId: id }) => {
      console.log("[VIDEO] Stream started by:", id);
      setIsStreaming(true);
      setStreamerId(id);
      streamerIdRef.current = id;
      
      if (id !== socket.id) {
        setConnStatus("Connecting...");
        socket.emit("request-stream", cleanRoomId);
      }
    };

    const handleStreamStopped = () => {
      console.log("[VIDEO] Stream stopped - cleaning up");
      setIsStreaming(false);
      setStreamerId(null);
      streamerIdRef.current = null;
      setConnStatus("Idle");
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
        videoRef.current.pause();
      }
      
      // Clear video source
      setVideoSource(null);
      
      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => {
        console.log("[VIDEO] Closing peer connection on stream stop");
        pc.close();
      });
      peerConnections.current = {};
    };

    const handleRequestStream = ({ from }) => {
      processSignaling(from, async () => {
        if (localStreamRef.current) {
          console.log("[VIDEO] Sending offer to:", from);
          const pc = createPeerConnection(from);
          if (pc.signalingState === "stable") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-offer", { roomId: cleanRoomId, offer, to: from });
          }
        }
      });
    };

    socket.on("stream-status", handleStreamStatus);
    socket.on("stream-started", handleStreamStarted);
    socket.on("stream-stopped", handleStreamStopped);
    socket.on("request-stream", handleRequestStream);
    
    socket.on("webrtc-offer", ({ offer, from }) => {
      processSignaling(from, async () => {
        console.log("[VIDEO] Offer from:", from);
        let pc = createPeerConnection(from);
        
        if (pc.signalingState !== "stable") {
          pc.close();
          delete peerConnections.current[from];
          pc = createPeerConnection(from);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { to: from, answer });
      });
    });

    socket.on("webrtc-answer", ({ answer, from }) => {
      processSignaling(from, async () => {
        console.log("[VIDEO] Answer from:", from);
        const pc = peerConnections.current[from];
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setConnStatus("Hosting Active");
        }
      });
    });

    socket.on("webrtc-ice-candidate", ({ candidate, from }) => {
      processSignaling(from, async () => {
        const pc = peerConnections.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {
            if (pc.remoteDescription) console.error("ICE Error:", e);
          });
        }
      });
    });

    // Probe status
    socket.emit("join-room", { roomId: cleanRoomId, username: "System" }); // Re-trigger join info

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
    if (peerConnections.current[userId]) return peerConnections.current[userId];
    
    console.log("[VIDEO] Creating PC for:", userId);
    const pc = new RTCPeerConnection(iceConfig);
    peerConnections.current[userId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[VIDEO] Sending ICE candidate to:", userId);
        socket.emit("webrtc-ice-candidate", { roomId, candidate: event.candidate, to: userId });
      } else {
        console.log("[VIDEO] ICE gathering complete for:", userId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[VIDEO] ICE state for", userId, ":", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.log("[VIDEO] Connection failed/disconnected, attempting restart");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[VIDEO] Connection state for", userId, ":", pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log("[VIDEO] Track received from:", userId);
      console.log("[VIDEO] Stream tracks:", event.streams[0].getTracks().map(t => `${t.kind}: ${t.enabled}`));
      console.log("[VIDEO] Am I streamer?", streamerIdRef.current === socket.id, "My ID:", socket.id);
      
      if (videoRef.current) {
        console.log("[VIDEO] Setting srcObject for viewer");
        
        // CRITICAL: Clear src attribute first to avoid conflicts
        videoRef.current.removeAttribute('src');
        videoRef.current.load(); // Reset video element
        
        // Now set the remote stream
        videoRef.current.srcObject = event.streams[0];
        setVideoSource(null); // Clear any file source state
        
        // Force play
        videoRef.current.play().then(() => {
          console.log("[VIDEO] Video playing successfully");
          setConnStatus("Live");
          setNeedsInteraction(false);
        }).catch(e => {
          console.error("[VIDEO] Autoplay failed:", e);
          setConnStatus("Live - Click to Play");
          setNeedsInteraction(true);
        });
      }
    };

    if (localStreamRef.current) {
      console.log("[VIDEO] Adding local tracks to PC for:", userId);
      localStreamRef.current.getTracks().forEach(track => {
        console.log("[VIDEO] Adding track:", track.kind, track.enabled);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
          let stream;
          if (videoRef.current.captureStream) {
            stream = videoRef.current.captureStream();
          } else if (videoRef.current.mozCaptureStream) {
            stream = videoRef.current.mozCaptureStream();
          }
          
          if (stream) {
            console.log("[VIDEO] Stream captured from file");
            localStreamRef.current = stream;
            videoRef.current.play();
            socket.emit("start-stream", roomId.trim().toUpperCase());
            setIsStreaming(true);
            setStreamerId(socket.id);
            setConnStatus("Hosting");
          }
        };
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      console.log("[VIDEO] Screen share started");
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setVideoSource(null);
      }
      socket.emit("start-stream", roomId.trim().toUpperCase());
      setIsStreaming(true);
      setStreamerId(socket.id);
      setConnStatus("Hosting Screen");
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopStreaming = () => {
    console.log("[VIDEO] Stopping stream...");
    
    // Stop all local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log("[VIDEO] Stopping track:", track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
      videoRef.current.pause();
    }
    
    // Clear video source state
    setVideoSource(null);
    
    // Notify backend
    const cleanRoomId = roomId.trim().toUpperCase();
    socket.emit("stop-stream", cleanRoomId);
    
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => {
      console.log("[VIDEO] Closing peer connection");
      pc.close();
    });
    peerConnections.current = {};
    
    // Reset state
    setIsStreaming(false);
    setStreamerId(null);
    streamerIdRef.current = null;
    setConnStatus("Idle");
  };

  const amIStreamer = streamerId === socket.id;

  const handlePlayClick = () => {
    if (videoRef.current && needsInteraction) {
      videoRef.current.play().then(() => {
        console.log("[VIDEO] Manual play successful");
        setNeedsInteraction(false);
        setConnStatus("Live");
      }).catch(e => {
        console.error("[VIDEO] Manual play failed:", e);
      });
    }
  };

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
        <video
          ref={videoRef}
          style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          controls={amIStreamer || !isStreaming}
          autoPlay
          playsInline
          muted={amIStreamer}
          {...(videoSource && { src: videoSource })}
        >
          Your browser does not support the video tag.
        </video>
        
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
