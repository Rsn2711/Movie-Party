import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Loader Component — CineSync Design System
   Variants: bars (default) | spinner | dots
   Props:    text, fullscreen, size (sm | md | lg), variant
------------------------------------------------------------------ */

function BarsLoader({ size = 'md' }) {
    const heights = { sm: 'h-6', md: 'h-10', lg: 'h-14' };
    const widths = { sm: 'w-1', md: 'w-1.5', lg: 'w-2.5' };

    return (
        <div
            className={clsx('flex items-end gap-1', heights[size])}
            role="img"
            aria-label="Loading"
        >
            {[0, 1, 2, 3].map(i => (
                <motion.div
                    key={i}
                    className={clsx('bg-red-brand rounded-full', widths[size])}
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: [0.4, 0, 0.6, 1],
                    }}
                    style={{ transformOrigin: 'bottom' }}
                />
            ))}
        </div>
    );
}

function SpinnerLoader({ size = 'md' }) {
    const dims = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
    const stroke = { sm: 2.5, md: 2, lg: 2 };

    return (
        <svg
            className={clsx('animate-spin text-red-brand', dims[size])}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke[size]}
            role="img"
            aria-label="Loading"
        >
            <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    );
}

function DotsLoader({ size = 'md' }) {
    const dotSize = { sm: 'w-1.5 h-1.5', md: 'w-2.5 h-2.5', lg: 'w-3.5 h-3.5' };

    return (
        <div className="flex items-center gap-1.5" role="img" aria-label="Loading">
            {[0, 1, 2].map(i => (
                <motion.span
                    key={i}
                    className={clsx('rounded-full bg-red-brand', dotSize[size])}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

export default function Loader({
    text,
    fullscreen = false,
    size = 'md',
    variant = 'bars',
    className = '',
}) {
    const loaderMap = {
        bars: <BarsLoader size={size} />,
        spinner: <SpinnerLoader size={size} />,
        dots: <DotsLoader size={size} />,
    };

    const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

    const content = (
        <div className={clsx('flex flex-col items-center justify-center gap-4', className)}>
            {loaderMap[variant] || loaderMap.bars}
            {text && (
                <p className={clsx(
                    textSizes[size],
                    'text-text-muted tracking-wider uppercase font-medium'
                )}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullscreen) {
        return (
            <div
                className="fixed inset-0 bg-bg-base flex items-center justify-center z-50"
                role="status"
                aria-live="polite"
            >
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
            {content}
        </div>
    );
}
