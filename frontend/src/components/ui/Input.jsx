import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

const Input = forwardRef(function Input(
    { label, error, icon, className = '', ...props },
    ref
) {
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-sm font-semibold text-[#A3A3A3] tracking-wide uppercase text-xs">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none group-focus-within:text-red-brand transition-colors">
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    className={clsx(
                        'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md',
                        'px-4 py-3.5 text-white text-sm',
                        'placeholder-[#555] leading-none',
                        'focus:outline-none focus:border-red-brand focus:ring-1 focus:ring-red-brand',
                        'hover:border-[#3a3a3a]',
                        'transition-all duration-200',
                        icon && 'pl-11',
                        error && 'border-red-brand/60 focus:ring-red-brand',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs text-red-brand">{error}</p>
            )}
        </div>
    );
});

export default Input;
