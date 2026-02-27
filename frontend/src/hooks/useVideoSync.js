/**
 * useVideoSync.js
 *
 * Handles play/pause/seek synchronization between host and viewers.
 *
 * Sync algorithm:
 *  1. Host emits sync-heartbeat every 5 s: { playing, currentTime, serverTime }
 *  2. Viewer measures RTT via periodic ping/pong with the server.
 *  3. expectedViewerTime = currentTime + (rtt / 2 / 1000)
 *  4. If drift > HARD_SEEK_THRESHOLD → hard seek (snap).
 *  5. If drift in (SOFT_ADJUST_MIN, HARD_SEEK_THRESHOLD) → tweak playbackRate by ±0.05.
 *
 * Usage (host):
 *   const { emitPlay, emitPause, emitSeek, startHeartbeat, stopHeartbeat } =
 *     useVideoSync({ socket, roomId, videoRef, isHost: true });
 *
 * Usage (viewer):
 *   const { startHeartbeat, stopHeartbeat } =
 *     useVideoSync({ socket, roomId, videoRef, isHost: false });
 */

import { useRef, useCallback, useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 5000;
const HARD_SEEK_THRESHOLD_S = 0.8;   // >0.8 s drift → hard seek
const SOFT_ADJUST_MIN_S = 0.15;      // 0.15–0.8 s drift → rate tweak
const RATE_ADJUST_STEP = 0.05;       // playbackRate offset to apply
const SEEK_DEBOUNCE_MS = 150;

export function useVideoSync({ socket, roomId, videoRef, isHost }) {
    const heartbeatInterval = useRef(null);
    const rttRef = useRef(0);           // measured RTT in ms
    const seekDebounceRef = useRef(null);
    const isSyncingRef = useRef(false); // prevent event re-entrant loops
    const pingIntervalRef = useRef(null);

    const getCleanRoomId = useCallback(
        () => (roomId ? roomId.trim().toUpperCase() : ""),
        [roomId]
    );

    // ── RTT measurement (every 10 s) ────────────────────────────────────────
    const startRttMeasurement = useCallback(() => {
        if (pingIntervalRef.current) return;

        const measure = () => {
            const t0 = Date.now();
            socket.emit("ping-rtt", t0);
            const handle = socket.once("pong-rtt", (sentTime) => {
                if (sentTime === t0) {
                    rttRef.current = Date.now() - t0;
                    console.log(`[Sync] RTT: ${rttRef.current} ms`);
                }
            });
            // Safety cleanup in case pong never arrives
            setTimeout(() => socket.off("pong-rtt", handle), 5000);
        };

        measure(); // immediate first measurement
        pingIntervalRef.current = setInterval(measure, 10000);
    }, [socket]);

    const stopRttMeasurement = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
    }, []);

    // ── Apply sync to viewer's video element ────────────────────────────────
    const applySyncToViewer = useCallback(
        ({ playing, currentTime, serverTime }) => {
            const video = videoRef.current;
            if (!video || isHost) return;

            // Compute expected time accounting for one-way latency
            const oneWayLatency = rttRef.current / 2 / 1000; // seconds
            const elapsed = (Date.now() - serverTime) / 1000;
            const expectedTime = currentTime + oneWayLatency + elapsed;

            const drift = expectedTime - video.currentTime;
            console.log(
                `[Sync] drift=${drift.toFixed(3)}s  expected=${expectedTime.toFixed(2)}  actual=${video.currentTime.toFixed(2)}`
            );

            isSyncingRef.current = true;

            // — Hard seek —
            if (Math.abs(drift) > HARD_SEEK_THRESHOLD_S) {
                console.log(`[Sync] Hard seek → ${expectedTime.toFixed(2)} s`);
                video.currentTime = expectedTime;
                video.playbackRate = 1.0;
            }
            // — Soft rate adjustment —
            else if (Math.abs(drift) > SOFT_ADJUST_MIN_S) {
                const rate = drift > 0 ? 1.0 + RATE_ADJUST_STEP : 1.0 - RATE_ADJUST_STEP;
                console.log(`[Sync] Rate adjust → ${rate}`);
                video.playbackRate = rate;
            }
            // — Already in sync —
            else {
                video.playbackRate = 1.0;
            }

            // Apply play/pause state
            if (playing && video.paused) {
                video.play().catch(() => { });
            } else if (!playing && !video.paused) {
                video.pause();
            }

            // Allow normal events again after the DOM has settled
            setTimeout(() => {
                isSyncingRef.current = false;
            }, 250);
        },
        [videoRef, isHost]
    );

    // ── Host: start broadcasting heartbeat ─────────────────────────────────
    const startHeartbeat = useCallback(() => {
        if (!isHost || heartbeatInterval.current) return;
        startRttMeasurement();

        heartbeatInterval.current = setInterval(() => {
            const video = videoRef.current;
            if (!video) return;
            socket.emit("sync-heartbeat", {
                roomId: getCleanRoomId(),
                playing: !video.paused,
                currentTime: video.currentTime,
            });
        }, HEARTBEAT_INTERVAL_MS);

        console.log("[Sync] Heartbeat started");
    }, [isHost, socket, videoRef, getCleanRoomId, startRttMeasurement]);

    const stopHeartbeat = useCallback(() => {
        if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
            heartbeatInterval.current = null;
        }
        stopRttMeasurement();
        console.log("[Sync] Heartbeat stopped");
    }, [stopRttMeasurement]);

    // ── Host: emit play/pause/seek ──────────────────────────────────────────
    const emitPlay = useCallback(() => {
        if (!isHost) return;
        socket.emit("play-video", getCleanRoomId());
    }, [isHost, socket, getCleanRoomId]);

    const emitPause = useCallback(() => {
        if (!isHost) return;
        socket.emit("pause-video", getCleanRoomId());
    }, [isHost, socket, getCleanRoomId]);

    const emitSeek = useCallback(
        (time) => {
            if (!isHost) return;
            if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
            seekDebounceRef.current = setTimeout(() => {
                socket.emit("seek-video", { roomId: getCleanRoomId(), time });
                // Also send an immediate heartbeat so viewers snap to the right position
                const video = videoRef.current;
                if (video) {
                    socket.emit("sync-heartbeat", {
                        roomId: getCleanRoomId(),
                        playing: !video.paused,
                        currentTime: video.currentTime,
                    });
                }
            }, SEEK_DEBOUNCE_MS);
        },
        [isHost, socket, videoRef, getCleanRoomId]
    );

    const emitVolumeChange = useCallback(
        ({ muted, volume }) => {
            if (!isHost) return;
            socket.emit("volume-change", { roomId: getCleanRoomId(), muted, volume });
        },
        [isHost, socket, getCleanRoomId]
    );

    // ── Viewer: listen for sync events ─────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        if (!isHost) {
            startRttMeasurement();
        }

        const handleHeartbeat = (payload) => applySyncToViewer(payload);

        const handlePlay = () => {
            if (isHost || isSyncingRef.current) return;
            const video = videoRef.current;
            if (video && video.paused) {
                isSyncingRef.current = true;
                video.play().catch(() => { }).finally(() => {
                    isSyncingRef.current = false;
                });
            }
        };

        const handlePause = () => {
            if (isHost || isSyncingRef.current) return;
            const video = videoRef.current;
            if (video && !video.paused) {
                isSyncingRef.current = true;
                video.pause();
                setTimeout(() => { isSyncingRef.current = false; }, 100);
            }
        };

        const handleSeek = (time) => {
            if (isHost || isSyncingRef.current) return;
            const video = videoRef.current;
            if (!video) return;
            isSyncingRef.current = true;
            if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
            seekDebounceRef.current = setTimeout(() => {
                video.currentTime = time;
                setTimeout(() => { isSyncingRef.current = false; }, 200);
            }, 80);
        };

        const handleVolumeChange = ({ muted, volume }) => {
            if (isHost) return;
            const video = videoRef.current;
            if (!video) return;
            video.muted = muted;
            if (!muted && typeof volume === "number") video.volume = volume;
        };

        socket.on("sync-heartbeat", handleHeartbeat);
        socket.on("play-video", handlePlay);
        socket.on("pause-video", handlePause);
        socket.on("seek-video", handleSeek);
        socket.on("volume-change", handleVolumeChange);

        return () => {
            socket.off("sync-heartbeat", handleHeartbeat);
            socket.off("play-video", handlePlay);
            socket.off("pause-video", handlePause);
            socket.off("seek-video", handleSeek);
            socket.off("volume-change", handleVolumeChange);
            if (!isHost) stopRttMeasurement();
        };
    }, [socket, isHost, videoRef, applySyncToViewer, startRttMeasurement, stopRttMeasurement]);

    // ── Cleanup ─────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopHeartbeat();
            if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
        };
    }, [stopHeartbeat]);

    return {
        emitPlay,
        emitPause,
        emitSeek,
        emitVolumeChange,
        startHeartbeat,
        stopHeartbeat,
        isSyncing: () => isSyncingRef.current,
    };
}
