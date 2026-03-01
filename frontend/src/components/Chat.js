import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import socket from '../socket';
import Avatar from './ui/Avatar';

function TypingDots() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[#555] text-xs">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#555]"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span>typing…</span>
    </div>
  );
}

export default function Chat({ roomId, username }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);
  const typingTimer = useRef(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = (e) => {
    e.preventDefault();
    if (!message.trim() || !roomId) return;
    const clean = roomId.trim().toUpperCase();
    socket.emit('send-message', { roomId: clean, message: message.trim(), user: username });
    socket.emit('stop-typing', clean);
    setMessage('');
  };

  const onType = (e) => {
    setMessage(e.target.value);
    if (!roomId) return;
    const clean = roomId.trim().toUpperCase();
    socket.emit('user-typing', { roomId: clean, user: username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('stop-typing', clean), 1500);
  };

  const isOwn = (msg) => msg.user === username;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#141414]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a] flex-shrink-0">
        <MessageSquare size={14} className="text-red-brand" />
        <span className="text-white text-sm font-semibold">Live Chat</span>
        <span className="ml-auto w-2 h-2 rounded-full bg-red-brand animate-pulse-red" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <MessageSquare size={22} className="text-[#555]" />
            </div>
            <div>
              <p className="text-[#A3A3A3] text-sm font-medium">No messages yet</p>
              <p className="text-[#555] text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${isOwn(msg) ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar name={msg.user} size="sm" className={isOwn(msg) ? 'ml-1' : 'mr-1'} />
              <div className={`flex flex-col gap-0.5 max-w-[78%] ${isOwn(msg) ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-[#555] px-1">
                  {isOwn(msg) ? 'You' : msg.user}
                </span>
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-snug break-words ${isOwn(msg)
                      ? 'bg-red-brand text-white rounded-tr-sm'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-tl-sm'
                    }`}
                >
                  {msg.message}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && <TypingDots />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 px-3 py-3 border-t border-[#2a2a2a] flex-shrink-0"
      >
        <input
          type="text"
          value={message}
          onChange={onType}
          placeholder="Message…"
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-red-brand transition-colors"
        />
        <motion.button
          type="submit"
          disabled={!message.trim()}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 rounded-lg bg-red-brand hover:bg-red-hover flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send size={14} />
        </motion.button>
      </form>
    </div>
  );
}
