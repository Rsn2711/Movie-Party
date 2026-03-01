import React, { useEffect, useRef } from 'react';

/**
 * CinematicBg — unique canvas animation for CineSync hero
 *
 * Layers (bottom→top):
 *  1. Drifting radial "spotlight" orbs (deep red)
 *  2. Fine particle network — dots + connecting lines
 *  3. Thin horizontal scan-strip lines (moving slowly down)
 *  4. CSS film-grain noise overlay
 *  5. Vignette radial gradient
 */
export default function CinematicBg() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;

        /* ── resize ── */
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        /* ── orbs ── */
        const orbs = [
            { x: 0.15, y: 0.3, r: 0.55, vx: 0.00012, vy: 0.00008, color: [229, 9, 20] },
            { x: 0.82, y: 0.65, r: 0.48, vx: -0.00009, vy: 0.00011, color: [180, 0, 10] },
            { x: 0.5, y: 0.1, r: 0.40, vx: 0.00007, vy: 0.00015, color: [100, 0, 5] },
        ];

        /* ── particles ── */
        const N = 90;
        const particles = Array.from({ length: N }, () => ({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.00025,
            vy: (Math.random() - 0.5) * 0.00025,
            r: Math.random() * 1.4 + 0.4,
            a: Math.random() * 0.45 + 0.15,
            phase: Math.random() * Math.PI * 2,
        }));

        /* ── scan strips ── */
        const STRIPS = 6;
        const strips = Array.from({ length: STRIPS }, (_, i) => ({
            y: i / STRIPS,
            speed: 0.00005 + Math.random() * 0.00006,
            h: Math.random() * 0.04 + 0.008,
            a: Math.random() * 0.03 + 0.01,
        }));

        /* ── noise canvas (generated once, reused with drawImage) ── */
        const noiseSize = 256;
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = noiseSize;
        noiseCanvas.height = noiseSize;
        const noiseCtx = noiseCanvas.getContext('2d');
        const imageData = noiseCtx.createImageData(noiseSize, noiseSize);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const v = Math.random() * 40 | 0;
            imageData.data[i] = v;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = Math.random() * 35 | 0;
        }
        noiseCtx.putImageData(imageData, 0, 0);

        let t = 0;

        const draw = () => {
            const W = canvas.width;
            const H = canvas.height;
            t += 1;

            /* 1 ── clear */
            ctx.fillStyle = '#0A0A0A';
            ctx.fillRect(0, 0, W, H);

            /* 2 ── spotlight orbs */
            orbs.forEach(o => {
                o.x += o.vx; o.y += o.vy;
                if (o.x < -0.3 || o.x > 1.3) o.vx *= -1;
                if (o.y < -0.3 || o.y > 1.3) o.vy *= -1;
                const cx = o.x * W, cy = o.y * H, rad = o.r * Math.max(W, H);
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
                g.addColorStop(0, `rgba(${o.color.join(',')},0.13)`);
                g.addColorStop(0.5, `rgba(${o.color.join(',')},0.05)`);
                g.addColorStop(1, `rgba(${o.color.join(',')},0)`);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, W, H);
            });

            /* 3 ── scan strips */
            strips.forEach(s => {
                s.y = (s.y + s.speed) % 1.15;
                ctx.fillStyle = `rgba(229,9,20,${s.a})`;
                ctx.fillRect(0, s.y * H, W, s.h * H);
            });

            /* 4 ── particles + connections */
            // update
            particles.forEach(p => {
                p.x = (p.x + p.vx + 1) % 1;
                p.y = (p.y + p.vy + 1) % 1;
                p.phase += 0.018;
            });

            // connections
            ctx.lineWidth = 0.6;
            const LINK_DIST = 0.18; // fraction of screen diagonal
            const diagPx = Math.sqrt(W * W + H * H);
            const linkPx = LINK_DIST * diagPx;

            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const dx = (particles[i].x - particles[j].x) * W;
                    const dy = (particles[i].y - particles[j].y) * H;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < linkPx) {
                        const alpha = (1 - d / linkPx) * 0.22;
                        ctx.strokeStyle = `rgba(229,9,20,${alpha.toFixed(3)})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x * W, particles[i].y * H);
                        ctx.lineTo(particles[j].x * W, particles[j].y * H);
                        ctx.stroke();
                    }
                }
            }

            // dots
            particles.forEach(p => {
                const px = p.x * W, py = p.y * H;
                const pulse = 0.7 + 0.3 * Math.sin(p.phase);
                ctx.beginPath();
                ctx.arc(px, py, p.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(229,9,20,${(p.a * pulse).toFixed(3)})`;
                ctx.fill();
            });

            /* 5 ── film-grain noise (tile) */
            ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t * 0.05);
            for (let tx = 0; tx < W; tx += noiseSize) {
                for (let ty = 0; ty < H; ty += noiseSize) {
                    ctx.drawImage(noiseCanvas, tx, ty);
                }
            }
            ctx.globalAlpha = 1;

            /* 6 ── thin grid of "film-frame" lines (very subtle) */
            ctx.strokeStyle = 'rgba(229,9,20,0.035)';
            ctx.lineWidth = 1;
            const cols = 12, rows = 8;
            for (let c = 0; c <= cols; c++) {
                ctx.beginPath(); ctx.moveTo(c / cols * W, 0); ctx.lineTo(c / cols * W, H); ctx.stroke();
            }
            for (let r = 0; r <= rows; r++) {
                ctx.beginPath(); ctx.moveTo(0, r / rows * H); ctx.lineTo(W, r / rows * H); ctx.stroke();
            }

            /* 7 ── vignette overlay */
            const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.9);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.75)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, W, H);

            raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
}
