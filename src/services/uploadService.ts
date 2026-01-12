
import { supabase } from '../lib/supabase';
import { ImageProcessor, WatermarkMeta } from './imageProcessor';
import { ApiService } from './api';

interface UploadResult {
  publicUrl: string;
  hash: string;
  size: number;
  path: string;
}

const OFFLINE_QUEUE_KEY = 'sakato_upload_queue';

export const UploadService = {
  
  // --- UTILS ---
  getUserIP: async (): Promise<string> => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch { return '0.0.0.0'; }
  },

  // --- CORE UPLOAD LOGIC (RETRY MECHANISM) ---
  _uploadWithRetry: async (
    bucket: string,
    path: string,
    file: Blob,
    maxRetries: number = 3
  ): Promise<void> => {
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg'
          });

        if (error) throw error;
        return; // Success

      } catch (err: any) {
        attempt++;
        const isNetworkError = !err.status || (err.status >= 500 && err.status < 600);
        
        console.warn(`Upload attempt ${attempt} failed:`, err.message);

        if (attempt >= maxRetries || !isNetworkError) {
          throw err; // Stop retrying
        }

        // Exponential backoff
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; 
      }
    }
  },

  // --- PUBLIC API ---
  uploadProof: async (
    fileOrBase64: string | File,
    userId: string,
    eventId: string,
    metadata: WatermarkMeta,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult> => {
    
    try {
      if (onProgress) onProgress(10);

      // 1. Process Image (Resize, Watermark, Strip EXIF, Hash)
      const { blob: processedBlob, hash } = await ImageProcessor.process(fileOrBase64, metadata);

      if (onProgress) onProgress(30);

      // 2. Validation (Enterprise Security)
      if (processedBlob.size > 2 * 1024 * 1024) throw new Error("Ukuran foto terlalu besar (>2MB).");

      // 3. Prepare Secure Path
      const timestamp = Date.now();
      const cleanEventId = eventId.slice(0, 8);
      const fileName = `${timestamp}_${cleanEventId}_${hash.substring(0, 6)}.jpg`;
      const filePath = `${userId}/${fileName}`;

      if (onProgress) onProgress(50);

      // 4. OFFLINE QUEUE CHECK
      if (!navigator.onLine) {
          // Save to offline queue (IndexedDB/LocalStore logic handled by caller or separate service)
          // For now, throw specific error to trigger offline flow in UI
          throw new Error("OFFLINE_MODE");
      }

      // 5. Upload with Retry
      await UploadService._uploadWithRetry('proofs', filePath, processedBlob);

      if (onProgress) onProgress(80);

      // 6. Audit Logging (WORM)
      const ip = await UploadService.getUserIP();
      ApiService.logUploadAudit(userId, filePath, hash, ip, navigator.userAgent).catch(console.error);

      // 7. Get Result
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(filePath);

      if (onProgress) onProgress(100);

      return {
        publicUrl: urlData.publicUrl,
        hash: hash,
        size: processedBlob.size,
        path: filePath
      };

    } catch (e: any) {
      if (e.message === "OFFLINE_MODE") throw e;
      console.error("Upload Critical Error:", e);
      throw new Error(e.message || "Gagal mengupload bukti kehadiran.");
    }
  }
};
