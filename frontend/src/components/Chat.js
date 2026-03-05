import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import socket from '../socket';
import Avatar from './ui/Avatar';

/* ────────────────────────────────────────────────────────────────
   Typing indicator
──────────────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-3 py-2 text-text-dim text-xs select-none"
      aria-live="polite"
      aria-label="Someone is typing"
    >
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-dim"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.14, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span>typing…</span>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Empty state
──────────────────────────────────────────────────────────────── */
function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6 py-8">
      <div
        className="w-12 h-12 rounded-xl bg-bg-surface border border-border
                   flex items-center justify-center"
        aria-hidden="true"
      >
        <MessageSquare size={20} className="text-text-dim" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-text-secondary text-sm font-semibold">No messages yet</p>
        <p className="text-text-muted text-xs">Start the conversation!</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Message bubble
──────────────────────────────────────────────────────────────── */
const messageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
};

function MessageBubble({ msg, isOwn }) {
  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar — show on other's messages */}
      {!isOwn && (
        <Avatar name={msg.user} size="sm" className="flex-shrink-0 mb-0.5" />
      )}

      <div className={`flex flex-col gap-0.5 max-w-[82%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        <span className="text-[10px] text-text-dim px-1 font-medium select-none">
          {isOwn ? 'You' : msg.user}
        </span>

        {/* Bubble */}
        <div
          className={`px-3 py-2 text-xs sm:text-sm leading-relaxed break-words rounded-2xl
                      ${isOwn
              ? 'bg-red-brand text-white rounded-br-sm'
              : 'bg-bg-surface border border-border text-white rounded-bl-sm'
            }`}
        >
          {msg.message}
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Chat Component
──────────────────────────────────────────────────────────────── */
export default function Chat({ roomId, username }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const endRef = useRef(null);
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  /* ── Socket listeners ── */
  useEffect(() => {
    if (!roomId) return;
    const clean = roomId.trim().toUpperCase();

    const onMsg = (data) => setMessages(p => [...p, data]);
    const onTyping = ({ user }) => { if (user !== username) setIsTyping(true); };
    const onStop = () => setIsTyping(false);

    socket.on('receive-message', onMsg);
    socket.on('user-typing', onTyping);
    socket.on('stop-typing', onStop);

    return () => {
      socket.off('receive-message', onMsg);
      socket.off('user-typing', onTyping);
      socket.off('stop-typing', onStop);
    };
  }, [roomId, username]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, autoScroll]);

  /* ── Detect if user has scrolled up (pause auto-scroll) ── */
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    setAutoScroll(isAtBottom);
  }, []);

  /* ── Send message ── */
  const send = useCallback((e) => {
    e.preventDefault();
    if (!message.trim() || !roomId) return;
    const clean = roomId.trim().toUpperCase();
    socket.emit('send-message', { roomId: clean, message: message.trim(), user: username });
    socket.emit('stop-typing', clean);
    setMessage('');
    setAutoScroll(true); // Scroll to new message after sending
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [message, roomId, username]);

  /* ── Typing indicator emit ── */
  const onType = useCallback((e) => {
    setMessage(e.target.value);
    if (!roomId) return;
    const clean = roomId.trim().toUpperCase();
    socket.emit('user-typing', { roomId: clean, user: username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('stop-typing', clean), 1500);
  }, [roomId, username]);

  /* ── Enter to send, Shift+Enter for newline ── */
  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  }, [send]);

  const hasMessages = messages.length > 0;

  return (
    <section
      className="flex flex-col h-full min-h-0 bg-bg-modal"
      aria-label="Live chat"
    >
      {/* Chat header */}
      <div
        className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3
                   border-b border-border flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-red-brand" aria-hidden="true" />
          <h2 className="text-white text-xs sm:text-sm font-semibold">Live Chat</h2>
        </div>

        {/* Live indicator */}
        <span
          className="flex items-center gap-1.5 text-[10px] sm:text-xs text-red-brand font-bold tracking-widest uppercase"
          aria-label="Live"
        >
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-brand animate-pulse-red" aria-hidden="true" />
          Live
        </span>
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0 overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        aria-relevant="additions"
      >
        {!hasMessages && <EmptyChat />}

        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              isOwn={msg.user === username}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={endRef} aria-hidden="true" />
      </div>

      {/* Scroll to bottom button — shows when user has scrolled up */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setAutoScroll(true);
              endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Scroll to latest messages"
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2
                       flex items-center gap-1.5 px-3 py-1.5
                       bg-red-brand text-white text-xs font-semibold rounded-full
                       shadow-red-sm hover:bg-red-hover transition-all duration-200
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{ position: 'relative' }}
          >
            ↓ New messages
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form
        onSubmit={send}
        className="flex items-end gap-2 px-2 py-2 sm:px-3 sm:py-3 border-t border-border flex-shrink-0"
        aria-label="Send a message"
      >
        <textarea
          ref={inputRef}
          value={message}
          onChange={onType}
          onKeyDown={onKeyDown}
          placeholder="Message…"
          rows={1}
          maxLength={500}
          aria-label="Chat message"
          className="flex-1 bg-bg-surface border border-border rounded-xl
                     px-3 py-2 text-xs sm:text-sm text-white placeholder-text-dim
                     focus:outline-none focus:border-red-brand focus:shadow-input-focus
                     hover:border-border-bright
                     transition-all duration-250 resize-none
                     min-h-[36px] sm:min-h-[40px] max-h-[100px] leading-snug"
          style={{ scrollbarWidth: 'none' }}
        />
        <motion.button
          type="submit"
          disabled={!message.trim()}
          aria-label="Send message"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.12 }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-brand hover:bg-red-hover
                     flex items-center justify-center text-white
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors duration-200 flex-shrink-0
                     focus:outline-none focus:ring-2 focus:ring-red-brand/50"
        >
          <Send size={14} aria-hidden="true" />
        </motion.button>
      </form>
    </section>
  );
}
