import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Cloud, Sun, CloudRain, CloudLightning, Calendar, Thermometer, Settings, X, Droplets, Wind } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string; humidity?: number; wind?: number; name?: string } | null>(null);
  const [coldThreshold, setColdThreshold] = useState(20);
  const [warmThreshold, setWarmThreshold] = useState(28);
  const [hotThreshold, setHotThreshold] = useState(33);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const fetchWeather = async () => {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
      if (!apiKey) return;

      try {
        // Sử dụng tọa độ TP.HCM hoặc lấy từ geolocation nếu muốn, ở đây giữ cố định TP.HCM như ảnh
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=10.7626&lon=106.6602&appid=${apiKey}&units=metric&lang=vi`
        );
        const data = await response.json();
        
        if (data && data.main) {
          setWeather({ 
            temp: data.main.temp, 
            description: data.weather[0].description, 
            icon: data.weather[0].main,
            humidity: data.main.humidity,
            wind: data.wind.speed,
            name: data.name
          });
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };

    fetchWeather();
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  
  // Xác định chủ đề màu sắc theo nhiệt độ (Dynamic Themes)
  const getTheme = () => {
    const temp = weather?.temp ?? 25;
    
    let baseTheme = "from-emerald-500 via-teal-500 to-emerald-700"; // Moderate
    if (temp < coldThreshold) baseTheme = "from-blue-400 via-indigo-500 to-blue-700"; // Cold
    else if (temp >= warmThreshold && temp < hotThreshold) baseTheme = "from-orange-400 via-amber-500 to-orange-600"; // Warm
    else if (temp >= hotThreshold) baseTheme = "from-red-500 via-rose-600 to-red-800"; // Hot
    
    // Áp dụng tông tối nếu là ban đêm
    if (hour >= 18 || hour < 5) {
        return baseTheme.replace("from-", "from-slate-900/80 via-").replace("to-", "to-black");
    }
    
    return baseTheme;
  };

  const getGreeting = () => {
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const WeatherIcon = () => {
    const iconClass = "w-8 h-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]";
    switch (weather?.icon) {
      case 'Clear': return <Sun className={`${iconClass} text-yellow-300 animate-spin-slow`} />;
      case 'Clouds': return <Cloud className={`${iconClass} text-blue-100`} />;
      case 'Rain': return <CloudRain className={`${iconClass} text-cyan-300`} />;
      case 'Thunderstorm': return <CloudLightning className={`${iconClass} text-yellow-400`} />;
      default: return <Sun className={`${iconClass} text-yellow-300`} />;
    }
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${getTheme()} p-1 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-md transition-all duration-1000`}>
      
      {/* Lớp phủ hạt sáng trang trí */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {showSettings ? (
        <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 p-8 rounded-[2.3rem] flex flex-col gap-4 text-white">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Cài đặt ngưỡng nhiệt</h3>
                <button onClick={() => setShowSettings(false)}><X className="w-6 h-6" /></button>
            </div>
            {[
                { label: 'Ngưỡng lạnh (°C)', value: coldThreshold, setter: setColdThreshold },
                { label: 'Ngưỡng ấm (°C)', value: warmThreshold, setter: setWarmThreshold },
                { label: 'Ngưỡng nóng (°C)', value: hotThreshold, setter: setHotThreshold },
            ].map(item => (
                <div key={item.label} className="flex flex-col gap-1">
                    <label className="text-xs text-white/60">{item.label}</label>
                    <input type="number" value={item.value} onChange={e => item.setter(Number(e.target.value))} className="bg-white/10 p-2 rounded-lg text-white" />
                </div>
            ))}
        </div>
      ) : (
        <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.3rem] flex flex-col gap-6 text-white">
            
            {/* Header: Greeting & Date */}
            <div className="flex justify-between items-start">
            <div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                {getGreeting()}
                </span>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white/80">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>
            
            {/* Weather Widget (Floating Style) */}
            <div className="flex flex-col items-center gap-2">
                {weather && (
                    <div className="flex flex-col items-center bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-inner">
                    <WeatherIcon />
                    <div className="mt-1 font-bold text-xl">{Math.round(weather.temp)}°</div>
                    </div>
                )}
                <button onClick={() => setShowSettings(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                    <Settings className="w-4 h-4" />
                </button>
            </div>
            </div>

            {/* Main: Big Digital Clock */}
            <div className="text-center py-4">
            <div className="text-6xl font-black tracking-tighter drop-shadow-2xl flex justify-center items-baseline gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className="text-2xl font-light text-white/40 animate-pulse">
                :{time.toLocaleTimeString([], { second: '2-digit' })}
                </span>
            </div>
            <p className="text-[11px] text-white/50 mt-2 tracking-[0.2em] uppercase font-semibold">
                {weather?.description || 'Đang cập nhật...'}
            </p>
            </div>

            {/* Footer: Status bar */}
            <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                <div className="p-2 bg-emerald-500/20 rounded-lg"><Droplets className="w-4 h-4 text-emerald-400" /></div>
                <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 uppercase font-bold">Độ ẩm</span>
                    <span className="text-[10px] leading-tight text-white/70 font-medium">{weather?.humidity || '--'}%</span>
                </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Wind className="w-4 h-4 text-blue-400" /></div>
                <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 uppercase font-bold">Gió</span>
                    <span className="text-[10px] leading-tight text-white/70 font-medium">{weather?.wind || '--'} m/s</span>
                </div>
            </div>
            </div>
        </div>
      )}
    </div>
  );
};