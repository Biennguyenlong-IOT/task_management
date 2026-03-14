import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Sun, Cloud, CloudRain, CloudLightning, Snowflake, 
  CloudFog, RefreshCw, MapPin, Wind, Droplets, Eye, Thermometer 
} from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (lat: number, lon: number) => {
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    if (!apiKey) {
      setError('Thiếu API Key');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`
      );
      if (!response.ok) throw new Error('Không thể tải dữ liệu thời tiết');
      const data = await response.json();
      setWeather(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude);
          },
          (err) => {
            console.warn("Geolocation error:", err);
            // Fallback to Ho Chi Minh City as requested in the image
            fetchWeather(10.7626, 106.6602);
          },
          { timeout: 10000 }
        );
      } else {
        fetchWeather(10.7626, 106.6602);
      }
    };

    getLocation();
  }, []);

  const getWeatherIcon = (code: string) => {
    const iconProps = { size: 48, className: "text-white" };
    if (code.startsWith('01')) return <Sun {...iconProps} className="text-yellow-300" />;
    if (code.startsWith('02')) return <CloudSun {...iconProps} className="text-yellow-200" />;
    if (code.startsWith('03') || code.startsWith('04')) return <Cloud {...iconProps} className="text-stone-200" />;
    if (code.startsWith('09') || code.startsWith('10')) return <CloudRain {...iconProps} className="text-blue-300" />;
    if (code.startsWith('11')) return <CloudLightning {...iconProps} className="text-yellow-400" />;
    if (code.startsWith('13')) return <Snowflake {...iconProps} className="text-blue-100" />;
    if (code.startsWith('50')) return <CloudFog {...iconProps} className="text-stone-300" />;
    return <CloudSun {...iconProps} />;
  };

  if (loading) return (
    <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg flex items-center justify-center h-[240px]">
      <RefreshCw className="animate-spin" size={32} />
    </div>
  );

  if (error || !weather) return (
    <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg flex flex-col items-center justify-center h-[240px] text-center">
      <p className="text-sm opacity-80 mb-4">{error === 'Thiếu API Key' ? 'Vui lòng thêm VITE_WEATHER_API_KEY vào mục Secrets' : error}</p>
      <button 
        onClick={() => { setLoading(true); fetchWeather(10.7626, 106.6602); }}
        className="bg-white/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/30 transition-all"
      >
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 rounded-[2rem] shadow-lg relative overflow-hidden flex flex-col min-h-[240px]">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-white/70 mb-1">
            <MapPin size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">{weather.name}, {weather.sys.country}</span>
          </div>
          <div className="text-4xl font-sans font-bold">{Math.round(weather.main.temp)}°C</div>
        </div>
        <div className="flex flex-col items-end">
          {getWeatherIcon(weather.weather[0].icon)}
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{weather.weather[0].description}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Thermometer size={14} className="text-orange-300" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase font-bold">Cảm giác</div>
            <div className="text-xs font-bold">{Math.round(weather.main.feels_like)}°C</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Droplets size={14} className="text-blue-300" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase font-bold">Độ ẩm</div>
            <div className="text-xs font-bold">{weather.main.humidity}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Wind size={14} className="text-emerald-300" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase font-bold">Gió</div>
            <div className="text-xs font-bold">{weather.wind.speed} m/s</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Eye size={14} className="text-purple-300" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase font-bold">Tầm nhìn</div>
            <div className="text-xs font-bold">{(weather.visibility / 1000).toFixed(1)} km</div>
          </div>
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
