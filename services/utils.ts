
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { User, Event } from '../types';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; 
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const cleanData = data.map(({_checksum, _tainted, ...rest}) => rest);
  const headers = Object.keys(cleanData[0]);
  const csvContent = [
    headers.join(','),
    ...cleanData.map(row => headers.map(fieldName => JSON.stringify((row as any)[fieldName], (_, value) => value === null ? '' : value)).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const hashString = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// CHECKSUM UTILS
export const signData = async <T extends object>(data: T): Promise<T> => {
    const { _checksum, _tainted, ...cleanData } = data as any;
    const hash = await hashString(JSON.stringify(cleanData));
    return { ...data, _checksum: hash };
};

export const verifyData = async <T extends object>(data: T): Promise<T> => {
    const { _checksum, ...cleanData } = data as any;
    if (!_checksum) return data; 

    const currentHash = await hashString(JSON.stringify(cleanData));
    if (currentHash !== _checksum) {
        console.warn('Data integrity check failed for:', cleanData.id);
        return { ...data, _tainted: true };
    }
    return data;
};

// --- UX MICRO INTERACTIONS ---

export const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error(e); }
};

export const triggerHaptic = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// --- CERTIFICATE GENERATOR ---
export const generateCertificate = (user: User, event: Event, dateStr: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Border
    doc.setLineWidth(3);
    doc.setDrawColor(25, 99, 235); // Blue
    doc.rect(10, 10, 277, 190);
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("SERTIFIKAT KEHADIRAN", 148.5, 40, { align: "center" });
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Diberikan kepada:", 148.5, 60, { align: "center" });

    // User Name
    doc.setFontSize(28);
    doc.setFont("times", "bolditalic");
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.text(user.name, 148.5, 80, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.text(`(ID: ${user.nia || user.id})`, 148.5, 90, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text("Atas partisipasi aktif dalam acara:", 148.5, 110, { align: "center" });

    // Event Name
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(event.name, 148.5, 125, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatDate(event.date)}`, 148.5, 135, { align: "center" });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated by SAKATO System | ${new Date().toISOString()}`, 148.5, 190, { align: "center" });

    // Save
    doc.save(`Sertifikat_${user.name.replace(/\s/g,'_')}.pdf`);
};
