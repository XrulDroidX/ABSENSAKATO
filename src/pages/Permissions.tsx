
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { PermissionRequest, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateId, formatDate } from '../services/utils';
import { FileSignature, CheckCircle, XCircle, Clock, Send, Plus, Loader2 } from '../components/Icons';

export const Permissions: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role !== Role.ANGGOTA;
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [events, setEvents] = useState(StorageService.getEvents().filter(e => e.status !== 'SELESAI'));
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
      eventId: '',
      reasonType: 'SICK',
      reasonDetail: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
      const allReqs = StorageService.getPermissions();
      // If admin, show all pending/processed. If member, show own.
      if (isAdmin) {
          setRequests(allReqs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
          setRequests(allReqs.filter(r => r.userId === user?.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.eventId || !formData.reasonDetail) {
          alert("Mohon lengkapi data izin.");
          return;
      }
      setLoading(true);
      try {
          const payload: PermissionRequest = {
              id: generateId(),
              userId: user!.id,
              eventId: formData.eventId,
              reasonType: formData.reasonType as any,
              reasonDetail: formData.reasonDetail,
              status: 'PENDING',
              timestamp: new Date().toISOString()
          };
          await StorageService.savePermission(payload);
          alert("Pengajuan Izin berhasil dikirim!");
          setShowForm(false);
          setFormData({ eventId: '', reasonType: 'SICK', reasonDetail: '' });
          loadData();
      } catch (err: any) {
          alert("Gagal: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleDecision = async (id: string, status: 'APPROVED' | 'REJECTED') => {
      if (!confirm(`Apakah anda yakin ingin ${status === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} izin ini?`)) return;
      try {
          await StorageService.updatePermissionStatus(id, status, user!.id);
          loadData();
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Perizinan Online</h2>
          <p className="text-sm text-slate-600">{isAdmin ? 'Kelola persetujuan izin anggota' : 'Ajukan izin ketidakhadiran'}</p>
        </div>
        {!isAdmin && (
             <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium">
                 {showForm ? 'Batal' : <><Plus size={18}/> Buat Izin Baru</>}
             </button>
        )}
      </div>

      {/* MEMBER FORM */}
      {showForm && !isAdmin && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 max-w-2xl mx-auto">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileSignature className="text-blue-600"/> Form Pengajuan Izin</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Pilih Kegiatan</label>
                      <select className="w-full border p-2 rounded" value={formData.eventId} onChange={e => setFormData({...formData, eventId: e.target.value})}>
                          <option value="">-- Pilih Event --</option>
                          {events.map(e => (
                              <option key={e.id} value={e.id}>{e.name} ({formatDate(e.date)})</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Alasan</label>
                      <select className="w-full border p-2 rounded" value={formData.reasonType} onChange={e => setFormData({...formData, reasonType: e.target.value})}>
                          <option value="SICK">Sakit</option>
                          <option value="FAMILY">Urusan Keluarga</option>
                          <option value="DUTY">Dinas / Tugas Luar</option>
                          <option value="OTHER">Lainnya</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Detail Keterangan</label>
                      <textarea className="w-full border p-2 rounded h-24" placeholder="Jelaskan alasan anda..." value={formData.reasonDetail} onChange={e => setFormData({...formData, reasonDetail: e.target.value})}></textarea>
                  </div>
                  <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                      {loading ? <Loader2 className="animate-spin"/> : <Send size={16}/>} Kirim Pengajuan
                  </button>
              </form>
          </div>
      )}

      {/* LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs">
                  <tr>
                      <th className="px-6 py-4">Waktu Pengajuan</th>
                      {isAdmin && <th className="px-6 py-4">ID Anggota</th>}
                      <th className="px-6 py-4">Event</th>
                      <th className="px-6 py-4">Alasan</th>
                      <th className="px-6 py-4">Status</th>
                      {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {requests.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Belum ada data perizinan.</td></tr>
                  ) : (
                      requests.map(req => {
                          const evt = events.find(e => e.id === req.eventId);
                          
                          return (
                              <tr key={req.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 text-slate-500">{new Date(req.timestamp).toLocaleDateString()}</td>
                                  {isAdmin && (
                                      <td className="px-6 py-4 font-bold">{req.userId}</td> 
                                  )}
                                  <td className="px-6 py-4">{evt?.name || 'Unknown Event'}</td>
                                  <td className="px-6 py-4">
                                      <span className="font-bold block text-xs mb-1 bg-slate-100 px-2 py-0.5 rounded w-fit">{req.reasonType}</span>
                                      <span className="text-slate-600">{req.reasonDetail}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                      {req.status === 'PENDING' && <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-bold"><Clock size={12}/> Pending</span>}
                                      {req.status === 'APPROVED' && <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12}/> Disetujui</span>}
                                      {req.status === 'REJECTED' && <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><XCircle size={12}/> Ditolak</span>}
                                  </td>
                                  {isAdmin && req.status === 'PENDING' && (
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleDecision(req.id, 'APPROVED')} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Terima"><CheckCircle size={18}/></button>
                                              <button onClick={() => handleDecision(req.id, 'REJECTED')} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Tolak"><XCircle size={18}/></button>
                                          </div>
                                      </td>
                                  )}
                              </tr>
                          );
                      })
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};
