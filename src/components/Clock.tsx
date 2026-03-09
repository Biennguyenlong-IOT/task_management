import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = 'Chào bạn';
  if (hour < 12) greeting = 'Chào buổi sáng';
  else if (hour < 18) greeting = 'Chào buổi chiều';
  else greeting = 'Chào buổi tối';

  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-700 p-6 rounded-2xl shadow-lg flex items-center gap-4 text-white">
      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
        <ClockIcon className="w-6 h-6 text-emerald-400" />
      </div>
      <div>
        <div className="text-xs font-medium text-stone-300 mb-0.5">{greeting}, chúc bạn một ngày làm việc hiệu quả!</div>
        <div className="text-2xl font-mono font-medium tracking-tight">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-sm text-stone-400">
          {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
    </div>
  );
};
