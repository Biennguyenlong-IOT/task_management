import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Cloud, Sun, CloudRain, CloudLightning, Calendar, Thermometer } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&current_weather=true'
        );
        const data = await response.json();
        
        if (data?.current_weather) {
          const code = data.current_weather.weathercode;
          let description = 'Nhiều mây';
          let icon = 'Clouds';
          
          if (code === 0) { description = 'Trời quang'; icon = 'Clear'; }
          else if (code >= 1 && code <= 3) { description = 'Ít mây'; icon = 'Clouds'; }
          else if (code >= 51 && code <= 67) { description = 'Mưa phùn'; icon = 'Rain'; }
          else if (code >= 71 && code <= 82) { description = 'Mưa lớn'; icon = 'Rain'; }
          else if (code >= 95) { description = 'Có dông'; icon = 'Thunderstorm'; }
          
          setWeather({ temp: data.current_weather.temperature, description, icon });
        }
      } catch (error) {
        setWeather({ temp: 28, description: 'Ổn định', icon: 'Clouds' });
      }
    };

    fetchWeather();
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  
  // Xác định chủ đề màu sắc theo nhiệt độ (Dynamic Themes)
  const getTheme = () => {
    const temp = weather?.temp ?? 25;
    
    let baseTheme = "from-emerald-500 via-teal-500 to-emerald-700"; // Moderate (20-28°C)
    if (temp < 20) baseTheme = "from-blue-400 via-indigo-500 to-blue-700"; // Cold
    else if (temp >= 28 && temp < 33) baseTheme = "from-orange-400 via-amber-500 to-orange-600"; // Warm
    else if (temp >= 33) baseTheme = "from-red-500 via-rose-600 to-red-800"; // Hot
    
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
          {weather && (
            <div className="flex flex-col items-center bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-inner">
              <WeatherIcon />
              <div className="mt-1 font-bold text-xl">{Math.round(weather.temp)}°</div>
            </div>
          )}
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
            <div className="p-2 bg-emerald-500/20 rounded-lg"><ClockIcon className="w-4 h-4 text-emerald-400" /></div>
            <span className="text-[10px] leading-tight text-white/70 font-medium">Làm việc hiệu quả nhé!</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Thermometer className="w-4 h-4 text-blue-400" /></div>
            <span className="text-[10px] leading-tight text-white/70 font-medium">Hồ Chí Minh, VN</span>
          </div>
        </div>
      </div>
    </div>
  );
};