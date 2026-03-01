import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const styles = {
    success: { icon: <CheckCircle size={16} className="text-green-400 flex-shrink-0" />, bar: 'bg-green-500' },
    error: { icon: <AlertCircle size={16} className="text-red-brand flex-shrink-0" />, bar: 'bg-red-brand' },
    info: { icon: <Info size={16} className="text-white/60 flex-shrink-0" />, bar: 'bg-white/30' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.8)] min-w-[280px] max-w-[360px] overflow-hidden relative"
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles[t.type]?.bar || 'bg-white/30'}`} />
                            {styles[t.type]?.icon}
                            <p className="flex-1 text-sm text-white leading-snug">{t.message}</p>
                            <button onClick={() => remove(t.id)} className="text-[#737373] hover:text-white transition-colors ml-1 flex-shrink-0">
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
