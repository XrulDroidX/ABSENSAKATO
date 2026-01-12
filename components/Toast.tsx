
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, X, Info } from './Icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ addToast: (type: ToastType, message: string) => void } | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-sm ${
                toast.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' :
                toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' :
                toast.type === 'warning' ? 'bg-orange-50/90 border-orange-200 text-orange-800' :
                'bg-blue-50/90 border-blue-200 text-blue-800'
              }`}
            >
              <div className="mt-0.5">
                {toast.type === 'success' && <CheckCircle size={18} className="text-green-600"/>}
                {toast.type === 'error' && <XCircle size={18} className="text-red-600"/>}
                {toast.type === 'warning' && <AlertTriangle size={18} className="text-orange-600"/>}
                {toast.type === 'info' && <Info size={18} className="text-blue-600"/>}
              </div>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
