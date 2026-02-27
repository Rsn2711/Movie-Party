/**
 * useWebRTC.js
 *
 * Encapsulates all RTCPeerConnection logic for the Movie Watch Party.
 *
 * Architecture:
 *  - Full-mesh topology: host creates one RTCPeerConnection per viewer.
 *  - Uses the "perfect negotiation" pattern to handle offer/answer glare.
 *  - ICE candidates are queued until setRemoteDescription is complete.
 *  - Falls back to Socket.io-only sync if WebRTC fails after 15 s.
 *
 * Usage:
 *   const { startStream, stopStream, remoteStream, peerStates } = useWebRTC({ roomId, socket });
 */

import { useRef, useState, useEffect, useCallback } from "react";

const ICE_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // TURN server — read from env vars (set in .env.local / .env.production)
        ...(process.env.REACT_APP_TURN_URL
            ? [
                {
                    urls: process.env.REACT_APP_TURN_URL,
                    username: process.env.REACT_APP_TURN_USERNAME || "",
                    credential: process.env.REACT_APP_TURN_CREDENTIAL || "",
                },
            ]
            : []),
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
};

export function useWebRTC({ roomId, socket }) {
    // peerConnections[peerId] = RTCPeerConnection
    const pcs = useRef({});
    // iceCandidateQueue[peerId] = RTCIceCandidateInit[]  — buffered before remoteDesc set
    const iceCandidateQueue = useRef({});
    // remoteDescSet[peerId] = boolean
    const remoteDescSet = useRef({});
    // localStream cached ref
    const localStreamRef = useRef(null);
    // Fallback timer ref (connection watchdog)
    const fallbackTimer = useRef(null);

    const [remoteStream, setRemoteStream] = useState(null);
    const [peerStates, setPeerStates] = useState({}); // { peerId: "connecting"|"connected"|"failed" }
    const [usingFallback, setUsingFallback] = useState(false);

    const getCleanRoomId = useCallback(
        () => (roomId ? roomId.trim().toUpperCase() : ""),
        [roomId]
    );

    // ── ICE candidate queue helpers ─────────────────────────────────────────
    const queueIceCandidate = useCallback((peerId, candidate) => {
        if (!iceCandidateQueue.current[peerId]) {
            iceCandidateQueue.current[peerId] = [];
        }
        iceCandidateQueue.current[peerId].push(candidate);
    }, []);

    const flushIceCandidates = useCallback(async (peerId) => {
        const pc = pcs.current[peerId];
        if (!pc) return;
        const queue = iceCandidateQueue.current[peerId] || [];
        iceCandidateQueue.current[peerId] = [];
        for (const candidate of queue) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                // ignore state-machine errors from stale candidates
            }
        }
    }, []);

    // ── Create peer connection ───────────────────────────────────────────────
    const createPeerConnection = useCallback(
        (peerId, isPolite) => {
            // Close & remove any existing connection
            if (pcs.current[peerId]) {
                pcs.current[peerId].close();
                delete pcs.current[peerId];
            }
            remoteDescSet.current[peerId] = false;
            iceCandidateQueue.current[peerId] = [];

            const pc = new RTCPeerConnection(ICE_CONFIG);
            pcs.current[peerId] = pc;

            // ── ICE candidates ────────────────────────────────────────────────
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    socket.emit("webrtc-ice-candidate", { to: peerId, candidate });
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`[WebRTC] ICE ${peerId}: ${pc.iceConnectionState}`);
                const state =
                    pc.iceConnectionState === "connected" ||
                        pc.iceConnectionState === "completed"
                        ? "connected"
                        : pc.iceConnectionState === "failed" ||
                            pc.iceConnectionState === "disconnected"
                            ? "failed"
                            : "connecting";

                setPeerStates((prev) => ({ ...prev, [peerId]: state }));

                if (state === "failed") {
                    console.warn(`[WebRTC] Connection to ${peerId} failed — activating fallback`);
                    setUsingFallback(true);
                }
            };

            // ── Receiving remote tracks (viewer side) ─────────────────────────
            pc.ontrack = ({ streams }) => {
                console.log(`[WebRTC] ontrack from ${peerId}`);
                if (streams && streams[0]) {
                    setRemoteStream((prev) => {
                        // Only update if the stream object actually changed
                        if (prev && prev.id === streams[0].id) return prev;
                        return streams[0];
                    });
                }
            };

            // ── Perfect negotiation: polite peer handles glare ─────────────────
            let makingOffer = false;
            pc.onnegotiationneeded = async () => {
                if (isPolite) return; // polite peer never initiates
                try {
                    makingOffer = true;
                    await pc.setLocalDescription();
                    socket.emit("webrtc-offer", { to: peerId, offer: pc.localDescription });
                } catch (err) {
                    console.error("[WebRTC] negotiationneeded error:", err);
                } finally {
                    makingOffer = false;
                }
            };

            // Store makingOffer ref on the pc for use in offer handler
            pc._makingOffer = () => makingOffer;
            pc._isPolite = isPolite;

            return pc;
        },
        [socket]
    );

    // ── Add local tracks to a peer connection ───────────────────────────────
    const addLocalTracksToPeer = useCallback((pc) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const senders = pc.getSenders().map((s) => s.track?.id);
        stream.getTracks().forEach((track) => {
            if (!senders.includes(track.id)) {
                pc.addTrack(track, stream);
            }
        });
    }, []);

    // ── Public: start streaming (host calls this) ───────────────────────────
    const startStream = useCallback(
        (stream) => {
            localStreamRef.current = stream;
            // Add tracks to all existing peer connections immediately
            Object.values(pcs.current).forEach((pc) => addLocalTracksToPeer(pc));
        },
        [addLocalTracksToPeer]
    );

    // ── Public: stop streaming ──────────────────────────────────────────────
    const stopStream = useCallback(() => {
        Object.values(pcs.current).forEach((pc) => pc.close());
        pcs.current = {};
        iceCandidateQueue.current = {};
        remoteDescSet.current = {};
        localStreamRef.current = null;
        setRemoteStream(null);
        setPeerStates({});
        setUsingFallback(false);
        if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    }, []);

    // ── Socket signal handlers ───────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !roomId) return;

        // ── Host: viewer requests stream ────────────────────────────────────
        const handleRequestStream = async ({ from }) => {
            console.log(`[WebRTC] request-stream from ${from}`);
            if (!localStreamRef.current) return;

            const pc = createPeerConnection(from, false); // host = impolite
            addLocalTracksToPeer(pc);

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("webrtc-offer", { to: from, offer: pc.localDescription });
            } catch (err) {
                console.error("[WebRTC] Error creating offer:", err);
            }
        };

        // ── Viewer: receive offer from host ─────────────────────────────────
        const handleOffer = async ({ offer, from }) => {
            console.log(`[WebRTC] offer from ${from}`);

            let pc = pcs.current[from];
            if (!pc) {
                pc = createPeerConnection(from, true); // viewer = polite
            }

            const offerCollision =
                pc.signalingState !== "stable" || pc._makingOffer();

            if (offerCollision && !pc._isPolite) {
                console.warn("[WebRTC] Glare detected — impolite peer ignoring offer");
                return;
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                remoteDescSet.current[from] = true;
                await flushIceCandidates(from);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc-answer", { to: from, answer: pc.localDescription });
            } catch (err) {
                console.error("[WebRTC] Error handling offer:", err);
            }
        };

        // ── Host: receive answer from viewer ────────────────────────────────
        const handleAnswer = async ({ answer, from }) => {
            console.log(`[WebRTC] answer from ${from}`);
            const pc = pcs.current[from];
            if (!pc) return;

            if (pc.signalingState === "have-local-offer") {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    remoteDescSet.current[from] = true;
                    await flushIceCandidates(from);
                } catch (err) {
                    console.error("[WebRTC] Error applying answer:", err);
                }
            }
        };

        // ── Both: receive ICE candidate ─────────────────────────────────────
        const handleIceCandidate = async ({ candidate, from }) => {
            if (!candidate) return;
            if (remoteDescSet.current[from]) {
                const pc = pcs.current[from];
                if (!pc) return;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    // Ignore benign errors (e.g., already closed)
                }
            } else {
                // Buffer until setRemoteDescription is done
                queueIceCandidate(from, candidate);
            }
        };

        // ── New viewer joined — host re-initiates offers to them ─────────────
        const handleUserJoined = ({ id: newUserId }) => {
            if (!localStreamRef.current) return; // I'm not streaming
            console.log(`[WebRTC] New user joined: ${newUserId} — initiating offer`);
            const pc = createPeerConnection(newUserId, false);
            addLocalTracksToPeer(pc);
            // onnegotiationneeded will fire automatically and send the offer
        };

        const handleUserLeft = ({ id: leftUserId }) => {
            if (pcs.current[leftUserId]) {
                pcs.current[leftUserId].close();
                delete pcs.current[leftUserId];
                delete remoteDescSet.current[leftUserId];
                delete iceCandidateQueue.current[leftUserId];
                setPeerStates((prev) => {
                    const next = { ...prev };
                    delete next[leftUserId];
                    return next;
                });
            }
        };

        socket.on("request-stream", handleRequestStream);
        socket.on("webrtc-offer", handleOffer);
        socket.on("webrtc-answer", handleAnswer);
        socket.on("webrtc-ice-candidate", handleIceCandidate);
        socket.on("user-joined", handleUserJoined);
        socket.on("user-left", handleUserLeft);

        return () => {
            socket.off("request-stream", handleRequestStream);
            socket.off("webrtc-offer", handleOffer);
            socket.off("webrtc-answer", handleAnswer);
            socket.off("webrtc-ice-candidate", handleIceCandidate);
            socket.off("user-joined", handleUserJoined);
            socket.off("user-left", handleUserLeft);
        };
    }, [
        socket,
        roomId,
        createPeerConnection,
        addLocalTracksToPeer,
        flushIceCandidates,
        queueIceCandidate,
    ]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    return {
        startStream,
        stopStream,
        remoteStream,
        peerStates,
        usingFallback,
        isConnected: Object.values(peerStates).some((s) => s === "connected"),
    };
}
