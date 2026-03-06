import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, LogOut, MessageSquare, Check, ChevronRight, Users } from 'lucide-react';
import socket from '../socket';
import VideoPlayer from '../components/VideoPlayer_v3';
import Chat from '../components/Chat';
import MembersList from '../components/MembersList';
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
function RoomHeader({ roomId, username, chatOpen, activeTab, onTogglePanel, onCopyCode, onLeave, copied, userCount }) {
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

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Username — only on large mobile/desktop */}
      <span className="hidden sm:flex items-center gap-2 text-xs text-text-muted flex-shrink-0 mr-2">
        <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
        <span className="max-w-[80px] truncate text-text-secondary font-medium">{username}</span>
      </span>

      {/* Members toggle */}
      <button
        onClick={() => onTogglePanel('members')}
        aria-label="View members"
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold
                    border transition-all duration-200 min-h-[32px] sm:min-h-[36px] flex-shrink-0
                    focus:outline-none focus:ring-2 focus:ring-red-brand/50
                    ${chatOpen && activeTab === 'members'
            ? 'bg-red-brand border-red-brand text-white shadow-[0_0_12px_rgba(229,9,20,0.3)]'
            : 'bg-bg-card border-border hover:border-border-bright text-text-muted hover:text-white'
          }`}
      >
        <Users size={13} aria-hidden="true" />
        <span className="hidden sm:inline">Members</span>
        {userCount > 0 && (
          <span className="bg-red-brand/10 text-red-brand px-1 rounded text-[10px] ml-0.5">{userCount}</span>
        )}
      </button>

      {/* Chat toggle */}
      <button
        onClick={() => onTogglePanel('chat')}
        aria-label={chatOpen ? 'Collapse chat' : 'Open chat'}
        aria-pressed={chatOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold
                    border transition-all duration-200 min-h-[32px] sm:min-h-[36px] flex-shrink-0
                    focus:outline-none focus:ring-2 focus:ring-red-brand/50
                    ${chatOpen && activeTab === 'chat'
            ? 'bg-red-brand border-red-brand text-white shadow-[0_0_12px_rgba(229,9,20,0.3)]'
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
function ChatPanel({ roomId, username, onClose, activeTab, onTabChange, userList, streamerId, onKick }) {
  return (
    <>
      {/* ── Desktop side panel (md+) ── */}
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 'clamp(300px, 340px, 35vw)', opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-shrink-0 border-l border-border overflow-hidden"
        aria-label="Live interaction panel"
      >
        <div className="flex flex-col h-full w-[340px] bg-bg-modal">
          {/* Tabs header */}
          <div className="flex items-center bg-bg-base/50 p-1 border-b border-border">
            <button
              onClick={() => onTabChange('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all
                          ${activeTab === 'chat'
                  ? 'bg-bg-surface text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'}`}
            >
              <MessageSquare size={14} />
              Chat
            </button>
            <button
              onClick={() => onTabChange('members')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all
                          ${activeTab === 'members'
                  ? 'bg-bg-surface text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'}`}
            >
              <Users size={14} />
              Members
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'members' ? 'bg-red-brand text-white' : 'bg-bg-surface text-text-dim'}`}>
                {userList.length}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-dim hover:text-white transition-colors"
              title="Close panel"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <Chat roomId={roomId} username={username} />
            ) : (
              <MembersList users={userList} streamerId={streamerId} currentUserId={socket.id} onKick={onKick} />
            )}
          </div>
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
        style={{ maxHeight: '85vh' }}
        role="dialog"
        aria-modal="true"
        aria-label="Live interaction"
      >
        {/* Mobile sheet drag handle */}
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="flex flex-col items-center pt-3 pb-2 gap-1.5 focus:outline-none"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full" aria-hidden="true" />
        </button>

        <div className="flex items-center justify-between px-4 pb-2 border-b border-border/50">
          <div className="flex bg-bg-surface/50 p-1 rounded-xl w-full max-w-[240px]">
            <button
              onClick={() => onTabChange('chat')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-bg-surface text-white' : 'text-text-muted'}`}
            >
              Chat
            </button>
            <button
              onClick={() => onTabChange('members')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'members' ? 'bg-bg-surface text-white' : 'text-text-muted'}`}
            >
              Members ({userList.length})
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden" style={{ height: '60vh' }}>
          {activeTab === 'chat' ? (
            <Chat roomId={roomId} username={username} />
          ) : (
            <MembersList users={userList} streamerId={streamerId} currentUserId={socket.id} onKick={onKick} />
          )}
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
  const [activeTab, setActiveTab] = useState('chat');
  const [userList, setUserList] = useState([]);
  const [streamerId, setStreamerId] = useState(null);
  const [copied, setCopied] = useState(false);

  const cleanRoomId = roomId?.trim().toUpperCase() ?? '';

  // ── Room Events ──
  useEffect(() => {
    if (!ready || !cleanRoomId) return;

    const handleUserList = (list) => setUserList(list);
    const handleStreamStatus = ({ streamerId: id }) => setStreamerId(id);
    const handleStreamStarted = ({ streamerId: id }) => setStreamerId(id);
    const handleStreamStopped = () => setStreamerId(null);

    socket.on('user-list', handleUserList);
    socket.on('stream-status', handleStreamStatus);
    socket.on('stream-started', handleStreamStarted);
    socket.on('stream-stopped', handleStreamStopped);

    return () => {
      socket.off('user-list', handleUserList);
      socket.off('stream-status', handleStreamStatus);
      socket.off('stream-started', handleStreamStarted);
      socket.off('stream-stopped', handleStreamStopped);
    };
  }, [ready, cleanRoomId]);

  // ── Global Security: Kicked Event ──
  useEffect(() => {
    const onKicked = ({ reason }) => {
      alert(reason || "You have been removed from the room.");
      // Force immediate exit
      setReady(false);
      navigate('/', { replace: true });
      window.location.reload(); // Hard refresh to clear any socket state/room joining
    };

    socket.on('kicked', onKicked);
    return () => {
      socket.off('kicked', onKicked);
    };
  }, [navigate]);

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

  const handleKick = useCallback((targetId, targetName) => {
    if (window.confirm(`Are you sure you want to remove ${targetName} from the room?`)) {
      socket.emit('kick-user', { roomId: cleanRoomId, targetId });
    }
  }, [cleanRoomId]);

  const togglePanel = useCallback((tab) => {
    if (chatOpen && activeTab === tab) {
      setChatOpen(false);
    } else {
      setChatOpen(true);
      setActiveTab(tab);
    }
  }, [chatOpen, activeTab]);

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
        activeTab={activeTab}
        onTogglePanel={togglePanel}
        onCopyCode={copyCode}
        onLeave={handleLeave}
        copied={copied}
        userCount={userList.length}
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
              onClose={() => setChatOpen(false)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userList={userList}
              streamerId={streamerId}
              onKick={handleKick}
            />
          )}
        </AnimatePresence>

        {/* Collapsed chat restore button (desktop only) */}
        {!chatOpen && (
          <ChatRestoreButton onClick={() => togglePanel(activeTab)} />
        )}
      </div>
    </div>
  );
}
