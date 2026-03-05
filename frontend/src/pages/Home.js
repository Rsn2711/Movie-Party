import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, MonitorPlay, Shield, Globe,
  ArrowRight, Users, Zap, Sparkles,
} from 'lucide-react';
import socket from '../socket';
import Button from '../components/ui/Button';
import LaptopShowcase from '../components/ui/LaptopShowcase';

/* ────────────────────────────────────────────────────────────────
   Static Data
──────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Zap size={18} />,
    title: 'Frame-Perfect Sync',
    desc: 'RTT-compensated playback keeps everyone on the same frame, no matter where you are.',
  },
  {
    icon: <MonitorPlay size={18} />,
    title: 'Any Source',
    desc: 'Upload a local video file or share your screen in one click.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Private Rooms',
    desc: 'Unique invite codes. Only invited guests can enter.',
  },
  {
    icon: <Globe size={18} />,
    title: 'Live Chat',
    desc: 'Real-time reactions and conversations as scenes unfold.',
  },
];

const QUOTES = [
  'Friendship feels closer in sync.',
  'Late night calls. Early morning memories.',
  "We don't just watch movies. We create moments.",
  'Miles apart, but frame by frame together.',
  'The best scenes are the ones we react to together.',
];

/* ────────────────────────────────────────────────────────────────
   Ambient Background — layered glows (pure CSS, no intervals)
──────────────────────────────────────────────────────────────── */
function AmbientBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Large primary nebula — top left */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 900, height: 900,
          top: '-25%', left: '-20%',
          background: 'radial-gradient(circle at 40% 40%, rgba(229,9,20,0.09) 0%, rgba(180,0,10,0.04) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.06, 0.97, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Secondary nebula — bottom right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700, height: 700,
          bottom: '-18%', right: '-18%',
          background: 'radial-gradient(circle at 60% 60%, rgba(229,9,20,0.07) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }}
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.93, 1.07, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Accent orb — center */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 350, height: 350,
          top: '35%', left: '55%',
          background: 'radial-gradient(circle, rgba(229,9,20,0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{ x: [0, 35, -35, 0], y: [0, -45, 45, 0], scale: [1, 1.2, 0.85, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      {/* Top radial vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 180% 100% at 50% 0%, transparent 55%, rgba(8,8,8,0.65) 100%)' }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Floating Particles
──────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────
   Floating Brand Logos
   Animated icons for YouTube, Netflix, Prime, etc.
──────────────────────────────────────────────────────────────── */
const BRANDS = [
  /* Perfect circular distribution */
  { id: 'hs', name: 'Hotstar', color: '#01147C', dur: 12, delay: 0 },
  { id: 'yt', name: 'YouTube', color: '#FF0000', dur: 14, delay: 2 },
  { id: 'nf', name: 'Netflix', color: '#E50914', dur: 16, delay: 4 },
  { id: 'dis', name: 'Disney+', color: '#0063E5', dur: 15, delay: 1 },
  { id: 'max', name: 'HBO Max', color: '#991BFA', dur: 17, delay: 3 },
  { id: 'ap', name: 'Prime', color: '#00A8E1', dur: 13, delay: 5 },
  { id: 'atv', name: 'AppleTV', color: '#555555', dur: 18, delay: 7 },
  { id: 'hu', name: 'Hulu', color: '#3DBB3D', dur: 14, delay: 0.5 },
  { id: 'z5', name: 'Zee5', color: '#8224E3', dur: 16, delay: 2.5 },
  { id: 'nf2', name: 'Netflix2', color: '#E50914', dur: 15, delay: 4.5 },
  { id: 'yt2', name: 'YouTube2', color: '#FF0000', dur: 17, delay: 1.5 },
  { id: 'sho', name: 'Showtime', color: '#FF0000', dur: 13, delay: 3.5 },
];

