
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { User, Role, AttendanceRecord } from '../types';
import { exportToCSV, generateCertificate } from '../services/utils';
import { Download, Search, Award } from '../components/Icons';
import { useAuth } from '../App';
import { VirtualTable } from '../components/VirtualTable';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN || user?.role === Role.PENGURUS;
  
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const events = StorageService.getEvents();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
      const u = await StorageService.getUsers();
      setUsers(u);
      setAttendance(StorageService.getAttendance());
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
      { header: 'No', width: 'w-16', accessor: (_: any, idx: number) => idx + 1 },
      { header: 'Nama / NIA', accessor: (row: any) => <div><div className="font-bold">{row.userName}</div><div className="text-xs text-slate-500">{row.userNia}</div></div> },
      { header: 'Event', accessor: (row: any) => <div><div>{row.eventName}</div><div className="text-xs text-slate-500">{row.eventDate}</div></div> },
      { header: 'Skor Kepercayaan', accessor: (row: any) => (
          <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${row.trustScore > 80 ? 'bg-green-500' : row.trustScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${row.trustScore}%`}}></div>
              </div>
              <span className="text-xs font-bold">{row.trustScore}</span>
          </div>
      )},
      { header: 'Status', accessor: (row: any) => (
         <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
            row.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
            row.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-red-100 text-red-700'
         }`}>{row.status.replace('_', ' ')}</span>
      )},
      { header: 'Aksi', align: 'right', accessor: (row: any) => (
          (row.status === 'PRESENT' || row.status === 'LATE') ? (
              <button onClick={() => handleGenerateCert(row)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Download Sertifikat">
                  <Award size={16}/>
              </button>
          ) : <span className="text-slate-300">-</span>
      )}
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Laporan Kehadiran</h2>
        <button 
            onClick={() => exportToCSV(reportData, 'sakato-report.csv')}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm text-sm"
          >
            <Download size={16} />
            <span>Export CSV</span>
        </button>
      </div>

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-4 transition-all">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
             <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="Cari Nama..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
              rowHeight={60} 
              height={500} 
          />
      </div>
    </div>
  );
};
