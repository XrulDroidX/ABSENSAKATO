
import React, { useState, useEffect } from 'react';
import { Sparkles, X } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_VERSION = '2.1.0';
const CHANGES = [
    "✨ Optimistic UI: Aplikasi terasa lebih cepat",
    "🛡️ Anti-Cheat: Device Binding & QR One-Time",
    "📊 Virtualized Tables: Scroll ribuan data lancar",
    "📶 Offline-First: Background Sync otomatis",
    "⚙️ Role Matrix & Developer Mode"
];

export const Changelog: React.FC = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const lastVer = localStorage.getItem('sakato_version');
        if (lastVer !== CURRENT_VERSION) {
            setShow(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem('sakato_version', CURRENT_VERSION);
        setShow(false);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-2xl overflow-hidden border border-slate-700"
                >
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><Sparkles className="text-yellow-300"/> Apa yang baru?</h3>
                        <button onClick={handleClose} className="text-white/80 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-5 space-y-3">
                        <p className="text-sm text-slate-300 font-bold">Versi {CURRENT_VERSION} telah hadir!</p>
                        <ul className="space-y-2">
                            {CHANGES.map((c, i) => (
                                <li key={i} className="text-sm text-slate-200 flex gap-2 items-start">
                                    <span>•</span> {c}
                                </li>
                            ))}
                        </ul>
                        <button onClick={handleClose} className="w-full mt-2 bg-white text-slate-900 font-bold py-2 rounded hover:bg-slate-100 transition">
                            Mengerti
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
