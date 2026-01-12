
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AuditLog, Role } from '../types';
import { useAuth } from '../App';
import { ShieldAlert, Search, Download, Terminal, ChevronRight, ChevronLeft, Play, PauseCircle } from '../components/Icons';
import { exportToCSV } from '../services/utils';

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Playback State
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN) {
        const data = StorageService.getAuditLogs().sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setLogs(data);
    }
  }, [user]);

  useEffect(() => {
      let interval: any;
      if (isPlaying && playbackMode) {
          interval = setInterval(() => {
              setPlaybackIndex(prev => {
                  if (prev >= logs.length - 1) {
                      setIsPlaying(false);
                      return prev;
                  }
                  return prev + 1;
              });
          }, 1000); // 1 sec per log step
      }
      return () => clearInterval(interval);
  }, [isPlaying, playbackMode, logs]);

  const handleExport = async () => {
      const pin = prompt("Masukkan PIN Organisasi untuk Secure Export:");
      if (!pin) return;
      try {
          await StorageService.secureExport(logs, 'audit_logs_secure', pin, 'PDF');
      } catch (e:any) {
          alert(e.message);
      }
  };

  if (user?.role !== Role.SUPER_ADMIN && user?.role !== Role.ADMIN) {
      return <div className="p-10 text-center text-red-600 font-bold">Akses Ditolak.</div>;
  }

  const currentLog = logs[playbackIndex];

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="text-red-600"/> Audit Logs
                </h2>
                <p className="text-slate-600 text-sm">Rekaman aktivitas dengan Difference Tracking.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { setPlaybackMode(!playbackMode); setIsPlaying(false); setPlaybackIndex(0); }} className={`px-4 py-2 rounded-lg font-bold text-sm ${playbackMode ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {playbackMode ? 'Close Playback' : 'Playback Mode'}
                </button>
                <button onClick={handleExport} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 text-sm font-bold shadow-sm">
                    <Download size={16}/> Secure Export
                </button>
            </div>
        </div>

        {playbackMode ? (
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400"><Terminal size={20}/> Activity Playback</h3>
                <div className="h-64 flex items-center justify-center border border-slate-700 rounded-lg bg-black/50 relative overflow-hidden">
                    {currentLog ? (
                        <div className="text-center space-y-2 animate-fade-in-up">
                            <p className="text-slate-400 font-mono text-sm">{new Date(currentLog.timestamp).toLocaleString()}</p>
                            <h2 className="text-3xl font-bold">{currentLog.actorName}</h2>
                            <div className="inline-block bg-blue-600 px-3 py-1 rounded text-sm font-bold">{currentLog.action}</div>
                            <p className="text-slate-300 max-w-md mx-auto">{currentLog.details}</p>
                        </div>
                    ) : <p className="text-slate-500">No logs available.</p>}
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-white text-black rounded-full hover:bg-slate-200">
                        {isPlaying ? <PauseCircle size={24}/> : <Play size={24}/>}
                    </button>
                    <input 
                        type="range" min="0" max={logs.length - 1} value={playbackIndex} 
                        onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                        className="flex-1 accent-blue-500"
                    />
                    <span className="font-mono text-xs">{playbackIndex + 1} / {logs.length}</span>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[75vh]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="text-slate-400 w-4 h-4"/>
                    <input 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full"
                        placeholder="Cari User atau Aksi..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Waktu</th>
                                <th className="px-4 py-3">Aktor</th>
                                <th className="px-4 py-3">Aksi</th>
                                <th className="px-4 py-3">Detail</th>
                                <th className="px-4 py-3">Diff</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.filter(l => l.actorName.toLowerCase().includes(searchTerm.toLowerCase())).map(log => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-2 font-bold text-slate-800">{log.actorName}</td>
                                        <td className="px-4 py-2 font-bold text-slate-900">{log.action}</td>
                                        <td className="px-4 py-2 text-slate-600 truncate max-w-xs">{log.details}</td>
                                        <td className="px-4 py-2">
                                            {log.diff && log.diff.length > 0 ? (
                                                <span className="text-blue-600 flex items-center gap-1 font-bold">{expandedRow === log.id ? <ChevronLeft size={12} className="-rotate-90"/> : <ChevronRight size={12}/>} View Diff</span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                    </tr>
                                    {expandedRow === log.id && log.diff && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={5} className="p-4">
                                                <div className="bg-white border rounded-lg p-3 shadow-inner">
                                                    <h4 className="font-bold mb-2">Perubahan Data:</h4>
                                                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                                                        <div className="font-bold text-slate-500">Field</div>
                                                        <div className="font-bold text-red-600">Sebelum</div>
                                                        <div className="font-bold text-green-600">Sesudah</div>
                                                        {log.diff.map((d, i) => (
                                                            <React.Fragment key={i}>
                                                                <div className="border-b py-1">{d.field}</div>
                                                                <div className="border-b py-1 text-red-600 bg-red-50 px-1">{JSON.stringify(d.old)}</div>
                                                                <div className="border-b py-1 text-green-600 bg-green-50 px-1">{JSON.stringify(d.new)}</div>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};
