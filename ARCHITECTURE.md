# 🎬 Movie Watch Party — WebRTC Architecture

## System Overview

```mermaid
graph TB
    subgraph "Browser: Host"
        HV[Video Element<br/>Local File / Screen]
        HCS[captureStream]
        HWRTC[useWebRTC Hook<br/>RTCPeerConnection × N]
        HSync[useVideoSync Hook<br/>Heartbeat every 5s]
    end

    subgraph "Browser: Viewer A"
        VA[Video Element<br/>srcObject = remoteStream]
        VAWRTC[useWebRTC Hook<br/>RTCPeerConnection]
        VASync[useVideoSync Hook<br/>RTT compensation]
    end

    subgraph "Browser: Viewer B"
        VB[Video Element]
        VBWRTC[useWebRTC Hook<br/>RTCPeerConnection]
        VBSync[useVideoSync Hook]
    end

    subgraph "Server: Render"
        SIG[Socket.IO Signaling<br/>server.js]
        STUN[Google STUN<br/>stun.l.google.com]
    end

    HV -->|captureStream| HCS
    HCS --> HWRTC
    HWRTC <-->|ICE/SDP via Socket.IO| SIG
    VAWRTC <-->|ICE/SDP via Socket.IO| SIG
    VBWRTC <-->|ICE/SDP via Socket.IO| SIG

    HWRTC <-.->|WebRTC P2P Video+Audio| VAWRTC
    HWRTC <-.->|WebRTC P2P Video+Audio| VBWRTC

    HWRTC -.->|ICE negotiation| STUN
    VAWRTC -.->|ICE negotiation| STUN

    HSync -->|sync-heartbeat| SIG
    SIG -->|sync-heartbeat relay| VASync
    SIG -->|sync-heartbeat relay| VBSync
```

---

## Signaling Flow (Step by Step)

### Phase 1 – Room Setup
```
Host             Server (Socket.IO)         Viewer
  |                      |                     |
  |── create-room ──────>|                     |
  |<─ roomId ───────────|                     |
  |                      |<── join-room ───────|
  |                      |──stream-status ────>|
  |                      |──user-joined ──────>|  (triggers host to initiate WebRTC)
```

### Phase 2 – WebRTC Negotiation (per viewer)
```
Host             Server (Socket.IO)         Viewer
  |── start-stream ─────>|                     |
  |                      |── stream-started ──>|
  |                      |<── request-stream ──|
  |<─ request-stream ───|                     |
  |                      |                     |
  |─ createOffer() ──>  |                     |
  |── webrtc-offer ─────>|── webrtc-offer ────>|
  |                      |                  setRemoteDesc()
  |                      |                  createAnswer()
  |                      |<── webrtc-answer ───|
  |<─ webrtc-answer ────|                     |
  |  setRemoteDesc()     |                     |
  |                      |                     |
  |<── ICE candidates ──>|<── ICE candidates ──|  (buffered until remoteDesc set)
  |                      |                     |
  |════════ P2P Video+Audio Stream ════════════|  (direct, no server relay)
```

### Phase 3 – Playback Sync (ongoing)
```
Host (every 5s)    Server              Viewer
  |                    |                  |
  |── sync-heartbeat ─>|── heartbeat ────>|
  |   { playing,       |   relay          |   RTT / 2 offset applied
  |     currentTime,   |                  |   Soft: adjust playbackRate ±0.05
  |     serverTime }   |                  |   Hard: hard seek if drift > 0.8s
```

---

## ICE Candidate Buffering (Critical Fix)

**Old problem**: ICE candidates were emitted before the receiver had called `setRemoteDescription()`, causing them to be silently dropped.

**Fix** in `useWebRTC.js`:
```js
// Buffer candidates until remote description is set
if (remoteDescSet.current[from]) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
} else {
  iceCandidateQueue.current[from].push(candidate);  // buffered
}

// Flush buffer AFTER setRemoteDescription()
await pc.setRemoteDescription(offer);
remoteDescSet.current[from] = true;
await flushIceCandidates(from);  // drain queue
```

---

## Latency Compensation

```
Viewer's expected position = host.currentTime + (RTT / 2 / 1000s) + elapsed_since_server_timestamp

Drift = expectedTime - video.currentTime

| Drift         | Action                          |
|---------------|----------------------------------|
| < 0.15 s      | Do nothing (within tolerance)   |
| 0.15 – 0.8 s  | playbackRate ± 0.05 (smooth)    |
| > 0.8 s       | video.currentTime = expectedTime |
```

RTT is measured every 10 seconds with a `ping-rtt`/`pong-rtt` echo on Socket.IO.

---

## Audio Fix

**Old problem**: `canvas.captureStream()` produces a video-only stream — no audio.

**Fix**:
```js
// ✅ Correct: captureStream from video element (includes decoded audio)
const stream = videoElement.captureStream();
// stream.getTracks() → [ VideoStreamTrack, AudioStreamTrack ]

// ❌ Wrong: canvas has no audio decoder
const stream = canvas.captureStream(30);
// stream.getTracks() → [ VideoStreamTrack ]  ← audio missing!
```

