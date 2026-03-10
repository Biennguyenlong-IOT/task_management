import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths 
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export const Calendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Bắt đầu từ Thứ 2 (T2)
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-xl max-w-sm overflow-hidden">
      {/* Header điều hướng */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shadow-inner">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 capitalize leading-tight">
              {format(currentMonth, 'MMMM', { locale: vi })}
            </h3>
            <p className="text-xs text-stone-400 font-medium">{format(currentMonth, 'yyyy')}</p>
          </div>
        </div>
        
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-stone-500" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Tên các thứ trong tuần */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-4">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <div key={day}>{day}</div>)}
      </div>

      {/* Lưới ngày */}
      <div className="grid grid-cols-7 gap-2 relative">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentMonth.toString()}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-2 col-span-7"
          >
            {days.map((day, idx) => {
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <button 
                  key={idx} 
                  className={`
                    relative group flex flex-col items-center justify-center h-10 w-10 rounded-xl text-sm transition-all duration-300
                    ${!isCurrentMonth ? 'text-stone-300' : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-600'}
                    ${isToday ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600' : ''}
                  `}
                >
                  {format(day, 'd')}
                  
                  {/* Chấm nhỏ trang trí cho các sự kiện giả định */}
                  {isCurrentMonth && !isToday && Math.random() > 0.8 && (
                    <span className="absolute bottom-1.5 w-1 h-1 bg-amber-400 rounded-full group-hover:scale-150 transition-transform"></span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nhỏ xinh */}
      <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center">
        <button 
          onClick={() => setCurrentMonth(new Date())}
          className="text-xs font-semibold text-emerald-600 hover:underline"
        >
          Về hôm nay
        </button>
        <div className="flex -space-x-2">
           {[1,2,3].map(i => (
             <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-stone-200 overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};