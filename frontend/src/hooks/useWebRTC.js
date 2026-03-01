/**
 * useWebRTC.js  — Production-grade WebRTC hook
 *
 * ROOT CAUSES of the "Sync Only / WebRTC failed" on Vercel + Render:
 *
 *  BUG 1 — Double-offer race:
 *    In handleRequestStream the code manually called pc.createOffer() AND
 *    pc.onnegotiationneeded also fired (because addTrack triggers it).
 *    Two simultaneous offers → signaling state machine error → connection dies.
 *    FIX: Remove onnegotiationneeded entirely. All offers are created EXPLICITLY
 *    only in handleRequestStream and handleUserJoined.
 *
 *  BUG 2 — No TURN server:
 *    Locally both peers share the same machine → no NAT → STUN succeeds trivially.
 *    On Vercel + Render the viewer and host are on different networks behind NAT.
 *    If either side is behind symmetric NAT (common on mobile/corporate), STUN
 *    can't punch through → ICE fails → "failed" state.
 *    FIX: Add a free TURN server (openrelay.metered.ca) as built-in fallback.
 *    Users can override with their own TURN via env vars.
 *
 *  BUG 3 — handleUserJoined relied on onnegotiationneeded firing asynchronously
 *    but that was never guaranteed (esp. with the removed onnegotiationneeded handler).
 *    FIX: Explicitly create offer and send it in handleUserJoined, same as
 *    handleRequestStream.
 *
 * Architecture:
 *  - EXPLICIT negotiation only (no onnegotiationneeded)
 *  - Host is always offerer, viewer is always answerer
 *  - ICE candidates buffered until after setRemoteDescription
 *  - TURN servers included for NAT traversal in production
 *  - Full ICE state logging for debugging
 */

import { useRef, useState, useEffect, useCallback } from "react";

