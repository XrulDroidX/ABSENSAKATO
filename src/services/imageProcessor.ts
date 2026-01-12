
/**
 * SERVICE: Image Processor (Optimized)
 * Menangani manipulasi gambar client-side:
 * 1. Deteksi Fake/Manipulasi
 * 2. Smart Resize (Max 1280px)
 * 3. Watermarking
 * 4. EXIF Stripping
 * 5. Compression (WebP 70% - High Performance)
 * 6. Hashing
 */

export interface WatermarkMeta {
  eventName: string;
  userName: string;
  timestamp: string;
  gps: string;
  deviceInfo: string;
}

export const ImageProcessor = {
  
  loadImage: (src: string | File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      if (src instanceof File) {
        img.src = URL.createObjectURL(src);
      } else {
        img.src = src;
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error("Gagal memuat gambar source."));
    });
  },

  computeFileHash: async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  detectManipulation: (img: HTMLImageElement, file?: File): void => {
    const ratio = img.width / img.height;
    if (img.width < 400 || img.height < 400) {
      throw new Error("Resolusi foto terlalu rendah (Min 400px). Harap ambil foto asli.");
    }
    if (ratio > 2.5 || ratio < 0.4) {
      throw new Error("Rasio foto tidak wajar. Jangan gunakan screenshot.");
    }
    if (file && file.size < 20 * 1024) { 
      throw new Error("Ukuran file terlalu kecil (kualitas rendah).");
    }
  },

  process: async (
    source: string | File, 
    meta: WatermarkMeta
  ): Promise<{ blob: Blob, hash: string }> => {
    const img = await ImageProcessor.loadImage(source);
    
    if (source instanceof File) ImageProcessor.detectManipulation(img, source);
    else ImageProcessor.detectManipulation(img);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Gagal inisialisasi pemroses gambar.");

    // --- 1. SMART RESIZE (Max 1280px) ---
    const MAX_DIMENSION = 1280;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // Draw Image
    ctx.drawImage(img, 0, 0, width, height);

    // --- 2. WATERMARKING ---
    const barHeight = Math.max(60, Math.floor(height * 0.15));
    const startY = height - barHeight;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, startY, width, barHeight);

    const fontSize = Math.max(12, Math.floor(width * 0.025));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const paddingX = Math.floor(width * 0.03);
    const paddingY = Math.floor(barHeight * 0.1);
    const lineHeight = fontSize * 1.4;
    let textY = height - paddingY;

    const lines = [
      `GPS: ${meta.gps}`,
      `TIME: ${meta.timestamp}`,
      `EVENT: ${meta.eventName}`,
      `USER: ${meta.userName}`
    ];

    lines.forEach(line => {
      ctx.fillText(line, width - paddingX, textY);
      textY -= lineHeight;
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText("SAKATO SECURE CAM", paddingX, height - paddingY);

    // --- 3. OUTPUT & COMPRESS (WEBP) ---
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const hash = await ImageProcessor.computeFileHash(blob);
            resolve({ blob, hash });
          }
          else reject(new Error("Gagal kompresi gambar."));
        },
        'image/webp', // CHANGED TO WEBP FOR PERFORMANCE
        0.75          // QUALITY 75%
      );
    });
  }
};