For **screen share**, `getDisplayMedia({ audio: true })` already returns a MediaStream with both audio and video — no canvas needed.

---

## STUN / TURN Configuration

### STUN (Free — for most home networks)
```
stun:stun.l.google.com:19302
stun:stun1.l.google.com:19302
stun:stun2.l.google.com:19302
```
STUN works when at least one peer is behind a "cone" NAT (most home ISPs).
**STUN fails** when either peer is behind **symmetric NAT** (mobile, corporate, strict ISPs).

### TURN (Built-in free server for testing)
The code includes `openrelay.metered.ca` TURN servers as a built-in fallback.
These work for testing — for production replace with your own TURN server.

### Your own TURN server (recommended for production)
Set these in `frontend/.env.local` or `frontend/.env.production`:
```bash
REACT_APP_TURN_URL=turn:your-server.com:3478
REACT_APP_TURN_USERNAME=your_username
REACT_APP_TURN_CREDENTIAL=your_password
```

**Free TURN providers**:
- [Metered.ca](https://www.metered.ca/) — 50 GB/month free tier
- [Twilio](https://www.twilio.com/docs/stun-turn) — pay-as-you-go

---

## Why WebRTC Failed on Vercel + Render (Root Cause Analysis)

### Reason 1 — Double-offer race condition (Code Bug)
```
handleRequestStream() → manually called pc.createOffer()
addLocalTracks()      → triggered onnegotiationneeded → also called pc.createOffer()

Result: Two simultaneous offers → signaling state machine error → ICE never starts
```
**Fix**: Removed `onnegotiationneeded`. All offers are created **explicitly** in `sendOffer()`.

### Reason 2 — No TURN server (NAT traversal gap)
```
Locally:    Host + Viewer = same machine → loopback → no NAT → STUN works
Production: Host = home WiFi behind NAT A
            Viewer = mobile/corporate behind NAT B (possibly symmetric)
            → STUN cannot punch through symmetric NAT → ICE fails
```
**Fix**: Built-in TURN server (`openrelay.metered.ca`) provides relay fallback.

### Reason 3 — captureStream() on un-started video
```
Old code: captureStream() called immediately after play() (before first frame decoded)
Result:   Stream has 0 tracks → addTrack() adds nothing → viewer receives nothing
```
**Fix**: 200ms delay after `play()` before calling `captureStream()`.

### Debugging ICE failures (open browser DevTools → Console)
The new code logs every step with colors:
```
[ICE] Connection state → checking   (orange)  ← negotiating
[ICE] Connection state → connected  (green)   ← success
[ICE] Connection state → failed     (red)     ← need TURN server
[ICE] Sending candidate to X: relay udp       ← TURN relay candidate
[ICE] Sending candidate to X: srflx udp       ← STUN server-reflexive candidate
[ICE] Sending candidate to X: host  udp       ← local network candidate
```
If you only see `host` candidates and ICE fails → **TURN server required**.
If you see `relay` candidates and ICE still fails → check TURN credentials.

---

## Production Topology

```
                    ┌─────────────────────────────┐
                    │   Vercel (React Frontend)    │
                    │   movie-party-bice.vercel.app│
                    └──────────────┬──────────────┘
                                   │ Socket.IO (signaling only)
                    ┌──────────────▼──────────────┐
                    │   Render (Node.js Backend)   │
                    │   Carries: SDP + ICE only    │
                    │   Does NOT carry media       │
                    └─────────────────────────────┘
                              ▲           ▲
                   ICE/SDP    │           │   ICE/SDP
              ┌───────────────┘           └─────────────┐
              │                                          │
    ┌─────────▼──────────┐              ┌───────────────▼──────┐
    │   Host Browser     │              │   Viewer Browser     │
    │   (Chrome/Edge)    │◄────P2P─────►│   (Chrome/Edge)      │
    └────────────────────┘   WebRTC     └──────────────────────┘
             ↑                   if symmetric NAT:   ↓
             └──── TURN server (openrelay.metered.ca) ──────┘
```

---

## Scaling Considerations

| Users | Architecture | Notes |
|-------|-------------|-------|
| 1–8   | Full mesh (this implementation) | Each peer connects to every other peer |
| 8–50  | SFU (Selective Forwarding Unit) | MediaSoup, LiveKit, or Janus |
| 50+   | CDN streaming (HLS/DASH) | Host stream → CDN → viewers |

---

## Browser Compatibility

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| `RTCPeerConnection` | ✅ | ✅ | ✅ | ✅ |
| `video.captureStream()` | ✅ | ✅ (mozCaptureStream) | ✅ | ❌ |
| `getDisplayMedia` | ✅ | ✅ | ✅ | ✅ (macOS 13+) |
| `playbackRate` adjust | ✅ | ✅ | ✅ | ✅ |

> **Safari host note**: `captureStream()` is not supported on Safari. Safari users can join as viewers or use screen share. The code falls back to `mozCaptureStream()` on Firefox automatically.