// ─── ICE Configuration ────────────────────────────────────────────────────────
// Free TURN servers: openrelay.metered.ca (no sign-up needed, testing only)
// Replace with your own TURN server for production to avoid rate limits.
// Metered.ca free tier: https://www.metered.ca/tools/openrelay/
const ICE_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },

        // ── Free TURN for testing (openrelay.metered.ca) ──
        // These allow NAT traversal when STUN alone fails (production deployments)
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },

        // ── Your own TURN (override via env vars for production) ──
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWebRTC({ roomId, socket }) {
    const pcs = useRef({});                  // { peerId: RTCPeerConnection }
    const iceCandidateQueue = useRef({});    // { peerId: RTCIceCandidateInit[] }
    const remoteDescSet = useRef({});        // { peerId: boolean }
    const localStreamRef = useRef(null);
    const makingOfferRef = useRef({});       // { peerId: boolean } — glare guard

    const [remoteStream, setRemoteStream] = useState(null);
    const [peerStates, setPeerStates] = useState({});
    const [usingFallback, setUsingFallback] = useState(false);

    // ── ICE helper: queue until remote description is set ──────────────────────
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
        console.log(`[WebRTC] Flushing ${queue.length} buffered ICE candidates for ${peerId}`);
        for (const candidate of queue) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                // Benign — can happen if candidate is redundant or connection closed
            }
        }
    }, []);

    // ── Create RTCPeerConnection ───────────────────────────────────────────────
    const createPeerConnection = useCallback(
        (peerId) => {
            // Close any stale connection first
            if (pcs.current[peerId]) {
                console.log(`[WebRTC] Closing stale PC for ${peerId}`);
                pcs.current[peerId].close();
                delete pcs.current[peerId];
            }
            remoteDescSet.current[peerId] = false;
            iceCandidateQueue.current[peerId] = [];
            makingOfferRef.current[peerId] = false;

            console.log(`[WebRTC] Creating RTCPeerConnection for ${peerId}`);
            const pc = new RTCPeerConnection(ICE_CONFIG);
            pcs.current[peerId] = pc;

            // ── ICE candidate handler ─────────────────────────────────────────────
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    console.log(`[ICE] Sending candidate to ${peerId}: ${candidate.type} ${candidate.protocol}`);
                    socket.emit("webrtc-ice-candidate", { to: peerId, candidate });
                } else {
                    console.log(`[ICE] Gathering complete for ${peerId}`);
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log(`[ICE] Gathering state → ${pc.iceGatheringState} (peer: ${peerId})`);
            };

            // ── ICE connection state — critical for debugging ────────────────────
            pc.oniceconnectionstatechange = () => {
                const s = pc.iceConnectionState;
                console.log(`%c[ICE] Connection state → ${s} (peer: ${peerId})`,
                    s === "connected" || s === "completed" ? "color:green;font-weight:bold"
                        : s === "failed" ? "color:red;font-weight:bold"
                            : "color:orange");

                const normalized =
                    s === "connected" || s === "completed" ? "connected"
                        : s === "failed" || s === "disconnected" ? "failed"
                            : "connecting";

                setPeerStates((prev) => ({ ...prev, [peerId]: normalized }));

                if (s === "failed") {
                    console.error(
                        `[ICE] FAILED for ${peerId}.\n` +
                        "Possible causes:\n" +
                        "  1. No TURN server reached (symmetric NAT)\n" +
                        "  2. Firewall blocking UDP ports\n" +
                        "  3. ICE candidates dropped before setRemoteDescription\n" +
                        "Activating Socket.io-only fallback sync."
                    );
                    setUsingFallback(true);
                }

                if (s === "disconnected") {
                    // Try ICE restart before giving up
                    console.warn(`[ICE] Disconnected — attempting restart for ${peerId}`);
                    if (localStreamRef.current && pc.restartIce) {
                        pc.restartIce();
                    }
                }
            };

            pc.onsignalingstatechange = () => {
                console.log(`[SIG] Signaling state → ${pc.signalingState} (peer: ${peerId})`);
            };

            pc.onconnectionstatechange = () => {
                console.log(`[PC] Connection state → ${pc.connectionState} (peer: ${peerId})`);
            };

            // ── Receive tracks from remote peer (viewer side) ─────────────────────
            pc.ontrack = ({ track, streams }) => {
                console.log(`[WebRTC] ontrack: kind=${track.kind} from ${peerId}`, streams);
                if (!streams || streams.length === 0) {
                    console.warn("[WebRTC] ontrack fired with no streams — track without stream");
                    return;
                }
                const incomingStream = streams[0];
                setRemoteStream((prev) => {
                    if (prev === incomingStream) return prev; // no-op if same instance
                    console.log(`[WebRTC] Assigning remote stream ${incomingStream.id}`);
                    return incomingStream;
                });
            };

            // IMPORTANT: Do NOT set onnegotiationneeded here.
            // It was causing a race condition where both the automatic negotiation
            // and our manual createOffer() ran simultaneously → signaling glare → failure.
            // All offers are initiated EXPLICITLY below.

            return pc;
        },
        [socket]
    );

    // ── Helper: add all local tracks to a peer connection ─────────────────────
    const addLocalTracks = useCallback((pc) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const existingSenderTrackIds = pc.getSenders()
            .map((s) => s.track?.id)
            .filter(Boolean);

        stream.getTracks().forEach((track) => {
            if (!existingSenderTrackIds.includes(track.id)) {
                console.log(`[WebRTC] Adding track: ${track.kind} (${track.id})`);
                pc.addTrack(track, stream);
            }
        });
    }, []);

    // ── Helper: explicitly create and send offer (HOST only) ──────────────────
    const sendOffer = useCallback(
        async (peerId) => {
            const pc = pcs.current[peerId];
            if (!pc) return;
            if (makingOfferRef.current[peerId]) {
                console.warn(`[WebRTC] Already making offer for ${peerId}, skipping`);
                return;
            }
            try {
                makingOfferRef.current[peerId] = true;
                console.log(`[WebRTC] Creating offer for ${peerId}`);
                const offer = await pc.createOffer({
                    offerToReceiveAudio: false,  // host sends only, not receives
                    offerToReceiveVideo: false,
                });
                await pc.setLocalDescription(offer);
                console.log(`[WebRTC] Sending offer to ${peerId}`);
                socket.emit("webrtc-offer", { to: peerId, offer: pc.localDescription });
            } catch (err) {
                console.error(`[WebRTC] Failed to create offer for ${peerId}:`, err);
            } finally {
                makingOfferRef.current[peerId] = false;
            }
        },
        [socket]
    );

    // ── Public: host calls this when stream is ready ───────────────────────────
    const startStream = useCallback(
        (stream) => {
            console.log("[WebRTC] startStream — storing local stream");
            localStreamRef.current = stream;
            // If any peer connections already exist (rare edge case), add tracks
            Object.entries(pcs.current).forEach(([peerId, pc]) => {
                addLocalTracks(pc);
                sendOffer(peerId);
            });
        },
        [addLocalTracks, sendOffer]
    );

    // ── Public: stop all peer connections ─────────────────────────────────────
    const stopStream = useCallback(() => {
        console.log("[WebRTC] stopStream — closing all connections");
        Object.values(pcs.current).forEach((pc) => pc.close());
        pcs.current = {};
        iceCandidateQueue.current = {};
        remoteDescSet.current = {};
        makingOfferRef.current = {};
        localStreamRef.current = null;
        setRemoteStream(null);
        setPeerStates({});
        setUsingFallback(false);
    }, []);

    // ── Socket event handlers ─────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !roomId) return;

        // HOST receives: viewer is requesting the stream
        const handleRequestStream = async ({ from }) => {
            console.log(`[WebRTC] ← request-stream from viewer ${from}`);

            if (!localStreamRef.current) {
                console.warn("[WebRTC] request-stream received but no local stream — ignoring");
                return;
            }

            // If we are already negotiating or connected to this peer, don't restart PC
            // to avoid interrupting the proactive offer from handleUserJoined.
            const existingPc = pcs.current[from];
            if (existingPc && (existingPc.connectionState === "connected" || existingPc.connectionState === "connecting")) {
                console.log(`[WebRTC] Already have an active PC for ${from} (${existingPc.connectionState}), skipping duplicate request`);
                return;
            }

            const pc = createPeerConnection(from);
            addLocalTracks(pc);
            // Brief delay so addTrack settles before negotiation
            await new Promise((r) => setTimeout(r, 50));
            await sendOffer(from);
        };

        // VIEWER receives: host sent an offer
        const handleOffer = async ({ offer, from }) => {
            console.log(`[WebRTC] ← offer from host ${from}`);

            // Create/recreate PC for this host
            const pc = createPeerConnection(from);

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                remoteDescSet.current[from] = true;
                console.log(`[WebRTC] Remote description set for ${from}`);

                // Flush any ICE candidates that arrived early
                await flushIceCandidates(from);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log(`[WebRTC] Sending answer to ${from}`);
                socket.emit("webrtc-answer", { to: from, answer: pc.localDescription });
            } catch (err) {
                console.error(`[WebRTC] Failed to handle offer from ${from}:`, err);
            }
        };

        // HOST receives: viewer sent an answer
        const handleAnswer = async ({ answer, from }) => {
            console.log(`[WebRTC] ← answer from viewer ${from}`);
            const pc = pcs.current[from];
            if (!pc) {
                console.warn(`[WebRTC] No PC found for ${from} when handling answer`);
                return;
            }

            if (pc.signalingState !== "have-local-offer") {
                console.warn(
                    `[WebRTC] Unexpected signaling state "${pc.signalingState}" when handling answer from ${from}`
                );
                return;
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                remoteDescSet.current[from] = true;
                console.log(`[WebRTC] Remote description (answer) set for ${from}`);
                await flushIceCandidates(from);
            } catch (err) {
                console.error(`[WebRTC] Failed to handle answer from ${from}:`, err);
            }
        };

        // BOTH: receive an ICE candidate from the other peer
        const handleIceCandidate = async ({ candidate, from }) => {
            if (!candidate) return;

            const pc = pcs.current[from];
            if (!pc) {
                // PC might not exist yet — queue it anyway
                console.log(`[ICE] No PC yet for ${from}, queuing candidate`);
                queueIceCandidate(from, candidate);
                return;
            }

            if (remoteDescSet.current[from]) {
                // Remote description is set — apply immediately
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(`[ICE] Applied candidate from ${from}: ${candidate.type}`);
                } catch (err) {
                    // Only log if it's not a harmless benign error
                    if (!err.message.includes("Cannot add ICE candidate")) {
                        console.warn(`[ICE] addIceCandidate error from ${from}:`, err.message);
                    }
                }
            } else {
                // Remote description not set yet — MUST buffer
                console.log(`[ICE] Buffering candidate from ${from} (remoteDesc not set yet)`);
                queueIceCandidate(from, candidate);
            }
        };

        // HOST receives: a NEW viewer just joined — send them an offer immediately 
        // (only if we are already streaming)
        const handleUserJoined = async ({ id: newUserId }) => {
            if (!localStreamRef.current) return; // We're not the host
            console.log(`[WebRTC] New viewer joined: ${newUserId} — sending offer proactively`);
            const pc = createPeerConnection(newUserId);
            addLocalTracks(pc);
            await new Promise((r) => setTimeout(r, 50));
            await sendOffer(newUserId);
        };

        // Cleanup when a peer leaves
        const handleUserLeft = ({ id: leftUserId }) => {
            console.log(`[WebRTC] User left: ${leftUserId} — closing PC`);
            if (pcs.current[leftUserId]) {
                pcs.current[leftUserId].close();
                delete pcs.current[leftUserId];
            }
            delete remoteDescSet.current[leftUserId];
            delete iceCandidateQueue.current[leftUserId];
            delete makingOfferRef.current[leftUserId];
            setPeerStates((prev) => {
                const next = { ...prev };
                delete next[leftUserId];
                return next;
            });
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
        addLocalTracks,
        sendOffer,
        flushIceCandidates,
        queueIceCandidate,
    ]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => stopStream();
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
