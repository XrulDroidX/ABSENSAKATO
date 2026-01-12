
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, RefreshCw, XCircle } from '../components/Icons';
import { User, Event } from '../types';

export const RecycleBin: React.FC = () => {
    const { user } = useAuth();
    const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
    const [deletedEvents, setDeletedEvents] = useState<Event[]>([]);
    const [activeTab, setActiveTab] = useState<'USERS' | 'EVENTS'>('USERS');

    useEffect(() => { fetchBin(); }, []);

    const fetchBin = async () => {
        const users = await StorageService.getUsers(true);
        const events = StorageService.getEvents(true);
        setDeletedUsers(users.filter(u => u.deleted));
        setDeletedEvents(events.filter(e => e.deleted));
    };

    const handleRestore = async (type: string, id: string) => {
        if (!confirm("Pulihkan item ini?")) return;
        await StorageService.restoreItem(type === 'USERS' ? 'users' : 'events', id, user!);
        fetchBin();
    };

    const handlePermanentDelete = async (type: string, id: string) => {
        if (!confirm("HAPUS PERMANEN? Data tidak bisa dikembalikan.")) return;
        await StorageService.permanentDelete(type === 'USERS' ? 'users' : 'events', id, user!);
        fetchBin();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="text-red-600" /> Recycle Bin
            </h2>

            <div className="flex gap-2 border-b border-slate-200">
                <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 font-bold ${activeTab === 'USERS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Anggota ({deletedUsers.length})</button>
                <button onClick={() => setActiveTab('EVENTS')} className={`px-4 py-2 font-bold ${activeTab === 'EVENTS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Event ({deletedEvents.length})</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Dihapus Pada</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTab === 'USERS' && deletedUsers.map(u => (
                            <tr key={u.id}>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.id}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{u.deletedAt ? new Date(u.deletedAt).toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleRestore('USERS', u.id)} className="text-green-600 hover:underline"><RefreshCw size={16}/></button>
                                    <button onClick={() => handlePermanentDelete('USERS', u.id)} className="text-red-600 hover:underline"><XCircle size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'EVENTS' && deletedEvents.map(e => (
                            <tr key={e.id}>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{e.name}</div>
                                    <div className="text-xs text-slate-500">{e.date}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{e.deletedAt ? new Date(e.deletedAt).toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleRestore('EVENTS', e.id)} className="text-green-600 hover:underline"><RefreshCw size={16}/></button>
                                    <button onClick={() => handlePermanentDelete('EVENTS', e.id)} className="text-red-600 hover:underline"><XCircle size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {((activeTab === 'USERS' && deletedUsers.length === 0) || (activeTab === 'EVENTS' && deletedEvents.length === 0)) && (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-400">Kosong.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
