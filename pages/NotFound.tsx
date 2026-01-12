import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from '../components/Icons';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
         <AlertTriangle size={48} />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-700 mb-4">Halaman Tidak Ditemukan</h2>
      <p className="text-slate-500 max-w-md mb-8">
        Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau link yang Anda masukkan salah.
      </p>
      <Link to="/" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-bold shadow-lg">
         <Home size={20}/> Kembali ke Dashboard
      </Link>
    </div>
  );
};