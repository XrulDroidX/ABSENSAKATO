
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { ShieldCheck, Lock, User, Loader2, AlertTriangle, Whatsapp, X } from '../components/Icons';
import { StorageService } from '../services/storage';
import { motion, AnimatePresence } from 'framer-motion';

// Replace with actual Admin Phone Number (International format without +)
const ADMIN_PHONE = '628123456789'; 

export const Login: React.FC = () => {
  const [id, setId] = useState(''); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedOut, setLockedOut] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const branding = StorageService.getBranding();
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      // Check Rate Limit
      const attempts = parseInt(localStorage.getItem('login_attempts') || '0');
      const lockUntil = parseInt(localStorage.getItem('login_lock_until') || '0');
      
      if (Date.now() < lockUntil) {
          setLockedOut(true);
          setError(`Akun terkunci sementara. Silakan coba lagi nanti.`);
      } else if (lockUntil > 0 && Date.now() > lockUntil) {
          localStorage.removeItem('login_attempts');
          localStorage.removeItem('login_lock_until');
          setLockedOut(false);
      }
  }, []);

  const handleRateLimit = (success: boolean) => {
      if (success) {
          localStorage.removeItem('login_attempts');
          localStorage.removeItem('login_lock_until');
      } else {
          const attempts = parseInt(localStorage.getItem('login_attempts') || '0') + 1;
          localStorage.setItem('login_attempts', attempts.toString());
          if (attempts >= 5) {
              const lockTime = Date.now() + (5 * 60 * 1000); // 5 Minutes
              localStorage.setItem('login_lock_until', lockTime.toString());
              setLockedOut(true);
              setError("Terlalu banyak percobaan gagal. Akun dikunci 5 menit.");
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut) return;

    setIsLoading(true);
    setError('');

    setTimeout(async () => {
      const success = await login(id, password);
      handleRateLimit(success);

      if (success) {
        StorageService.saveLoginLog(id);
        navigate('/');
      } else {
        if (!lockedOut) setError('ID atau Password tidak valid.');
        setPassword('');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleForgotClick = () => {
      const msg = encodeURIComponent("Halo Admin SAKATO, saya lupa password akun saya. Mohon bantuannya untuk reset password.");
      window.open(`https://wa.me/${ADMIN_PHONE}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 font-sans">
      
      {/* LEFT SIDE - DECORATION (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 text-center px-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8 }}
            className="mb-6 flex justify-center"
          >
             {/* Logo Dekorasi Kiri */}
             <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
               {branding.logoUrl ? (
                 <img src={branding.logoUrl} className="w-24 h-24 object-contain" alt="Logo" />
               ) : (
                 <ShieldCheck className="text-blue-400 w-24 h-24" strokeWidth={1} />
               )}
             </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl font-bold text-white tracking-tight mb-2"
          >
            SAKATO
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto"
          >
            {branding.slogan || "Platform Absensi & Manajemen Keanggotaan Terintegrasi."}
          </motion.p>
        </div>
      </div>

      {/* RIGHT SIDE - FORM (Main Interaction) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="max-w-md w-full">
          
          {/* HEADER SECTION - CENTERED LOGO & TEXT */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} 
              className="inline-flex bg-blue-600 p-4 rounded-2xl mb-5 shadow-lg shadow-blue-600/30"
            >
               {branding.logoUrl ? (
                 <img src={branding.logoUrl} className="w-10 h-10 object-contain brightness-0 invert" alt="Logo" />
               ) : (
                 <ShieldCheck className="text-white w-10 h-10" />
               )}
            </motion.div>
            
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight uppercase mb-2">
              SISTEM ABSENSI ONLINE SAKATO
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3"
                >
                   <AlertTriangle className="shrink-0" size={18}/> 
                   <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">ID Anggota</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Masukkan ID / Username"
                  required
                  disabled={lockedOut}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                  disabled={lockedOut}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-600">Ingat Saya</span>
                </label>
                <button type="button" onClick={() => setShowForgot(true)} className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none">Lupa Password?</button>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockedOut}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : lockedOut ? 'TERKUNCI' : 'MASUK SEKARANG'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
             <p className="text-xs text-slate-400">
               &copy; {new Date().getFullYear()} SAKATO System | Enterprise Grade Security
             </p>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {showForgot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowForgot(false)}
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden"
                >
                    <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Lupa Password?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Demi keamanan akun, reset password hanya dapat dilakukan melalui Administrator. Silakan hubungi admin untuk verifikasi.
                        </p>
                        
                        <div className="w-full space-y-3">
                            <button 
                                onClick={handleForgotClick}
                                className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#1dbf57] transition-colors shadow-lg shadow-green-500/20"
                            >
                                <Whatsapp size={20} />
                                Hubungi Admin
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
