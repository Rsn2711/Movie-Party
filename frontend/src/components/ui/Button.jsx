import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const variants = {
    primary: [
        'bg-gradient-to-r from-red-brand to-red-dark hover:from-red-hover hover:to-red-brand text-white',
        'shadow-[0_4px_14px_0_rgba(229,9,20,0.39)]',
        'hover:shadow-[0_6px_20px_rgba(229,9,20,0.5)]',
        'border border-red-brand/20',
    ].join(' '),
    secondary: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-md',
    ghost: 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white',
    danger: 'bg-red-brand/10 hover:bg-red-brand/20 text-red-brand border border-red-brand/30',
    outline: 'bg-transparent border border-white/20 hover:border-white/40 hover:bg-white/5 text-white',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-md gap-2',
    lg: 'px-7 py-3.5 text-base rounded-md gap-2.5',
    xl: 'px-9 py-4 text-lg rounded-md gap-3',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    onClick,
    type = 'button',
    icon,
    ...props
}) {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            transition={{ duration: 0.2 }}
            className={clsx(
                'inline-flex items-center justify-center font-semibold',
                'transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-brand/60',
                'cursor-pointer select-none leading-none',
                variants[variant],
                sizes[size],
                disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                className
            )}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </motion.button>
    );
}
