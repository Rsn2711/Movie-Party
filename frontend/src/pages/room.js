import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, LogOut, ChevronRight, MessageSquare, Check } from 'lucide-react';
import socket from '../socket';
import VideoPlayer from '../components/VideoPlayer_v3';
import Chat from '../components/Chat';
import Loader from '../components/ui/Loader';
import Button from '../components/ui/Button';

const ElectricZap = ({ delay = 0, d = "M 10,20 L 25,10 L 40,25 L 60,15 L 80,30 L 105,20" }) => {
  return (
    <motion.svg
      className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none overflow-visible"
      width="100"
      height="30"
      viewBox="0 0 120 40"
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d={d}
        stroke="#E50914"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: [0, 1, 1],
            opacity: [0, 1, 0],
            transition: {
              duration: 0.4 + Math.random() * 0.4,
              repeat: Infinity,
              repeatDelay: 1.2 + Math.random() * 2.5,
              delay: delay,
              ease: "easeInOut"
            }
          }
        }}
        style={{ filter: 'drop-shadow(0 0 3px rgba(229,9,20,0.8)) blur(0.2px)' }}
      />
    </motion.svg>
  );
};

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [ready, setReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const cleanRoomId = roomId?.trim().toUpperCase();

  const handleJoin = (e) => {
    e?.preventDefault();
    const name = nameInput.trim() || `Viewer_${Math.floor(Math.random() * 9000 + 1000)}`;
    setUsername(name);
    setReady(true);
    socket.emit('join-room', { roomId: cleanRoomId, username: name });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(cleanRoomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center z-50 px-4">
        {/* Subtle red glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle 600px at 50% 40%, rgba(229,9,20,0.08) 0%, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 w-full max-w-sm shadow-[0_32px_80px_rgba(0,0,0,0.9)]"
        >
          {/* Red top bar accent */}
          <div className="absolute top-0 left-8 right-8 h-0.5 bg-red-brand rounded-full" />

          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-red-brand/10 border border-red-brand/30 text-red-brand text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-brand" />
              Room {cleanRoomId}
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Joining Theater</h2>
            <p className="text-[#737373] text-sm">What should we call you?</p>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Your name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              maxLength={24}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-4 py-3.5 text-white text-sm placeholder-[#555] focus:outline-none focus:border-red-brand transition-colors"
            />
            <Button variant="primary" size="lg" type="submit" className="w-full justify-center text-base">
              Enter Theater
            </Button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#555] text-xs hover:text-[#A3A3A3] transition-colors text-center"
            >
              ← Back to Home
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0A]">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-4 px-4 md:px-5 h-12 bg-[#0A0A0A] border-b border-[#1a1a1a] flex-shrink-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer h-full relative" onClick={() => navigate('/')}>
          <ElectricZap delay={0.2} d="M 10,20 L 25,10 L 40,25 L 60,15 L 80,30 L 105,20" />
          <ElectricZap delay={1.1} d="M 12,15 L 30,25 L 50,10 L 75,28 L 95,15" />

          <div className="w-8 h-8 relative z-10 flex-shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(229,9,20,0.3))' }}>
            <img
              src="/logo_transparent.png"
              alt="CineSync Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center gap-0 relative z-10">
            <span className="text-white font-black text-lg tracking-tight -translate-y-0.5 inline-block">cine</span>
            <span className="text-red-brand font-black text-lg tracking-tight translate-y-0.5 inline-block">sync</span>
          </div>
        </div>
        <div className="h-4 w-px bg-[#2a2a2a] hidden sm:block" />

        {/* Room code pill */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-md transition-all group"
        >
          <span className="text-xs text-[#737373]">Room</span>
          <span className="text-xs font-bold text-white tracking-widest">{cleanRoomId}</span>
          {copied
            ? <Check size={12} className="text-green-500 flex-shrink-0" />
            : <Copy size={12} className="text-[#555] group-hover:text-white flex-shrink-0 transition-colors" />
          }
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Viewer label */}
        <span className="hidden sm:block text-xs text-[#555]">
          <span className="text-[#A3A3A3]">{username}</span>
        </span>

        {/* Chat toggle (mobile) */}
        <button
          onClick={() => setChatOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] bg-[#141414] hover:bg-[#1a1a1a] rounded-md text-xs text-[#737373] hover:text-white transition-all md:hidden"
        >
          <MessageSquare size={13} />
          Chat
        </button>

        {/* Leave */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-brand/10 hover:bg-red-brand/20 border border-red-brand/30 hover:border-red-brand/50 text-red-brand text-xs font-semibold rounded-md transition-all"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </header>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <motion.div layout className="flex-1 min-w-0 overflow-hidden bg-black">
          <VideoPlayer roomId={roomId} username={username} />
        </motion.div>

        {/* Chat panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex-shrink-0 border-l border-[#1a1a1a] overflow-hidden"
            >
              <div className="flex flex-col h-full w-[320px]">
                {/* Desktop close handle */}
                <button
                  onClick={() => setChatOpen(false)}
                  className="hidden md:flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors group"
                >
                  <span className="text-xs text-[#555] group-hover:text-[#A3A3A3]">Collapse chat</span>
                  <ChevronRight size={13} className="text-[#555] rotate-180" />
                </button>
                <Chat roomId={roomId} username={username} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Collapsed chat button (desktop) */}
        {!chatOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setChatOpen(true)}
            className="hidden md:flex flex-col items-center justify-center w-9 border-l border-[#1a1a1a] bg-[#0A0A0A] hover:bg-[#141414] transition-colors text-[#555] hover:text-white gap-2"
          >
            <ChevronRight size={14} />
            <span className="text-[9px] tracking-wider" style={{ writingMode: 'vertical-rl' }}>CHAT</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
