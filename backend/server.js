const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Serve the frontend for all other routes (excluding API and socket routes)
app.get(/^(?!\/health|\/socket-health|\/socket\.io)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const io = new Server(server, {
  // Production-ready CORS configuration for Railway deployment
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL || "*")
      : ["http://localhost:3000", "http://192.168.240.1:3000", "*"],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Critical: Configure transports properly for Railway's proxy
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow older Engine.IO versions
  cookie: false,   // Disable cookies for Railway compatibility
  
  // Railway-specific settings for WebSocket upgrades
  pingTimeout: 60000,
  pingInterval: 25000,
  allowUpgrades: true,
  upgrade: true,
  path: '/socket.io/',
  serveClient: false,  // Don't serve client-side library
  maxHttpBufferSize: 1e6, // 1MB for larger payloads
  
  // Additional settings for Railway's infrastructure
  perMessageDeflate: false, // Disable compression to avoid proxy issues
  httpCompression: false    // Disable HTTP compression for WebSocket compatibility
});

// Enable trust proxy settings for Railway's load balancer
app.set('trust proxy', true);

// Add middleware to log requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Properly configure Socket.IO to work with Railway's proxy
io.engine.generateId = (req) => {
  console.log(`New Socket.IO connection attempt from: ${req.connection.remoteAddress} - Origin: ${req.headers.origin}`);
  // Use default ID generation
  return (Date.now().toString(36) + Math.random().toString(36)).substr(2, 9);
};

// Add event handlers for connection debugging
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO Engine Error:", err.message, err.description);
  console.error("Socket.IO Engine Error Details:", err.context);
});

io.on("connect_error", (err) => {
  console.error("Socket.IO Connection Error:", err.message);
});

// Additional health check for Railway
app.get('/socket-health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Socket.IO server is running',
    connectedSockets: io.engine.clientsCount 
  });
});

// Handle WebSocket upgrade events for debugging
server.on('upgrade', (req, socket, head) => {
  console.log(`WebSocket upgrade attempt to: ${req.url}`);
  console.log(`Headers:`, req.headers);
  console.log(`Origin:`, req.headers.origin);
  console.log(`Connection:`, req.headers.connection);
  console.log(`Upgrade:`, req.headers.upgrade);
});

const rooms = {};

const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

io.on("connection", (socket) => {
  console.log(`[CONNECT] ${socket.id}`);
  console.log(`[CONNECT] Socket connected from: ${socket.handshake.address}`);
  console.log(`[CONNECT] Socket handshake headers:`, socket.handshake.headers);

  socket.on("create-room", (callback) => {
    const roomId = generateRoomId();
    console.log(`[CREATE] ${roomId}`);
    rooms[roomId] = { streamer: null };
    socket.join(roomId);
    callback(roomId);
  });

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[JOIN] User: ${username} -> Room: ${cleanRoomId}`);
    
    socket.join(cleanRoomId);
    if (!rooms[cleanRoomId]) rooms[cleanRoomId] = { streamer: null };
    
    // Notify room
    io.to(cleanRoomId).emit("user-joined", username);
    
    // Direct reply to joiner
    socket.emit("stream-status", { 
      isStreaming: !!rooms[cleanRoomId].streamer,
      streamerId: rooms[cleanRoomId].streamer 
    });
  });

  socket.on("send-message", ({ roomId, message, user }) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[MSG] Room: ${cleanRoomId}, User: ${user}: ${message}`);
    io.to(cleanRoomId).emit("receive-message", { message, user });
  });

  socket.on("start-stream", (roomId) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[STREAM_START] Room: ${cleanRoomId} by ${socket.id}`);
    if (rooms[cleanRoomId]) {
      rooms[cleanRoomId].streamer = socket.id;
      io.to(cleanRoomId).emit("stream-started", { streamerId: socket.id });
    }
  });

  socket.on("stop-stream", (roomId) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[STREAM_STOP] Room: ${cleanRoomId}`);
    if (rooms[cleanRoomId] && rooms[cleanRoomId].streamer === socket.id) {
      rooms[cleanRoomId].streamer = null;
      io.to(cleanRoomId).emit("stream-stopped");
    }
  });

  socket.on("request-stream", (roomId) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[STREAM_REQ] Room: ${cleanRoomId} from ${socket.id}`);
    if (rooms[cleanRoomId] && rooms[cleanRoomId].streamer) {
      console.log(`[STREAM_REQ] Forwarding to streamer: ${rooms[cleanRoomId].streamer}`);
      io.to(rooms[cleanRoomId].streamer).emit("request-stream", { from: socket.id });
    } else {
      console.log(`[STREAM_REQ] No streamer found in room ${cleanRoomId}`);
    }
  });

  socket.on("webrtc-offer", ({ roomId, offer, to }) => {
    console.log(`[WEBRTC] Offer from ${socket.id} to ${to || 'room: ' + roomId}`);
    if (to) {
      io.to(to).emit("webrtc-offer", { offer, from: socket.id });
      console.log(`[WEBRTC] Offer relayed to ${to}`);
    } else if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      socket.to(cleanRoomId).emit("webrtc-offer", { offer, from: socket.id });
      console.log(`[WEBRTC] Offer broadcast to room ${cleanRoomId}`);
    }
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    console.log(`[WEBRTC] Answer from ${socket.id} to ${to}`);
    if (to) {
      io.to(to).emit("webrtc-answer", { answer, from: socket.id });
      console.log(`[WEBRTC] Answer relayed to ${to}`);
    }
  });

  socket.on("webrtc-ice-candidate", ({ roomId, candidate, to }) => {
    if (to) {
      io.to(to).emit("webrtc-ice-candidate", { candidate, from: socket.id });
    } else if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      socket.to(cleanRoomId).emit("webrtc-ice-candidate", { candidate, from: socket.id });
    }
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId].streamer === socket.id) {
        rooms[roomId].streamer = null;
        io.to(roomId).emit("stream-stopped");
      }
    }
  });

  socket.on("play-video", (roomId) => {
    if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      console.log(`[SYNC] Play command in room ${cleanRoomId}`);
      io.to(cleanRoomId).emit("play-video");
    }
  });

  socket.on("pause-video", (roomId) => {
    if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      console.log(`[SYNC] Pause command in room ${cleanRoomId}`);
      io.to(cleanRoomId).emit("pause-video");
    }
  });

  socket.on("seek-video", ({ roomId, time }) => {
    if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      console.log(`[SYNC] Seek to ${time} in room ${cleanRoomId}`);
      io.to(cleanRoomId).emit("seek-video", time);
    }
  });

  socket.on("volume-change", ({ roomId, muted, volume }) => {
    if (roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      console.log(`[SYNC] Volume change in room ${cleanRoomId} - muted: ${muted}, volume: ${volume}`);
      io.to(cleanRoomId).emit("volume-change", { muted, volume });
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  console.log(`Process environment:`, process.env);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
