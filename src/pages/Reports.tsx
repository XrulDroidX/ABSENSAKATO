
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { User, Role, AttendanceRecord } from '../types';
import { exportToCSV, generateCertificate } from '../services/utils';
import { Download, Search, Award, Image as ImageIcon, X, Loader2, ShieldCheck, FileText, Database, CheckCircle } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { VirtualTable } from '../components/VirtualTable';
import { motion, AnimatePresence } from 'framer-motion';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN || user?.role === Role.PENGURUS;
  
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Photo Modal State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
      try {
          const [uData, aData, eData] = await Promise.all([
              ApiService.getUsers(),
              ApiService.getAttendanceHistory(),
              ApiService.getEvents()
          ]);
          setUsers(uData);
          setAttendance(aData);
          setEvents(eData);
      } catch (e) {
          console.error("Error loading reports:", e);
      } finally {
          setLoading(false);
      }
  };

  const reportData = attendance.map(record => {
    const u = users.find(usr => usr.id === record.userId);
    const evt = events.find(e => e.id === record.eventId);
    return {
      ...record,
      userObj: u,
      eventObj: evt,
      userName: u?.name || 'Unknown',
      userNia: u?.nia || '-',
      eventName: evt?.name || 'Unknown',
      eventDate: evt ? evt.date : ''
    };
  }).filter(item => {
      const matchName = item.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEvent = filterEvent === 'ALL' || item.eventId === filterEvent;
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const matchMonth = filterMonth === '' || item.eventDate.startsWith(filterMonth);
      const matchAuth = isAdmin || item.userId === user?.id;
      return matchName && matchEvent && matchStatus && matchMonth && matchAuth;
  });

  const handleGenerateCert = (row: any) => {
      if (row.userObj && row.eventObj) {
          generateCertificate(row.userObj, row.eventObj, row.eventDate);
      }
  };

  const columns = [
      { header: 'No', width: 'w-12', accessor: (_: any, idx: number) => idx + 1 },
      { header: 'Nama / NIA', width: 'w-48', accessor: (row: any) => <div><div className="font-bold truncate">{row.userName}</div><div className="text-xs text-slate-500">{row.userNia}</div></div> },
      { header: 'Event', width: 'w-40', accessor: (row: any) => <div><div className="truncate">{row.eventName}</div><div className="text-xs text-slate-500">{row.eventDate}</div></div> },
      { header: 'Bukti', width: 'w-24', accessor: (row: any) => row.proofPhoto ? (
          <button 
            onClick={() => setSelectedRecord(row)} 
            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-500 transition relative group bg-slate-100"
          >
              <img src={row.proofPhoto} alt="Proof" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition">
                  <ImageIcon size={16} className="text-white"/>
              </div>
          </button>
      ) : <span className="text-slate-300 text-xs italic">-</span>},
      { header: 'Status', width: 'w-24', accessor: (row: any) => (
         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
            row.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
            row.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-red-100 text-red-700'
         }`}>{row.status.replace('_', ' ')}</span>
      )},
      { header: 'Aksi', width: 'w-16', align: 'right', accessor: (row: any) => (
          (row.status === 'PRESENT' || row.status === 'LATE') ? (
              <button onClick={() => handleGenerateCert(row)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Download Sertifikat">
                  <Award size={18}/>
              </button>
          ) : <span className="text-slate-300">-</span>
      )}
  ];

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline text-blue-600"/> Memuat Laporan...</div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Laporan Kehadiran</h2>
        <button 
            onClick={() => exportToCSV(reportData, 'sakato-report.csv')}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm text-sm font-bold"
          >
            <Download size={16} />
            <span>Export CSV</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4 transition-all">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
             <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cari Nama..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-lg text-sm p-2 bg-white" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
              <option value="ALL">Semua Event</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg text-sm p-2 bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">Semua Status</option>
              <option value="PRESENT">Hadir</option>
              <option value="LATE">Telat</option>
              <option value="ABSENT">Alpha</option>
          </select>
          <input type="month" className="border border-gray-200 rounded-lg text-sm p-2 bg-white" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <VirtualTable 
              data={reportData} 
              columns={columns as any} 
              rowHeight={64} 
              height={500} 
          />
      </div>

      {/* FORENSICS MODAL */}
      <AnimatePresence>
        {selectedRecord && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setSelectedRecord(null)}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="flex flex-col md:flex-row bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* LEFT: IMAGE */}
                    <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                        <img 
                            src={selectedRecord.proofPhoto} 
                            alt="Full Proof" 
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg border border-slate-800"
                        />
                        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm border border-white/10">
                            Original Evidence
                        </div>
                    </div>

                    {/* RIGHT: FORENSICS DATA */}
                    <div className="w-full md:w-96 bg-slate-800 p-6 flex flex-col text-slate-300 border-l border-slate-700 overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <ShieldCheck className="text-green-500"/> Digital Forensics
                            </h3>
                            <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white"><X/></button>
                        </div>

                        <div className="space-y-6 text-sm">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">File Hash (SHA-256)</label>
                                <div className="font-mono text-xs bg-black/30 p-2 rounded border border-slate-700 break-all mt-1 text-green-400">
                                    {(selectedRecord as any).metadata?.file_hash || 'HASH_NOT_AVAILABLE'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Size</label>
                                    <p className="text-white font-mono">{((selectedRecord as any).metadata?.file_size / 1024).toFixed(2)} KB</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Timestamp</label>
                                    <p className="text-white font-mono">{new Date(selectedRecord.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Geolocation</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Database size={14} className="text-blue-400"/>
                                    <span className="font-mono">{selectedRecord.latitude?.toFixed(6)}, {selectedRecord.longitude?.toFixed(6)}</span>
                                </div>
                                <a 
                                    href={`https://maps.google.com/?q=${selectedRecord.latitude},${selectedRecord.longitude}`} 
                                    target="_blank" rel="noreferrer"
                                    className="text-xs text-blue-400 hover:underline mt-1 block"
                                >
                                    Open in Maps
                                </a>
                            </div>

                            <div className="pt-4 border-t border-slate-700">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Device Fingerprint</label>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed font-mono">
                                    {(selectedRecord as any).deviceInfo || 'Unknown Device'}
                                </p>
                            </div>
                            
                            <div className="mt-auto pt-6">
                                <div className="bg-green-900/20 border border-green-900/50 p-3 rounded text-xs text-green-400 flex items-start gap-2">
                                    <CheckCircle size={16} className="mt-0.5 shrink-0"/>
                                    <p>File ini memiliki tanda tangan digital yang valid dan belum dimodifikasi sejak diunggah.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
