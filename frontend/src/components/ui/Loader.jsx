import React from 'react';
import { motion } from 'framer-motion';

export default function Loader({ text = 'Loading…', fullscreen = false }) {
    const content = (
        <div className="flex flex-col items-center justify-center gap-5">
            {/* Netflix N-style animated bar loader */}
            <div className="flex items-end gap-1 h-10">
                {[0, 1, 2, 3].map(i => (
                    <motion.div
                        key={i}
                        className="w-1.5 bg-red-brand rounded-full"
                        animate={{ height: ['12px', '40px', '12px'] }}
                        transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                        }}
                    />
                ))}
            </div>
            <p className="text-[#737373] text-sm tracking-wider uppercase">{text}</p>
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center z-50">
                {content}
            </div>
        );
    }
    return <div className="flex items-center justify-center p-8">{content}</div>;
}
