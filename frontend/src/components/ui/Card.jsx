import React from 'react';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Card Component — CineSync Design System
   Exports: Card, CardHeader, CardBody, CardFooter
------------------------------------------------------------------ */

export function Card({
    children,
    className = '',
    hover = false,
    glow = false,
    ...props
}) {
    return (
        <div
            className={clsx(
                'bg-bg-card border border-border rounded-xl',
                'transition-all duration-250',
                hover && 'hover:border-border-bright hover:shadow-card-hover hover:-translate-y-0.5',
                glow && 'hover:shadow-red-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', border = true }) {
    return (
        <div
            className={clsx(
                'px-5 pt-5 pb-4',
                border && 'border-b border-border',
                className
            )}
        >
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={clsx('p-5', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '', border = true }) {
    return (
        <div
            className={clsx(
                'px-5 py-4',
                border && 'border-t border-border',
                className
            )}
        >
            {children}
        </div>
    );
}
