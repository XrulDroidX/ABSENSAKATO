
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Clock, BarChart3, CalendarDays, Trophy, FileCheck, CalendarClock, Users, 
  ShieldCheck, FileBarChart, Trash2, Settings, Menu, X, LogOut, Zap, IconProps, Grid
} from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { StorageService } from '../services/storage';
import { QueueService } from '../services/queue';
import { Changelog } from './Changelog';
import { AutomationService } from '../services/automation';
import { useToast } from './Toast';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';

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

  // NEW ICON MAPPING - Enterprise Standard
  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Absensi', path: '/attendance', icon: <Clock />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Analytics', path: '/analytics', icon: <BarChart3 />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Kelola Agenda', path: '/agendas', icon: <CalendarDays />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Rewards', path: '/rewards', icon: <Trophy />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
    { label: 'Perizinan', path: '/permissions', icon: <FileCheck />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] }, 
    { label: 'Event Absen', path: '/events', icon: <CalendarClock />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Anggota', path: '/members', icon: <Users />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Audit Log', path: '/audit-logs', icon: <ShieldCheck />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Laporan', path: '/reports', icon: <FileBarChart />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS] },
    { label: 'Recycle Bin', path: '/recycle-bin', icon: <Trash2 />, roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { label: 'Pengaturan', path: '/settings', icon: <Settings />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || Role.ANGGOTA));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Changelog />
      <CommandPalette />
      
      {!focusMode && (
          <motion.aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 shadow-xl lg:shadow-none lg:static flex flex-col`}
            initial={false}
            animate={window.innerWidth >= 1024 ? (collapsed ? {width:80} : {width:260}) : (sidebarOpen ? { x: 0, width: 260 } : { x: -280, width: 260 })}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* ENTERPRISE HEADER */}
            <div className="h-auto p-5 border-b border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3 overflow-hidden">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} className="w-9 h-9 object-contain rounded-md" />
                    ) : (
                      <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center rounded-lg shadow-sm">
                         <span className="font-bold text-lg">S</span>
                      </div>
                    )}
                    {!collapsed && (
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-slate-900 leading-tight tracking-tight">SAKATO</span>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide truncate max-w-[140px]">
                          {currentOrg.name}
                        </span>
                      </div>
                    )}
                 </div>
                 <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              
              {!collapsed && (
                <div className="px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-center">
                   <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {user?.role?.replace('_', ' ')}
                   </span>
                </div>
              )}
            </div>

            {/* NAVIGATION AREA */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} 
                    onClick={() => setSidebarOpen(false)}
                    className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                        ${isActive 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        } 
                        ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-blue-600 rounded-r-full" />
                    )}

                    {/* Icon */}
                    <div className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'} transition-colors`}>
                        {React.cloneElement(item.icon as React.ReactElement<IconProps>, { 
                            size: collapsed ? 22 : 20,
                            strokeWidth: isActive ? 2.5 : 2
                        })}
                    </div>

                    {/* Label */}
                    {!collapsed && (
                        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                            {item.label}
                        </span>
                    )}

                    {/* Tooltip for Collapsed Mode */}
                    {collapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            {item.label}
                        </div>
                    )}
                  </Link>
                );
              })}
            </nav>
            
            {/* FOOTER ACTIONS */}
            <div className="p-3 border-t border-slate-100">
              <button onClick={() => logout()} className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''} group`}>
                <LogOut size={20} className="group-hover:stroke-2" /> 
                {!collapsed && <span className="font-medium text-sm">Sign Out</span>}
              </button>
            </div>
          </motion.aside>
      )}

      {/* OVERLAY FOR MOBILE */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className={`h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0 transition-all ${focusMode ? '-translate-y-full absolute' : ''}`}>
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
             {/* Desktop Collapse Toggle could go here if needed */}
             <div className="hidden md:block text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <span className="font-bold text-slate-500">⌘ K</span> <span className="opacity-50">untuk menu cepat</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
              <button onClick={() => setFocusMode(!focusMode)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-slate-50 rounded-full transition-colors" title="Toggle Focus Mode">
                  <Zap size={20} className={focusMode ? 'fill-blue-600 text-blue-600' : ''}/>
              </button>
          </div>
        </header>

        {focusMode && (
            <button onClick={() => setFocusMode(false)} className="fixed top-4 right-4 z-50 bg-slate-900 text-white p-2 rounded-full shadow-lg opacity-50 hover:opacity-100 transition-opacity">
                <X size={20}/>
            </button>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          <div className="max-w-7xl mx-auto">
             {!focusMode && <Breadcrumbs />}
             {children}
          </div>
          {branding.showFooter && !focusMode && (
              <footer className="mt-12 text-center text-xs text-slate-400 pb-6 border-t border-slate-100 pt-6">
                  &copy; {new Date().getFullYear()} <span className="font-bold text-slate-500">SAKATO Enterprise System</span>. All rights reserved.
              </footer>
          )}
        </main>
      </div>
    </div>
  );
};
