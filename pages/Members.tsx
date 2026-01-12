import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { User, Role } from '../types';
import { Plus, Trash2, Edit, Search, Lock, CheckCircle, AlertTriangle, X, FileText } from '../components/Icons';
import { generateId } from '../services/utils';
import { useAuth } from '../App';
import { useToast } from '../components/Toast';

export const Members: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Confirmation State
  const [confirmAction, setConfirmAction] = useState<{
      type: 'DELETE' | 'RESET' | 'BULK_DELETE' | 'BULK_RESET';
      id?: string;
      name?: string;
  } | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Admin Note State
  const [newNote, setNewNote] = useState('');

  const fetchUsers = async () => {
      const data = await StorageService.getUsers();
      setUsers([...data]); 
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation(); 
      setConfirmAction({ type: 'DELETE', id, name });
  };

  const handleResetClick = (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation();
      setConfirmAction({ type: 'RESET', id, name });
  };

  const handleEditClick = (e: React.MouseEvent, u: User) => {
      e.stopPropagation();
      setEditingUser(u); 
      setNewNote('');
      setShowModal(true);
  };

  const executeAction = async () => {
      if (!confirmAction) return;

      const { type, id, name } = confirmAction;
      setConfirmAction(null); 

      try {
          if (type === 'DELETE' && id) {
              if (id === currentUser?.id) throw new Error("Tidak bisa hapus akun sendiri.");
              setUsers(prev => prev.filter(u => u.id !== id));
              await StorageService.deleteUser(id, currentUser!);
              addToast('success', `Anggota ${name} dihapus.`);
          }
          
          else if (type === 'RESET' && id) {
              await StorageService.updatePassword(id, StorageService.DEFAULT_PASSWORD, currentUser!);
              addToast('success', `Password ${name} direset ke default.`);
          }

          else if (type === 'BULK_DELETE') {
              const ids = Array.from(selectedIds) as string[];
              setUsers(prev => prev.filter(u => !selectedIds.has(u.id))); 
              setSelectedIds(new Set());
              await StorageService.bulkDeleteUsers(ids, currentUser!);
              addToast('success', `${ids.length} anggota dihapus.`);
          }

          else if (type === 'BULK_RESET') {
              const ids = Array.from(selectedIds) as string[];
              setSelectedIds(new Set());
              await StorageService.bulkResetPasswords(ids, currentUser!);
              addToast('success', `${ids.length} password direset.`);
          }

      } catch (err: any) {
          addToast('error', err.message);
          fetchUsers(); 
      }
  };

  const handleSave = async () => {
      if (!editingUser.name || !editingUser.division) {
          addToast('warning', "Nama dan Divisi wajib diisi!");
          return;
      }
      try {
          // Add Note logic
          let updatedNotes = editingUser.adminNotes || [];
          if (newNote.trim()) {
              updatedNotes.push({
                  id: generateId(),
                  content: newNote,
                  date: new Date().toISOString(),
                  author: currentUser?.name || 'Admin'
              });
          }

          const payload: User = {
              id: editingUser.id || generateId(),
              nia: editingUser.nia || `NIA-${Date.now()}`,
              name: editingUser.name!,
              division: editingUser.division!,
              role: editingUser.role || Role.ANGGOTA,
              phone: editingUser.phone || '',
              email: editingUser.email || '',
              password: editingUser.password || StorageService.DEFAULT_PASSWORD,
              isActive: editingUser.isActive !== undefined ? editingUser.isActive : true,
              totalPoints: editingUser.totalPoints || 0,
              trustScore: 100,
              deviceId: editingUser.deviceId,
              adminNotes: updatedNotes
          };
          await StorageService.saveUser(payload, currentUser!);
          
          if (editingUser.id) {
              setUsers(prev => prev.map(u => u.id === payload.id ? payload : u));
          } else {
              setUsers(prev => [...prev, payload]);
          }

          addToast('success', `Data anggota disimpan.`);
          setShowModal(false);
      } catch (err: any) {
          addToast('error', "Gagal menyimpan: " + err.message);
      }
  };

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const allIds = users.filter(u => u.id !== currentUser?.id).map(u => u.id);
          setSelectedIds(new Set(allIds));
      } else {
          setSelectedIds(new Set());
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900">Anggota</h2>
            <button onClick={() => { setEditingUser({role: Role.ANGGOTA}); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">
                <Plus size={18}/> Tambah
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/>
                    <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cari Nama/NIA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-xs">
                    <tr>
                        <th className="px-6 py-4 w-10">
                            <input type="checkbox" onChange={toggleSelectAll} checked={users.length > 1 && selectedIds.size === users.length - 1} className="cursor-pointer"/>
                        </th>
                        <th className="px-6 py-4">Nama / NIA</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Poin</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                        <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-6 py-4">
                                {u.id !== currentUser?.id && (
                                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="cursor-pointer"/>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{u.name}</div>
                                <div className="text-xs text-slate-500">{u.nia}</div>
                            </td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === Role.ANGGOTA ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                            <td className="px-6 py-4 font-bold text-yellow-600">{u.totalPoints}</td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        type="button"
                                        onClick={(e) => handleResetClick(e, u.id, u.name)} 
                                        className="p-2 text-orange-600 bg-orange-50 rounded hover:bg-orange-100 transition-colors cursor-pointer" 
                                        title="Reset Password"
                                    >
                                        <Lock size={16}/>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => handleEditClick(e, u)} 
                                        className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                                    >
                                        <Edit size={16}/>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDeleteClick(e, u.id, u.name)} 
                                        className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada data anggota.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* BULK ACTION BAR */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-fade-in-up">
                <span className="font-bold text-sm">{selectedIds.size} Dipilih</span>
                <div className="h-4 w-[1px] bg-slate-700"></div>
                <button type="button" onClick={() => setConfirmAction({type: 'BULK_RESET'})} className="flex items-center gap-2 hover:text-orange-400 transition-colors text-sm font-bold cursor-pointer">
                    <Lock size={16}/> Reset Pass
                </button>
                <button type="button" onClick={() => setConfirmAction({type: 'BULK_DELETE'})} className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold cursor-pointer">
                    <Trash2 size={16}/> Hapus
                </button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-2 bg-slate-800 p-1 rounded-full hover:bg-slate-700 cursor-pointer">
                    <CheckCircle size={16}/>
                </button>
            </div>
        )}

        {/* FORM MODAL */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                    <h3 className="font-bold text-lg">{editingUser.id ? 'Edit' : 'Tambah'} Anggota</h3>
                    <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nama Lengkap" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}/>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="NIA" value={editingUser.nia} onChange={e => setEditingUser({...editingUser, nia: e.target.value})}/>
                        <input className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Divisi" value={editingUser.division} onChange={e => setEditingUser({...editingUser, division: e.target.value})}/>
                    </div>
                    <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})}>
                        <option value={Role.ANGGOTA}>Anggota</option>
                        <option value={Role.PENGURUS}>Pengurus</option>
                        <option value={Role.ADMIN}>Admin</option>
                    </select>
                    
                    {/* ADMIN NOTES */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <h4 className="text-xs font-bold text-yellow-800 flex items-center gap-1 mb-2">
                            <FileText size={12}/> Catatan Internal (Admin Only)
                        </h4>
                        <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                            {editingUser.adminNotes?.map(note => (
                                <div key={note.id} className="text-xs bg-white p-2 rounded border border-yellow-200">
                                    <p>{note.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(note.date).toLocaleString()} - {note.author}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input className="flex-1 text-xs border p-2 rounded" placeholder="Tambah catatan baru..." value={newNote} onChange={e => setNewNote(e.target.value)}/>
                        </div>
                    </div>

                    {editingUser.id && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded border">
                            <input type="checkbox" id="deviceReset" onChange={(e) => e.target.checked && setEditingUser({...editingUser, deviceId: undefined}) } />
                            <label htmlFor="deviceReset" className="text-xs text-slate-600">Reset Device Binding (Izinkan login di HP baru)</label>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors">Batal</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors">Simpan</button>
                    </div>
                </div>
            </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmAction && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                            confirmAction.type.includes('RESET') ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                        }`}>
                            {confirmAction.type.includes('RESET') ? <Lock size={32}/> : <Trash2 size={32}/>}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Konfirmasi Tindakan</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            {confirmAction.type === 'DELETE' && `Hapus "${confirmAction.name}"?`}
                            {confirmAction.type === 'RESET' && `Reset password "${confirmAction.name}"?`}
                            {confirmAction.type === 'BULK_DELETE' && `Hapus ${selectedIds.size} anggota?`}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                            <button onClick={executeAction} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors ${confirmAction.type.includes('RESET') ? 'bg-orange-600' : 'bg-red-600'}`}>Ya, Lanjutkan</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};