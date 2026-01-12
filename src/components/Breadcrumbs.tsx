
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from './Icons';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap: Record<string, string> = {
      'members': 'Anggota',
      'events': 'Event',
      'attendance': 'Absensi',
      'settings': 'Pengaturan',
      'audit-logs': 'Audit Logs',
      'rewards': 'Rewards',
      'permissions': 'Perizinan',
      'reports': 'Laporan',
      'recycle-bin': 'Recycle Bin',
      'analytics': 'Analytics',
      'agendas': 'Agenda'
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center text-xs text-slate-500 mb-4 animate-fade-in">
      <Link to="/" className="hover:text-blue-600 transition-colors">
        <Home size={14} />
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNameMap[value] || value;

        return (
          <div key={to} className="flex items-center">
            <ChevronRight size={12} className="mx-1" />
            {isLast ? (
              <span className="font-bold text-slate-700 capitalize">{name}</span>
            ) : (
              <Link to={to} className="hover:text-blue-600 capitalize transition-colors">
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};
