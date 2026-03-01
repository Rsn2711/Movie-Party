import React from 'react';
import { clsx } from 'clsx';

const gradients = [
    'from-red-800 to-red-600',
    'from-neutral-700 to-neutral-500',
    'from-red-900 to-red-700',
    'from-zinc-700 to-zinc-500',
    'from-stone-700 to-stone-500',
];

function getGradient(name) {
    if (!name) return gradients[0];
    return gradients[name.charCodeAt(0) % gradients.length];
}

export default function Avatar({ name, size = 'md', isHost = false, isOnline = false, className = '' }) {
    const initials = name
        ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const sizeClasses = {
        sm: 'w-7 h-7 text-xs',
        md: 'w-9 h-9 text-sm',
        lg: 'w-11 h-11 text-base',
    };

    return (
        <div className={clsx('relative flex-shrink-0', className)}>
            <div
                className={clsx(
                    'rounded-full flex items-center justify-center font-bold text-white',
                    `bg-gradient-to-br ${getGradient(name)}`,
                    sizeClasses[size]
                )}
            >
                {initials}
            </div>
            {isOnline && (
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0A0A0A]" />
            )}
            {isHost && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">🎬</span>
            )}
        </div>
    );
}
