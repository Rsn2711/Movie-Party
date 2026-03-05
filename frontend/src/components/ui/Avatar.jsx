import React from 'react';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Avatar Component — CineSync Design System
   Props: name, size (xs | sm | md | lg | xl), isHost, isOnline
------------------------------------------------------------------ */

const PALETTE = [
    ['#7C2D12', '#9A3412'],  // Deep red-orange
    ['#1E3A5F', '#1D4ED8'],  // Midnight blue
    ['#134E4A', '#0F766E'],  // Deep teal
    ['#4C1D95', '#6D28D9'],  // Deep violet
    ['#713F12', '#92400E'],  // Amber-brown
    ['#881337', '#9F1239'],  // Crimson
    ['#0C4A6E', '#0369A1'],  // Ocean blue
    ['#14532D', '#15803D'],  // Forest green
];

function getColor(name) {
    if (!name) return PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

const SIZE_CLASSES = {
    xs: { wrap: 'w-5 h-5', text: 'text-[9px]', online: 'w-1.5 h-1.5 border', host: 'text-[8px] -top-1 -right-1' },
    sm: { wrap: 'w-7 h-7', text: 'text-[10px]', online: 'w-2 h-2 border-2', host: 'text-[9px] -top-1 -right-1' },
    md: { wrap: 'w-9 h-9', text: 'text-xs', online: 'w-2.5 h-2.5 border-2', host: 'text-[10px] -top-1 -right-1' },
    lg: { wrap: 'w-11 h-11', text: 'text-sm', online: 'w-3 h-3 border-2', host: 'text-xs -top-1.5 -right-1' },
    xl: { wrap: 'w-14 h-14', text: 'text-base', online: 'w-3.5 h-3.5 border-2', host: 'text-xs -top-2 -right-1' },
};

export default function Avatar({
    name,
    size = 'md',
    isHost = false,
    isOnline = false,
    className = '',
}) {
    const s = SIZE_CLASSES[size] || SIZE_CLASSES.md;
    const [from, to] = getColor(name);
    const initials = getInitials(name);

    return (
        <div
            className={clsx('relative flex-shrink-0', className)}
            aria-label={name ? `${name}${isHost ? ' (Host)' : ''}${isOnline ? ' (Online)' : ''}` : undefined}
        >
            <div
                className={clsx(
                    'rounded-full flex items-center justify-center font-bold text-white select-none',
                    'ring-2 ring-black/30',
                    s.wrap,
                    s.text
                )}
                style={{
                    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                }}
            >
                {initials}
            </div>

            {/* Online indicator */}
            {isOnline && (
                <span
                    className={clsx(
                        'absolute bottom-0 right-0 rounded-full bg-green-500 border-bg-base',
                        s.online
                    )}
                    aria-hidden="true"
                />
            )}

            {/* Host badge */}
            {isHost && (
                <span
                    className={clsx('absolute leading-none', s.host)}
                    title="Host"
                    aria-label="Host"
                >
                    🎬
                </span>
            )}
        </div>
    );
}
