
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, User as UserIcon, Loader2, AlertTriangle } from '../components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

export const Login: React.FC = () => {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login Gagal. Periksa email dan password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-900 font-sans">
      <div className="w-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl inline-block mb-4 shadow-lg shadow-blue-500/30">
               <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">SAKATO ENTERPRISE</h2>
            <p className="text-slate-500 text-sm">Supabase Secured Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 text-sm">
                   <AlertTriangle size={18}/> {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Email</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="nama@organisasi.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase ml-1">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl shadow-lg shadow-blue-600/30 font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'MASUK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
