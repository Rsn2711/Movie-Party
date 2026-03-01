import React from 'react';
import { clsx } from 'clsx';

export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={clsx(
                'bg-[#181818] border border-[#2a2a2a] rounded-lg',
                'transition-all duration-300',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return (
        <div className={clsx('px-6 pt-6 pb-4 border-b border-[#2a2a2a]', className)}>
            {children}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={clsx('p-6', className)}>
            {children}
        </div>
    );
}
