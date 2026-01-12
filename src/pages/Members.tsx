
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { User, Role } from '../types';
import { Plus, Trash2, Edit, Search, Lock, Shield, Smartphone, Power, X } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Guard } from '../components/Guard';

export const Members: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // State for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  
  // Action Confirmation
  const [confirmAction, setConfirmAction] = useState<{
      type: 'DELETE' | 'RESET_PASS' | 'RESET_DEVICE' | 'TOGGLE_STATUS' | 'BULK_DELETE' | 'BULK_RESET';
      id?: string;
      name?: string;
      value?: any; // e.g. status boolean
  } | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newNote, setNewNote] = useState('');

  const fetchUsers = async () => {
      try {
          const data = await ApiService.getUsers();
          setUsers(data);
      } catch (e) {
          addToast('error', 'Gagal memuat data anggota.');
      }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filter Logic
  useEffect(() => {
      let res = users.filter(u => !u.deleted);
      if (searchTerm) {
          res = res.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.nia?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      if (roleFilter !== 'ALL') {
          res = res.filter(u => u.role === roleFilter);
      }
      if (divisionFilter !== 'ALL') {
          res = res.filter(u => u.division === divisionFilter);
      }
      setFilteredUsers(res);
  }, [users, searchTerm, roleFilter, divisionFilter]);

  // Permissions Helper
  const canManage = (targetUser: User) => {
      if (!currentUser) return false;
      if (currentUser.role === Role.SUPER_ADMIN) return true;
      if (currentUser.role === Role.ADMIN) return targetUser.role !== Role.SUPER_ADMIN && targetUser.role !== Role.ADMIN;
      return false; // Pengurus/Anggota cannot manage
  };

  const executeAction = async () => {
      if (!confirmAction) return;
      const { type, id, name, value } = confirmAction;
      setConfirmAction(null); 

      try {
          if (type === 'DELETE' && id) {
              await ApiService.deleteUser(id, currentUser!);
              addToast('success', `Anggota ${name} dihapus.`);
          }
          else if (type === 'RESET_PASS' && id) {
              await ApiService.resetUserPassword(id, 'sakato123', currentUser!);
              addToast('success', `Password ${name} direset ke default (sakato123).`);
          }
          else if (type === 'RESET_DEVICE' && id) {
              await ApiService.resetUserDevice(id, currentUser!);
              addToast('success', `Device binding ${name} dilepas.`);
          }
          else if (type === 'TOGGLE_STATUS' && id) {
              await ApiService.toggleUserStatus(id, value, currentUser!);
              addToast('success', `Status ${name} diperbarui.`);
          }
          else if (type === 'BULK_DELETE') {
              const ids = Array.from(selectedIds) as string[];
              for (const uid of ids) await ApiService.deleteUser(uid, currentUser!);
              addToast('success', `${ids.length} anggota dihapus.`);
              setSelectedIds(new Set());
          }

          fetchUsers();
      } catch (err: any) {
          const msg = (err instanceof Error) ? err.message : String(err);
          addToast('error', msg || "Gagal melakukan aksi.");
      }
  };

  // UI Handlers
  const handleEdit = (u: User) => {
      if (!canManage(u)) return addToast('error', "Akses Ditolak");
      setEditingUser(u);
      setNewNote('');
      setShowModal(true);
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const ids = filteredUsers.filter(u => canManage(u)).map(u => u.id);
          setSelectedIds(new Set(ids));
      } else {
          setSelectedIds(new Set());
      }
  };

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  // Unique Divisions for Filter
  const divisions = Array.from(new Set(users.map(u => u.division))).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Manajemen Anggota</h2>
                <p className="text-sm text-slate-500">Kelola data, role, dan keamanan akun anggota.</p>
            </div>
            
            <Guard roles={[Role.SUPER_ADMIN, Role.ADMIN]}>
                <button onClick={() => { setEditingUser({role: Role.ANGGOTA, isActive: true}); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-blue-700 transition-colors">
                    <Plus size={18}/> Tambah Anggota
                </button>
            </Guard>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/>
                <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cari Nama / NIA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <div className="flex gap-2">
                <select className="border p-2 rounded-lg text-sm bg-slate-50" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                    <option value="ALL">Semua Role</option>
                    <option value={Role.SUPER_ADMIN}>Super Admin</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.PENGURUS}>Pengurus</option>
                    <option value={Role.ANGGOTA}>Anggota</option>
                </select>
                <select className="border p-2 rounded-lg text-sm bg-slate-50" value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}>
                    <option value="ALL">Semua Divisi</option>
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs">
                    <tr>
                        <th className="px-6 py-4 w-10">
                            <input type="checkbox" onChange={toggleSelectAll} className="cursor-pointer"/>
                        </th>
                        <th className="px-6 py-4">Profil</th>
                        <th className="px-6 py-4">Divisi & Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => (
                        <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-6 py-4">
                                {canManage(u) && <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="cursor-pointer"/>}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{u.name[0]}</div>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{u.name}</div>
                                        <div className="text-xs text-slate-500">{u.nia}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-slate-900 font-medium">{u.division}</div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    <span className="text-xs text-slate-600">{u.isActive ? 'Aktif' : 'Nonaktif'}</span>
                                    {u.deviceId ? <span title="Device Linked"><Smartphone size={14} className="text-blue-500"/></span> : <span title="No Device"><Smartphone size={14} className="text-slate-300"/></span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-1">
                                    {canManage(u) ? (
                                        <>
                                            <button onClick={() => setConfirmAction({type: 'RESET_DEVICE', id: u.id, name: u.name})} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Reset Device"><Smartphone size={16}/></button>
                                            <button onClick={() => setConfirmAction({type: 'RESET_PASS', id: u.id, name: u.name})} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Reset Password"><Lock size={16}/></button>
                                            <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16}/></button>
                                            <button onClick={() => setConfirmAction({type: 'TOGGLE_STATUS', id: u.id, name: u.name, value: !u.isActive})} className={`p-1.5 rounded ${u.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`} title={u.isActive ? "Matikan Akun" : "Aktifkan Akun"}><Power size={16}/></button>
                                            <button onClick={() => setConfirmAction({type: 'DELETE', id: u.id, name: u.name})} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus"><Trash2 size={16}/></button>
                                        </>
                                    ) : <span className="text-slate-300 text-xs italic">Read Only</span>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* BULK ACTION BAR */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in-up">
                <span className="font-bold text-sm">{selectedIds.size} Dipilih</span>
                <div className="h-4 w-[1px] bg-slate-700"></div>
                <button type="button" onClick={() => setConfirmAction({type: 'BULK_DELETE'})} className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold">
                    <Trash2 size={16}/> Hapus
                </button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-2 bg-slate-800 p-1 rounded-full hover:bg-slate-700">
                    <X size={16}/>
                </button>
            </div>
        )}

        {/* CONFIRMATION MODAL */}
        {confirmAction && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-scale-in">
                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-600">
                        {confirmAction.type.includes('DELETE') ? <Trash2 size={32} className="text-red-500"/> : <Shield size={32}/>}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Konfirmasi Tindakan</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        {confirmAction.type === 'DELETE' && `Hapus akun "${confirmAction.name}"?`}
                        {confirmAction.type === 'RESET_PASS' && `Reset password "${confirmAction.name}" ke default?`}
                        {confirmAction.type === 'RESET_DEVICE' && `Lepaskan device binding "${confirmAction.name}"?`}
                        {confirmAction.type === 'TOGGLE_STATUS' && `${confirmAction.value ? 'Aktifkan' : 'Nonaktifkan'} akun "${confirmAction.name}"?`}
                        {confirmAction.type === 'BULK_DELETE' && `Hapus ${selectedIds.size} akun terpilih?`}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-slate-100 font-bold text-slate-600 rounded-lg">Batal</button>
                        <button onClick={executeAction} className="flex-1 py-2 bg-blue-600 font-bold text-white rounded-lg hover:bg-blue-700">Ya, Proses</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
