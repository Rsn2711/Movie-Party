import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import VideoPlayer from "../components/VideoPlayer_v3";
import Chat from "../components/Chat";

export default function Room() {
  const { roomId } = useParams();
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toUpperCase();

    const name = prompt("Enter your name") || `User_${Math.floor(Math.random() * 1000)}`;
    setUsername(name);
    setReady(true);

    console.log(`[ROOM] Joining: ${cleanRoomId} as ${name}`);
    socket.emit("join-room", { roomId: cleanRoomId, username: name });

    const handleUserJoined = ({ username: joinedName }) => {
      console.log(`[ROOM] Notification: ${joinedName} joined`);
    };

    socket.on("user-joined", handleUserJoined);

    return () => {
      socket.off("user-joined", handleUserJoined);
    };
  }, [roomId]);

  if (!ready) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Initializing Theater...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', padding: '0 10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Theater</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>You are watching as <span style={{ color: 'var(--accent-color)' }}>{username}</span></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Room Code</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{roomId?.toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <div className="royal-card" style={{ padding: '0', overflow: 'hidden' }}>
          <VideoPlayer roomId={roomId} username={username} />
        </div>
        <div className="royal-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <Chat roomId={roomId} username={username} />
        </div>
      </div>
    </div>
  );
}
