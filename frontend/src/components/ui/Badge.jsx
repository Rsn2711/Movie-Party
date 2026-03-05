import React from 'react';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Badge Component — CineSync Design System
   Variants: default | red | green | amber | blue | live
------------------------------------------------------------------ */

const VARIANTS = {
    default: 'bg-bg-surface text-text-secondary border border-border',
    red: 'bg-red-muted text-red-brand border border-red-brand/20',
    green: 'bg-green-500/10 text-green-400 border border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    live: 'bg-red-muted text-red-brand border border-red-brand/25 animate-pulse-red',
};

const SIZES = {
    sm: 'px-2 py-0.5 text-[10px] gap-1 rounded',
    md: 'px-2.5 py-1 text-xs gap-1.5 rounded-md',
    lg: 'px-3 py-1.5 text-sm gap-2 rounded-lg',
};

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    dotColor,
    className = '',
}) {
    const dotBg = dotColor || (variant === 'live' || variant === 'red' ? 'bg-red-brand' : 'bg-current');

    return (
        <span
            className={clsx(
                'inline-flex items-center font-semibold leading-none tracking-wide',
                VARIANTS[variant],
                SIZES[size],
                className
            )}
        >
            {dot && (
                <span
                    className={clsx('rounded-full flex-shrink-0', dotBg, {
                        'w-1 h-1': size === 'sm',
                        'w-1.5 h-1.5': size === 'md',
                        'w-2 h-2': size === 'lg',
                    })}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    );
}
