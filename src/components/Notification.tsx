import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string | null;
  type: NotificationType;
  onClose: () => void;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-6 right-6 z-[100] max-w-md w-full"
        >
          <div className={cn(
            "p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md",
            type === 'success' ? "bg-emerald-500/90 border-emerald-400 text-white" : 
            type === 'error' ? "bg-red-500/90 border-red-400 text-white" : 
            "bg-stone-800/90 border-stone-700 text-white"
          )}>
            <div className="mt-0.5">
              {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
               <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {message}
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
