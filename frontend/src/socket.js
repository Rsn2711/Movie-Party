import { io } from "socket.io-client";

// Use environment-based backend URL with fallback options
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_BACKEND_URL || "https://movie-watch-party-production.up.railway.app"
  : "http://localhost:5000";

// Log the backend URL being used for debugging
console.log('Using backend URL:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  // Configure transports for Railway compatibility
  transports: ["polling", "websocket"],  // Try polling first as fallback
  upgrade: true,                        // Allow transport upgrades
  rememberUpgrade: false,               // Don't remember failed upgrades
  
  // Connection settings for production stability
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 10,
  
  // Timeout and performance settings
  timeout: 15000,
  autoConnect: true,
  
  // Security and proxy settings for Railway
  withCredentials: false,
  rejectUnauthorized: false,  // Allow self-signed certificates if needed
  
  // Additional options for Railway's proxy infrastructure
  forceNew: true,             // Create a new connection instance
  path: '/socket.io/',        // Match backend path configuration
  closeOnBeforeunload: false  // Prevent closure on page unload
});

// Add comprehensive error handling for debugging
socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  console.error('Connection attempt to:', BACKEND_URL);
  console.error('Error type:', error.type);
  console.error('Error message:', error.message);
});

socket.on('connect_timeout', (timeout) => {
  console.error('Socket connection timeout:', timeout);
});

socket.on('reconnect_failed', () => {
  console.error('Socket reconnection failed - giving up');
  // Show user-friendly error message
  alert('Unable to connect to server. Please check your internet connection and try refreshing the page.');
});

socket.on('reconnecting', (attemptNumber) => {
  console.log(`Socket reconnecting... Attempt: ${attemptNumber}`);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server forcibly closed the connection
    socket.connect();
  }
});

// Add connection success handler
socket.on('connect', () => {
  console.log('Socket connected successfully to:', BACKEND_URL);
});

export default socket;
