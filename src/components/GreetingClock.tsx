
import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CloudSun, Quote } from './Icons';
import { motion } from 'framer-motion';

interface GreetingClockProps {
  user: {
    name: string;
    division?: string;
  } | null;
}

const DAILY_QUOTES = [
  "Disiplin adalah jembatan antara cita-cita dan pencapaian.",
  "Kerja keras hari ini adalah tabungan kesuksesan di masa depan.",
  "Jangan menunggu sempurna, mulailah sekarang dan perbaiki pelan-pelan.",
  "Konsistensi mengalahkan intensitas jangka pendek.",
  "Hadir tepat waktu adalah bentuk penghormatan pada diri sendiri dan orang lain.",
  "Sukses bukanlah kebetulan, ia adalah hasil dari kerja keras dan ketekunan.",
  "Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang Anda lakukan."
];

export const GreetingClock: React.FC<GreetingClockProps> = ({ user }) => {
  const [time, setTime] = useState(new Date());
  
  // Contextual State
  const [locationName, setLocationName] = useState('Mendeteksi lokasi...');
  const [weatherTemp, setWeatherTemp] = useState<string | null>(null);
  const [dailyQuote, setDailyQuote] = useState('');

  // 1. Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Location & Weather Effect (Runs once)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationName("GPS tidak didukung");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        
        // Fetch Location Name (Nominatim)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => {
             const loc = data.address.suburb || data.address.city || data.address.town || data.address.county || "Lokasi Terdeteksi";
             setLocationName(loc);
          })
          .catch(() => setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`));

        // Fetch Weather (Open-Meteo)
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
          .then(res => res.json())
          .then(data => {
            if (data.current_weather) {
              setWeatherTemp(`${Math.round(data.current_weather.temperature)}°C`);
            }
          })
          .catch(err => console.log("Weather error", err));
      },
      () => {
        setLocationName("Aktifkan GPS");
      }
    );
  }, []);

  // 3. Daily Quote Logic
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('sakato_daily_quote');
    
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        setDailyQuote(parsed.text);
        return;
      }
    }

    // Generate new quote
    const newQuote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
    localStorage.setItem('sakato_daily_quote', JSON.stringify({ date: today, text: newQuote }));
    setDailyQuote(newQuote);
  }, []);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\./g, ':');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}, <span className="text-blue-600">{user?.name || 'Anggota'}</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
               <span className="text-sm font-medium text-slate-500">{formatDate(time)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
             <div className="bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200">
                <MapPin size={12} className="text-red-500"/> {locationName}
             </div>
             {weatherTemp && (
                <div className="bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-blue-700 border border-blue-100">
                   <CloudSun size={12}/> {weatherTemp}
                </div>
             )}
          </div>
          
          <div className="flex gap-2 items-start max-w-lg">
             <Quote size={14} className="text-slate-300 shrink-0 mt-0.5" />
             <p className="text-xs text-slate-500 italic leading-relaxed">"{dailyQuote}"</p>
          </div>
        </div>
        
        <div className="w-full md:w-auto bg-slate-50 border border-slate-100 px-6 py-4 rounded-xl flex items-center justify-between md:justify-end gap-4 shadow-inner">
            <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Waktu Server</p>
                <p className="text-3xl font-mono font-bold text-slate-800 tabular-nums tracking-wide">
                    {formatTime(time)} <span className="text-sm text-slate-400 font-sans font-normal">WIB</span>
                </p>
            </div>
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 border border-slate-100">
                <Clock size={24} className="animate-pulse-slow"/>
            </div>
        </div>
      </div>
    </motion.div>
  );
};
