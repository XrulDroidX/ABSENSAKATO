
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Agenda, AgendaCategory } from '../types';
import { useAuth } from '../App';
import { generateId, formatDate } from '../services/utils';
import { CalendarDays, Plus, Trash2, Edit, Save, X, Loader2, Tag } from '../components/Icons';

export const Agendas: React.FC = () => {
  const { user } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [agendaForm, setAgendaForm] = useState<Partial<Agenda>>({});
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    loadAgendas();
  }, []);

  const loadAgendas = () => {
    setAgendas(StorageService.getAgendas());
  };

  const handleSaveAgenda = async () => {
      if (!agendaForm.title || !agendaForm.date) return alert("Judul dan Tanggal wajib diisi");
      setLoading(true);
      try {
          const payload: Agenda = {
              id: agendaForm.id || generateId(),
              title: agendaForm.title,
              date: agendaForm.date,
              time: agendaForm.time || '08:00',
              category: agendaForm.category || AgendaCategory.LAINNYA,
              description: agendaForm.description || '',
              createdBy: user!.id,
              createdAt: agendaForm.createdAt || new Date().toISOString()
          };
          await StorageService.saveAgenda(payload, user!);
          loadAgendas();
          setShowModal(false);
      } catch (e: any) {
          alert("Gagal simpan agenda: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteAgenda = async (id: string) => {
      if(confirm("Hapus agenda ini?")) {
          await StorageService.deleteAgenda(id, user!);
          loadAgendas();
      }
  };

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case AgendaCategory.RAPAT: return 'bg-blue-100 text-blue-700';
          case AgendaCategory.PELATIHAN: return 'bg-purple-100 text-purple-700';
          case AgendaCategory.DARURAT: return 'bg-red-100 text-red-700';
          case AgendaCategory.SOSIAL: return 'bg-green-100 text-green-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  const filteredAgendas = agendas
    .filter(a => filterCategory === 'ALL' || a.category === filterCategory)
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="text-blue-600"/> Manajemen Agenda
                </h2>
                <p className="text-slate-500 text-sm">Kelola jadwal kegiatan organisasi.</p>
            </div>
            <div className="flex gap-2">
                 <select className="border p-2 rounded-lg text-sm bg-white" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                     <option value="ALL">Semua Kategori</option>
                     {Object.keys(AgendaCategory).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <button onClick={() => {setAgendaForm({}); setShowModal(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
                    <Plus size={18}/> Buat Agenda
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgendas.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <CalendarDays className="mx-auto text-slate-300 mb-2" size={48}/>
                    <p className="text-slate-500">Belum ada agenda tersimpan.</p>
                </div>
            ) : (
                filteredAgendas.map(agenda => {
                    const isToday = agenda.date === new Date().toISOString().split('T')[0];
                    return (
                        <div key={agenda.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all relative group">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${getCategoryColor(agenda.category)}`}>
                                    {agenda.category}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {setAgendaForm(agenda); setShowModal(true);}} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDeleteAgenda(agenda.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{agenda.title}</h3>
                            <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                                {formatDate(agenda.date)} • {agenda.time} WIB
                            </p>
                            {agenda.description && (
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-3">
                                    {agenda.description}
                                </p>
                            )}
                        </div>
                    );
                })
            )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 animate-fade-in-up shadow-2xl">
                  <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="font-bold text-lg text-slate-900">
                          {agendaForm.id ? 'Edit Agenda' : 'Agenda Baru'}
                      </h3>
                      <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Judul Kegiatan</label>
                          <input className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Rapat Evaluasi" value={agendaForm.title || ''} onChange={e => setAgendaForm({...agendaForm, title: e.target.value})}/>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                          <select className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 bg-white" value={agendaForm.category || AgendaCategory.LAINNYA} onChange={e => setAgendaForm({...agendaForm, category: e.target.value as any})}>
                               {Object.keys(AgendaCategory).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
                              <input type="date" className="w-full border border-slate-300 p-2.5 rounded-lg mt-1" value={agendaForm.date || ''} onChange={e => setAgendaForm({...agendaForm, date: e.target.value})}/>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Jam</label>
                              <input type="time" className="w-full border border-slate-300 p-2.5 rounded-lg mt-1" value={agendaForm.time || ''} onChange={e => setAgendaForm({...agendaForm, time: e.target.value})}/>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Deskripsi</label>
                          <textarea className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Detail kegiatan..." value={agendaForm.description || ''} onChange={e => setAgendaForm({...agendaForm, description: e.target.value})}/>
                      </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                      <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Batal</button>
                      <button disabled={loading} onClick={handleSaveAgenda} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                          {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Simpan
                      </button>
                  </div>
              </div>
          </div>
        )}
    </div>
  );
};
