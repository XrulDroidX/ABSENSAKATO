
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/pages/Dashboard.tsx
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import React, { useMemo, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { User, Role, Agenda } from '../types';
import { useAuth } from '../App';
import { 
    Users, CalendarDays, CheckCircle, AlertTriangle, Trophy, Star, Activity, GripVertical
} from '../components/Icons';
import { 
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion, Reorder } from 'framer-motion';
import { CountUp } from '../components/CountUp';
import { GreetingClock } from '../components/GreetingClock';
import { Guard } from '../components/Guard';

const StatCard = React.memo(({ title, value, icon, colorClass, subtext }: any) => (
  <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300 h-full relative group cursor-grab active:cursor-grabbing">
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30"><GripVertical size={16}/></div>
    <div>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900"><CountUp value={value} /></h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100 shadow-sm`}>
      {React.cloneElement(icon, { size: 24, className: `${colorClass.replace('bg-', 'text-')}` })}
    </div>
  </div>
));

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [chartReady, setChartReady] = useState(false);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [items, setItems] = useState([0, 1, 2, 3]);
  const [slaWarning, setSlaWarning] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({
      totalUsers: 0, totalEvents: 0, countPresent: 0, countLate: 0, countPermission: 0, countAlpha: 0,
      myPresent: 0, myRate: 0, ranking: []
  });
  const [aiInsight, setAiInsight] = useState<string[]>([]);

  // FALLBACK LOGIC (Main Thread)
  const calculateStatsFallback = (users: User[], events: any[], attendance: any[], userId: string | undefined) => {
      console.log("Running Statistics on Main Thread (Fallback)");
      const totalUsers = users.length;
      const totalEvents = events.filter((e: any) => e.status !== 'BATAL').length;
      
      const countPresent = attendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'ON_HOLD').length;
      const countLate = attendance.filter((a: any) => a.status === 'LATE').length;
      const countPermission = attendance.filter((a: any) => a.status === 'PERMISSION').length;
      const countAlpha = attendance.filter((a: any) => a.status === 'ABSENT').length;

      const myRecords = attendance.filter((a: any) => a.userId === userId);
      const myPresent = myRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'ON_HOLD').length;
      const myRate = totalEvents > 0 ? Math.round(((myPresent) / totalEvents) * 100) : 0;

      const divisions: any = {};
      users.forEach(u => {
          if (!divisions[u.division]) divisions[u.division] = { name: u.division, points: 0, members: 0 };
          divisions[u.division].points += (u.totalPoints || 0);
          divisions[u.division].members++;
      });
      const ranking = Object.values(divisions)
          .map((d: any) => ({ ...d, avg: Math.round(d.points / d.members) }))
          .sort((a: any, b: any) => b.avg - a.avg)
          .slice(0, 5);

      return { totalUsers, totalEvents, countPresent, countLate, countPermission, countAlpha, myPresent, myRate, ranking };
  };

  useEffect(() => {
    let worker: Worker | null = null;
    let isMounted = true;

    const fetchData = async () => {
      const users = await StorageService.getUsers();
      const events = StorageService.getEvents();
      const attendance = StorageService.getAttendance();
      const agendas = StorageService.getAgendas();
      const org = StorageService.getOrgSettings();
      
      if (!isMounted) return;
      setAgendas(agendas);

      const payload = { users, events, attendance, userId: user?.id };

      // --- WORKER INSTANTIATION ---
      try {
          // FIX: Use URL constructor for Vite/Webpack compatibility
          worker = new Worker(new URL('../workers/statsWorker.ts', import.meta.url), { type: 'module' });
          
          worker.onmessage = (e) => {
              if (!isMounted) return;
              if (e.data.type === 'DASHBOARD_STATS_RESULT') {
                  const data = e.data.data;
                  setStats(data);
                  setChartReady(true);
                  
                  // SLA CHECK (Post-Calc)
                  if (data.myRate < org.settings.slaTarget && user?.role === Role.ANGGOTA) {
                      setSlaWarning(`Perhatian! Kehadiran Anda (${data.myRate}%) di bawah target organisasi (${org.settings.slaTarget}%).`);
                  }
              }
          };

          worker.onerror = (err) => {
              console.warn("Worker Error (Runtime), switching to main thread:", err);
              if (isMounted) {
                  const fallbackData = calculateStatsFallback(users, events, attendance, user?.id);
                  setStats(fallbackData);
                  setChartReady(true);
              }
              worker?.terminate();
          };

          worker.postMessage({ type: 'CALC_DASHBOARD_STATS', payload });

      } catch (e) {
          console.warn("Worker Instantiation Failed, running on Main Thread:", e);
          const fallbackData = calculateStatsFallback(users, events, attendance, user?.id);
          if (isMounted) {
              setStats(fallbackData);
              setChartReady(true);
          }
      }

      // --- AI INSIGHT (Lightweight Main Thread) ---
      if (user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN) {
          const insights = [];
          const riskUsers = users.filter(u => {
              const uAtt = attendance.filter(a => a.userId === u.id);
              const uLate = uAtt.filter(a => a.status === 'LATE').length;
              return uLate > 3; 
          });
          if (riskUsers.length > 0) insights.push(`${riskUsers.length} anggota sering terlambat bulan ini.`);
          
          const inactive = users.filter(u => u.totalPoints === 0 && u.role === Role.ANGGOTA).length;
          if (inactive > 0) insights.push(`${inactive} anggota baru belum aktif sama sekali.`);
          
          setAiInsight(insights);
      }
    };

    fetchData();
    return () => { isMounted = false; worker?.terminate(); };
  }, [user]);

  const chartData = useMemo(() => [
    { name: 'Hadir', value: stats.countPresent, color: '#22C55E' }, 
    { name: 'Telat', value: stats.countLate, color: '#F59E0B' }, 
    { name: 'Izin', value: stats.countPermission, color: '#2563EB' }, 
    { name: 'Alpha', value: stats.countAlpha, color: '#EF4444' }, 
  ], [stats]);

  return (
    <div className="space-y-8 pb-10">
      <GreetingClock user={user} />

      {slaWarning && (
          <motion.div initial={{opacity: 0, y:-20}} animate={{opacity: 1, y:0}} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-700 shadow-sm">
              <AlertTriangle className="animate-pulse"/>
              <span className="font-bold text-sm">{slaWarning}</span>
          </motion.div>
      )}

      {aiInsight.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-4">
              <div className="bg-white/20 p-2 rounded-full"><Activity size={20}/></div>
              <div className="flex-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-200">AI Insights (Offline)</h4>
                  <div className="text-sm font-medium">
                      {aiInsight.map((t, i) => <p key={i}>• {t}</p>)}
                  </div>
              </div>
          </div>
      )}

      <Guard roles={[Role.ADMIN, Role.SUPER_ADMIN, Role.PENGURUS]}>
          <Reorder.Group axis="x" values={items} onReorder={setItems} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
                <Reorder.Item key={item} value={item}>
                    {item === 0 && <StatCard title="Total Anggota" value={stats.totalUsers} icon={<Users />} colorClass="bg-slate-700" />}
                    {item === 1 && <StatCard title="Hadir (Global)" value={stats.countPresent} icon={<CheckCircle />} colorClass="bg-green-600" />}
                    {item === 2 && <StatCard title="Izin (Global)" value={stats.countPermission} icon={<CalendarDays />} colorClass="bg-blue-600" />}
                    {item === 3 && <StatCard title="Alpha (Global)" value={stats.countAlpha} icon={<AlertTriangle />} colorClass="bg-red-600" />}
                </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 lg:col-span-1 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Distribusi Kehadiran</h3>
              <div className="w-full h-[300px] relative">
                {chartReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value" cornerRadius={6}>
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl animate-pulse">
                        Loading Chart...
                    </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100">
                   <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Trophy className="text-amber-500"/> Attendance League (Divisi)</h3>
                   <div className="space-y-3">
                       {stats.ranking.map((r: any, idx: number) => (
                           <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                               <div className="flex items-center gap-4">
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${idx === 0 ? 'bg-amber-400' : 'bg-slate-400'}`}>{idx + 1}</div>
                                   <div><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.members} Anggota</p></div>
                               </div>
                               <div className="flex items-center gap-2">
                                   <Star size={14} className="text-yellow-500"/>
                                   <span className="font-bold text-slate-900">{r.avg} Poin/Org</span>
                               </div>
                           </motion.div>
                       ))}
                       {stats.ranking.length === 0 && <p className="text-slate-400 text-center py-4">Belum ada data ranking.</p>}
                   </div>
                </div>
            </div>
          </div>
      </Guard>
    </div>
  );
};
