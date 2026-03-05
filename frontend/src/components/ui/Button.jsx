import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Button Component — CineSync Design System
   Variants: primary | secondary | ghost | danger | outline
   Sizes:    xs | sm | md | lg | xl
   Props:    icon (leading), iconRight (trailing), loading, fullWidth
------------------------------------------------------------------ */

const variants = {
    primary: clsx(
        'bg-red-brand hover:bg-red-hover text-white',
        'shadow-[0_4px_14px_rgba(229,9,20,0.35)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.5)]',
        'border border-red-brand/20 active:bg-red-dark'
    ),
    secondary: clsx(
        'bg-white/[0.06] hover:bg-white/[0.1] text-white',
        'border border-white/[0.1] hover:border-white/[0.2]',
        'backdrop-blur-md active:bg-white/[0.04]'
    ),
    ghost: clsx(
        'bg-transparent hover:bg-white/[0.06] text-text-secondary hover:text-white',
        'border border-transparent hover:border-white/[0.08]',
        'active:bg-white/[0.04]'
    ),
    danger: clsx(
        'bg-red-brand/[0.1] hover:bg-red-brand/[0.18] text-red-brand',
        'border border-red-brand/[0.25] hover:border-red-brand/[0.4]',
        'active:bg-red-brand/[0.08]'
    ),
    outline: clsx(
        'bg-transparent hover:bg-white/[0.05] text-white',
        'border border-white/[0.2] hover:border-white/[0.35]',
        'active:bg-white/[0.03]'
    ),
};

const sizes = {
    xs: 'px-3 py-1.5 text-xs rounded gap-1.5 min-h-[32px]',
    sm: 'px-4 py-2 text-sm rounded-md gap-1.5 min-h-[36px]',
    md: 'px-5 py-2.5 text-sm rounded-md gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-base rounded-lg gap-2 min-h-[44px]',
    xl: 'px-8 py-3.5 text-base rounded-lg gap-2.5 min-h-[52px]',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    icon,
    iconRight,
    fullWidth = false,
    'aria-label': ariaLabel,
    ...props
}) {
    const isDisabled = disabled || loading;

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            aria-label={ariaLabel}
            aria-busy={loading}
            whileHover={isDisabled ? {} : { scale: 1.015 }}
            whileTap={isDisabled ? {} : { scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={clsx(
                /* Base */
                'inline-flex items-center justify-center font-semibold',
                'transition-all duration-250 focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-red-brand/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
                'cursor-pointer select-none leading-none',
                /* Variant */
                variants[variant],
                /* Size */
                sizes[size],
                /* Width */
                fullWidth && 'w-full',
                /* Disabled */
                isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                className
            )}
            {...props}
        >
            {/* Spinner when loading */}
            {loading && (
                <svg
                    className="animate-spin flex-shrink-0"
                    width="14" height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
            )}

            {/* Leading icon */}
            {!loading && icon && (
                <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
            )}

            {children}

            {/* Trailing icon */}
            {iconRight && (
                <span className="flex-shrink-0" aria-hidden="true">{iconRight}</span>
            )}
        </motion.button>
    );
}
