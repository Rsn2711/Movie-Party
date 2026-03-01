import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/* ─── Animated progress bar that loops ──────────────────────────── */
function ProgressBar() {
    const barRef = useRef(null);
    useEffect(() => {
        let v = 34;
        const id = setInterval(() => {
            v = v >= 98 ? 0 : v + 0.045;
            if (barRef.current) barRef.current.style.width = v + '%';
        }, 40); // 25fps is more than enough for a tiny mockup progress bar
        return () => clearInterval(id);
    }, []);
    return (
        <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, position: 'relative', cursor: 'pointer' }}>
            <div ref={barRef} style={{ height: '100%', background: '#E50914', borderRadius: 2, width: '34%', transition: 'width 0.1s linear', position: 'relative' }}>
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px rgba(229,9,20,0.8)' }} />
            </div>
        </div>
    );
}

/* ─── Animated chat messages ─────────────────────────────────────── */
const MESSAGES = [
    { own: false, name: 'Alex', color: '#c0392b', text: 'this scene is incredible 🔥', delay: 0 },
    { own: true, name: 'You', color: '#E50914', text: 'right?! didn\'t see it coming', delay: 1400 },
    { own: false, name: 'Mia', color: '#7b241c', text: 'sync is perfect btw 👌', delay: 2800 },
    { own: false, name: 'Alex', color: '#c0392b', text: 'best watch party app tbh', delay: 4200 },
    { own: true, name: 'You', color: '#E50914', text: 'agreed! CineSync ❤️', delay: 5600 },
];

