import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Play, MonitorPlay, Shield, Globe,
  ArrowRight, Users, Zap, Sparkles,
} from 'lucide-react';
import socket from '../socket';

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
   Hero Background Video — desktop only
──────────────────────────────────────────────────────────────── */
function HeroVideoBackground() {
  // Only mount the <video> on viewports where it's actually visible (lg+).
  // The element used to sit in the DOM at all sizes with `hidden` (display:none),
  // which still triggers the browser to download the full video on mobile/tablet.
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setShowVideo(mq.matches);
    const onChange = (e) => setShowVideo(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="hidden lg:block absolute inset-0 overflow-hidden" aria-hidden="true">
      {showVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/spiderman2-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/spiderman2-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Overlay — matches the reference .bg-video::after gradient exactly */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(101.47deg, #0A0C10 26.38%, rgba(10, 12, 16, 0.8) 50.07%, #0A0C10 73.17%)',
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Tilt Wrapper — 3D parallax tilt that follows the cursor
   Applied as an outer layer so it doesn't touch the child's own
   transform (position offsets etc. stay intact).
──────────────────────────────────────────────────────────────── */
function TiltWrapper({ children, className, maxTilt = 10, scale = 1.03 }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]);

  const springConfig = { stiffness: 180, damping: 18, mass: 0.4 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);
  const springScale = useSpring(1, springConfig);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseEnter = () => springScale.set(scale);

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    springScale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        perspective: 1200,
        rotateX: springRotateX,
        rotateY: springRotateY,
        scale: springScale,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  );
}

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
        {/* Create button — same skewed corner-reveal style as the reference's "Pre-order now" */}
        <motion.button
          type="button"
          onClick={onCreateRoom}
          disabled={!isConnected || creating}
          aria-label="Create a new watch party room"
          aria-busy={creating}
          whileHover={(!isConnected || creating) ? {} : { scale: 1.02 }}
          whileTap={(!isConnected || creating) ? {} : { scale: 0.97 }}
          className="hero-btn-solid text-sm font-semibold gap-2 w-full xs:w-auto flex-shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {creating ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          ) : (
            <Play size={14} fill="currentColor" aria-hidden="true" />
          )}
          {creating ? 'Creating…' : 'Create Room'}
        </motion.button>

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
          className="flex items-stretch gap-3 flex-1 min-w-0"
          aria-label="Join a room"
        >
          <div
            className="hero-input-skew relative flex items-center flex-1 min-w-0 bg-bg-surface border border-border
                       hover:border-border-bright focus-within:border-red-brand/40
                       overflow-hidden transition-all duration-250"
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
          </div>

          {/* Join button — same outline fill-sweep style as the reference's "Watch the teaser" */}
          <button
            type="submit"
            disabled={!isConnected || !roomCode.trim()}
            aria-label="Join room"
            className="hero-btn-outline text-sm font-semibold gap-1.5 flex-shrink-0
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <span>Join</span> <ArrowRight size={13} aria-hidden="true" />
          </button>
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
    <section className="py-10 sm:py-14 border-t border-border bg-bg-deep" aria-labelledby="how-heading">
      <div className="container-content">
        <div className="text-center mb-8 sm:mb-10">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-8 sm:gap-6">
          {HOW_STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left"
            >
              {/* Connector line — only meaningful in the single-row sm+ layout */}
              {i < HOW_STEPS.length - 1 && (
                <div
                  className="hidden sm:block absolute top-4 sm:top-6 left-[calc(50%+16px)] sm:left-[calc(50%+24px)] right-[-50%]
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
                <h3 className="text-white font-bold text-[11px] sm:text-sm mb-0.5 sm:mb-1 whitespace-normal">
                  {s.title}
                </h3>
                <p className="block text-text-muted text-[10px] sm:text-[13px] leading-tight sm:leading-relaxed">
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
    <div className="min-h-dvh bg-bg-base flex flex-col">

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex items-end pt-16 sm:pt-16 pb-8 sm:pb-16 min-h-[100dvh]"
        aria-label="Hero section"
      >
        <HeroVideoBackground />
        <AmbientBackground />
        <Particles />

        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">

            {/* ── RIGHT: Laptop Showcase (hidden on mobile to save space) ── */}
            <motion.div
              variants={rightVariants}
              initial="hidden"
              animate="visible"
              className="w-full order-2 lg:order-2 hidden sm:block relative"
            >
              <TiltWrapper className="block w-full">
                <img
                  src="/spider-man.webp"
                  alt="Watch party scene"
                  loading="eager"
                  decoding="async"
                  className="block w-[110%] lg:w-[145%] xl:w-[160%] max-w-none h-auto object-contain lg:-translate-x-32 lg:-translate-y-8 xl:-translate-x-44 xl:-translate-y-10"
                />
              </TiltWrapper>
            </motion.div>

            {/* ── LEFT: Text + CTA ── */}
            <motion.div
              variants={leftVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center sm:items-start gap-5 sm:gap-6 order-1 lg:order-1 lg:-mt-[50px] xl:-mt-50"
            >

              {/* Headline */}
              <h1 className="w-full flex justify-center sm:justify-start">
                <img
                  src="/watchtogether.webp"
                  alt="Watch Together, In Sync"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  className="w-full max-w-[580px] xs:max-w-[660px] sm:max-w-[820px] lg:max-w-[820px] xl:max-w-[800px] h-auto"
                  style={{ filter: 'drop-shadow(0 4px 40px rgba(0,0,0,0.6))' }}
                />
              </h1>

              {/* Description */}
              <p className="w-full max-w-[700px] text-text-muted text-sm leading-relaxed text-center sm:text-left">
                Watch movies and shows together in real time, no matter the distance.
                Create a room, invite friends, and enjoy synced playback with live chat.
              </p>


              {/* Scene image — mobile only, shown above buttons */}
              <motion.div
                variants={leftVariants}
                initial="hidden"
                animate="visible"
                className="block sm:hidden w-[130%] max-w-none origin-center -mx-[15%] -my-4 relative pointer-events-none"
              >
                <img
                  src="/spider-man.webp"
                  alt="Watch party scene"
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto object-contain"
                />
              </motion.div>

              {/* CTA Group */}
              <motion.div
                variants={ctaVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-[360px] sm:w-full sm:max-w-none min-w-[210px]"
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
        className="py-10 sm:py-14 border-t border-border"
        aria-labelledby="features-heading"
      >
        <div className="container-content">
          {/* Section header */}
          <div className="text-center mb-6 sm:mb-8">
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
