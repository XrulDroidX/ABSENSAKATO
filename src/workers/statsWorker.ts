
/* eslint-disable no-restricted-globals */
// Web Worker for Heavy Calculation
// Aman untuk GitHub Pages & Vite

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'CALC_DASHBOARD_STATS') {
        try {
            const { users, events, attendance, userId } = payload;
            
            const totalUsers = users.length;
            const totalEvents = events.filter((e: any) => e.status !== 'BATAL').length;
            
            const countPresent = attendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'ON_HOLD').length;
            const countLate = attendance.filter((a: any) => a.status === 'LATE').length;
            const countPermission = attendance.filter((a: any) => a.status === 'PERMISSION').length;
            const countAlpha = attendance.filter((a: any) => a.status === 'ABSENT').length;

            const myRecords = attendance.filter((a: any) => a.userId === userId);
            const myPresent = myRecords.filter((a: any) => a.status === 'PRESENT' || a.status === 'ON_HOLD').length;
            const myRate = totalEvents > 0 ? Math.round(((myPresent) / totalEvents) * 100) : 0;
            
            // League Calculation (Divisi)
            const divisions: any = {};
            users.forEach((u: any) => {
                if (!divisions[u.division]) divisions[u.division] = { name: u.division, points: 0, members: 0 };
                divisions[u.division].points += (u.totalPoints || 0);
                divisions[u.division].members++;
            });
            
            const ranking = Object.values(divisions)
                .map((d: any) => ({ ...d, avg: Math.round(d.points / d.members) }))
                .sort((a: any, b: any) => b.avg - a.avg)
                .slice(0, 5);

            self.postMessage({
                type: 'DASHBOARD_STATS_RESULT',
                data: {
                    totalUsers, totalEvents, 
                    countPresent, countLate, countPermission, countAlpha,
                    myPresent, myRate, ranking
                }
            });
        } catch (err) {
            console.error("Worker Calculation Failed:", err);
            // Send error signal if needed, or let main thread timeout
        }
    }
};

export {};
