import React, { useState, useEffect } from "react";
import socket from "../socket";

export default function Chat({ roomId, username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`[CHAT] Joining room listener: ${cleanRoomId}`);
    
    const handleReceiveMessage = (data) => {
      console.log("[CHAT] Message received:", data);
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [roomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && roomId) {
      const cleanRoomId = roomId.trim().toUpperCase();
      console.log(`[CHAT] Emitting to ${cleanRoomId}: ${message}`);
      socket.emit("send-message", { 
        roomId: cleanRoomId, 
        message: message.trim(), 
        user: username 
      });
      setMessage("");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>Chat</h3>
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        marginBottom: "15px", 
        paddingRight: "5px",
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            fontSize: '0.9rem', 
            padding: '8px 12px', 
            background: msg.user === username ? 'rgba(197, 160, 89, 0.1)' : 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            borderLeft: msg.user === username ? '2px solid var(--accent-color)' : '2px solid transparent'
          }}>
            <strong style={{ color: msg.user === username ? 'var(--accent-color)' : 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
              {msg.user}
            </strong> 
            <span style={{ wordBreak: 'break-word' }}>{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..."
          className="royal-input"
          style={{ flex: 1, padding: '10px' }}
        />
        <button type="submit" className="royal-button" style={{ padding: '10px 15px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  );
}
