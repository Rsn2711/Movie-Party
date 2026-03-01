const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

// ─── Static / Frontend ────────────────────────────────────────────────────────
const buildPath = path.join(__dirname, "../frontend/build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

app.set("trust proxy", true);

app.use((req, res, next) => {
  // Skip logging for socket.io polling to reduce noise
  if (!req.path.startsWith("/socket.io")) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

app.get("/health", (_req, res) =>
  res.json({ status: "OK", ts: Date.now(), rooms: Object.keys(rooms).length })
);

app.get("/socket-health", (_req, res) =>
  res.json({ status: "OK", clients: io.engine.clientsCount })
);

app.get(/^(?!\/health|\/socket-health|\/socket\.io)/, (req, res) => {
  const index = path.join(buildPath, "index.html");
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(404).send(
      `<h1>Frontend build not found</h1>
       <p>Run <code>npm run build</code> in the frontend directory.</p>
       <p>Dev server: <a href="http://localhost:3000">http://localhost:3000</a></p>`
    );
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      "https://movie-party-bice.vercel.app",
      "https://movie-party-git-main-kumarraushan2797-6902s-projects.vercel.app",
      "https://movie-party-5srathvcm-kumarraushan2797-6902s-projects.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  cookie: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: true,
  path: "/socket.io/",
  serveClient: false,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
  httpCompression: false,
});

io.engine.on("connection_error", (err) => {
  console.error("[ENGINE] Connection error:", err.message);
});

// ─── Room State ──────────────────────────────────────────────────────────────
/**
 * rooms[roomId] = {
 *   streamer: socketId | null,
 *   members: Map<socketId, { username, joinedAt }>,
 *   lastActivity: Date,
 *   playState: { playing: bool, currentTime: number, serverTime: number } | null
 * }
 */
const rooms = {};

const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/** Remove empty rooms after 30 minutes of inactivity */
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of Object.entries(rooms)) {
    if (
      room.members.size === 0 &&
      now - room.lastActivity > 30 * 60 * 1000
    ) {
      delete rooms[roomId];
      console.log(`[CLEANUP] Removed empty room: ${roomId}`);
    }
  }
}, 5 * 60 * 1000);

const broadcastUserList = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;
  const list = [...room.members.entries()].map(([id, info]) => ({
    id,
    username: info.username,
    isStreamer: id === room.streamer,
  }));
  io.to(roomId).emit("user-list", list);
};

