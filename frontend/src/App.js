import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/room";
import socket from "./socket";
import "./App.css";

function App() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Global Socket Connected");
      setConnected(true);
    };
    const handleDisconnect = () => {
      console.log("Global Socket Disconnected");
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return (
    <div className="App">
      <header className="royal-header">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>ROYAL CINEMA</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#4caf50' : '#f44336' }}></div>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>WATCH PARTY</div>
      </header>
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;