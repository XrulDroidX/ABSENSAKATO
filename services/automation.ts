
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/services/automation.ts
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import { StorageService } from './storage';
import { AttendanceRecord, Role } from '../types';
import { generateId } from './utils';

export const AutomationService = {
    run: async () => {
        const events = StorageService.getEvents(); 
        const now = new Date();
        const nowTime = now.toTimeString().slice(0, 5); // HH:MM
        const todayStr = now.toISOString().split('T')[0];

        let updatedCount = 0;
        let alphaCount = 0;

        // Fetch users once for alpha check
        const users = await StorageService.getUsers();
        const activeMembers = users.filter(u => !u.deleted && u.isActive && u.role === Role.ANGGOTA);
        const attendance = StorageService.getAttendance();

        for (const event of events) {
            let newStatus = event.status;

            if (event.status === 'BATAL' || event.status === 'SELESAI') continue;

            const isToday = event.date === todayStr;
            const isFuture = event.date > todayStr;
            const isPast = event.date < todayStr;

            if (isFuture) {
                newStatus = 'AKAN_DATANG';
            } else if (isPast) {
                newStatus = 'SELESAI';
            } else if (isToday) {
                if (nowTime < event.startTime) {
                    newStatus = 'AKAN_DATANG';
                } else if (nowTime >= event.startTime && nowTime <= event.endTime) {
                    if (event.status !== 'DITUNDA') newStatus = 'BERLANGSUNG';
                } else if (nowTime > event.endTime) {
                    newStatus = 'SELESAI';
                }
            }

            // AUTO ALPHA LOGIC: Trigger when event becomes 'SELESAI' from another status
            if (newStatus === 'SELESAI') {
                for (const member of activeMembers) {
                    // Check if member attended
                    const hasAttended = attendance.some(a => a.eventId === event.id && a.userId === member.id && a.status !== 'CANCELLED');
                    
                    if (!hasAttended) {
                        const alphaRecord: AttendanceRecord = {
                            id: generateId(),
                            userId: member.id,
                            eventId: event.id,
                            timestamp: new Date().toISOString(),
                            status: 'ABSENT', // ALPHA
                            trustScore: Math.max(0, (member.trustScore || 100) - 10),
                            deviceInfo: 'SYSTEM_AUTO',
                            notes: 'Tidak absen sampai event selesai.'
                        };
                        // Save directly to storage
                        await StorageService.saveAttendance(alphaRecord);
                        alphaCount++;
                    }
                }
            }

            if (newStatus !== event.status) {
                event.status = newStatus;
                await StorageService.saveEvent(event); 
                updatedCount++;
            }
        }

        if (updatedCount > 0 || alphaCount > 0) {
            console.log(`Automation: ${updatedCount} events updated, ${alphaCount} auto-alphas assigned.`);
        }
    }
};
