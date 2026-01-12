
const DB_NAME = 'sakato_offline_db';
const DB_VERSION = 4; // Bump version to force schema update

// Only store Queues, not Data
const STORES = {
  UPLOAD_QUEUE: 'upload_queue',
  RETRY_QUEUE: 'retry_queue'
};

export const DB = {
  db: null as IDBDatabase | null,

  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (DB.db) return resolve(DB.db);

      // Safe Init
      if (!window.indexedDB) {
          console.warn("IndexedDB not supported");
          return reject("IndexedDB not supported");
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        
        // 1. Create New Queues if missing
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });

        // 2. CLEANUP: Delete legacy stores to prevent "Object store not found" errors
        // and ensure we don't store local data anymore
        const legacyStores = ['users', 'events', 'attendance', 'logs', 'notifications', 'permissions', 'rewards', 'point_logs', 'agendas', 'organizations'];
        legacyStores.forEach(store => {
            if (db.objectStoreNames.contains(store)) {
                db.deleteObjectStore(store);
                console.log(`[DB] Cleaned up legacy store: ${store}`);
            }
        });
      };

      request.onsuccess = (event: any) => {
        DB.db = event.target.result;
        console.log(`[DB] Offline Storage Initialized (v${DB_VERSION})`);
        resolve(DB.db!);
      };

      request.onerror = (event: any) => {
        console.error("[DB] Init Error:", event.target.error);
        reject(`IndexedDB error: ${event.target.error}`);
      };
    });
  },

  // Generic Put
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

  // Generic Get All
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

  // Generic Delete
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

  // Helper for Queue Management
  addToQueue: async (type: 'UPLOAD' | 'RETRY', item: any) => {
      const store = type === 'UPLOAD' ? STORES.UPLOAD_QUEUE : STORES.RETRY_QUEUE;
      await DB.put(store, item);
  },

  getQueue: async (type: 'UPLOAD' | 'RETRY') => {
      const store = type === 'UPLOAD' ? STORES.UPLOAD_QUEUE : STORES.RETRY_QUEUE;
      return await DB.getAll(store);
  },

  removeFromQueue: async (type: 'UPLOAD' | 'RETRY', id: string) => {
      const store = type === 'UPLOAD' ? STORES.UPLOAD_QUEUE : STORES.RETRY_QUEUE;
      await DB.delete(store, id);
  }
};
