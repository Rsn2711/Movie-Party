import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Zap } from 'lucide-react';

/* ------------------------------------------------------------------
   Toast / Notification System — CineSync Design System
   Types: success | error | info | warning
   Usage: const toast = useToast(); toast('Message', 'success');
------------------------------------------------------------------ */

const ToastContext = createContext(null);

const TOAST_CONFIG = {
    success: {
        icon: <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" aria-hidden="true" />,
        bar: 'bg-green-500',
        label: 'Success',
    },
    error: {
        icon: <AlertCircle size={16} className="text-red-brand flex-shrink-0" aria-hidden="true" />,
        bar: 'bg-red-brand',
        label: 'Error',
    },
    info: {
        icon: <Info size={16} className="text-blue-400 flex-shrink-0" aria-hidden="true" />,
        bar: 'bg-blue-500',
        label: 'Info',
    },
    warning: {
        icon: <Zap size={16} className="text-amber-400 flex-shrink-0" aria-hidden="true" />,
        bar: 'bg-amber-500',
        label: 'Warning',
    },
};

const toastVariants = {
    initial: { opacity: 0, x: 48, scale: 0.94 },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: 'spring', damping: 22, stiffness: 380 },
    },
    exit: {
        opacity: 0,
        x: 56,
        scale: 0.9,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
};

function Toast({ id, message, type, onDismiss }) {
    const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

    return (
        <motion.div
            key={id}
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            role="alert"
            aria-live="assertive"
            aria-label={`${config.label}: ${message}`}
            className="relative flex items-start gap-3 pl-4 pr-3 py-3.5
                       bg-bg-surface border border-border rounded-xl
                       shadow-modal overflow-hidden
                       min-w-[280px] max-w-[360px] sm:max-w-[420px]
                       pointer-events-auto"
        >
            {/* Color accent bar */}
            <div
                className={`absolute left-0 inset-y-0 w-1 ${config.bar} rounded-l-xl`}
                aria-hidden="true"
            />

            {/* Icon */}
            {config.icon}

            {/* Message */}
            <p className="flex-1 text-sm text-white leading-snug">
                {message}
            </p>

            {/* Dismiss */}
            <button
                onClick={() => onDismiss(id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 p-0.5 rounded text-text-muted hover:text-white
                           transition-colors duration-200 focus:outline-none
                           focus-visible:ring-1 focus-visible:ring-white/30"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev.slice(-4), { id, message, type }]); // Max 5 toasts
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}

            {/* Toast container — bottom-right, mobile-aware */}
            <div
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]
                           flex flex-col gap-2 pointer-events-none
                           max-w-[calc(100vw-2rem)]"
                aria-label="Notifications"
                aria-live="polite"
            >
                <AnimatePresence mode="popLayout">
                    {toasts.map(t => (
                        <Toast
                            key={t.id}
                            id={t.id}
                            message={t.message}
                            type={t.type}
                            onDismiss={removeToast}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}
