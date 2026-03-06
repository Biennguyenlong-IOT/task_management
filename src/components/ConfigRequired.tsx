import React from 'react';
import { AlertCircle, ExternalLink, Key, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const ConfigRequired: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[32px] shadow-xl border border-black/5 w-full max-w-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="text-amber-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-medium text-stone-900">Cấu hình Supabase</h1>
            <p className="text-stone-500">Bạn cần thiết lập API Keys để ứng dụng có thể hoạt động.</p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center text-[10px] text-stone-600">1</span>
              Lấy thông tin từ Supabase
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-stone-100 bg-stone-50 hover:bg-stone-100 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5 text-emerald-500" />
                  <ExternalLink className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />
                </div>
                <h3 className="font-medium text-stone-900 text-sm">Supabase Dashboard</h3>
                <p className="text-xs text-stone-500 mt-1">Truy cập vào dự án của bạn.</p>
              </a>
              <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50">
                <Key className="w-5 h-5 text-amber-500 mb-2" />
                <h3 className="font-medium text-stone-900 text-sm">Project Settings</h3>
                <p className="text-xs text-stone-500 mt-1">Vào Settings {'>'} API để lấy URL và Anon Key.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center text-[10px] text-stone-600">2</span>
              Thiết lập Secrets trong AI Studio
            </h2>
            <div className="bg-stone-900 rounded-2xl p-6 text-stone-300 font-mono text-xs leading-relaxed">
              <p className="mb-2 text-stone-500"># Thêm 2 biến này vào tab Secrets:</p>
              <p><span className="text-emerald-400">VITE_SUPABASE_URL</span>="https://your-project.supabase.co"</p>
              <p><span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span>="your-anon-key"</p>
            </div>
          </section>

          <div className="pt-4 border-t border-stone-100">
            <p className="text-sm text-stone-500 italic">
              * Sau khi thêm Secrets, hãy làm mới (Refresh) lại trang web này.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
