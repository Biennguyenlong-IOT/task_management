import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Cloud, Sun, CloudRain, CloudLightning, Wind } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const fetchWeather = async () => {
      try {
        // Use Open-Meteo (Free, no API key required)
         // Coordinates for Ho Chi Minh City (10.8231, 106.6297)
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&current_weather=true'
        );
        const data = await response.json();
        
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          let description = 'Có mây';
          let icon = 'Clouds';
          
          // WMO Weather interpretation codes
          if (code === 0) { description = 'Trời quang'; icon = 'Clear'; }
          else if (code >= 1 && code <= 3) { description = 'Có mây'; icon = 'Clouds'; }
          else if (code >= 45 && code <= 48) { description = 'Sương mù'; icon = 'Clouds'; }
          else if (code >= 51 && code <= 67) { description = 'Mưa phùn'; icon = 'Rain'; }
          else if (code >= 71 && code <= 82) { description = 'Mưa'; icon = 'Rain'; }
          else if (code >= 95) { description = 'Dông'; icon = 'Thunderstorm'; }
          
          setWeather({
            temp: data.current_weather.temperature,
            description,
            icon
          });
        } else {
          // Fallback to placeholder if data is invalid
          setWeather({ temp: 28, description: 'Có mây', icon: 'Clouds' });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Fallback to placeholder if fetch fails
        setWeather({ temp: 28, description: 'Có mây', icon: 'Clouds' });
      }
    };

    fetchWeather();
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = 'Chào bạn';
  if (hour < 12) greeting = 'Chào buổi sáng';
  else if (hour < 18) greeting = 'Chào buổi chiều';
  else greeting = 'Chào buổi tối';

  const WeatherIcon = () => {
    switch (weather?.icon) {
      case 'Clear': return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'Clouds': return <Cloud className="w-5 h-5 text-stone-300" />;
      case 'Rain': return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'Thunderstorm': return <CloudLightning className="w-5 h-5 text-purple-400" />;
      default: return <Sun className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-700 p-6 rounded-2xl shadow-lg flex items-center gap-4 text-white">
      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
        <ClockIcon className="w-6 h-6 text-emerald-400" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-stone-300 mb-0.5">{greeting}, chúc bạn một ngày làm việc hiệu quả!</div>
        <div className="text-2xl font-mono font-medium tracking-tight">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-sm text-stone-400">
          {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
      {weather && (
        <div className="flex flex-col items-center gap-1 bg-white/5 p-3 rounded-xl">
          <WeatherIcon />
          <div className="text-lg font-medium">{Math.round(weather.temp)}°C</div>
          <div className="text-xs text-stone-400">{weather.description}</div>
        </div>
      )}
    </div>
  );
};
