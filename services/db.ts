
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/services/db.ts
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import { User, Event, AttendanceRecord, AuditLog, Notification, PermissionRequest, Reward, PointLog, Agenda } from '../types';

const DB_NAME = 'sakato_db';
const DB_VERSION = 2; // UPGRADED VERSION

const STORES = {
  USERS: 'users',
  EVENTS: 'events',
  ATTENDANCE: 'attendance',
  LOGS: 'logs',
  NOTIFICATIONS: 'notifications',
  PERMISSIONS: 'permissions',
  REWARDS: 'rewards',
  POINT_LOGS: 'point_logs',
  AGENDAS: 'agendas' // NEW STORE
};

export const DB = {
  db: null as IDBDatabase | null,

  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (DB.db) return resolve(DB.db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = (event: any) => {
        DB.db = event.target.result;
        resolve(DB.db!);
      };

      request.onerror = (event: any) => {
        reject(`IndexedDB error: ${event.target.error}`);
      };
    });
  },

  getAll: <T>(storeName: string): Promise<T[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await DB.open();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  },

  put: (storeName: string, data: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await DB.open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  },

  delete: (storeName: string, id: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await DB.open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (e) { reject(e); }
    });
  },
  
  // Bulk insert/update for efficiency
  bulkPut: (storeName: string, items: any[]): Promise<void> => {
      return new Promise(async (resolve, reject) => {
          try {
              const db = await DB.open();
              const tx = db.transaction(storeName, 'readwrite');
              const store = tx.objectStore(storeName);
              items.forEach(item => store.put(item));
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
          } catch(e) { reject(e); }
      });
  },

  // Bulk delete for efficiency
  bulkDelete: (storeName: string, ids: string[]): Promise<void> => {
      return new Promise(async (resolve, reject) => {
          try {
              const db = await DB.open();
              const tx = db.transaction(storeName, 'readwrite');
              const store = tx.objectStore(storeName);
              ids.forEach(id => store.delete(id));
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
          } catch(e) { reject(e); }
      });
  }
};
