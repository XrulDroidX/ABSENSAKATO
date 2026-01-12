
import { AttendanceRecord } from '../types';
import { StorageService } from './storage';

const QUEUE_KEY = 'sakato_offline_queue';

export const QueueService = {
  addToQueue: (record: AttendanceRecord) => {
    const queue = QueueService.getQueue();
    queue.push(record);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Queue] Added attendance for ${record.userId} to offline queue.`);
  },

  getQueue: (): AttendanceRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch { return []; }
  },

  clearQueue: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  processQueue: async () => {
    if (!navigator.onLine) return;
    
    const queue = QueueService.getQueue();
    if (queue.length === 0) return;

    console.log(`[Queue] Processing ${queue.length} offline records...`);
    const failed: AttendanceRecord[] = [];

    for (const record of queue) {
      try {
        await StorageService.saveAttendance({ ...record, synced: true });
        console.log(`[Queue] Synced record ${record.id}`);
      } catch (e) {
        console.error(`[Queue] Failed to sync ${record.id}`, e);
        // If error is "Already exists", ignore it. Else, keep in queue.
        if (typeof e === 'string' && !e.includes('sudah dilakukan')) {
            failed.push(record);
        }
      }
    }

    if (failed.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    } else {
      QueueService.clearQueue();
      console.log('[Queue] All items synced.');
    }
  }
};