function ChatPanel() {
    const [visible, setVisible] = React.useState([]);

    useEffect(() => {
        MESSAGES.forEach((m, i) => {
            setTimeout(() => setVisible(prev => [...prev, i]), m.delay);
        });
        // repeat cycle
        const loop = setInterval(() => {
            setVisible([]);
            MESSAGES.forEach((m, i) => {
                setTimeout(() => setVisible(prev => {
                    if (prev.includes(i)) return prev;
                    return [...prev, i];
                }), m.delay);
            });
        }, 8000);
        return () => clearInterval(loop);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '8px 10px', overflowY: 'hidden' }}>
            {MESSAGES.map((m, i) => (
                <div
                    key={i}
                    style={{
                        display: 'flex', gap: 6, alignItems: 'flex-end',
                        flexDirection: m.own ? 'row-reverse' : 'row',
                        opacity: visible.includes(i) ? 1 : 0,
                        transform: visible.includes(i) ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'opacity 0.4s ease, transform 0.4s ease',
                    }}
                >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700, flexShrink: 0, fontFamily: 'Inter,sans-serif' }}>
                        {m.name[0]}
                    </div>
                    <div style={{
                        background: m.own ? '#E50914' : 'rgba(255,255,255,0.07)',
                        borderRadius: m.own ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '5px 9px', maxWidth: '75%',
                        border: m.own ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <span style={{ color: '#fff', fontSize: 9, fontFamily: 'Inter,sans-serif', lineHeight: 1.4 }}>{m.text}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Screen Content: CineSync Watch Room ────────────────────────── */
function ScreenContent() {
    const [time, setTime] = React.useState('1:04:32');
    const [pulseLive, setPulseLive] = React.useState(true);

    useEffect(() => {
        // Fake time counter
        let secs = 3872;
        const id = setInterval(() => {
            secs++;
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
            const s = (secs % 60).toString().padStart(2, '0');
            setTime(`${h}:${m}:${s}`);
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#0a0a0a', borderBottom: '1px solid #1c1c1c', flexShrink: 0 }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }}>
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                            <rect width="40" height="40" rx="9" fill="#E50914" />
                            <rect x="5" y="3" width="5" height="5" rx="1" fill="#c0010f" />
                            <rect x="15" y="3" width="5" height="5" rx="1" fill="#c0010f" />
                            <rect x="25" y="3" width="5" height="5" rx="1" fill="#c0010f" />
                            <rect x="5" y="32" width="5" height="5" rx="1" fill="#c0010f" />
                            <rect x="15" y="32" width="5" height="5" rx="1" fill="#c0010f" />
                            <rect x="25" y="32" width="5" height="5" rx="1" fill="#c0010f" />
                            <path d="M15 13L29 20L15 27V13Z" fill="white" />
                        </svg>
                    </div>
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: -0.3 }}>CineSync</span>
                </div>
                {/* Room code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }}
                    />
                    <span style={{ color: '#555', fontSize: 8.5 }}>Room · </span>
                    <span style={{ color: '#fff', fontSize: 8.5, fontWeight: 700, letterSpacing: 1 }}>X7K·2M</span>
                </div>
                {/* Avatars */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {['#c0392b', '#7b241c', '#4a235a', '#154360'].map((c, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1.5px solid #0a0a0a', marginLeft: i ? -6 : 0, zIndex: 10 - i }} />
                    ))}
                    <span style={{ color: '#555', fontSize: 8, marginLeft: 5 }}>+1</span>
                </div>
            </div>

            {/* Main area: video + chat */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Video area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                    {/* Real video player */}
                    <div style={{ flex: 1, position: 'relative', background: '#000', overflow: 'hidden' }}>
                        <video
                            src="/Chaos Walking _ Official Trailer _ 2021 _ Daisy Ridley, Tom Holland, Nick Jonas.mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                pointerEvents: 'none',
                                willChange: 'transform',
                            }}
                        />
                        {/* Thin dark vignette so the UI overlays are readable */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none' }} />

                        {/* SYNCED badge */}
                        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(229,9,20,0.88)', padding: '2px 8px', borderRadius: 3, backdropFilter: 'blur(4px)' }}>
                            <motion.div
                                animate={{ opacity: [1, 0.25, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                                style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }}
                            />
                            <span style={{ color: '#fff', fontSize: 7, fontWeight: 700, letterSpacing: 0.8 }}>SYNCED</span>
                        </div>

                        {/* Movie title overlay bottom-left */}
                        <div style={{ position: 'absolute', bottom: 10, left: 10, pointerEvents: 'none' }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', fontFamily: 'Inter,sans-serif', textShadow: '0 1px 4px rgba(0,0,0,0.8)', letterSpacing: 0.3 }}>Chaos Walking</div>
                            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter,sans-serif', marginTop: 1 }}>2021 · Tom Holland, Daisy Ridley</div>
                        </div>
                    </div>

                    {/* Controls bar */}
                    <div style={{ background: '#111', padding: '6px 12px 5px', flexShrink: 0, borderTop: '1px solid #1c1c1c' }}>
                        <ProgressBar />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Play/pause */}
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E50914', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <svg width={8} height={8} viewBox="0 0 10 12" fill="white"><path d="M0 0h4v12H0zm6 0h4v12H6z" /></svg>
                                </div>
                                {/* Skip */}
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <svg width={8} height={8} viewBox="0 0 24 24" fill="#888"><path d="M6 18l8.5-6L6 6v12zm2.5-6l5.5 4-5.5 4V6l5.5 4-5.5 4z" /><rect x="17" y="6" width="2" height="12" fill="#888" /></svg>
                                </div>
                                {/* Time */}
                                <span style={{ color: '#888', fontSize: 7.5, fontFamily: 'monospace', letterSpacing: 0.5 }}>{time} / 1:52:14</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Volume */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width={10} height={10} viewBox="0 0 24 24" fill="#888"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.7-4.12v8.23c1.64-.5 2.7-2.03 2.7-4.11z" /></svg>
                                    <div style={{ width: 32, height: 2, background: '#2a2a2a', borderRadius: 1 }}>
                                        <div style={{ width: '70%', height: '100%', background: '#E50914', borderRadius: 1 }} />
                                    </div>
                                </div>
                                {/* Fullscreen */}
                                <svg width={10} height={10} viewBox="0 0 24 24" fill="#888"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat sidebar */}
                <div style={{ width: 160, background: '#0d0d0d', borderLeft: '1px solid #1c1c1c', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Chat header */}
                    <div style={{ padding: '7px 10px', borderBottom: '1px solid #1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span style={{ color: '#888', fontSize: 8, fontWeight: 600, letterSpacing: 0.5 }}>LIVE CHAT</span>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }} />
                    </div>
                    {/* Messages */}
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        <ChatPanel />
                    </div>
                    {/* Input */}
                    <div style={{ padding: '5px 8px 7px', borderTop: '1px solid #1c1c1c', display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ flex: 1, height: 18, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 9, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                            <span style={{ color: '#3a3a3a', fontSize: 7.5 }}>React...</span>
                        </div>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#E50914', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width={7} height={7} viewBox="0 0 20 20" fill="white"><path d="M2 10l16-8-8 16-2-6z" /></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── MacBook Laptop Frame ───────────────────────────────────────── */
export default function LaptopShowcase() {
    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: '0 20px' }}>

            {/* Red glow behind laptop */}
            <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '80%', height: 60,
                background: 'radial-gradient(ellipse at 50% 100%, rgba(229,9,20,0.35) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: 0,
            }} />

            {/* ── Laptop wrapper ── */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860 }}>

                {/* Lid (screen) */}
                <div style={{
                    position: 'relative',
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #161616 100%)',
                    borderRadius: '16px 16px 0 0',
                    padding: '10px 10px 0',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 -4px 40px rgba(0,0,0,0.8), 0 30px 80px rgba(229,9,20,0.1)',
                }}>
                    {/* Camera notch */}
                    <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2a2a2a' }} />
                    </div>

                    {/* Screen bezel */}
                    <div style={{
                        background: '#000',
                        borderRadius: '10px 10px 0 0',
                        overflow: 'hidden',
                        aspectRatio: '16/9',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                    }}>
                        <ScreenContent />
                    </div>
                </div>

                {/* Hinge strip */}
                <div style={{
                    height: 6,
                    background: 'linear-gradient(180deg, #2a2a2c 0%, #1a1a1c 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }} />

                {/* Base / keyboard area */}
                <div style={{
                    background: 'linear-gradient(180deg, #1a1a1c 0%, #141416 100%)',
                    borderRadius: '0 0 14px 14px',
                    padding: '12px 20px 10px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)',
                    position: 'relative',
                }}>
                    {/* Keyboard rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                        {[
                            { keys: 14, w: '100%', h: 10 },
                            { keys: 14, w: '96%', h: 10 },
                            { keys: 12, w: '90%', h: 10 },
                            { keys: 11, w: '84%', h: 10 },
                            { keys: 10, w: '78%', h: 10 },
                        ].map((row, ri) => (
                            <div key={ri} style={{ display: 'flex', gap: 3, justifyContent: 'center', width: row.w, margin: '0 auto' }}>
                                {Array.from({ length: row.keys }).map((_, ki) => (
                                    <div key={ki} style={{
                                        flex: 1, height: row.h, borderRadius: 2,
                                        background: 'linear-gradient(180deg, #2c2c2e 0%, #252527 100%)',
                                        boxShadow: '0 1px 0 rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)',
                                    }} />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Spacebar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <div style={{ width: '45%', height: 10, borderRadius: 3, background: 'linear-gradient(180deg, #2c2c2e 0%, #252527 100%)', boxShadow: '0 1px 0 rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)' }} />
                    </div>

                    {/* Trackpad */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '28%', height: 48, borderRadius: 8,
                            background: 'linear-gradient(160deg, #222224 0%, #1c1c1e 100%)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.6)',
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
