import React from 'react';
import { clsx } from 'clsx';

const variants = {
    default: 'bg-surface text-text-secondary border border-border',
    primary: 'bg-primary/20 text-primary border border-primary/30',
    accent: 'bg-accent/20 text-accent border border-accent/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

export default function Badge({ children, variant = 'default', className = '' }) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-body',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
