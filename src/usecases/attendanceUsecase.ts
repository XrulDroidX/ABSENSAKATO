
import { EventRepository } from '../repositories/eventRepository';
import { UploadService } from '../services/uploadService';
import { ApiService } from '../services/api';
import { Event } from '../types';

interface SubmitAttendanceDTO {
  user: any;
  event: Event;
  coords: { lat: number; lng: number };
  proofPhoto: string;
  note: string;
  onProgress: (pct: number) => void;
}

export const AttendanceUsecase = {
  getActiveEvents: async () => {
    return await EventRepository.getActiveEvents();
  },

  submitAttendance: async ({ user, event, coords, proofPhoto, note, onProgress }: SubmitAttendanceDTO) => {
    // 1. Prepare Metadata
    const meta = {
      eventName: event.name,
      userName: user.name,
      timestamp: new Date().toLocaleString('id-ID'),
      gps: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      deviceInfo: navigator.platform
    };

    // 2. Upload Proof (Calls Service -> ImageProcessor)
    onProgress(10);
    const uploadResult = await UploadService.uploadProof(
      proofPhoto,
      user.id,
      event.id,
      meta,
      onProgress
    );

    // 3. Submit to DB (Calls Repo/API)
    onProgress(90);
    const result: any = await ApiService.submitAttendanceRPC(
      event.id,
      coords.lat,
      coords.lng,
      uploadResult.publicUrl,
      note,
      user.deviceId || 'unknown',
      {
          file_hash: uploadResult.hash,
          file_size: uploadResult.size,
          storage_path: uploadResult.path
      }
    );

    if (!result.success && !result) {
        throw new Error(result.message || "Gagal simpan ke database.");
    }

    // 4. Update Stats (Fire and forget)
    EventRepository.incrementAttendee(event.id);

    return result;
  }
};
