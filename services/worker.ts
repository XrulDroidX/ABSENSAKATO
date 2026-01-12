
/* eslint-disable no-restricted-globals */
self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'CALC_DASHBOARD_STATS') {
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
        
        // Ranking Logic
        const ranking = [...users]
            .sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0))
            .slice(0, 5)
            .map((u: any) => ({ name: u.name, role: u.role, totalPoints: u.totalPoints || 0 }));

        // Send back
        self.postMessage({
            type: 'DASHBOARD_STATS_RESULT',
            data: {
                totalUsers, totalEvents, 
                countPresent, countLate, countPermission, countAlpha,
                myPresent, myRate, ranking
            }
        });
    }
};

export {};
