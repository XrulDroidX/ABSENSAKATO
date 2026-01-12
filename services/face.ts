
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/services/face.ts
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

// Declare global faceapi variable injected via CDN
declare global {
  interface Window {
    faceapi: any;
  }
}

const MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

export const FaceService = {
  
  isLoaded: false,

  // DYNAMIC SCRIPT LOADER
  loadScript: async (): Promise<void> => {
      if (window.faceapi) return Promise.resolve();
      
      return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = FACE_API_SCRIPT;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Gagal download Face API"));
          document.body.appendChild(script);
      });
  },

  loadModels: async () => {
    if (FaceService.isLoaded) return;
    
    try {
      console.log("Initializing Face System...");
      // 1. Load Script Dynamically
      await FaceService.loadScript();

      // 2. Load Models
      await Promise.all([
        window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
      ]);
      FaceService.isLoaded = true;
      console.log("Face API Ready");
    } catch (error) {
      console.error("Failed to load face models", error);
      throw new Error("Gagal memuat sistem pengenalan wajah. Periksa koneksi internet.");
    }
  },

  getFaceDescriptor: async (imageElement: HTMLImageElement | HTMLVideoElement) => {
    if (!FaceService.isLoaded) await FaceService.loadModels();

    const detection = await window.faceapi.detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }
    return detection.descriptor;
  },

  compareFaces: async (selfieElement: HTMLImageElement, referenceUrl: string): Promise<number> => {
    // 1. Get Selfie Descriptor
    const selfieDescriptor = await FaceService.getFaceDescriptor(selfieElement);
    if (!selfieDescriptor) {
      throw new Error("Wajah tidak terdeteksi pada kamera. Pastikan pencahayaan cukup.");
    }

    // 2. Load Reference Image
    const imgRef = new Image();
    imgRef.crossOrigin = "Anonymous";
    imgRef.src = referenceUrl;
    
    await new Promise((resolve, reject) => {
        imgRef.onload = resolve;
        imgRef.onerror = () => reject(new Error("Gagal memuat foto referensi anggota. Pastikan link foto valid dan publik."));
    });

    // 3. Get Reference Descriptor
    const refDescriptor = await FaceService.getFaceDescriptor(imgRef);
    if (!refDescriptor) {
      throw new Error("Wajah tidak ditemukan pada Foto Referensi Database.");
    }

    // 4. Calculate Distance
    const distance = window.faceapi.euclideanDistance(selfieDescriptor, refDescriptor);
    
    let similarity = (1 - distance) * 100;
    if (similarity < 0) similarity = 0;

    return Math.round(similarity);
  }
};
