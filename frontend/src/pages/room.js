import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, LogOut, MessageSquare, Check, ChevronRight, Users } from 'lucide-react';
import socket from '../socket';
import VideoPlayer from '../components/VideoPlayer_v3';
import Chat from '../components/Chat';
import Button from '../components/ui/Button';
import { CineSyncLogo } from '../App';

/* ────────────────────────────────────────────────────────────────
   Join Theater Modal
   A focused, accessible modal that collects the viewer's name
──────────────────────────────────────────────────────────────── */
function JoinModal({ roomId, onJoin, onBack }) {
  const [nameInput, setNameInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = nameInput.trim() || `Viewer_${Math.floor(Math.random() * 9000 + 1000)}`;
    onJoin(name);
  };

  return (
    <div
      className="fixed inset-0 bg-bg-base flex items-center justify-center z-50 px-4"
      role="main"
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 700px 600px at 50% 40%, rgba(229,9,20,0.07) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-heading"
      >
        {/* Card */}
        <div className="bg-bg-modal border border-border rounded-2xl shadow-modal overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-red-brand" aria-hidden="true" />

          <div className="p-7 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3">
              {/* Room badge */}
              <div
                className="inline-flex items-center gap-2 bg-red-muted border border-red-brand/20
                           text-red-brand text-xs font-bold tracking-widest uppercase
                           px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-brand" aria-hidden="true" />
                Room {roomId}
              </div>

              <div>
                <h1
                  id="join-heading"
                  className="text-xl font-black text-white tracking-tight"
                >
                  Joining Theater
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  What should we call you?
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="viewer-name"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="viewer-name"
                  autoFocus
                  type="text"
                  placeholder="e.g. Alex, Movie Fan…"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={24}
                  autoComplete="nickname"
                  className="w-full bg-bg-surface border border-border rounded-lg
                             px-4 py-3 text-white text-sm placeholder-text-dim
                             focus:outline-none focus:border-red-brand focus:shadow-input-focus
                             hover:border-border-bright
                             transition-all duration-250 min-h-[44px]"
                />
                <p className="text-2xs text-text-dim mt-1.5">
                  Leave blank for a random name
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
              >
                Enter Theater
              </Button>

              <button
                type="button"
                onClick={onBack}
                className="text-text-muted text-sm hover:text-text-secondary
                           transition-colors duration-200 text-center
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
              >
                ← Back to Home
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Room Header Bar
──────────────────────────────────────────────────────────────── */
function RoomHeader({ roomId, username, chatOpen, onToggleChat, onCopyCode, onLeave, copied }) {
  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-12 sm:h-14
                 bg-bg-base border-b border-border flex-shrink-0 z-20"
      role="banner"
    >
      {/* Logo — clickable to go home */}
      <button
        onClick={onLeave}
        aria-label="Go to CineSync home"
        className="flex-shrink-0 focus:outline-none focus-visible:ring-2
                   focus-visible:ring-red-brand/50 rounded-lg p-1 -ml-1
                   transition-opacity hover:opacity-80"
      >
        <CineSyncLogo size="sm" />
      </button>

      {/* Room code pill — more compact on mobile */}
      <button
        onClick={onCopyCode}
        aria-label={`Copy room code ${roomId}. ${copied ? 'Copied!' : 'Click to copy'}`}
        className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-bg-card
                   border border-border hover:border-border-bright rounded-lg
                   transition-all duration-200 group min-h-[32px] sm:min-h-[36px] flex-shrink-0"
      >
        <span className="hidden xs:inline text-[9px] sm:text-2xs text-text-muted uppercase tracking-widest">Room</span>
        <span className="text-[10px] sm:text-xs font-black text-white tracking-widest">{roomId}</span>
        {copied ? (
          <Check size={10} className="text-green-400 flex-shrink-0" aria-hidden="true" />
        ) : (
          <Copy
            size={10}
            className="text-text-dim group-hover:text-text-secondary flex-shrink-0 transition-colors"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Username — only on large mobile/desktop */}
      <span className="hidden sm:flex items-center gap-2 text-xs text-text-muted flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
        <span className="max-w-[80px] truncate text-text-secondary font-medium">{username}</span>
      </span>

      {/* Chat toggle */}
      <button
        onClick={onToggleChat}
        aria-label={chatOpen ? 'Collapse chat' : 'Open chat'}
        aria-pressed={chatOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold
                    border transition-all duration-200 min-h-[32px] sm:min-h-[36px] flex-shrink-0
                    focus:outline-none focus:ring-2 focus:ring-red-brand/50
                    ${chatOpen
            ? 'bg-red-muted border-red-brand/25 text-red-brand'
            : 'bg-bg-card border-border hover:border-border-bright text-text-muted hover:text-white'
          }`}
      >
        <MessageSquare size={13} aria-hidden="true" />
        <span className="hidden md:inline">Chat</span>
      </button>

      {/* Leave */}
      <button
        onClick={onLeave}
        aria-label="Leave room and return to home"
        className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-red-muted hover:bg-red-brand/20
                   border border-red-brand/20 hover:border-red-brand/40 text-red-brand
                   text-xs font-semibold rounded-lg transition-all duration-200
                   min-h-[32px] sm:min-h-[36px] flex-shrink-0
                   focus:outline-none focus:ring-2 focus:ring-red-brand/50"
      >
        <LogOut size={13} aria-hidden="true" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────
   Collapsed Chat Restore Button (desktop sidebar)
──────────────────────────────────────────────────────────────── */
function ChatRestoreButton({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      aria-label="Open chat panel"
      className="hidden md:flex flex-col items-center justify-center w-10 gap-3
                 border-l border-border bg-bg-base hover:bg-bg-card
                 text-text-dim hover:text-text-secondary
                 transition-all duration-200
                 focus:outline-none focus-visible:ring-inset focus-visible:ring-2
                 focus-visible:ring-red-brand/40"
    >
      <ChevronRight size={14} aria-hidden="true" />
      <span
        className="text-[9px] font-bold tracking-[0.18em] uppercase select-none"
        style={{ writingMode: 'vertical-rl' }}
      >
        Chat
      </span>
    </motion.button>
  );
}

/* ────────────────────────────────────────────────────────────────
   Chat Panel
──────────────────────────────────────────────────────────────── */
function ChatPanel({ roomId, username, onClose }) {
  return (
    <>
      {/* ── Desktop side panel (md+) ── */}
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 'clamp(280px, 320px, 35vw)', opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-shrink-0 border-l border-border overflow-hidden"
        aria-label="Live chat"
      >
        <div className="flex flex-col h-full w-[320px]">
          {/* Panel close button */}
          <button
            onClick={onClose}
            aria-label="Collapse chat panel"
            className="flex items-center justify-between px-4 py-2.5
                       border-b border-border hover:bg-bg-card
                       transition-colors group focus:outline-none
                       focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-red-brand/30"
          >
            <div className="flex items-center gap-2">
              <Users size={12} className="text-text-dim" aria-hidden="true" />
              <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">
                Chat
              </span>
            </div>
            <ChevronRight
              size={13}
              className="text-text-dim rotate-180 group-hover:text-text-secondary transition-colors"
              aria-hidden="true"
            />
          </button>

          <Chat roomId={roomId} username={username} />
        </div>
      </motion.aside>

      {/* ── Mobile bottom-sheet overlay (< md) ── */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="md:hidden fixed inset-x-0 bottom-0 z-50
                   flex flex-col bg-bg-modal border-t border-border rounded-t-2xl
                   overflow-hidden"
        style={{ maxHeight: '75vh' }}
        role="dialog"
        aria-modal="true"
        aria-label="Live chat"
      >
        {/* Mobile sheet drag handle */}
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="flex flex-col items-center pt-3 pb-2 gap-1.5
                     focus:outline-none"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full" aria-hidden="true" />
        </button>

        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-sm font-semibold text-white">Live Chat</span>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06]
                       transition-all duration-200 focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <Chat roomId={roomId} username={username} />
        </div>
      </motion.div>

      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   Room Page
──────────────────────────────────────────────────────────────── */
export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [ready, setReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const cleanRoomId = roomId?.trim().toUpperCase() ?? '';

  // On mobile, chat starts closed to maximize video real estate
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) setChatOpen(false);
  }, []);

  const handleJoin = useCallback((name) => {
    setUsername(name);
    setReady(true);
    socket.emit('join-room', { roomId: cleanRoomId, username: name });
  }, [cleanRoomId]);

  // ── RECONNECTION LOGIC: Re-join room if socket reconnects while ready ──
  useEffect(() => {
    if (!ready || !username) return;

    const handleReconnect = () => {
      console.log("[Room] Socket reconnected — re-joining room automatically");
      socket.emit('join-room', { roomId: cleanRoomId, username });
    };

    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [ready, cleanRoomId, username]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(cleanRoomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cleanRoomId]);

  const handleLeave = useCallback(() => navigate('/'), [navigate]);
  const toggleChat = useCallback(() => setChatOpen(o => !o), []);

  /* ── Join screen ── */
  if (!ready) {
    return (
      <JoinModal
        roomId={cleanRoomId}
        onJoin={handleJoin}
        onBack={handleLeave}
      />
    );
  }

  /* ── Main Room UI ── */
  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-bg-base">
      {/* ── Top Bar ── */}
      <RoomHeader
        roomId={cleanRoomId}
        username={username}
        chatOpen={chatOpen}
        onToggleChat={toggleChat}
        onCopyCode={copyCode}
        onLeave={handleLeave}
        copied={copied}
      />

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <motion.div
          layout
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 min-w-0 overflow-hidden bg-black"
          aria-label="Video player"
        >
          <VideoPlayer roomId={roomId} username={username} />
        </motion.div>

        {/* Chat panel — conditionally shown */}
        <AnimatePresence>
          {chatOpen && (
            <ChatPanel
              roomId={roomId}
              username={username}
              onClose={toggleChat}
            />
          )}
        </AnimatePresence>

        {/* Collapsed chat restore button (desktop only) */}
        {!chatOpen && (
          <ChatRestoreButton onClick={toggleChat} />
        )}
      </div>
    </div>
  );
}
