import React from 'react';

/* ─────────────────────────────────────────────────────────────
   Rich cinema-themed app screens for CineSync
   Each screen simulates a real mobile UI with visible content
───────────────────────────────────────────────────────────── */

const Screen = {
    /* 1 ── Video player room with red progress bar */
    VideoPlayer: (
        <div style={{ width: '100%', height: '100%', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
            {/* Thumbnail area */}
            <div style={{ height: '48%', background: 'linear-gradient(160deg,#3a0000 0%,#1a0505 60%,#000 100%)', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 40%, rgba(229,9,20,0.22) 0%, transparent 70%)' }} />
                {/* Movie title text bars */}
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                    <div style={{ width: 80, height: 7, background: 'rgba(255,255,255,0.9)', borderRadius: 3, marginBottom: 5 }} />
                    <div style={{ width: 50, height: 5, background: 'rgba(229,9,20,0.9)', borderRadius: 2 }} />
                </div>
                {/* Play button */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-60%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(229,9,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={14} height={14} viewBox="0 0 10 10" fill="white"><path d="M2 1l7 4-7 4z" /></svg>
                </div>
                {/* Sync badge */}
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(229,9,20,0.2)', border: '1px solid rgba(229,9,20,0.6)', borderRadius: 4, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E50914' }} />
                    <span style={{ color: '#E50914', fontSize: 7, fontWeight: 700, fontFamily: 'Inter,sans-serif', letterSpacing: 1 }}>LIVE</span>
                </div>
            </div>
            {/* Progress / controls */}
            <div style={{ padding: '6px 12px 4px', flexShrink: 0 }}>
                <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ width: '42%', height: '100%', background: '#E50914', borderRadius: 2, position: 'relative' }}>
                        <div style={{ position: 'absolute', right: -4, top: -3, width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px rgba(229,9,20,0.8)' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888', fontSize: 7, fontFamily: 'Inter,sans-serif' }}>28:14</span>
                    <span style={{ color: '#555', fontSize: 7, fontFamily: 'Inter,sans-serif' }}>1:42:30</span>
                </div>
            </div>
            {/* Chat messages */}
            <div style={{ flex: 1, padding: '4px 10px 6px', display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                {[
                    { own: false, txt: 'That scene was insane! 🔥', w: '82%', avatar: '#c0392b' },
                    { own: true, txt: 'Right?! Didn\'t see it coming', w: '75%', avatar: '#E50914' },
                    { own: false, txt: 'Perfect sync btw 👌', w: '60%', avatar: '#922b21' },
                ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-end', flexDirection: m.own ? 'row-reverse' : 'row' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: m.avatar, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                        </div>
                        <div style={{ background: m.own ? '#E50914' : '#1c1c1c', borderRadius: m.own ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: '5px 8px', maxWidth: m.w }}>
                            <span style={{ color: '#fff', fontSize: 7.5, fontFamily: 'Inter,sans-serif', lineHeight: 1.4 }}>{m.txt}</span>
                        </div>
                    </div>
                ))}
            </div>
            {/* Input */}
            <div style={{ padding: '5px 10px 8px', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ flex: 1, height: 20, background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }} />
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E50914', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={9} height={9} viewBox="0 0 20 20" fill="white"><path d="M2 10l16-8-8 16-2-6z" /></svg>
                </div>
            </div>
        </div>
    ),

    /* 2 ── Room creation / lobby */
    Lobby: (
        <div style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 12px 8px' }}>
            {/* Logo */}
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E50914', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width={16} height={16} viewBox="0 0 111 190" fill="white"><path d="M0 0H31.6L63.6 131.2V0H95.2V190H63.6L31.6 58.8V190H0V0Z" /></svg>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'Inter,sans-serif', marginBottom: 2 }}>CineSync</div>
            <div style={{ fontSize: 7.5, color: '#E50914', fontFamily: 'Inter,sans-serif', marginBottom: 14 }}>Watch Together. In Sync.</div>
            {/* Input */}
            <div style={{ width: '100%', height: 24, background: '#181818', border: '1px solid #333', borderRadius: 7, marginBottom: 8, padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: 8, fontFamily: 'Inter,sans-serif' }}>Enter your name...</span>
            </div>
            {/* CTA */}
            <div style={{ width: '100%', height: 28, background: '#E50914', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 10 }}>
                <svg width={10} height={10} viewBox="0 0 10 10" fill="white"><path d="M2 1l7 4-7 4z" /></svg>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>Create a Room</span>
            </div>
            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: '#222' }} />
                <span style={{ color: '#444', fontSize: 7, fontFamily: 'Inter,sans-serif' }}>or join</span>
                <div style={{ flex: 1, height: 1, background: '#222' }} />
            </div>
            <div style={{ width: '100%', height: 24, background: 'transparent', border: '1px solid #333', borderRadius: 7, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid #555' }} />
                <span style={{ color: '#666', fontSize: 8, fontFamily: 'Inter,sans-serif', letterSpacing: 1.5 }}>ABC · 123</span>
            </div>
        </div>
    ),

    /* 3 ── Participants list */
    Participants: (
        <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', flexDirection: 'column', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Inter,sans-serif' }}>Room · X7K2M</div>
                    <div style={{ fontSize: 7.5, color: '#E50914', fontFamily: 'Inter,sans-serif', marginTop: 1 }}>4 watching</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, border: '1.5px solid #E50914' }} />
                </div>
            </div>
            {[
                { name: 'Alex Chen', role: 'HOST', color: '#c0392b', online: true },
                { name: 'Maria Lopez', role: null, color: '#922b21', online: true },
                { name: 'James Park', role: null, color: '#7b241c', online: true },
                { name: 'Sofia Khan', role: null, color: '#641e16', online: false },
            ].map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg,${u.color},#1a0505)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>
                            {u.name[0]}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: u.online ? '#22c55e' : '#555', border: '1.5px solid #111' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 8.5, color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 7, color: '#555', fontFamily: 'Inter,sans-serif' }}>{u.online ? 'Watching now' : 'Away'}</div>
                    </div>
                    {u.role && (
                        <div style={{ padding: '2px 6px', background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.4)', borderRadius: 3 }}>
                            <span style={{ color: '#E50914', fontSize: 6.5, fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>{u.role}</span>
                        </div>
                    )}
                </div>
            ))}
            {/* Mini invite button */}
            <div style={{ marginTop: 'auto', height: 22, background: '#1a1a1a', border: '1px dashed #333', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 5, height: 0.5, background: '#555' }} />
                </div>
                <span style={{ color: '#555', fontSize: 7.5, fontFamily: 'Inter,sans-serif' }}>Invite friends</span>
            </div>
        </div>
    ),

    /* 4 ── Movie poster grid */
    PosterGrid: (
        <div style={{ width: '100%', height: '100%', background: '#0a0a0a', padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Inter,sans-serif' }}>Recently Watched</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
                {[
                    { bg: 'linear-gradient(160deg,#7b241c,#1a0505)', title: 'Oppenheimer', dot: '#ffd700' },
                    { bg: 'linear-gradient(160deg,#154360,#0a0a0a)', title: 'Interstellar', dot: '#00bcd4' },
                    { bg: 'linear-gradient(160deg,#145a32,#0a0a0a)', title: 'The Matrix', dot: '#4caf50' },
                    { bg: 'linear-gradient(160deg,#4a235a,#0a0a0a)', title: 'Inception', dot: '#ab47bc' },
                ].map((p, i) => (
                    <div key={i} style={{ borderRadius: 8, background: p.bg, position: 'relative', overflow: 'hidden', minHeight: 55 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px' }}>
                            <div style={{ width: '85%', height: 5, background: 'rgba(255,255,255,0.9)', borderRadius: 2, marginBottom: 3 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: p.dot }} />
                                <div style={{ width: '50%', height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: 1.5 }} />
                            </div>
                        </div>
                        {/* Play overlay */}
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: 'rgba(229,9,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width={6} height={6} viewBox="0 0 10 10" fill="white"><path d="M2 1l7 4-7 4z" /></svg>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    ),

    /* 5 ── Live stream / host view */
    HostView: (
        <div style={{ width: '100%', height: '100%', background: '#080808', display: 'flex', flexDirection: 'column' }}>
            {/* Screen preview */}
            <div style={{ height: '50%', background: 'linear-gradient(135deg,#1a0000,#0d0d0d)', position: 'relative', flexShrink: 0, borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(229,9,20,0.2) 0%, transparent 60%)' }} />
                {/* Fake video grid */}
                <div style={{ position: 'absolute', inset: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {['#1a0505', '#0a0a2a', '#0a1a0a', '#1a0a1a'].map((c, i) => (
                        <div key={i} style={{ background: c, borderRadius: 4, border: i === 0 ? '1.5px solid #E50914' : '1px solid #222', position: 'relative' }}>
                            {i === 0 && <div style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderRadius: '50%', background: '#E50914' }} />}
                        </div>
                    ))}
                </div>
                {/* Live badge */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(229,9,20,0.9)', padding: '2px 7px', borderRadius: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
                    <span style={{ color: '#fff', fontSize: 7, fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>STREAMING</span>
                </div>
            </div>
            {/* Controls */}
            <div style={{ padding: '8px 10px 5px', flexShrink: 0 }}>
                <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ width: '68%', height: '100%', background: '#E50914', borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
                    {[
                        { icon: '⏮', active: false }, { icon: '▶', active: true }, { icon: '⏭', active: false },
                    ].map((b, i) => (
                        <div key={i} style={{ width: i === 1 ? 28 : 20, height: i === 1 ? 28 : 20, borderRadius: '50%', background: i === 1 ? '#E50914' : '#1a1a1a', border: i !== 1 ? '1px solid #2a2a2a' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: i === 1 ? 10 : 8 }}>{b.icon}</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Viewer info row */}
            <div style={{ flex: 1, padding: '5px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {['#c0392b', '#922b21', '#7b241c'].map((c, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1.5px solid #000', marginLeft: i > 0 ? -8 : 0 }} />
                    ))}
                    <span style={{ color: '#888', fontSize: 7.5, fontFamily: 'Inter,sans-serif', marginLeft: 4 }}>+2 watching</span>
                </div>
                {[{ w: '65%', c: '#1c1c1c' }, { w: '80%', c: '#E50914' }].map((m, i) => (
                    <div key={i} style={{ height: 14, background: m.c, borderRadius: 8, width: m.w }} />
                ))}
            </div>
        </div>
    ),

    /* 6 ── Chat full view */
    ChatView: (
        <div style={{ width: '100%', height: '100%', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#c0392b,#1a0505)' }} />
                <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: '#fff', fontFamily: 'Inter,sans-serif' }}>Room X7K2M</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: 7, color: '#555', fontFamily: 'Inter,sans-serif' }}>4 watching now</span>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', width: 22, height: 12, background: 'rgba(229,9,20,0.2)', border: '1px solid rgba(229,9,20,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E50914' }} />
                </div>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                    { own: false, txt: 'Bro this sync is perfect 🎬', avatar: '#c0392b', w: '78%' },
                    { own: true, txt: 'IKR! CineSync is goated', avatar: '#E50914', w: '70%' },
                    { own: false, txt: 'Rewind 30 seconds quick!', avatar: '#922b21', w: '82%' },
                    { own: true, txt: 'Done! ⏪', avatar: '#E50914', w: '30%' },
                    { own: false, txt: '😂 thanks', avatar: '#641e16', w: '28%' },
                ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 5, flexDirection: m.own ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: m.avatar, flexShrink: 0 }} />
                        <div style={{ background: m.own ? '#E50914' : '#1c1c1c', borderRadius: m.own ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: '5px 9px', maxWidth: m.w }}>
                            <span style={{ color: '#fff', fontSize: 8, fontFamily: 'Inter,sans-serif' }}>{m.txt}</span>
                        </div>
                    </div>
                ))}
            </div>
            {/* Input */}
            <div style={{ padding: '5px 10px 8px', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, borderTop: '1px solid #1a1a1a' }}>
                <div style={{ flex: 1, height: 22, background: '#1a1a1a', borderRadius: 12, border: '1px solid #292929', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                    <span style={{ color: '#444', fontSize: 8, fontFamily: 'Inter,sans-serif' }}>React to the scene...</span>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E50914', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={10} height={10} viewBox="0 0 20 20" fill="white"><path d="M2 10l16-8-8 16-2-6z" /></svg>
                </div>
            </div>
        </div>
    ),
};

const screenKeys = ['VideoPlayer', 'Lobby', 'Participants', 'PosterGrid', 'HostView', 'ChatView'];

/* ─── Phone Mockup ─── */
function PhoneMockup({ screenKey }) {
    const content = Screen[screenKey] || Screen.VideoPlayer;
    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '9 / 19.5',
                borderRadius: 34,
                flexShrink: 0,
                /* Realistic phone frame: dark ring + subtle inner glow */
                background: '#1c1c1e',
                boxShadow: [
                    '0 0 0 1.5px #2a2a2a',
                    '0 0 0 3px #111',
                    '0 24px 60px rgba(0,0,0,0.9)',
                    'inset 0 0 0 1px rgba(255,255,255,0.06)',
                ].join(', '),
                overflow: 'hidden',
            }}
        >
            {/* Dynamic Island / notch */}
            <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 48, height: 10, background: '#000', zIndex: 20,
                borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
            }} />

            {/* Screen */}
            <div style={{ position: 'absolute', inset: '1.5px', borderRadius: 33, overflow: 'hidden', background: '#000' }}>
                {/* Status bar */}
                <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', flexShrink: 0, background: 'rgba(0,0,0,0.4)', position: 'relative', zIndex: 10 }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 7, fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>9:41</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 8 }}>
                            {[3, 5, 7, 9].map((h, i) => <div key={i} style={{ width: 2, height: h, background: 'rgba(255,255,255,0.55)', borderRadius: 1 }} />)}
                        </div>
                        <svg width={10} height={8} viewBox="0 0 16 12" fill="rgba(255,255,255,0.55)">
                            <path d="M8 3C10.8 3 13.3 4.1 15.1 5.9L16 5C13.9 2.8 11.1 1.5 8 1.5C4.9 1.5 2.1 2.8 0 5L0.9 5.9C2.7 4.1 5.2 3 8 3Z" />
                        </svg>
                        <div style={{ width: 14, height: 7, borderRadius: 2, border: '1px solid rgba(255,255,255,0.4)', padding: '1px 1px', display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '70%', height: '100%', background: '#4caf50', borderRadius: 1 }} />
                        </div>
                    </div>
                </div>
                {/* App Content */}
                <div style={{ height: 'calc(100% - 16px - 14px)', overflow: 'hidden', position: 'relative' }}>
                    {content}
                </div>
                {/* Home indicator */}
                <div style={{ height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ width: 42, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
                </div>
            </div>

            {/* Side volume buttons (decorative) */}
            <div style={{ position: 'absolute', left: -2.5, top: '22%', width: 2.5, height: 18, background: '#2a2a2a', borderRadius: '2px 0 0 2px' }} />
            <div style={{ position: 'absolute', left: -2.5, top: '33%', width: 2.5, height: 26, background: '#2a2a2a', borderRadius: '2px 0 0 2px' }} />
            <div style={{ position: 'absolute', left: -2.5, top: '43%', width: 2.5, height: 26, background: '#2a2a2a', borderRadius: '2px 0 0 2px' }} />
            {/* Side power button */}
            <div style={{ position: 'absolute', right: -2.5, top: '28%', width: 2.5, height: 36, background: '#2a2a2a', borderRadius: '0 2px 2px 0' }} />
        </div>
    );
}

/* ─── Single scrolling column ─── */
function MarqueeColumn({ screens, direction, duration, offset = 0 }) {
    // Triple the items so there's always enough to scroll without gap
    const tripled = [...screens, ...screens, ...screens];
    const animName = direction === 'up' ? 'csUp' : 'csDown';

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: 20, willChange: 'transform',
            animation: `${animName} ${duration}s linear ${offset}s infinite`,
        }}>
            {tripled.map((sk, i) => <PhoneMockup key={i} screenKey={sk} />)}
        </div>
    );
}

/* ─── Main Export ─── */
export default function PhoneMarquee() {
    /* 5 columns: [down, down, UP, down, down] */
    const columns = [
        { screens: ['VideoPlayer', 'PosterGrid', 'ChatView'], dir: 'down', dur: 38, off: -14 },
        { screens: ['Lobby', 'HostView', 'VideoPlayer'], dir: 'down', dur: 30, off: -6 },
        { screens: ['Participants', 'ChatView', 'PosterGrid', 'HostView'], dir: 'up', dur: 24, off: -3 },
        { screens: ['PosterGrid', 'VideoPlayer', 'Lobby'], dir: 'down', dur: 32, off: -18 },
        { screens: ['HostView', 'ChatView', 'Participants'], dir: 'down', dur: 40, off: -9 },
    ];

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>

            {/* keyframes */}
            <style>{`
        @keyframes csDown {
          from { transform: translateY(-33.333%); }
          to   { transform: translateY(0%); }
        }
        @keyframes csUp {
          from { transform: translateY(0%); }
          to   { transform: translateY(-33.333%); }
        }
      `}</style>

            {/* Grid — rotated, tall enough to bleed off all 4 edges */}
            <div style={{
                position: 'absolute',
                inset: '-60% -25%',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 20,
                transform: 'rotate(-20deg)',
                transformOrigin: 'center center',
            }}>
                {columns.map((col, i) => (
                    <div key={i} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <MarqueeColumn
                            screens={col.screens}
                            direction={col.dir}
                            duration={col.dur}
                            offset={col.off}
                        />
                    </div>
                ))}
            </div>

            {/* ── Overlays ── */}
            {/* Strong top + bottom vignette */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0A0A0A 0%, rgba(10,10,10,0.15) 28%, rgba(10,10,10,0.15) 72%, #0A0A0A 100%)', zIndex: 2, pointerEvents: 'none' }} />
            {/* Soft left + right fade */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0A0A0A 0%, transparent 22%, transparent 78%, #0A0A0A 100%)', zIndex: 2, pointerEvents: 'none' }} />
            {/* Netflix red atmospheric glow */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 48%, rgba(229,9,20,0.11) 0%, transparent 68%)', zIndex: 3, pointerEvents: 'none' }} />
            {/* Centre readable zone — only darkens the very middle where text sits */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 42% 42% at 50% 46%, rgba(0,0,0,0.82) 0%, transparent 100%)', zIndex: 3, pointerEvents: 'none' }} />
        </div>
    );
}
