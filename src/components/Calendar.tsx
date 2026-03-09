import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

export const Calendar: React.FC = () => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <h3 className="font-medium text-stone-900">{format(today, 'MMMM yyyy')}</h3>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400 mb-2">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <div 
            key={idx} 
            className={`p-2 text-center text-sm rounded-lg ${
              isSameMonth(day, monthStart) ? 'text-stone-900' : 'text-stone-300'
            } ${isSameDay(day, today) ? 'bg-emerald-100 text-emerald-700 font-bold' : ''}`}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
    </div>
  );
};
