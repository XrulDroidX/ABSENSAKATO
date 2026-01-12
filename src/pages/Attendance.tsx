
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query'; // PERFORMANCE: React Query
import { AttendanceUsecase } from '../usecases/attendanceUsecase';
import { Event, AttendanceMode } from '../types';
import { calculateDistance, playSuccessSound, triggerHaptic } from '../services/utils';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, CheckCircle, Loader2, XCircle, ShieldCheck, Upload, AlertTriangle, RefreshCw, FileText } from '../components/Icons';
import { useToast } from '../components/Toast';

declare const Html5Qrcode: any;

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // Flow States
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [step, setStep] = useState<'SELECT' | 'VALIDATE' | 'SCAN_QR' | 'PROOF' | 'SUBMITTING' | 'SUCCESS'>('SELECT');
  
  // Data States
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [proofPhoto, setProofPhoto] = useState<string>('');
  const [note, setNote] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Hardware Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // PERFORMANCE: React Query for Caching Events
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['activeEvents'],
    queryFn: AttendanceUsecase.getActiveEvents,
    staleTime: 1000 * 60 * 5, // Cache 5 min
  });

  // PERFORMANCE: Mutation for Submission
  const mutation = useMutation({
    mutationFn: AttendanceUsecase.submitAttendance,
    onSuccess: () => {
        playSuccessSound();
        triggerHaptic([100, 50, 100]);
        setStep('SUCCESS');
    },
    onError: (e: any) => {
        console.error(e);
        addToast('error', e.message);
        setStep('PROOF');
        startCamera();
    }
  });

  useEffect(() => {
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsAccuracy(pos.coords.accuracy);
            },
            (err) => console.warn("GPS Error", err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleSelect = useCallback((event: Event) => {
      setActiveEvent(event);
      setStep('PROOF'); 
      startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      addToast('error', "Gagal akses kamera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      const ctx = canvasRef.current.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      // Process happens in Usecase, here we just capture base64 preview
      setProofPhoto(canvasRef.current.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  }, []);

  const handleSubmit = () => {
    if (!activeEvent || !coords || !user) return;
    if (!consentGiven) {
        addToast('warning', "Anda harus menyetujui penggunaan foto.");
        return;
    }
    
    setStep('SUBMITTING');
    setUploadProgress(0);

    mutation.mutate({
        user,
        event: activeEvent,
        coords,
        proofPhoto,
        note,
        onProgress: (pct) => setUploadProgress(pct)
    });
  };

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-blue-600"/> Memuat Event...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Gagal memuat event.</div>;

  if (step === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in min-h-[60vh]">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
            <CheckCircle className="text-green-600 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Absensi Berhasil!</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm">
            Bukti kehadiran terverifikasi, terenkripsi, dan tersimpan aman di server.
        </p>
        <button onClick={() => { setStep('SELECT'); setActiveEvent(null); setProofPhoto(''); setNote(''); setConsentGiven(false); }} className="w-full max-w-xs bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">
            Kembali ke Menu
        </button>
      </div>
    );
  }

  if (step === 'SUBMITTING') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-fade-in text-center">
              <div className="relative w-24 h-24 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                      <circle 
                        cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        className="text-blue-600 transition-all duration-300 ease-out" 
                        strokeDasharray={251.2} 
                        strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100} 
                        strokeLinecap="round" 
                      />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-blue-600">
                      {Math.round(uploadProgress)}%
                  </div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Memproses...</h3>
              <p className="text-xs text-slate-400 max-w-xs">Enkripsi & Upload data ke server.</p>
          </div>
      );
  }

  if (step === 'PROOF') {
    return (
      <div className="space-y-4 animate-fade-in pb-20">
        <div className="flex justify-between items-center px-2">
            <button onClick={() => { setStep('SELECT'); stopCamera(); }} className="text-sm font-bold text-slate-500 hover:text-slate-800">Batal</button>
            <h3 className="font-bold text-lg">Ambil Bukti</h3>
            <div className="w-8"></div>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] shadow-xl mx-auto border-2 border-slate-100 w-full max-w-sm">
          {!proofPhoto ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center">
                  <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-2xl flex items-center justify-center active:scale-95 transition-transform">
                      <div className="w-16 h-16 bg-white rounded-full border-[3px] border-black"></div>
                  </button>
              </div>
            </>
          ) : (
            <>
                <img src={proofPhoto} className="w-full h-full object-cover transform scale-x-[-1]" />
                <button onClick={() => {setProofPhoto(''); startCamera();}} className="absolute top-4 right-4 bg-black/50 text-white p-2.5 rounded-full backdrop-blur-md hover:bg-black/70 transition">
                    <RefreshCw size={20}/>
                </button>
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        {proofPhoto && (
            <div className="max-w-sm mx-auto space-y-4 px-2">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Catatan</label>
                    <input 
                        className="w-full text-sm outline-none bg-transparent placeholder-slate-300 font-medium" 
                        placeholder="Keterangan tambahan..." 
                        value={note} 
                        onChange={e => setNote(e.target.value)}
                    />
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={consentGiven}
                            onChange={e => setConsentGiven(e.target.checked)}
                        />
                        <div className="text-xs text-slate-600 leading-snug">
                            <span className="font-bold text-slate-800">Konfirmasi Absensi</span><br/>
                            Saya menyatakan data lokasi dan foto ini valid.
                        </div>
                    </label>
                </div>

                <button 
                    onClick={handleSubmit} 
                    disabled={!consentGiven}
                    className={`w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${consentGiven ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-slate-400 cursor-not-allowed'}`}
                >
                    <Upload size={20}/> Kirim Absensi
                </button>
            </div>
        )}
      </div>
    );
  }

  // --- SELECT EVENT STEP ---
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div>
          <h2 className="text-2xl font-bold text-slate-900">Absensi</h2>
          <p className="text-sm text-slate-500">Pilih event yang sedang berlangsung.</p>
      </div>

      <div className="flex gap-2">
          <div className={`flex-1 p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${coords ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
              <MapPin size={16}/> {coords ? `Akurasi GPS: ±${Math.round(gpsAccuracy)}m` : 'Mencari GPS...'}
          </div>
      </div>

      {events?.length === 0 ? (
        <div className="text-slate-400 border-2 border-dashed border-slate-200 p-10 text-center rounded-2xl flex flex-col items-center gap-2">
            <AlertTriangle size={32} className="opacity-20"/>
            <p className="font-medium">Tidak ada event aktif.</p>
        </div>
      ) : (
        events?.map(e => (
          <button 
            key={e.id}
            onClick={() => handleSelect(e)}
            className="w-full bg-white p-5 rounded-2xl shadow-card border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-left group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity">
                TAP TO ABSEN
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">{e.name}</h3>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                <span className="flex items-center gap-1"><MapPin size={14}/> {e.locationName || 'Lokasi GPS'}</span>
            </div>
            <div className="flex gap-2">
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                    {e.mode} MODE
                </span>
            </div>
          </button>
        ))
      )}
    </div>
  );
};
