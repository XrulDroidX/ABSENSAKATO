
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Reward, PointLog, Role, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Gift, Plus, Trash2, Coins, History, Award, Loader2, Save, X } from '../components/Icons';
import { generateId } from '../services/utils';

export const Rewards: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Reward>>({ name: '', description: '', minPoints: 100 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setRewards(StorageService.getRewards());
    // Get latest user data for fresh point balance
    const users = await StorageService.getUsers();
    const me = users.find(u => u.id === user?.id);
    if (me) setCurrentUser(me);

    // Logs
    const allLogs = StorageService.getPointLogs();
    if (isAdmin) {
        setPointLogs(allLogs);
    } else {
        setPointLogs(allLogs.filter(l => l.userId === user?.id));
    }
  };

  const handleSaveReward = async () => {
      if (!formData.name || !formData.minPoints) return alert("Nama dan Poin wajib diisi");
      setLoading(true);
      try {
          const payload: Reward = {
              id: generateId(),
              name: formData.name,
              description: formData.description || '',
              minPoints: Number(formData.minPoints),
              imageUrl: formData.imageUrl
          };
          await StorageService.saveReward(payload, user!);
          setShowModal(false);
          loadData();
          alert("Reward berhasil disimpan");
      } catch (e: any) {
          alert("Gagal: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteReward = async (id: string) => {
      if (!confirm("Hapus reward ini?")) return;
      await StorageService.deleteReward(id, user!);
      loadData();
  };

  const handleClaim = async (reward: Reward) => {
      if (!confirm(`Tukar ${reward.minPoints} poin untuk "${reward.name}"?`)) return;
      setLoading(true);
      try {
          await StorageService.claimReward(reward.id, user!.id);
          alert("Berhasil Klaim! Hubungi admin untuk pengambilan.");
          loadData();
      } catch (e: any) {
          alert("Gagal Klaim: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
               <Gift className="text-purple-600"/> Rewards & Poin
           </h2>
           <p className="text-slate-600 text-sm">Tukarkan poin keaktifan dengan hadiah menarik.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200 flex items-center gap-2 shadow-sm">
                <Coins size={20} className="text-yellow-600"/>
                <div>
                    <p className="text-[10px] font-bold uppercase opacity-70">Poin Saya</p>
                    <p className="text-xl font-bold leading-none">{currentUser?.totalPoints || 0}</p>
                </div>
            </div>
            {isAdmin && (
                <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm font-medium">
                    <Plus size={18}/> Tambah Reward
                </button>
            )}
        </div>
      </div>

      {/* REWARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => {
             const canClaim = (currentUser?.totalPoints || 0) >= reward.minPoints;
             return (
                 <div key={reward.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
                     <div className="h-32 bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                         {reward.imageUrl ? <img src={reward.imageUrl} className="w-full h-full object-cover"/> : <Gift size={48} className="text-white opacity-50"/>}
                     </div>
                     <div className="p-5 flex-1 flex flex-col">
                         <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-lg text-slate-900">{reward.name}</h3>
                             <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                 <Coins size={12}/> {reward.minPoints}
                             </span>
                         </div>
                         <p className="text-slate-600 text-sm mb-4 flex-1">{reward.description}</p>
                         
                         {isAdmin ? (
                             <button onClick={() => handleDeleteReward(reward.id)} className="w-full py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm font-medium flex items-center justify-center gap-2">
                                 <Trash2 size={16}/> Hapus
                             </button>
                         ) : (
                             <button 
                                onClick={() => canClaim && handleClaim(reward)}
                                disabled={!canClaim || loading}
                                className={`w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2
                                    ${canClaim ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                                `}
                             >
                                 {loading ? <Loader2 className="animate-spin"/> : canClaim ? 'Klaim Sekarang' : 'Poin Tidak Cukup'}
                             </button>
                         )}
                     </div>
                 </div>
             );
          })}
          {rewards.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Gift size={48} className="mx-auto mb-2 opacity-20"/>
                  <p>Belum ada reward tersedia.</p>
              </div>
          )}
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <History size={18} className="text-slate-500"/>
              <h3 className="font-bold text-slate-700">Riwayat Perubahan Poin</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr>
                          <th className="px-6 py-3">Waktu</th>
                          {isAdmin && <th className="px-6 py-3">User ID</th>}
                          <th className="px-6 py-3">Keterangan</th>
                          <th className="px-6 py-3 text-right">Perubahan</th>
                          <th className="px-6 py-3 text-right">Saldo Akhir</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pointLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                              {isAdmin && <td className="px-6 py-3 font-mono text-xs">{log.userId}</td>}
                              <td className="px-6 py-3">{log.reason}</td>
                              <td className={`px-6 py-3 text-right font-bold ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {log.change > 0 ? '+' : ''}{log.change}
                              </td>
                              <td className="px-6 py-3 text-right font-mono">{log.finalBalance}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* ADD REWARD MODAL */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                  <h3 className="font-bold text-lg">Buat Reward Baru</h3>
                  <input className="w-full border p-2 rounded" placeholder="Nama Reward" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                  <textarea className="w-full border p-2 rounded" placeholder="Deskripsi" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                      <label className="text-xs font-bold text-yellow-800">Harga Poin</label>
                      <input type="number" className="w-full border p-2 rounded mt-1" value={formData.minPoints} onChange={e => setFormData({...formData, minPoints: Number(e.target.value)})}/>
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                      <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Batal</button>
                      <button onClick={handleSaveReward} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold flex items-center gap-2">
                          {loading ? <Loader2 className="animate-spin"/> : <Save size={16}/>} Simpan
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
