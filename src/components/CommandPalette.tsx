
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Zap } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const actions = [
      { id: 'home', label: 'Go to Dashboard', path: '/', roles: [Role.ANGGOTA, Role.ADMIN, Role.SUPER_ADMIN] },
      { id: 'scan', label: 'Scan QR Absensi', path: '/attendance', roles: [Role.ANGGOTA, Role.ADMIN] },
      { id: 'add-event', label: 'Tambah Event Baru', path: '/events', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
      { id: 'add-member', label: 'Tambah Anggota', path: '/members', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
      { id: 'reports', label: 'Lihat Laporan', path: '/reports', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
      { id: 'settings', label: 'Pengaturan Sistem', path: '/settings', roles: [Role.ADMIN, Role.SUPER_ADMIN] },
      { id: 'logout', label: 'Log Out', action: logout, roles: [Role.ANGGOTA, Role.ADMIN, Role.SUPER_ADMIN] },
  ];

  const filteredActions = actions.filter(a => 
      a.label.toLowerCase().includes(query.toLowerCase()) && 
      user && a.roles.includes(user.role)
  );

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey && e.key === 'k') {
              e.preventDefault();
              setIsOpen(prev => !prev);
          }
          if (isOpen && e.key === 'Escape') {
              setIsOpen(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const execute = (action: any) => {
      if (action.path) navigate(action.path);
      if (action.action) action.action();
      setIsOpen(false);
      setQuery('');
  };

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
              <div className="p-4 border-b flex items-center gap-3">
                  <Search className="text-slate-400"/>
                  <input 
                      className="flex-1 outline-none text-lg" 
                      placeholder="Apa yang ingin Anda lakukan?" 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      autoFocus
                  />
                  <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">ESC</div>
              </div>
              <div className="overflow-y-auto p-2">
                  {filteredActions.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">Tidak ada hasil.</div>
                  ) : (
                      filteredActions.map((action, i) => (
                          <button
                              key={action.id}
                              onClick={() => execute(action)}
                              className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-colors ${i === selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <Zap size={16} className={i === selectedIndex ? 'text-blue-600' : 'text-slate-400'}/>
                                  <span className="font-medium">{action.label}</span>
                              </div>
                              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-400"/>
                          </button>
                      ))
                  )}
              </div>
          </div>
      </div>
  );
};
