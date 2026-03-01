import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, MonitorPlay, Shield, Globe, ArrowRight, Users } from 'lucide-react';
import socket from '../socket';
import Button from '../components/ui/Button';
import LaptopShowcase from '../components/ui/LaptopShowcase';

const features = [
  {
    icon: <Play size={18} className="text-red-brand" />,
    title: 'Frame-perfect Sync',
    desc: 'RTT-compensated playback keeps everyone on the same frame, anywhere.',
  },
  {
    icon: <MonitorPlay size={18} className="text-red-brand" />,
    title: 'Any Source',
    desc: 'Upload a local video file or share your screen in one click.',
  },
  {
    icon: <Shield size={18} className="text-red-brand" />,
    title: 'Private Rooms',
    desc: 'Unique invite code. Only invited guests can enter.',
  },
  {
    icon: <Globe size={18} className="text-red-brand" />,
    title: 'Live Chat',
    desc: 'Real-time reactions and conversation as scenes unfold.',
  },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('connecting');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

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

  const createRoom = () => {
    if (!socket.connected) { setStatus('error'); return; }
    setCreating(true);
    socket.emit('create-room', (roomId) => navigate(`/room/${roomId}`));
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomCode.trim()) navigate(`/room/${roomCode.trim()}`);
  };

  const isConnected = status === 'connected';

  // Rotating typewriter quotes
  const quotes = [
    'Friendship feels closer in sync.',
    'Late night calls. Early morning memories.',
    'We don\'t just watch movies. We create moments.',
    'Miles apart, but frame by frame together.',
    'The best scenes are the ones we react to together.',
  ];
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const full = quotes[quoteIdx];
    let timeout;
    if (!isErasing) {
      if (displayed.length < full.length) {
        timeout = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 45);
      } else {
        timeout = setTimeout(() => setIsErasing(true), 2200);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22);
      } else {
        setIsErasing(false);
        setQuoteIdx((quoteIdx + 1) % quotes.length);
      }
    }
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, isErasing, quoteIdx]);

  const sentenceVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.035, delayChildren: 0.4 } },
  };
  const letterVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  const AnimatedText = ({ text, className }) => (
    <motion.span
      className={className}
      variants={sentenceVariants}
      initial="hidden"
      animate="visible"
      aria-label={text}
      style={{ display: 'inline-block' }}
    >
      {text.split('').map((char, i) => (
        <motion.span key={i} variants={letterVariants} style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );

  const particles = [
    { size: 3, x: '12%', delay: 0, dur: 12, startY: '90%' },
    { size: 2, x: '28%', delay: 2, dur: 16, startY: '85%' },
    { size: 4, x: '45%', delay: 4, dur: 14, startY: '95%' },
    { size: 2, x: '60%', delay: 1, dur: 18, startY: '88%' },
    { size: 3, x: '75%', delay: 5, dur: 11, startY: '92%' },
    { size: 2, x: '88%', delay: 3, dur: 15, startY: '80%' },
    { size: 5, x: '20%', delay: 7, dur: 20, startY: '70%' },
    { size: 2, x: '52%', delay: 6, dur: 13, startY: '75%' },
  ];

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLightning, setIsLightning] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Occasional random lightning flashes
  useEffect(() => {
    const triggerLightning = () => {
      if (Math.random() > 0.95) {
        setIsLightning(true);
        setTimeout(() => setIsLightning(false), 100 + Math.random() * 200);
      }
    };
    const interval = setInterval(triggerLightning, 3000);
    return () => clearInterval(interval);
  }, []);

  const ElectricArc = ({ x, y, delay = 0, isCore = false }) => {
    const [path, setPath] = useState("");

    useEffect(() => {
      const generatePath = () => {
        const segments = isCore ? 6 : 4;
        const width = isCore ? 40 : 25;
        const height = isCore ? 30 : 25;
        let d = "M 0,0";
        for (let i = 1; i <= segments; i++) {
          const px = (i / segments) * width * 2 - width;
          const py = Math.random() * height * 2 - height;
          d += ` L ${px}, ${py}`;
        }
        setPath(d);
      };

      const interval = setInterval(generatePath, isCore ? 40 : 60);
      return () => clearInterval(interval);
    }, [isCore]);


    return (
      <motion.svg
        className="absolute pointer-events-none overflow-visible"
        style={{ left: x, top: y }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.4, 1, 0] }}
        transition={{ duration: isCore ? 0.2 : 0.3, repeat: Infinity, delay }}
      >
        <motion.path
          d={path}
          stroke="#E50914"
          strokeWidth={isCore ? 2 : 1.5}
          fill="none"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 ${isCore ? 8 : 5}px rgba(229,9,20,0.95))`,
            opacity: isCore ? 1 : 0.8
          }}
        />
      </motion.svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* ─── Hero: two-column layout ─────────────────────────────── */}
      <section className="relative flex-1 flex items-center px-6 md:px-12 pt-20 pb-10 overflow-hidden min-h-screen">

        {/* ── CINEMATIC BACKGROUND SYSTEM ── */}

        {/* Layer 1: Deep nebula orbs — large, slow drift */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 900, height: 900, top: '-20%', left: '-25%', background: 'radial-gradient(circle at 40% 40%, rgba(229,9,20,0.08) 0%, rgba(180,0,10,0.04) 40%, transparent 70%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 60, -30, 20, 0], y: [0, -40, 30, -10, 0], scale: [1, 1.08, 0.96, 1.04, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 700, height: 700, bottom: '-15%', right: '-20%', background: 'radial-gradient(circle at 60% 60%, rgba(229,9,20,0.07) 0%, transparent 65%)', filter: 'blur(70px)' }}
          animate={{ x: [0, -70, 40, -20, 0], y: [0, 50, -30, 15, 0], scale: [1, 0.92, 1.08, 0.98, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />

        {/* Layer 2: Mid-range accent orbs — medium speed */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 400, height: 400, top: '30%', left: '50%', background: 'radial-gradient(circle, rgba(229,9,20,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }}
          animate={{ x: [0, 40, -40, 20, 0], y: [0, -50, 50, -20, 0], scale: [1, 1.2, 0.85, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: 300, height: 300, top: '65%', left: '20%', background: 'radial-gradient(circle, rgba(229,9,20,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }}
          animate={{ x: [0, -30, 50, -10, 0], y: [0, 30, -40, 10, 0], scale: [1, 0.9, 1.15, 0.95, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
        />

        {/* Layer 3: Sweeping light streak */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 2, height: '60%', top: '20%', left: '35%', background: 'linear-gradient(to bottom, transparent, rgba(229,9,20,0.12), transparent)', filter: 'blur(3px)', transformOrigin: 'top center' }}
          animate={{ opacity: [0, 0.6, 0], rotate: [-5, 5, -5], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 1, height: '40%', top: '10%', right: '25%', background: 'linear-gradient(to bottom, transparent, rgba(229,9,20,0.08), transparent)', filter: 'blur(2px)', transformOrigin: 'top center' }}
          animate={{ opacity: [0, 0.4, 0], rotate: [3, -4, 3], x: [0, -20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        />

        {/* Layer 4: Floating glowing particles */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              left: p.x,
              top: p.startY,
              background: `rgba(229,9,20,${0.3 + (i % 3) * 0.1})`,
              boxShadow: `0 0 ${p.size * 3}px rgba(229,9,20,0.4)`,
            }}
            animate={{ y: [0, -(Math.random() * 300 + 200)], opacity: [0, 0.8, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: 'easeIn', delay: p.delay }}
          />
        ))}

        {/* Layer 5: Top cinematic vignette for depth */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 180% 100% at 50% 0%, transparent 60%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Layer 6: Interactive Electric Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <ElectricArc x={mousePos.x} y={mousePos.y} isCore={true} />
          <ElectricArc x={mousePos.x + 20} y={mousePos.y - 15} delay={0.15} />
          <ElectricArc x={mousePos.x - 25} y={mousePos.y + 20} delay={0.05} />
          <ElectricArc x={mousePos.x + 10} y={mousePos.y + 30} delay={0.3} />

          {/* Faint electric cursor glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              left: mousePos.x - 100,
              top: mousePos.y - 100,
              background: 'radial-gradient(circle, rgba(229,9,20,0.18) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        </div>

        {/* Layer 7: Occasional Lightning Flash */}
        <AnimatePresence>
          {isLightning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.2, 0.05, 0.3, 0] }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white pointer-events-none z-40"
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>


        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── LEFT: Laptop showcase ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="w-full"
          >
            <LaptopShowcase />
          </motion.div>

          {/* ── RIGHT: Headline + CTA ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
            className="flex flex-col items-start gap-6"
          >
            {/* Headline — always visible */}
            <h1 className="text-4xl md:text-5xl xl:text-7xl font-black text-white leading-[0.9] tracking-tight">
              Watch Together.
              <br />
              <span className="text-red-brand">In Sync.</span>
            </h1>

            {/* Rotating typewriter quote */}
            <div className="relative h-14 flex items-center max-w-xl" aria-live="polite">
              <p
                className="text-white text-3xl md:text-4xl leading-tight"
                style={{ fontFamily: '"Great Vibes", cursive', letterSpacing: '0.02em', textShadow: '0 0 24px rgba(255,255,255,0.08)' }}
              >
                {displayed}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-0.5 h-7 bg-red-brand ml-0.5 align-middle"
                  style={{ borderRadius: 2 }}
                />
              </p>
            </div>


            {/* Divider */}
            <div className="w-full h-px bg-[#1c1c1c]" />

            {/* CTA Group */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-full flex flex-col gap-4"
            >
              {/* Inline Create + Join row */}
              <div className="flex items-center gap-3">
                {/* Create a Room */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={createRoom}
                  disabled={!isConnected || creating}
                  icon={<Play size={14} fill="currentColor" />}
                  className="flex-shrink-0 font-semibold text-sm px-5"
                >
                  {creating ? 'Creating…' : 'Create a Room'}
                </Button>

                {/* Divider */}
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">or</span>

                {/* Join inline form */}
                <form onSubmit={joinRoom} className="relative flex-1 group">
                  <div className="absolute inset-0 bg-red-brand/8 blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-400 rounded-lg" />
                  <div className="relative flex items-center bg-white/5 border border-white/10 group-hover:border-white/15 group-focus-within:border-red-brand/40 rounded-lg overflow-hidden transition-all duration-300">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={e => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Room code"
                      maxLength={10}
                      className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none tracking-[0.15em] font-semibold uppercase min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={!isConnected || !roomCode.trim()}
                      className={`px-4 py-2.5 border-l border-white/10 text-white/60 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 flex items-center gap-1.5 ${roomCode.trim() ? 'bg-white/10 hover:bg-red-brand hover:text-white' : 'bg-white/5'}`}
                    >
                      Join <ArrowRight size={13} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Connection status */}
              <div className="flex items-center gap-2 text-[11px] text-white/30">
                <div className="relative flex items-center justify-center">
                  <span className={`absolute w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500/40 animate-ping' : ''}`} />
                  <span className={`relative w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-brand'}`} />
                </div>
                {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Offline'}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features + CTA Cards ─────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 bg-[#0A0A0A] border-t border-[#141414]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Built for every watch party
            </h2>
            <p className="text-[#737373] text-sm">Everything you need for a cinema-quality shared experience.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Left: Action Cards ── */}
            <div className="flex flex-col gap-4">

              {/* Create Room Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={createRoom}
                className="relative overflow-hidden rounded-2xl border border-red-brand/30 bg-gradient-to-br from-red-brand/15 via-red-brand/5 to-transparent p-6 cursor-pointer group transition-all duration-300 hover:border-red-brand/60"
                style={{ boxShadow: '0 0 40px rgba(229,9,20,0.08)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-red-brand/20 border border-red-brand/30 flex items-center justify-center mb-4 group-hover:bg-red-brand/30 group-hover:border-red-brand/50 transition-all duration-300">
                    <Play size={20} fill="currentColor" className="text-red-brand" />
                  </div>
                  <h3 className="text-white font-black text-lg mb-1 tracking-tight">Create a Room</h3>
                  <p className="text-[#737373] text-sm mb-5 leading-relaxed">Start a watch party instantly. Share your code with friends.</p>
                  <div className="inline-flex items-center gap-2 text-red-brand text-sm font-bold">
                    {creating ? 'Creating…' : 'Start now'}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </motion.div>

              {/* Join Room Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-6 group transition-all duration-300 hover:border-white/15" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="absolute inset-0 bg-red-brand/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Users size={18} className="text-white/70" />
                  </div>
                  <h3 className="text-white font-black text-lg mb-1 tracking-tight">Join a Room</h3>
                  <p className="text-[#737373] text-sm mb-4 leading-relaxed">Have a code? Enter it and jump straight in.</p>
                  <form onSubmit={joinRoom} className="relative">
                    <div className="flex items-center bg-black/40 border border-white/10 group-focus-within:border-red-brand/50 rounded-xl p-1 transition-all duration-300">
                      <input
                        type="text"
                        value={roomCode}
                        onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="Room code..."
                        maxLength={10}
                        className="flex-1 bg-transparent border-none px-3 py-2 text-white text-sm placeholder-[#444] focus:outline-none tracking-[0.2em] font-bold uppercase"
                      />
                      <button
                        type="submit"
                        disabled={!isConnected || !roomCode.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-red-brand to-red-dark text-white text-sm font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-red-hover hover:to-red-brand transition-all duration-300 flex-shrink-0"
                      >
                        Join
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>

            {/* ── Right: Feature Grid ── */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111] border border-white/5 hover:border-white/10 rounded-2xl p-6 group transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-brand/10 border border-red-brand/20 flex items-center justify-center mb-4 group-hover:bg-red-brand/15 group-hover:border-red-brand/35 transition-all duration-300">
                    {f.icon}
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2 tracking-wide">{f.title}</h3>
                  <p className="text-[#737373] text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#141414] py-6 text-center">
        <p className="text-[#555] text-xs tracking-wide">
          <span className="text-red-brand font-bold">CineSync</span> — Watch Together, In Sync.
        </p>
      </footer>
    </div>
  );
}
