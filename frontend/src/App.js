import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Room from './pages/room';
import { ToastProvider } from './components/ui/Toast';
import './App.css';
import './index.css';

/* ────────────────────────────────────────────────────────────────
   CineSync Logo — reusable wordmark
──────────────────────────────────────────────────────────────── */
export function CineSyncLogo({ size = 'md' }) {
  const sizes = {
    sm: { img: 'w-7 h-7', text: 'text-lg' },
    md: { img: 'w-9 h-9', text: 'text-xl' },
    lg: { img: 'w-11 h-11', text: 'text-2xl' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${s.img} flex-shrink-0`}
        style={{ filter: 'drop-shadow(0 0 8px rgba(229,9,20,0.35))' }}
      >
        <img
          src="/logo_transparent.png"
          alt="CineSync"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex items-baseline gap-0 leading-none">
        <span className={`text-white font-black ${s.text} tracking-tight transform -translate-y-[2.5px] inline-block`}>cine</span>
        <span className={`text-red-brand font-black ${s.text} tracking-tight transform translate-y-[2px] inline-block`}>sync</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Root App
──────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-bg-base text-white">
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