import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'reset_password'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Check if we are in a password reset flow (Supabase adds a type=recovery hash)
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset_password');
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản trước khi đăng nhập.' });
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Email của bạn chưa được xác nhận. Vui lòng kiểm tra hộp thư đến để nhấn vào link xác nhận.');
          }
          throw error;
        }
      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://task-management-biennguyen.vercel.app',
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Liên kết đặt lại mật khẩu đã được gửi vào email của bạn!' });
      } else if (mode === 'reset_password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Mật khẩu đã được cập nhật thành công! Đang chuyển hướng...' });
        setTimeout(() => setMode('login'), 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Đã có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <LayoutGrid className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif font-medium text-stone-900">
            {mode === 'login' ? 'Chào mừng trở lại' : 
             mode === 'signup' ? 'Tạo tài khoản mới' : 
             mode === 'forgot_password' ? 'Khôi phục mật khẩu' : 'Đặt mật khẩu mới'}
          </h1>
          <p className="text-stone-500 text-sm mt-2 text-center">
            {mode === 'login' ? 'Đăng nhập để tiếp tục quản lý công việc.' : 
             mode === 'signup' ? 'Tham gia cùng chúng tôi để làm việc hiệu quả hơn.' :
             mode === 'forgot_password' ? 'Nhập email để nhận liên kết đặt lại mật khẩu.' : 'Nhập mật khẩu mới cho tài khoản của bạn.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {message && (
            <div className={cn(
              "p-4 rounded-2xl text-sm flex items-center gap-3",
              message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
            )}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="flex-1">{message.text}</span>
            </div>
          )}

          {mode !== 'reset_password' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-stone-400 mb-2 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-stone-50/50"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-stone-400 mb-2 ml-1">
                {mode === 'reset_password' ? 'Mật khẩu mới' : 'Mật khẩu'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-stone-50/50"
                  placeholder="••••••••"
                  required
                />
              </div>
              {mode === 'login' && (
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? <LogIn className="w-5 h-5" /> : mode === 'signup' ? <UserPlus className="w-5 h-5" /> : null}
                <span>
                  {mode === 'login' ? 'Đăng nhập' : 
                   mode === 'signup' ? 'Đăng ký ngay' : 
                   mode === 'forgot_password' ? 'Gửi yêu cầu' : 'Cập nhật mật khẩu'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-stone-100 text-center">
          <p className="text-stone-500 text-sm">
            {mode === 'login' ? (
              <>Chưa có tài khoản? <button onClick={() => setMode('signup')} className="text-emerald-600 font-medium hover:underline">Đăng ký</button></>
            ) : mode === 'signup' ? (
              <>Đã có tài khoản? <button onClick={() => setMode('login')} className="text-emerald-600 font-medium hover:underline">Đăng nhập</button></>
            ) : (
              <button onClick={() => setMode('login')} className="text-emerald-600 font-medium hover:underline flex items-center justify-center gap-1 mx-auto">
                Quay lại đăng nhập
              </button>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
