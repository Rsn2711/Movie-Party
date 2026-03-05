import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------
   Input Component — CineSync Design System
   Props: label, error, hint, icon (leading), iconRight (trailing),
          size (sm | md | lg), className, ...native input props
------------------------------------------------------------------ */

const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-sm min-h-[44px]',
    lg: 'px-4 py-3.5 text-base min-h-[48px]',
};

const Input = forwardRef(function Input(
    {
        label,
        error,
        hint,
        icon,
        iconRight,
        size = 'md',
        className = '',
        id: providedId,
        ...props
    },
    ref
) {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const describedBy = [
        error && errorId,
        hint && hintId,
    ].filter(Boolean).join(' ') || undefined;

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-xs font-semibold text-text-secondary tracking-wide uppercase select-none"
                >
                    {label}
                </label>
            )}

            <div className="relative group">
                {/* Leading icon */}
                {icon && (
                    <span
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted
                                   pointer-events-none group-focus-within:text-red-brand
                                   transition-colors duration-200"
                        aria-hidden="true"
                    >
                        {icon}
                    </span>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    aria-describedby={describedBy}
                    aria-invalid={error ? 'true' : undefined}
                    className={clsx(
                        /* Base */
                        'w-full bg-bg-surface border rounded-md',
                        'text-white placeholder-text-dim',
                        'focus:outline-none focus:ring-0',
                        'hover:border-border-bright',
                        'transition-all duration-250',
                        /* Border states */
                        error
                            ? 'border-red-brand/60 focus:border-red-brand focus:shadow-input-focus'
                            : 'border-border focus:border-red-brand focus:shadow-input-focus',
                        /* Size */
                        sizes[size],
                        /* Icon padding */
                        icon && 'pl-10',
                        iconRight && 'pr-10',
                        className
                    )}
                    {...props}
                />

                {/* Trailing icon */}
                {iconRight && (
                    <span
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted
                                   pointer-events-none group-focus-within:text-red-brand
                                   transition-colors duration-200"
                        aria-hidden="true"
                    >
                        {iconRight}
                    </span>
                )}
            </div>

            {/* Hint text */}
            {hint && !error && (
                <p id={hintId} className="text-xs text-text-muted">
                    {hint}
                </p>
            )}

            {/* Error text */}
            {error && (
                <p id={errorId} className="text-xs text-red-brand flex items-center gap-1.5" role="alert">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
});

export default Input;
