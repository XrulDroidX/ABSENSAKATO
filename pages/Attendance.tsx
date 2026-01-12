
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/pages/Attendance.tsx
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Event, AttendanceMode } from '../types';
import { calculateDistance, generateId, playSuccessSound, triggerHaptic } from '../services/utils';
import { useAuth } from '../App';
import { MapPin, CheckCircle, Loader2, XCircle, ShieldCheck, Camera, Edit, ArrowRight } from '../components/Icons';
import { useToast } from '../components/Toast';

declare const Html5Qrcode: any;

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  
  // Steps: SELECT -> VALIDATE (GPS) -> SCAN_QR (if QR) -> PROOF -> SUCCESS
  const [currentStep, setCurrentStep] = useState<'SELECT' | 'VALIDATE' | 'SCAN_QR' | 'PROOF' | 'SUCCESS'>('SELECT');
  
  const [gpsReady, setGpsReady] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Confidence Score Data
  const [trustBadges, setTrustBadges] = useState<string[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  
  // Proof State
  const [proofPhoto, setProofPhoto] = useState<string>('');
  const [proofNote, setProofNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const events = StorageService.getEvents().filter(e => e.status === 'BERLANGSUNG');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
        (pos) => {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGpsReady(true);
        },
        (err) => console.log("GPS Error", err),
        { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const handleSelect = async (event: Event) => {
    setErrorMsg('');
    setTrustBadges([]);
    setCurrentScore(0);

    const isValidDevice = await StorageService.checkDeviceBinding(user!.id);
    if (isValidDevice) {
        setTrustBadges(prev => [...prev, 'DEVICE_MATCH']);
    } else {
        // Optional: Block or just reduce score
        addToast('warning', "Device baru terdeteksi. Skor kepercayaan mungkin berkurang.");
    }

    setActiveEvent(event);
    if (event.mode === AttendanceMode.QR) {
        setCurrentStep('SCAN_QR');
    } else {
        validateGps(event);
    }
  };

  const validateGps = (event: Event) => {
      if (!gpsReady || !coords) {
          setErrorMsg("Menunggu sinyal GPS...");
          setTimeout(() => validateGps(event), 2000);
          return;
      }

      // MULTI-POINT GEO-FENCING LOGIC
      // If locations array exists, check against ALL points. If match ANY, pass.
      // Fallback to legacy lat/lng if locations empty.
      
      let isInside = false;
      let minDistance = 999999;
      
      const targets = (event.locations && event.locations.length > 0) 
          ? event.locations 
          : [{ lat: event.latitude, lng: event.longitude, radius: event.radiusMeters }];

      for (const target of targets) {
          if (!target.lat) continue; // Skip invalid
          const dist = calculateDistance(coords.lat, coords.lng, target.lat, target.lng);
          if (dist < minDistance) minDistance = dist;
          
          if (dist <= target.radius) {
              isInside = true;
              break;
          }
      }

      // Check if event has no geofence set at all
      const hasGeoFence = targets.some(t => t.lat !== 0);

      if (!hasGeoFence || isInside) {
          if (isInside) setTrustBadges(prev => [...prev, 'GPS_ACCURATE']);
          proceedToNextStep(event);
      } else {
          setErrorMsg(`Di luar lokasi (Jarak: ${Math.round(minDistance)}m).`);
          addToast('error', `Anda berada di luar radius event.`);
          setActiveEvent(null);
      }
  };

  const proceedToNextStep = (event: Event) => {
     if (event.mode === AttendanceMode.HYBRID) {
         setTrustBadges(prev => [...prev, 'HYBRID_VERIFIED']);
         setCurrentStep('SCAN_QR');
     } else {
         setCurrentStep('PROOF');
     }
  };

  // QR Logic
  useEffect(() => {
    if (currentStep === 'SCAN_QR') {
        const scanner = new Html5Qrcode("reader");
        scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            (text: string) => {
                scanner.stop().then(() => validateToken(text));
            }, () => {}
        ).catch((e: any) => setErrorMsg("Kamera Error: " + e));
        return () => { try { scanner.stop(); } catch(e){} };
    }
  }, [currentStep]);

  const validateToken = (token: string) => {
      const [eventId, timeBlockStr] = token.split('::');
      if (eventId !== activeEvent?.id) {
          addToast('error', "QR Code salah! Event tidak cocok.");
          setCurrentStep('SELECT');
          return;
      }
      const tokenTime = parseInt(timeBlockStr);
      const serverTime = Math.floor(Date.now() / 30000);
      if (Math.abs(serverTime - tokenTime) <= 1) { 
          setCurrentStep('PROOF');
      } else {
          addToast('warning', "QR Code Kadaluarsa. Scan ulang.");
          setCurrentStep('SELECT');
      }
  };

  // Camera Logic
  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCameraActive(true);
          }
      } catch (e) {
          addToast('error', "Gagal akses kamera.");
      }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
          setCameraActive(false);
      }
  };

  const takePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
              // Draw to canvas
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              context.drawImage(videoRef.current, 0, 0);
              
              // Compress to JPEG 0.5 quality for storage
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
              setProofPhoto(dataUrl);
              stopCamera();
          }
      }
  };

  useEffect(() => {
      if (currentStep === 'PROOF') startCamera();
      return () => stopCamera();
  }, [currentStep]);

  const submitAttendance = async () => {
      if (!activeEvent) return;
      if (!proofPhoto) {
          addToast('warning', "Wajib ambil foto bukti kehadiran!");
          return;
      }

      try {
          const now = new Date();
          const [h, m] = activeEvent.startTime.split(':');
          const eventTime = new Date(); // Today
          eventTime.setHours(Number(h), Number(m), 0);
          
          const toleranceMs = (activeEvent.lateToleranceMinutes || 15) * 60000;
          let status: 'PRESENT' | 'LATE' = 'PRESENT';
          
          if (now.getTime() > eventTime.getTime() + toleranceMs) {
              status = 'LATE';
          } else {
              // Bonus score for On Time
              setTrustBadges(prev => [...prev, 'ON_TIME']);
          }

          // CALCULATE FINAL SCORE
          // Base 0. 
          // GPS Valid: +30
          // Device Match: +20
          // Hybrid/QR: +20
          // On Time: +30
          let score = 0;
          const badges = new Set(trustBadges);
          if (badges.has('GPS_ACCURATE')) score += 30;
          if (badges.has('ON_TIME')) score += 30;
          if (badges.has('DEVICE_MATCH')) score += 20;
          if (badges.has('HYBRID_VERIFIED')) score += 20;
          
          // Cap at 100
          if (score > 100) score = 100;

          await StorageService.saveAttendance({
              id: generateId(),
              userId: user!.id,
              eventId: activeEvent.id,
              timestamp: now.toISOString(),
              status: status,
              trustScore: score,
              trustBadges: Array.from(badges) as string[],
              latitude: coords?.lat,
              longitude: coords?.lng,
              deviceInfo: navigator.userAgent,
              proofPhoto: proofPhoto,
              notes: proofNote
          });
          
          playSuccessSound();
          triggerHaptic([100, 50, 100]); // Success Vibrate pattern
          
          addToast(status === 'LATE' ? 'warning' : 'success', `Absen Berhasil! Skor Kepercayaan: ${score}/100`);
          setCurrentStep('SUCCESS');
      } catch (e: any) {
          addToast('error', e.message);
          setCurrentStep('SELECT');
      }
  };

  if (currentStep === 'SUCCESS') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in p-6 text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mb-4 animate-bounce"/>
              <h2 className="text-2xl font-bold text-slate-800">Absensi Berhasil!</h2>
              <p className="text-slate-500 mb-6">Data telah diamankan & disinkronisasi.</p>
              <button onClick={() => setCurrentStep('SELECT')} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold">Kembali</button>
          </div>
      );
  }

  if (currentStep === 'PROOF') {
      return (
          <div className="space-y-4 animate-fade-in p-1">
              <h3 className="font-bold text-lg text-slate-900 text-center mb-2">Bukti Kehadiran</h3>
              
              <div className="relative bg-black rounded-xl overflow-hidden aspect-[3/4] shadow-lg max-w-sm mx-auto">
                  {!proofPhoto ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <button onClick={takePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                                <div className="w-12 h-12 bg-slate-900 rounded-full"></div>
                            </button>
                        </div>
                      </>
                  ) : (
                      <img src={proofPhoto} className="w-full h-full object-cover" />
                  )}
                  {proofPhoto && (
                      <button onClick={() => { setProofPhoto(''); startCamera(); }} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                          <Edit size={16}/>
                      </button>
                  )}
              </div>
              
              <canvas ref={canvasRef} className="hidden"></canvas>
              
              <div className="max-w-sm mx-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase">Catatan (Opsional)</label>
                  <input 
                    className="w-full border p-3 rounded-xl mt-1 text-sm" 
                    placeholder="Contoh: Datang telat karena ban bocor..." 
                    value={proofNote} 
                    onChange={e => setProofNote(e.target.value)}
                  />
              </div>

              <div className="max-w-sm mx-auto flex gap-2 pt-2">
                  <button onClick={() => setCurrentStep('SELECT')} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl">Batal</button>
                  <button onClick={submitAttendance} className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2">
                       Kirim <ArrowRight size={18}/>
                  </button>
              </div>
          </div>
      );
  }

  if (currentStep === 'SCAN_QR') {
      return (
          <div className="p-4">
              <h3 className="text-center font-bold mb-4">Scan QR Event</h3>
              <div id="reader" className="rounded-xl overflow-hidden shadow-lg border-2 border-slate-800"></div>
              <button onClick={() => setCurrentStep('SELECT')} className="mt-4 w-full py-3 bg-slate-100 font-bold rounded">Batal</button>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-900">Absensi</h2>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-3 rounded-lg flex items-center gap-2 font-bold border ${gpsReady ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {gpsReady ? <MapPin size={14}/> : <Loader2 className="animate-spin" size={14}/>}
                {gpsReady ? "GPS Siap" : "Mencari Lokasi..."}
            </div>
            <div className="p-3 rounded-lg flex items-center gap-2 font-bold border bg-blue-50 text-blue-700">
                <ShieldCheck size={14}/> Device Secure
            </div>
        </div>

        {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-sm font-bold flex items-center gap-2 rounded border border-red-200"><XCircle size={16}/> {errorMsg}</div>}
        
        {events.length === 0 ? (
            <div className="text-center p-10 border-2 border-dashed rounded-xl text-slate-400">Tidak ada event berlangsung.</div>
        ) : (
            events.map(event => (
                <button key={event.id} onClick={() => handleSelect(event)} className="w-full text-left bg-white p-5 rounded-xl shadow-sm border hover:border-blue-500 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{event.name}</h3>
                            <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold uppercase">{event.mode}</span>
                                {(event.locations && event.locations.length > 0) && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold uppercase">Multi-Point</span>}
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="text-lg font-mono font-bold text-blue-600">{event.startTime}</span>
                             <p className="text-[10px] text-red-500 mt-1 font-bold">Max Telat: {event.lateToleranceMinutes || 15}m</p>
                        </div>
                    </div>
                </button>
            ))
        )}
    </div>
  );
};