function BrandIcon({ id, color }) {
  const commonIconClass = "w-full h-full flex items-center justify-center font-black text-white italic tracking-tighter";

  if (id.startsWith('yt')) return (
    <svg viewBox="0 0 24 24" fill={color} className="w-full h-full"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z" /></svg>
  );
  if (id.startsWith('nf')) return (
    <div className={commonIconClass} style={{ fontSize: 22, textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>N</div>
  );
  if (id === 'ap') return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div style={{ color }} className="font-black italic text-[10px] leading-none mb-[-2px]">prime</div>
      <svg viewBox="0 0 24 6" fill={color} className="w-4"><path d="M0 2.5c4 3 10 3 14 0" fill="none" stroke={color} strokeWidth="2" /><path d="M12 1l2 1.5-2 1.5" /></svg>
    </div>
  );
  if (id === 'z5') return (
    <div className="w-full h-full rounded-full flex items-center justify-center font-black text-white text-[11px]" style={{ background: 'linear-gradient(45deg, #8224E3, #FF0080)' }}>Z5</div>
  );
  if (id === 'hs') return (
    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color, borderRadius: 4 }}>★ HS</div>
  );
  if (id === 'dis') return (
    <div className="w-full h-full flex items-center justify-center text-[9px] font-black italic tracking-tighter text-white" style={{ background: 'linear-gradient(135deg, #002d72, #0063E5)', borderRadius: 4 }}>Disney+</div>
  );
  if (id === 'max') return (
    <div className="w-full h-full flex items-center justify-center text-[22px] font-black text-white" style={{ color: '#fff', textShadow: '0 0 12px rgba(153,27,250,0.8)' }}>M</div>
  );
  if (id === 'atv') return (
    <div className="w-full h-full flex items-center justify-center text-[18px] text-white"></div>
  );
  if (id === 'hu') return (
    <div className="w-full h-full flex items-center justify-center text-[13px] font-black text-white italic" style={{ color: '#3DBB3D' }}>hulu</div>
  );
  if (id === 'sho') return (
    <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white bg-red-600 rounded-sm">SHOWTIME</div>
  );
  return null;
}