// ─── Connection Handler ───────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // ── Room management ──────────────────────────────────────────────────────
  socket.on("create-room", (callback) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      streamer: null,
      members: new Map(),
      lastActivity: Date.now(),
      playState: null,
    };
    socket.join(roomId);
    console.log(`[CREATE] Room: ${roomId} by ${socket.id}`);
    if (typeof callback === "function") callback(roomId);
  });

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();

    if (!rooms[id]) {
      rooms[id] = {
        streamer: null,
        members: new Map(),
        lastActivity: Date.now(),
        playState: null,
      };
    }

    socket.join(id);
    rooms[id].members.set(socket.id, { username, joinedAt: Date.now() });
    rooms[id].lastActivity = Date.now();
    console.log(`[JOIN]  ${username} (${socket.id}) → Room: ${id}`);

    // Notify others
    socket.to(id).emit("user-joined", { id: socket.id, username });

    // Tell joiner current stream + playback state
    socket.emit("stream-status", {
      isStreaming: !!rooms[id].streamer,
      streamerId: rooms[id].streamer,
      playState: rooms[id].playState,
    });

    broadcastUserList(id);
  });

  // ── Chat ─────────────────────────────────────────────────────────────────
  socket.on("send-message", ({ roomId, message, user }) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    io.to(id).emit("receive-message", { message, user, ts: Date.now() });
  });

  // ── Streaming control ─────────────────────────────────────────────────────
  socket.on("start-stream", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    if (!rooms[id]) return;
    rooms[id].streamer = socket.id;
    rooms[id].lastActivity = Date.now();
    console.log(`[STREAM_START] Room: ${id} streamer: ${socket.id}`);
    io.to(id).emit("stream-started", { streamerId: socket.id });
    broadcastUserList(id);
  });

  socket.on("stop-stream", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    if (!rooms[id] || rooms[id].streamer !== socket.id) return;
    rooms[id].streamer = null;
    rooms[id].playState = null;
    rooms[id].lastActivity = Date.now();
    console.log(`[STREAM_STOP] Room: ${id}`);
    io.to(id).emit("stream-stopped");
    broadcastUserList(id);
  });

  // When a newly-joined viewer asks the host to resend its stream
  socket.on("request-stream", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    if (!rooms[id] || !rooms[id].streamer) return;
    console.log(
      `[STREAM_REQ] ${socket.id} requested stream in room ${id} → forwarding to ${rooms[id].streamer}`
    );
    io.to(rooms[id].streamer).emit("request-stream", { from: socket.id });
  });

  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  // Unicast relay — always use `to` field for targeted signaling
  socket.on("webrtc-offer", ({ to, offer }) => {
    if (!to || !offer) return;
    console.log(`[SIG] offer  ${socket.id} → ${to}`);
    io.to(to).emit("webrtc-offer", { offer, from: socket.id });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    if (!to || !answer) return;
    console.log(`[SIG] answer ${socket.id} → ${to}`);
    io.to(to).emit("webrtc-answer", { answer, from: socket.id });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("webrtc-ice-candidate", { candidate, from: socket.id });
  });

  // ── Playback Sync ─────────────────────────────────────────────────────────
  /**
   * Host broadcasts sync-heartbeat every ~5 s.
   * Server appends its own timestamp so viewers can calc RTT offset.
   */
  socket.on("sync-heartbeat", ({ roomId, playing, currentTime, duration }) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    if (!rooms[id] || rooms[id].streamer !== socket.id) return;

    const payload = { playing, currentTime, duration, serverTime: Date.now() };
    rooms[id].playState = payload;
    rooms[id].lastActivity = Date.now();

    // Relay to all OTHER members
    socket.to(id).emit("sync-heartbeat", payload);
  });

  /** Viewer asks for an immediate state snapshot (e.g. just reconnected) */
  socket.on("request-sync", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    if (!rooms[id] || !rooms[id].streamer) return;
    // Forward the request to the host
    io.to(rooms[id].streamer).emit("request-sync", { from: socket.id });
  });

  /** Host responds to a specific viewer's sync request */
  socket.on("sync-response", ({ to, playing, currentTime, duration }) => {
    if (!to) return;
    io.to(to).emit("sync-heartbeat", {
      playing,
      currentTime,
      duration,
      serverTime: Date.now(),
    });
  });

  // Legacy play / pause / seek (kept for fallback compatibility)
  socket.on("play-video", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    socket.to(id).emit("play-video");
  });

  socket.on("pause-video", (roomId) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    socket.to(id).emit("pause-video");
  });

  socket.on("seek-video", ({ roomId, time }) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    socket.to(id).emit("seek-video", time);
  });

  socket.on("volume-change", ({ roomId, muted, volume }) => {
    if (!roomId) return;
    const id = roomId.trim().toUpperCase();
    socket.to(id).emit("volume-change", { muted, volume });
  });

  // ── RTT measurement ───────────────────────────────────────────────────────
  socket.on("ping-rtt", (clientTime) => {
    socket.emit("pong-rtt", clientTime);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (!rooms[roomId]) continue;
      rooms[roomId].members.delete(socket.id);
      rooms[roomId].lastActivity = Date.now();

      if (rooms[roomId].streamer === socket.id) {
        rooms[roomId].streamer = null;
        rooms[roomId].playState = null;
        io.to(roomId).emit("stream-stopped");
        console.log(`[DISCONNECT] Streamer left room ${roomId}`);
      }

      const username =
        rooms[roomId].members.get(socket.id)?.username ?? "Unknown";
      socket.to(roomId).emit("user-left", { id: socket.id, username });
      broadcastUserList(roomId);
    }
    console.log(`[DISCONNECT] ${socket.id}`);
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});

process.on("SIGTERM", () =>
  server.close(() => console.log("Process terminated (SIGTERM)"))
);
process.on("SIGINT", () =>
  server.close(() => console.log("Process terminated (SIGINT)"))
);
