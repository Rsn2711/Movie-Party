import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Wifi, WifiOff } from 'lucide-react';
import Home from './pages/Home';
import Room from './pages/room';
import socket from './socket';
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
   Connection Status Pill
──────────────────────────────────────────────────────────────── */
function ConnectionStatus({ connected }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                  border transition-all duration-300
                  ${connected
          ? 'bg-green-500/10 border-green-500/20 text-green-400'
          : 'bg-red-brand/10 border-red-brand/20 text-red-brand'
        }`}
      role="status"
      aria-label={connected ? 'Connected to server' : 'Disconnected from server'}
    >
      {connected ? (
        <Wifi size={12} aria-hidden="true" />
      ) : (
        <WifiOff size={12} aria-hidden="true" />
      )}
      {/* Always show text label on sm+ */}
      <span className="hidden sm:inline font-semibold">
        {connected ? 'Online' : 'Offline'}
      </span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-brand'}`}
        aria-hidden="true"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Mobile Menu
──────────────────────────────────────────────────────────────── */
function MobileMenu({ isOpen, onClose, connected }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-bg-modal border-l border-border
                       z-50 flex flex-col p-6 gap-6"
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <CineSyncLogo size="md" />
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06]
                           transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-brand/50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status */}
            <ConnectionStatus connected={connected} />

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* CineSync tag */}
            <p className="text-xs text-text-muted">
              Watch movies together, perfectly in sync.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────────────
   Navbar
──────────────────────────────────────────────────────────────── */
function Navbar({ connected }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll shadow effect — must come before any conditional returns
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      const original = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [menuOpen]);

  // Don't render navbar inside rooms (after all hooks)
  if (pathname.startsWith('/room/')) return null;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 h-16 flex items-center
                    transition-all duration-300
                    ${scrolled
            ? 'bg-bg-base/95 backdrop-blur-xl border-b border-border shadow-card'
            : 'bg-bg-base/80 backdrop-blur-md border-b border-transparent'
          }`}
        role="banner"
      >
        {/* ── Use full width (removed container-content) for true far-left/far-right align ── */}
        <div className="w-full flex items-center px-4 sm:px-6 lg:px-8">

          {/* Logo — Far Left */}
          <Link
            to="/"
            className="flex-shrink-0 focus:outline-none focus-visible:ring-2
                       focus-visible:ring-red-brand/50 rounded-lg"
            aria-label="CineSync — Go to home"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <CineSyncLogo size="md" />
            </motion.div>
          </Link>

          {/* Flexible spacer pushes everything else to the right */}
          <div className="flex-1" aria-hidden="true" />

          {/* Status + Actions — Far Right */}
          <div className="flex items-center gap-3">
            <ConnectionStatus connected={connected} />

            {/* Mobile Hamburger (hidden on sm+) */}
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="sm:hidden p-3 -mr-2 rounded-lg text-text-muted hover:text-white
                         hover:bg-white/[0.06] transition-all duration-200
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-brand/50"
            >
              <Menu size={20} />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={menuOpen}
        onClose={closeMenu}
        connected={connected}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   Root App
──────────────────────────────────────────────────────────────── */
export default function App() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-bg-base text-white">
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