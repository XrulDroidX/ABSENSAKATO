
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/components/Layout.tsx
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, CalendarDays, Users, BarChart3, LogOut, Menu, X, Fingerprint, ShieldCheck,
  Settings, Trash2, Filter, RefreshCw, IconProps, Gift, FileCheck, Download, Zap, Grid
} from '../components/Icons';
import { useAuth } from '../App';
import { Role } from '../types';
import { StorageService } from '../services/storage';
import { QueueService } from '../services/queue';
import { Changelog } from './Changelog';
import { AutomationService } from '../services/automation';
import { useToast } from './Toast';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';

const IDLE_TIMEOUT = 15 * 60 * 1000; 

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const branding = StorageService.getBranding();
  const { addToast } = useToast();
  
  // Focus Mode
  const [focusMode, setFocusMode] = useState(false);
  const currentOrg = StorageService.getOrgSettings();

  // Smart PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
      const handler = (e: any) => {
          e.preventDefault();
          setDeferredPrompt(e);
          const visits = parseInt(localStorage.getItem('visit_count') || '0');
          if (visits > 3) setShowInstall(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      const count = parseInt(localStorage.getItem('visit_count') || '0') + 1;
      localStorage.setItem('visit_count', count.toString());
      return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
  };

  useEffect(() => {
      const handleOnline = () => {
          QueueService.processQueue();
          addToast('success', "Online: Data sinkronisasi.");
      };
      window.addEventListener('online', handleOnline);
      if (navigator.onLine) QueueService.processQueue();
      return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
      const loop = setInterval(() => AutomationService.run(), 60000); 
      return () => clearInterval(loop);
  }, [user]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Absensi', path: '/attendance', icon: <Fingerprint />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Analytics', path: '/analytics', icon: <Filter />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Kelola Agenda', path: '/agendas', icon: <CalendarDays />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Rewards', path: '/rewards', icon: <Gift />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Perizinan', path: '/permissions', icon: <FileCheck />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] }, 
    { label: 'Event Absen', path: '/events', icon: <CalendarDays />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Anggota', path: '/members', icon: <Users />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Audit Log', path: '/audit-logs', icon: <ShieldCheck />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Laporan', path: '/reports', icon: <BarChart3 />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Recycle Bin', path: '/recycle-bin', icon: <Trash2 />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Pengaturan', path: '/settings', icon: <Settings />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || Role.ANGGOTA));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Changelog />
      <CommandPalette />
      
      {!focusMode && (
          <motion.aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 shadow-soft lg:static flex flex-col`}
            initial={false}
            animate={window.innerWidth >= 1024 ? (collapsed ? {width:80} : {width:260}) : (sidebarOpen ? { x: 0, width: 260 } : { x: -280, width: 260 })}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="h-20 flex items-center justify-between px-5 border-b border-slate-100">
              <div className="flex items-center gap-3 overflow-hidden">
                {branding.logoUrl ? <img src={branding.logoUrl} className="w-8 h-8 object-contain" /> : <div className="bg-blue-600 p-1.5 rounded-lg shrink-0"><ShieldCheck className="text-white" size={24} /></div>}
                {!collapsed && <span className="font-bold text-xl text-slate-900 truncate">SAKATO</span>}
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500"><X size={24} /></button>
            </div>

            {/* ORG SWITCHER - Enterprise */}
            {!collapsed && user?.role === Role.SUPER_ADMIN && (
                <div className="px-3 mt-4 mb-2">
                    <div className="p-3 bg-slate-50 border rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Organisasi Aktif</p>
                        <div className="font-bold text-sm truncate flex items-center gap-2">
                            <Grid size={14} className="text-blue-600"/> {currentOrg.name}
                        </div>
                    </div>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'} ${collapsed ? 'justify-center' : ''}`}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<IconProps>, { size: 20 })}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
            
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => logout()} className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}>
                <LogOut size={20} /> {!collapsed && <span className="font-medium text-sm">Sign Out</span>}
              </button>
            </div>
          </motion.aside>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className={`h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0 transition-all ${focusMode ? '-translate-y-full absolute' : ''}`}>
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600"><Menu size={24} /></button>
             <div className="hidden md:block text-xs text-slate-400">Tekan <kbd className="bg-slate-100 border border-slate-300 px-1 rounded font-mono text-slate-500">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 rounded font-mono text-slate-500">K</kbd> untuk menu cepat</div>
          </div>
          <button onClick={() => setFocusMode(!focusMode)} className="text-slate-400 hover:text-blue-600" title="Toggle Focus Mode">
              <Zap size={20} className={focusMode ? 'text-blue-600' : ''}/>
          </button>
        </header>

        {focusMode && (
            <button onClick={() => setFocusMode(false)} className="fixed top-4 right-4 z-50 bg-slate-900 text-white p-2 rounded-full shadow-lg opacity-50 hover:opacity-100">
                <X size={20}/>
            </button>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
             {!focusMode && <Breadcrumbs />}
             {children}
          </div>
          {branding.showFooter && !focusMode && (
              <footer className="mt-8 text-center text-xs text-slate-400 pb-4">&copy; {new Date().getFullYear()} SAKATO Enterprise.</footer>
          )}
        </main>
      </div>
    </div>
  );
};
