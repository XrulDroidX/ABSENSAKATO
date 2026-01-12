
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { StorageService } from '../services/storage';
import { Role, User, BrandingConfig, FeatureConfig } from '../types';
import { Lock, Save, Shield, HardDrive, Palette, BellRing, Database, Upload, CheckCircle, Loader2, Download } from '../components/Icons';
import { useToast } from '../components/Toast';
import { Guard } from '../components/Guard';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'THEME' | 'PLUGINS' | 'DATA'>('GENERAL');
  const [branding, setBranding] = useState<BrandingConfig>(StorageService.getBranding());
  const [features, setFeatures] = useState<FeatureConfig>(StorageService.getFeatures());
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreTable, setRestoreTable] = useState('users');
  const [loading, setLoading] = useState(false);

  const handleSaveTheme = () => {
      StorageService.saveBranding(branding);
      addToast('success', "Tema tersimpan!");
  };

  const handleSavePlugins = () => {
      StorageService.saveFeatures(features);
      addToast('success', "Konfigurasi fitur tersimpan (Refresh required).");
  };

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900">Pengaturan Sistem</h2>

      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button onClick={() => setActiveTab('GENERAL')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'GENERAL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Akun</button>
          <Guard roles={[Role.ADMIN, Role.SUPER_ADMIN]}>
            <button onClick={() => setActiveTab('THEME')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'THEME' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Theme Builder</button>
            <button onClick={() => setActiveTab('PLUGINS')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'PLUGINS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Plugins</button>
            <button onClick={() => setActiveTab('DATA')} className={`px-4 py-2 text-sm font-bold ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Data Management</button>
          </Guard>
      </div>

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
              
              {/* LIVE PREVIEW */}
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
      
      {activeTab === 'GENERAL' && (
          <div className="p-10 text-center text-slate-400">Pengaturan akun standar...</div>
      )}
    </div>
  );
};
