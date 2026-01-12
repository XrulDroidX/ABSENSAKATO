
import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { StorageService } from '../services/storage';
import { Filter, Trophy, Grid, Sparkles, Loader2 } from '../components/Icons';
import { useAuth } from '../App';
import { User } from '../types';

// Lazy Load Heavy Chart Components
const RechartsGroup = React.lazy(() => import('recharts').then(module => ({
    default: ({ data, colors }: any) => {
        const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = module;
        return (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        );
    }
})));

export const Analytics: React.FC = () => {
    const { user } = useAuth();
    const attendance = StorageService.getAttendance();
    const events = StorageService.getEvents();
    
    const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsersSync());
    const [isChartVisible, setIsChartVisible] = useState(false);

    // Render charts after interaction/delay to prioritize LCP
    useEffect(() => {
        const timer = setTimeout(() => setIsChartVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // ... (Logic code remains same as before for suggestions, heatmap, leaderboard) ...
    const suggestions = useMemo(() => {
        if (attendance.length === 0) return [];
        const result = [];
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayCounts = new Array(7).fill(0);
        attendance.forEach(a => { if (a.status === 'PRESENT') dayCounts[new Date(a.timestamp).getDay()]++; });
        const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
        result.push(`Hari dengan kehadiran tertinggi adalah ${days[bestDayIdx]}.`);
        const totalLate = attendance.filter(a => a.status === 'LATE').length;
        if (totalLate > attendance.length * 0.2) result.push("Tingkat keterlambatan tinggi (>20%).");
        return result;
    }, [attendance]);

    const heatmapData = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const myAttendance = attendance.filter(a => a.userId === user?.id);
        return days.map(date => {
            const hasEvent = events.some(e => e.date === date);
            const record = myAttendance.find(a => a.timestamp.startsWith(date));
            let status = 'NONE';
            if (record) status = record.status;
            else if (hasEvent && date < today.toISOString().split('T')[0]) status = 'ABSENT_AUTO';
            return { date, status };
        });
    }, [attendance, events, user]);

    const leaderboard = useMemo(() => {
        return allUsers
            .filter(u => u.role === 'ANGGOTA' && !u.deleted)
            .map(u => {
                const userRecords = attendance.filter(a => a.userId === u.id);
                const totalEvents = events.filter(e => e.status === 'SELESAI').length; 
                const present = userRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                const rate = totalEvents > 0 ? (present / totalEvents) * 100 : 0;
                return { name: u.name, rate: Math.round(rate), points: u.totalPoints || 0 };
            })
            .sort((a, b) => b.rate - a.rate || b.points - a.points)
            .slice(0, 5);
    }, [allUsers, attendance, events]);

    const statusDistribution = useMemo(() => {
        const counts: any = { PRESENT: 0, LATE: 0, PERMISSION: 0, ABSENT: 0 };
        attendance.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
        return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
    }, [attendance]);

    const COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#EF4444'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Filter className="text-blue-600" /> Analytics & Insight
            </h2>

            {/* SMART SUGGESTIONS - Rendered Immediately */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden content-visibility-auto">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100}/></div>
                <h3 className="font-bold flex items-center gap-2 mb-3 relative z-10"><Sparkles size={18} className="text-yellow-300"/> AI Insights</h3>
                <ul className="space-y-2 relative z-10 text-sm">
                    {suggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 items-start"><span className="text-yellow-300">•</span> {s}</li>
                    ))}
                    {suggestions.length === 0 && <li>Belum cukup data untuk analisis.</li>}
                </ul>
            </div>

            {/* HEATMAP */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Grid size={18}/> Riwayat Kehadiran (30 Hari)</h3>
                <div className="flex flex-wrap gap-2">
                    {heatmapData.map((d, i) => {
                        let color = 'bg-slate-100';
                        if (d.status === 'PRESENT') color = 'bg-green-500';
                        else if (d.status === 'LATE') color = 'bg-yellow-400';
                        else if (d.status === 'ABSENT') color = 'bg-red-500';
                        return (
                            <div key={i} className={`w-8 h-8 rounded-md ${color} flex items-center justify-center text-[10px] text-white font-bold`}>
                                {new Date(d.date).getDate()}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* LEADERBOARD */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" size={18}/> Top Rajin</h3>
                    <div className="space-y-4">
                        {leaderboard.map((u, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-sm">{u.name}</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">{u.rate}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DISTRIBUTION CHART - LAZY LOADED */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                    <h3 className="font-bold mb-4 text-sm">Distribusi Status</h3>
                    <div className="w-full h-64 relative">
                        {isChartVisible ? (
                            <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-600"/></div>}>
                                <RechartsGroup data={statusDistribution} colors={COLORS} />
                            </Suspense>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                                <span className="text-slate-400 text-xs">Loading Chart...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