function FloatingLogos() {
  const radius = 260; // Perfect circle radius
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    >
      {BRANDS.map((b, i) => {
        const angle = (i * 360 / BRANDS.length - 90) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={`${b.id}-${i}`}
            className="absolute w-12 h-12 sm:w-16 sm:h-16"
            style={{
              x, y,
              left: 'calc(50% - 24px)', // Half width mobile
              top: 'calc(50% - 24px)',  // Half height mobile
            }}
            animate={{
              y: [y - 12, y + 12, y - 12],
              // Counter-rotate the icon itself so it stays upright while its container rotates
              rotate: [-0, -360],
              scale: [1, 1.05, 0.95, 1],
            }}
            transition={{
              y: { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay },
              rotate: { duration: 60, repeat: Infinity, ease: "linear" },
              scale: { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }
            }}
          >
            {/* sm: variant for responsive half-size */}
            <style>{`
              @media (min-width: 640px) {
                .brand-node-${i} {
                  left: calc(50% - 32px) !important;
                  top: calc(50% - 32px) !important;
                }
              }
            `}</style>

            <div className={`brand-node-${i} relative w-full h-full p-[1px] rounded-2xl overflow-hidden group`}>
              {/* animated border gradient */}
              <div
                className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `conic-gradient(from 0deg, transparent 60%, ${b.color} 100%)` }}
              />

              <div className="relative w-full h-full bg-[#111]/80 backdrop-blur-2xl rounded-[inherit] border border-white/10 flex items-center justify-center p-2.5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                {/* Subtle inner reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                <BrandIcon id={b.id} color={b.color} />
              </div>
            </div>

            {/* Premium Ambient Glow */}
            <div
              className="absolute inset-0 blur-[30px] opacity-10 rounded-full scale-150 transition-transform duration-500 group-hover:scale-[2] group-hover:opacity-20"
              style={{ background: b.color }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

const PARTICLES = [
  { size: 3, x: '12%', delay: 0, dur: 14, opacity: 0.4 },
  { size: 2, x: '28%', delay: 2, dur: 18, opacity: 0.3 },
  { size: 4, x: '45%', delay: 4, dur: 16, opacity: 0.5 },
  { size: 2, x: '60%', delay: 1, dur: 20, opacity: 0.3 },
  { size: 3, x: '75%', delay: 5, dur: 13, opacity: 0.4 },
  { size: 2, x: '88%', delay: 3, dur: 17, opacity: 0.3 },
];

function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: '95%',
            background: `rgba(229,9,20,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px rgba(229,9,20,0.4)`,
          }}
          animate={{ y: [0, -(320 + i * 20)], opacity: [0, p.opacity * 1.8, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: 'easeIn', delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Typewriter Quote
──────────────────────────────────────────────────────────────── */
function TypewriterQuote() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const full = QUOTES[quoteIdx];
    let timeout;
    if (!isErasing) {
      if (displayed.length < full.length) {
        timeout = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 45);
      } else {
        timeout = setTimeout(() => setIsErasing(true), 2400);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22);
      } else {
        setIsErasing(false);
        setQuoteIdx(i => (i + 1) % QUOTES.length);
      }
    }
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, isErasing, quoteIdx]);

  return (
    <div className="h-9 sm:h-10 flex items-center justify-center sm:justify-start" aria-live="polite" aria-label="Rotating quote">
      <p
        className="text-white/75 text-xl sm:text-2xl leading-tight text-center sm:text-left"
        style={{
          fontFamily: '"Great Vibes", cursive',
          letterSpacing: '0.03em',
          textShadow: '0 0 20px rgba(255,255,255,0.05)',
        }}
        aria-hidden="true"
      >
        {displayed}
        <motion.span
          className="inline-block w-px h-5 bg-red-brand ml-0.5 align-middle"
          style={{ borderRadius: 1 }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        />
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Connection Status Pill (hero section)
──────────────────────────────────────────────────────────────── */
function HeroStatusPill({ status }) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const label = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Offline';
  const dotClass = isConnected
    ? 'bg-green-400'
    : isConnecting
      ? 'bg-amber-400 animate-pulse'
      : 'bg-red-brand';

  return (
    <div
      className="flex items-center justify-center sm:justify-start gap-2 text-xs text-text-muted"
      role="status"
      aria-label={`Server status: ${label}`}
    >
      <div className="relative flex items-center justify-center">
        {isConnected && (
          <span className="absolute w-2 h-2 rounded-full bg-green-500/40 animate-ping" aria-hidden="true" />
        )}
        <span className={`relative w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CTA — Create & Join
──────────────────────────────────────────────────────────────── */
function CTAGroup({ creating, isConnected, status, onCreateRoom, roomCode, setRoomCode, onJoinRoom }) {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Inline Create + Join row */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
        {/* Create button */}
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateRoom}
          disabled={!isConnected || creating}
          loading={creating}
          icon={!creating ? <Play size={14} fill="currentColor" aria-hidden="true" /> : undefined}
          className="flex-shrink-0 text-sm font-semibold w-full xs:w-auto"
          aria-label="Create a new watch party room"
        >
          {creating ? 'Creating…' : 'Create Room'}
        </Button>

        {/* OR divider */}
        <span
          className="text-[10px] text-text-dim font-bold uppercase tracking-widest text-center flex-shrink-0"
          aria-hidden="true"
        >
          or
        </span>

        {/* Join inline form */}
        <form
          onSubmit={onJoinRoom}
          className="relative flex-1 min-w-0 group"
          aria-label="Join a room"
        >
          {/* Focus glow */}
          <div
            className="absolute inset-0 bg-red-brand/[0.06] blur-lg opacity-0
                       group-focus-within:opacity-100 transition-opacity duration-300 rounded-lg"
            aria-hidden="true"
          />

          <div
            className="relative flex items-center bg-bg-surface border border-border
                       group-hover:border-border-bright group-focus-within:border-red-brand/40
                       rounded-lg overflow-hidden transition-all duration-250"
          >
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={10}
              aria-label="Enter room code"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm
                         placeholder-text-dim focus:outline-none
                         tracking-[0.14em] font-semibold uppercase min-w-0"
            />
            <button
              type="submit"
              disabled={!isConnected || !roomCode.trim()}
              aria-label="Join room"
              className={`px-4 py-2.5 border-l border-border text-sm font-semibold
                          flex-shrink-0 flex items-center gap-1.5
                          transition-all duration-200
                          ${roomCode.trim()
                  ? 'bg-red-brand text-white border-red-brand'
                  : 'bg-white/90 hover:bg-white text-black border-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Join <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      {/* Connection status */}
      <HeroStatusPill status={status} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Feature Card
──────────────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-bg-card border border-border hover:border-border-bright
                 rounded-xl p-3 sm:p-4 group
                 transition-all duration-250 hover:shadow-card-hover
                 focus-within:border-red-brand/30"
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-lg bg-red-muted border border-red-brand/15
                   flex items-center justify-center mb-2.5
                   text-red-brand group-hover:bg-red-brand/[0.15] group-hover:border-red-brand/30
                   transition-all duration-250"
        aria-hidden="true"
      >
        <span className="scale-[0.8]">{icon}</span>
      </div>

      <h3 className="text-white font-bold text-[11.5px] mb-1 tracking-tight">{title}</h3>
      <p className="text-text-muted text-[11px] leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Action Cards (Create / Join)
──────────────────────────────────────────────────────────────── */
function CreateRoomCard({ creating, isConnected, onCreateRoom }) {
  return (
    <motion.div
      whileHover={{ scale: 1.018, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onClick={isConnected ? onCreateRoom : undefined}
      role="button"
      tabIndex={0}
      aria-label="Create a new watch party room"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onCreateRoom(); }}
      className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 cursor-pointer group
                  transition-all duration-250 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-red-brand/60
                  ${isConnected
          ? 'border-red-brand/20 bg-gradient-to-br from-red-brand/[0.12] via-red-brand/[0.05] to-transparent hover:border-red-brand/40'
          : 'border-border bg-bg-card opacity-60 cursor-not-allowed'
        }`}
      style={{ boxShadow: '0 0 32px rgba(229,9,20,0.05)' }}
    >
      {/* Hover overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-red-brand/[0.08] to-transparent
                   opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div
          className="w-7 h-7 rounded-lg bg-red-muted border border-red-brand/20
                     flex items-center justify-center mb-2.5
                     group-hover:bg-red-brand/[0.18] group-hover:border-red-brand/40
                     transition-all duration-250"
          aria-hidden="true"
        >
          {creating ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E50914" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          ) : (
            <Play size={14} fill="currentColor" className="text-red-brand" aria-hidden="true" />
          )}
        </div>

        <h3 className="text-white font-black text-sm mb-1 tracking-tight">
          Create a Room
        </h3>
        <p className="text-text-muted text-[11.5px] mb-2.5 leading-relaxed">
          Start a watch party instantly. Share your code with friends.
        </p>

        <div className="inline-flex items-center gap-2 text-red-brand text-[11.5px] font-bold">
          {creating ? 'Creating…' : 'Start now'}
          <ArrowRight
            size={12}
            className="group-hover:translate-x-1 transition-transform duration-200"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.div>
  );
}

function JoinRoomCard({ roomCode, setRoomCode, isConnected, onJoinRoom }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border
                 bg-bg-card p-3 sm:p-4 group
                 hover:border-border-bright transition-all duration-250
                 focus-within:border-red-brand/30"
    >
      {/* Focus glow */}
      <div
        className="absolute inset-0 bg-red-brand/[0.04] opacity-0
                   group-focus-within:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div
          className="w-7 h-7 rounded-lg bg-bg-surface border border-border
                     flex items-center justify-center mb-2.5"
          aria-hidden="true"
        >
          <Users size={14} className="text-text-secondary" aria-hidden="true" />
        </div>

        <h3 className="text-white font-black text-sm mb-1 tracking-tight">
          Join a Room
        </h3>
        <p className="text-text-muted text-[11.5px] mb-2.5 leading-relaxed">
          Have a code? Enter it and jump straight in.
        </p>

        <form onSubmit={onJoinRoom} aria-label="Join a room by code">
          <div
            className="flex items-center bg-bg-base border border-border
                       group-focus-within:border-red-brand/50 rounded-xl px-1
                       transition-all duration-250 py-0.5"
          >
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room code…"
              maxLength={10}
              aria-label="Room code"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent border-none px-2.5 py-2.5 text-white text-xs
                         placeholder-text-dim focus:outline-none
                         tracking-[0.18em] font-bold uppercase"
            />
            <button
              type="submit"
              disabled={!isConnected || !roomCode.trim()}
              className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg m-0.5
                         transition-all duration-200
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-brand/50
                         ${roomCode.trim()
                  ? 'bg-red-brand text-white hover:bg-red-hover'
                  : 'bg-white text-black hover:bg-white/90'}
                         disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   How It Works Section
──────────────────────────────────────────────────────────────── */
const HOW_STEPS = [
  { step: '01', title: 'Create a room', desc: 'Click "Create Room" to get a unique invite code.' },
  { step: '02', title: 'Share your code', desc: 'Send the room code to your friends wherever they are.' },
  { step: '03', title: 'Load your content', desc: 'Upload a local file or share your screen.' },
  { step: '04', title: 'Watch together', desc: 'Play, pause, and seek — everyone stays in sync.' },
];

function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 border-t border-border bg-bg-deep" aria-labelledby="how-heading">
      <div className="container-content">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         bg-red-muted border border-red-brand/15 text-red-brand
                         text-xs font-bold uppercase tracking-widest mb-4"
            >
              <Sparkles size={11} aria-hidden="true" />
              Simple Setup
            </span>
            <h2
              id="how-heading"
              className="text-2xl sm:text-3xl font-black text-white tracking-tight"
            >
              Up and running in seconds
            </h2>
            <p className="text-text-muted text-sm mt-2">
              No sign-up required. Just create, share, and watch.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-6">
          {HOW_STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left"
            >
              {/* Connector line (hidden on last) */}
              {i < HOW_STEPS.length - 1 && (
                <div
                  className="absolute top-4 sm:top-6 left-[calc(50%+16px)] sm:left-[calc(50%+24px)] right-[-50%]
                             h-px bg-gradient-to-r from-border to-transparent"
                  aria-hidden="true"
                />
              )}


              {/* Step number */}
              <div
                className="text-[10px] sm:text-xs font-black text-red-brand tracking-widest
                           bg-red-muted border border-red-brand/15 rounded-lg
                           w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center shrink-0"
                aria-label={`Step ${i + 1}`}
              >
                {s.step}
              </div>

              <div className="min-w-0">
                <h3 className="text-white font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1 truncate sm:whitespace-normal">
                  {s.title}
                </h3>
                <p className="hidden xs:block text-text-muted text-[9px] sm:text-[13px] leading-tight sm:leading-relaxed line-clamp-2 md:line-clamp-none">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Footer
──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border py-6 sm:py-8" role="contentinfo">
      <div className="container-content flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-text-dim text-xs">
          © {new Date().getFullYear()}{' '}
          <span className="text-red-brand font-bold">CineSync</span>
          . All rights reserved.
        </p>
        <p className="text-text-dim text-xs">
          Watch Together, In Sync.
        </p>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────
   Home Page
──────────────────────────────────────────────────────────────── */
export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('connecting');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  /* ── Socket status ── */
  useEffect(() => {
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onError = () => setStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    setStatus(socket.connected ? 'connected' : 'connecting');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, []);

  const isConnected = status === 'connected';

  const createRoom = useCallback(() => {
    if (!socket.connected) { setStatus('error'); return; }
    setCreating(true);
    socket.emit('create-room', (roomId) => navigate(`/room/${roomId}`));
  }, [navigate]);

  const joinRoom = useCallback((e) => {
    e.preventDefault();
    if (roomCode.trim()) navigate(`/room/${roomCode.trim()}`);
  }, [roomCode, navigate]);

  /* ── Hero section animation variants ── */
  const leftVariants = {
    hidden: { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
  };
  const rightVariants = {
    hidden: { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] } },
  };
  const ctaVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } },
  };

  return (
    <div className="min-h-dvh bg-bg-base flex flex-col overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex-1 flex items-center pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden min-h-screen"
        aria-label="Hero section"
      >
        <AmbientBackground />
        <Particles />

        <div className="container-content w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">

            {/* ── LEFT: Laptop Showcase (hidden on mobile to save space) ── */}
            <motion.div
              variants={leftVariants}
              initial="hidden"
              animate="visible"
              className="w-full order-2 lg:order-1 hidden sm:block relative"
            >
              <LaptopShowcase />
            </motion.div>

            {/* ── RIGHT: Text + CTA ── */}
            <motion.div
              variants={rightVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center sm:items-start gap-5 sm:gap-6 order-1 lg:order-2"
            >

              {/* Headline */}
              <h1 className="text-4xl xs:text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[0.9] tracking-tight text-balance text-center sm:text-left">
                Watch Together.
                <br />
                <span className="text-red-brand">In Sync.</span>
              </h1>

              {/* Typewriter subtitle */}
              <div className="w-full flex justify-center sm:justify-start">
                <TypewriterQuote />
              </div>


              {/* Laptop — mobile only, shown above buttons */}
              <motion.div
                variants={leftVariants}
                initial="hidden"
                animate="visible"
                className="block sm:hidden w-full origin-center -my-10 relative"
                style={{ scale: 0.5 }}
              >
                <FloatingLogos />
                <LaptopShowcase />
              </motion.div>

              {/* CTA Group */}
              <motion.div
                variants={ctaVariants}
                initial="hidden"
                animate="visible"
                className="w-[65%] sm:w-full sm:max-w-none min-w-[210px]"
              >
                <CTAGroup
                  creating={creating}
                  isConnected={isConnected}
                  status={status}
                  onCreateRoom={createRoom}
                  roomCode={roomCode}
                  setRoomCode={setRoomCode}
                  onJoinRoom={joinRoom}
                />
              </motion.div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FEATURES + CARDS SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-16 sm:py-20 border-t border-border"
        aria-labelledby="features-heading"
      >
        <div className="container-content">
          {/* Section header */}
          <div className="text-center mb-10 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2
                id="features-heading"
                className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2"
              >
                Built for every watch party
              </h2>
              <p className="text-text-muted text-sm">
                Everything you need for a cinema-quality shared experience.
              </p>
            </motion.div>
          </div>

          {/* 3-column grid: Action Cards | Feature Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* ── Left col: Action Cards ── */}
            <div className="flex flex-col gap-4">
              <CreateRoomCard
                creating={creating}
                isConnected={isConnected}
                onCreateRoom={createRoom}
              />
              <JoinRoomCard
                roomCode={roomCode}
                setRoomCode={setRoomCode}
                isConnected={isConnected}
                onJoinRoom={joinRoom}
              />
            </div>

            {/* ── Right 2 cols: Feature Grid ── */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <FeatureCard key={i} index={i} {...f} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════════ */}
      <HowItWorks />

      {/* ═══════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}
