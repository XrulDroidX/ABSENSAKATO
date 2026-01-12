
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../services/storage';
import { Role, BrandingConfig, FeatureConfig } from '../types';
import { Lock, Save, Shield, HardDrive, Palette, Database, Upload, CheckCircle, Loader2, Download, Smartphone, LogOut, History, User as UserIcon, Camera, Mail, Phone, AlertTriangle } from '../components/Icons';
import { useToast } from '../components/Toast';
import { Guard } from '../components/Guard';
import { ProfileUsecase } from '../usecases/profileUsecase';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'SYSTEM' | 'THEME' | 'PLUGINS' | 'DATA'>('ACCOUNT');
  
  // Config States
  const [branding, setBranding] = useState<BrandingConfig>(StorageService.getBranding());
  const [features, setFeatures] = useState<FeatureConfig>(StorageService.getFeatures());
  
  // Profile States
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password States
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  
  // Utils
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreTable, setRestoreTable] = useState('users');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // --- PROFILE LOGIC ---

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await ProfileUsecase.updateProfileInfo(user, profileForm.name, profileForm.phone, avatarFile || undefined);
      
      // Update email separately if changed
      if (profileForm.email !== user.email) {
        if (confirm("Mengganti email membutuhkan verifikasi ulang. Lanjutkan?")) {
           await ProfileUsecase.changeEmail(user, profileForm.email);
           addToast('info', "Cek email baru Anda untuk verifikasi.");
        }
      }

      addToast('success', "Profil berhasil diperbarui!");
      // Force reload to reflect changes or update context manually (Context refresh ideal)
      setTimeout(() => window.location.reload(), 1000); 
    } catch (e: any) {
      addToast('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!passForm.new || !passForm.confirm) return addToast('warning', "Lengkapi form password.");
    
    if (!confirm("Apakah Anda yakin ingin mengubah password?")) return;

    setLoading(true);
    try {
        await ProfileUsecase.changePassword(user, passForm.old, passForm.new, passForm.confirm);
        addToast('success', "Password berhasil diubah. Silakan login ulang.");
        setPassForm({ old: '', new: '', confirm: '' });
        setTimeout(() => logout(), 2000);
    } catch (e: any) {
        addToast('error', e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
      if (!user) return;
      if (!confirm("Ini akan mengeluarkan akun Anda dari SEMUA perangkat (termasuk ini). Lanjutkan?")) return;
      
      setLoading(true);
      try {
          await ProfileUsecase.logoutAllDevices(user);
          addToast('success', "Semua sesi berhasil di-reset.");
          setTimeout(() => logout(), 1500);
      } catch (e:any) {
          addToast('error', e.message);
      } finally {
          setLoading(false);
      }
  };

  // --- THEME & PLUGINS ---
  const handleSaveTheme = () => {
      StorageService.saveBranding(branding);
      addToast('success', "Tema tersimpan!");
  };

  const handleSavePlugins = () => {
      StorageService.saveFeatures(features);
      addToast('success', "Konfigurasi fitur tersimpan (Refresh required).");
  };

  // --- DATA RESTORE ---
  const handlePartialRestore = async () => {
      if (!restoreFile) return addToast('error', "Pilih file backup dulu.");
      if (!confirm(`Yakin restore tabel ${restoreTable}? Data ID sama akan ditimpa.`)) return;
      
      setLoading(true);
      try {
          const msg = await StorageService.restorePartial(restoreFile, restoreTable, user!);
          addToast('success', msg as string);
          setRestoreFile(null);
      } catch (e: any) {
          addToast('error', e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h2>
            <p className="text-slate-500 text-sm">Kelola akun, tampilan, dan preferensi aplikasi.</p>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setActiveTab('ACCOUNT')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'ACCOUNT' ? 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Akun Saya</button>
          <Guard roles={[Role.SUPER_ADMIN, Role.ADMIN]}>
              <button onClick={() => setActiveTab('SYSTEM')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'SYSTEM' ? 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>System Admin</button>
          </Guard>
          <Guard roles={[Role.ADMIN, Role.SUPER_ADMIN]}>
            <button onClick={() => setActiveTab('THEME')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'THEME' ? 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Theme</button>
            <button onClick={() => setActiveTab('PLUGINS')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'PLUGINS' ? 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Plugins</button>
            <button onClick={() => setActiveTab('DATA')} className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'DATA' ? 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Backup & Restore</button>
          </Guard>
      </div>

      {activeTab === 'ACCOUNT' && (
          <div className="grid lg:grid-cols-3 gap-8">
              {/* LEFT: Profile Form */}
              <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <UserIcon className="text-blue-600"/> Informasi Profil
                      </h3>
                      
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                          {/* Avatar Upload */}
                          <div className="flex flex-col items-center gap-3">
                              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-lg">
                                      {avatarPreview ? (
                                          <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar"/>
                                      ) : (
                                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                                              <UserIcon size={40}/>
                                          </div>
                                      )}
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Camera className="text-white" size={24}/>
                                  </div>
                              </div>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange}/>
                              <p className="text-[10px] text-slate-400 text-center">Klik untuk ubah foto<br/>Max 2MB</p>
                          </div>

                          {/* Inputs */}
                          <div className="flex-1 space-y-4 w-full">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Nama Lengkap</label>
                                  <input 
                                    className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={profileForm.name}
                                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                  />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Mail size={12}/> Email</label>
                                      <input 
                                        type="email"
                                        className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.email}
                                        onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Phone size={12}/> No HP</label>
                                      <input 
                                        className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                      />
                                  </div>
                              </div>
                              
                              <div className="flex justify-end pt-2">
                                  <button 
                                    onClick={handleUpdateProfile} 
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                  >
                                      {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Simpan Profil
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Lock className="text-blue-600"/> Keamanan Akun
                      </h3>
                      <div className="space-y-4 max-w-lg">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Password Lama</label>
                              <input 
                                type="password" 
                                className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm"
                                placeholder="••••••••"
                                value={passForm.old}
                                onChange={e => setPassForm({...passForm, old: e.target.value})}
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Password Baru</label>
                                  <input 
                                    type="password" 
                                    className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm"
                                    placeholder="Min 8 karakter"
                                    value={passForm.new}
                                    onChange={e => setPassForm({...passForm, new: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Konfirmasi</label>
                                  <input 
                                    type="password" 
                                    className="w-full border border-slate-300 p-2.5 rounded-lg mt-1 text-sm"
                                    placeholder="Ulangi password"
                                    value={passForm.confirm}
                                    onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                                  />
                              </div>
                          </div>
                          <button 
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2"
                          >
                              {loading ? <Loader2 className="animate-spin"/> : 'Ganti Password'}
                          </button>
                      </div>
                  </div>
              </div>

              {/* RIGHT: Session & Danger Zone */}
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100">
                      <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Shield size={18} className="text-green-600"/> Device Aktif</h4>
                      <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4">
                          <div className="flex items-start gap-3">
                              <Smartphone className="text-green-700 mt-1" size={24}/>
                              <div>
                                  <p className="font-bold text-green-800 text-sm">Perangkat Ini (Online)</p>
                                  <p className="text-xs text-green-600 mt-1 font-mono break-all">{navigator.userAgent}</p>
                                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-green-700">
                                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Terhubung Aman
                                  </div>
                              </div>
                          </div>
                      </div>
                      <button onClick={handleLogoutAll} className="w-full border-2 border-red-100 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 text-sm">
                          <LogOut size={16}/> Logout Semua Device
                      </button>
                  </div>

                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                      <h4 className="font-bold mb-2 flex items-center gap-2 text-red-800"><AlertTriangle size={18}/> Zona Bahaya</h4>
                      <p className="text-xs text-red-600 mb-4 leading-relaxed">
                          Menghapus akun bersifat permanen dan tidak dapat dikembalikan. Hubungi admin Super User untuk penghapusan akun.
                      </p>
                      {user?.role === Role.SUPER_ADMIN && (
                          <div className="text-center text-xs font-bold bg-white/50 p-2 rounded text-red-500">
                              Anda adalah Super Admin
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'SYSTEM' && (
          <div className="bg-slate-50 p-12 text-center rounded-2xl border-2 border-dashed border-slate-300">
              <History size={48} className="mx-auto text-slate-300 mb-4"/>
              <h3 className="font-bold text-slate-600">Admin Panel System</h3>
              <p className="text-sm text-slate-500 mt-2">Log Keamanan & Session Manager akan tampil di sini.</p>
          </div>
      )}

      {activeTab === 'THEME' && (
          <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Palette size={18}/> Visual Identity</h3>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Warna Utama</label>
                      <div className="flex gap-2 mt-1">
                          <input type="color" className="h-10 w-12 rounded cursor-pointer" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})}/>
                          <input className="flex-1 border px-2 rounded" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})}/>
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Border Radius</label>
                      <select className="w-full border p-2 rounded mt-1" value={branding.borderRadius} onChange={e => setBranding({...branding, borderRadius: e.target.value})}>
                          <option value="0px">Square (0px)</option>
                          <option value="0.25rem">Small (4px)</option>
                          <option value="0.5rem">Medium (8px)</option>
                          <option value="0.75rem">Large (12px)</option>
                          <option value="1.5rem">Round (24px)</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Font Family</label>
                      <select className="w-full border p-2 rounded mt-1" value={branding.fontFamily} onChange={e => setBranding({...branding, fontFamily: e.target.value})}>
                          <option value="Inter">Inter (Modern)</option>
                          <option value="Roboto">Roboto (Android)</option>
                          <option value="serif">Serif (Formal)</option>
                          <option value="monospace">Monospace (Code)</option>
                      </select>
                  </div>
                  <button onClick={handleSaveTheme} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Terapkan Tema</button>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-dashed flex items-center justify-center">
                   <div style={{ fontFamily: branding.fontFamily }} className="bg-white p-6 shadow-lg w-64 space-y-4 transition-all" >
                       <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                       <div className="h-20 w-full bg-slate-100 rounded"></div>
                       <button style={{ backgroundColor: branding.primaryColor, borderRadius: branding.borderRadius }} className="w-full text-white py-2 font-bold shadow-lg shadow-blue-500/30">
                           Button Preview
                       </button>
                   </div>
              </div>
          </div>
      )}

      {activeTab === 'PLUGINS' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-bold mb-4">Feature Flags (Plugin System)</h3>
              <div className="space-y-3">
                  {Object.keys(features).map((key) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                          <span className="font-bold capitalize">{key}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={(features as any)[key]} onChange={(e) => setFeatures({...features, [key]: e.target.checked})} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                      </div>
                  ))}
              </div>
              <button onClick={handleSavePlugins} className="mt-4 bg-slate-900 text-white px-6 py-2 rounded font-bold">Simpan Konfigurasi</button>
          </div>
      )}

      {activeTab === 'DATA' && (
          <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-bold mb-2 flex items-center gap-2"><Download size={18}/> Snapshot Backup</h3>
                  <p className="text-xs text-slate-500 mb-4">Download data JSON untuk backup manual.</p>
                  <div className="space-y-2">
                      <button onClick={() => StorageService.backupDatabase('users')} className="w-full border p-2 rounded text-left hover:bg-slate-50 text-sm font-medium">Backup Users Only</button>
                      <button onClick={() => StorageService.backupDatabase('events')} className="w-full border p-2 rounded text-left hover:bg-slate-50 text-sm font-medium">Backup Events Only</button>
                      <button onClick={() => StorageService.backupDatabase()} className="w-full bg-blue-50 border border-blue-200 text-blue-700 p-2 rounded text-left font-bold text-sm">Full Backup (All)</button>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h3 className="font-bold mb-2 flex items-center gap-2"><Upload size={18}/> Partial Restore</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500">Target Tabel</label>
                          <select className="w-full border p-2 rounded mt-1" value={restoreTable} onChange={e => setRestoreTable(e.target.value)}>
                              <option value="users">Users</option>
                              <option value="events">Events</option>
                              <option value="attendance">Attendance</option>
                          </select>
                      </div>
                      <input type="file" accept=".json" onChange={e => setRestoreFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      <button disabled={loading} onClick={handlePartialRestore} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50 flex justify-center">
                          {loading ? <Loader2 className="animate-spin"/> : 'Restore Data'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
