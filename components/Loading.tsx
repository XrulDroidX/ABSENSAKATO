
import React from 'react';
import { Loader2 } from '../components/Icons';
import { motion } from 'framer-motion';

export const LoadingSpinner: React.FC<{fullScreen?: boolean}> = ({ fullScreen }) => {
  if (fullScreen) {
    return <SplashScreen />;
  }
  return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>;
};

export const SplashScreen: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-glow mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h1 className="text-3xl font-bold tracking-widest mb-2">SAKATO</h1>
        <p className="text-blue-400 text-sm tracking-wide uppercase">Absensi Digital</p>
      </motion.div>
      
      <div className="absolute bottom-10 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-full h-full bg-blue-500"
        />
      </div>
    </motion.div>
  );
};

export const Skeleton: React.FC<{className?: string}> = ({ className }) => {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>;
};
