import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

export default function Home() {
  const [roomInput, setRoomInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const navigate = useNavigate();

  useEffect(() => {
    // Monitor connection status
    const handleConnect = () => {
      setConnectionStatus('connected');
    };
    
    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };
    
    const handleConnectError = () => {
      setConnectionStatus('error');
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Set initial status
    setConnectionStatus(socket.connected ? 'connected' : 'connecting');

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  const createRoom = () => {
    console.log("Create room button clicked");
    console.log("Socket connected:", socket.connected);
    
    if (!socket.connected) {
      console.error("Socket is not connected!");
      // Instead of blocking alert, show inline message
      setConnectionStatus('error');
      setTimeout(() => {
        if (!socket.connected) {
          setConnectionStatus('disconnected');
        }
      }, 3000);
      return;
    }
    
    socket.emit("create-room", (roomId) => {
      console.log("Room created with ID:", roomId);
      navigate(`/room/${roomId}`);
    });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomInput.trim()) {
      navigate(`/room/${roomInput.trim()}`);
    }
  };

  const getConnectionMessage = () => {
    switch(connectionStatus) {
      case 'connected':
        return { text: 'Connected to server', color: '#4caf50' };
      case 'connecting':
        return { text: 'Connecting to server...', color: '#ff9800' };
      case 'error':
        return { text: 'Connection failed. Retrying...', color: '#f44336' };
      case 'disconnected':
        return { text: 'Disconnected. Please refresh page.', color: '#f44336' };
      default:
        return { text: 'Checking connection...', color: '#ff9800' };
    }
  };

  const connectionInfo = getConnectionMessage();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="royal-card" style={{ width: '100%', maxWidth: '450px', textAlign: 'center' }}>
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          borderRadius: '5px',
          backgroundColor: `${connectionInfo.color}20`,
          border: `1px solid ${connectionInfo.color}`,
          color: connectionInfo.color
        }}>
          {connectionInfo.text}
        </div>
        
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Welcome</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Experience cinema with friends, privately.</p>
        
        <button 
          onClick={createRoom} 
          className="royal-button" 
          style={{ 
            width: '100%', 
            marginBottom: '20px', 
            fontSize: '1.1rem',
            opacity: connectionStatus === 'connected' ? 1 : 0.7,
            cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed'
          }}
          disabled={connectionStatus !== 'connected'}
        >
          Create New Room
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--border-color)' }}>
          <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
          <span style={{ margin: '0 15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OR JOIN EXISTING</span>
          <div style={{ flex: 1, height: '1px', background: 'currentColor' }}></div>
        </div>

        <form onSubmit={joinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            className="royal-input"
            placeholder="Enter Room Code"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
          />
          <button 
            type="submit" 
            className="royal-button" 
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--accent-color)', 
              color: 'var(--accent-color)',
              opacity: connectionStatus === 'connected' ? 1 : 0.7,
              cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed'
            }}
            disabled={connectionStatus !== 'connected'}
          >
            Join Room
          </button>
        </form>
        
        {connectionStatus !== 'connected' && (
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #666',
              color: '#666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Refresh Connection
          </button>
        )}
      </div>
    </div>
  );
}
