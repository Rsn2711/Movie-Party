import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Room from './pages/room';
import socket from './socket';
import { ToastProvider } from './components/ui/Toast';
import './App.css';
import './index.css';

const ElectricZap = ({ delay = 0, d = "M 10,20 L 25,10 L 40,25 L 60,15 L 80,30 L 105,20" }) => {
  return (
    <motion.svg
      className="absolute top-1/2 -translate-y-1/2 left-8 pointer-events-none overflow-visible"
      width="120"
      height="40"
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

function Navbar({ connected }) {
  const { pathname } = useLocation();
  if (pathname.startsWith('/room/')) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all duration-300">
      <div className="w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group relative">
          {/* Electric zaps arcing from logo to text */}
          <ElectricZap delay={0.2} d="M 10,20 L 25,10 L 40,25 L 60,15 L 80,30 L 105,20" />
          <ElectricZap delay={1.1} d="M 12,15 L 30,25 L 50,10 L 75,28 L 95,15" />
          <ElectricZap delay={2.3} d="M 15,25 L 35,35 L 55,20 L 85,32 L 100,25" />

          {/* Custom logo image — dark bg removed via blend mode */}
          <div className="w-11 h-11 relative z-10 flex-shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ filter: 'drop-shadow(0 0 8px rgba(229,9,20,0.4))' }}>
            <img
              src="/logo_transparent.png"
              alt="CineSync Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Two-tone wordmark */}
          <div className="flex items-center gap-0 relative z-10">
            <span className="text-white font-black text-2xl tracking-tight -translate-y-1 inline-block">cine</span>
            <span className="text-red-brand font-black text-2xl tracking-tight translate-y-1 inline-block">sync</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold transition-colors hover:bg-white/8 group">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-red-brand'}`} />
            <span className="text-white/70 group-hover:text-white transition-colors">{connected ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => { socket.off('connect', on); socket.off('disconnect', off); };
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Navbar connected={connected} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
          </Routes>
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}