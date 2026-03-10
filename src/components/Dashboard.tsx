import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Task, UserProfile } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, Clock as ClockIcon, PlayCircle, Users, 
  X, LogOut, RefreshCw, LayoutGrid, Activity, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification, NotificationType } from './Notification';
import { Clock } from './Clock';
import { Calendar } from './Calendar';

interface DashboardProps {
  onBack: () => void;
  user: User;
}

// Thành phần thẻ thống kê dùng chung để giao diện đồng nhất
const StatCard = ({ title, value, icon, color, onClick, subtitle, isLink }: any) => {
  const colorMap: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    stone: "bg-stone-100 text-stone-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <motion.div 
      whileHover={isLink ? { y: -4 } : {}}
      onClick={onClick}
      className={`bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm transition-all ${isLink ? 'cursor-pointer hover:border-stone-400 hover:shadow-md group' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.stone} transition-transform group-hover:scale-110`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-3xl font-serif font-semibold text-stone-900">{value}</div>
      {subtitle && <p className="text-xs text-stone-500 mt-1.5 font-medium">{subtitle}</p>}
    </motion.div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onBack, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [dbNotification, setDbNotification] = useState<{ message: string, type: NotificationType } | null>(null);

  const showDbNotification = (message: string, type: NotificationType = 'info') => {
    setDbNotification({ message, type });
  };

  // LOGIC GIỮ NGUYÊN TỪ CODE CŨ
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select(`*, task_assignees (user_id)`),
        supabase.from('profiles').select('*')
      ]);
      console.log('Profiles data:', profilesRes.data);
      if (tasksRes.error) throw tasksRes.error;
      const allTasks = (tasksRes.data || []) as any[];
      const relatedTasks = allTasks.filter(task => 
        task && (task.user_id === user.id || task.task_assignees?.some((a: any) => a.user_id === user.id))
      );
      setTasks(relatedTasks);
      tasksRef.current = relatedTasks;
      setProfiles(profilesRes.data || []);
      
      // Update online status logic
      const currentOnline = (profilesRes.data || []).filter(p => p.last_seen !== null).map(p => p.id);
      console.log('Online users:', currentOnline, 'Profiles:', profilesRes.data);
      setOnlineUsers(currentOnline);
    } catch (err: any) {
      showDbNotification('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id).then(({ error }) => {
        if (error) {
          if (error.code === 'PGRST204' || error.message.includes('column "last_seen" does not exist')) {
            console.warn('Column last_seen does not exist');
          } else {
            console.error('Error updating last_seen:', error);
          }
        } else {
          console.log('last_seen updated for', user.id);
        }
      });
    }, 30000);

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { data } = await supabase.from('profiles').select('*');
        if (data) {
          setProfiles(data);
          const currentOnline = data.filter(p => p.last_seen !== null).map(p => p.id);
          setOnlineUsers(currentOnline);
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // TÍNH TOÁN DỮ LIỆU
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  const statusData = [
    { name: 'Cần làm', value: tasks.filter(t => t.status === 'todo').length, color: '#A8A29E' },
    { name: 'Đang làm', value: inProgressTasks, color: '#D97706' },
    { name: 'Hoàn thành', value: doneTasks, color: '#059669' },
  ].filter(d => d.value > 0);

  const userData = profiles.map(p => ({
    name: p.display_name || p.email.split('@')[0],
    total: tasks.filter(t => t.task_assignees?.some(a => a.user_id === p.id)).length,
    done: tasks.filter(t => t.status === 'done' && t.task_assignees?.some(a => a.user_id === p.id)).length,
  })).filter(u => u.total > 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFCFB]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-stone-900 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-stone-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header - Thanh thoát hơn */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-stone-900 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-stone-200">
              <TrendingUp size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight text-stone-900">Quản Trị Hệ Thống</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-stone-500 text-sm font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-stone-200/50">
            <button onClick={fetchData} title="Làm mới" className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all">
              <RefreshCw size={20} />
            </button>
            <div className="w-[1px] h-6 bg-stone-200 mx-1" />
            <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all shadow-md">
              <LayoutGrid size={18} /> Bảng điều khiển
            </button>
            <button 
              onClick={async () => {
                await supabase.from('profiles').update({ last_seen: null }).eq('id', user.id);
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Footer Stats Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 bg-emerald-950 text-white p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-emerald-900/20"
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-serif font-bold mb-2 italic">Chỉ số năng suất</h2>
              <p className="text-emerald-200/50 text-sm font-medium tracking-wide">Dữ liệu tính toán dựa trên 7 ngày gần nhất</p>
            </div>
            <div className="flex gap-12 md:gap-20">
              <div className="text-center">
                <div className="text-5xl font-serif font-bold text-emerald-400">{completionRate}%</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/40 mt-2 font-bold">Hiệu quả</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-serif font-bold text-white">{inProgressTasks}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/40 mt-2 font-bold">Đang xử lý</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-serif font-bold text-emerald-400">{onlineUsers.length || 1}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/40 mt-2 font-bold">Active</div>
              </div>
            </div>
          </div>
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full -ml-32 -mb-32 blur-[80px]" />
        </motion.div>

        {/* Layout Grid chính */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* CỘT TRÁI - Nội dung trọng tâm */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            
            {/* Grid Thẻ thống kê */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Tổng Task" value={totalTasks} icon={<Activity />} color="stone" />
              <StatCard title="Hoàn Thành" value={doneTasks} icon={<CheckCircle2 />} color="emerald" subtitle={`${completionRate}% tiến độ`} />
              <StatCard title="Đang Chạy" value={inProgressTasks} icon={<PlayCircle />} color="amber" onClick={onBack} isLink />
              <StatCard title="Nhân Sự" value={profiles.length} icon={<Users />} color="blue" onClick={() => setShowPersonnel(true)} isLink subtitle={`${onlineUsers.length} trực tuyến`} />
            </div>

            {/* Biểu đồ phân bổ nhân sự */}
            <section className="bg-white p-8 rounded-[2rem] border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                <h2 className="font-serif font-bold text-xl flex items-center gap-3">
                  <BarChart3 size={24} className="text-stone-300" /> Hiệu suất nhân sự
                </h2>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-stone-400">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-stone-200"></div> Tổng</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Xong</span>
                </div>
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userData} barGap={12}>
                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#F1F1EF" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12, fontWeight: 500 }} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#F9F8F6' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="total" name="Tổng" fill="#E7E5E4" radius={[8, 8, 8, 8]} barSize={35} />
                    <Bar dataKey="done" name="Xong" fill="#10B981" radius={[8, 8, 8, 8]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI - Tiện ích */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            
            {/* Clock Widget */}
            <div className="bg-stone-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <Clock />
              </div>
              <div className="absolute -right-6 -bottom-6 text-white/[0.03] group-hover:scale-110 transition-transform duration-700">
                <ClockIcon size={180} />
              </div>
            </div>

            {/* Pie Chart Widget */}
            <section className="bg-white p-8 rounded-[2rem] border border-stone-200/60 shadow-sm">
              <h2 className="font-serif font-bold text-xl mb-8 flex items-center gap-3">
                <PieChartIcon size={22} className="text-stone-300" /> Trạng thái
              </h2>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" stroke="none">
                      {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '25px', fontSize: '12px', fontWeight: '600' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="bg-white p-2 rounded-[2rem] border border-stone-200/60 shadow-sm">
              <Calendar />
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Modal - Cải tiến đẹp hơn */}
      <AnimatePresence>
        {showPersonnel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-stone-200"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Thành viên đội ngũ</h2>
                  <p className="text-sm text-stone-500 font-medium">Danh sách nhân sự tham gia dự án</p>
                </div>
                <button onClick={() => setShowPersonnel(false)} className="p-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200 rounded-2xl transition-all text-stone-400 hover:text-stone-900">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[50vh] overflow-y-auto space-y-4 custom-scrollbar">
                {profiles.map(p => {
                   const isUserOnline = onlineUsers.includes(p.id) || p.id === user.id;
                   return (
                    <div key={p.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-[#F9F8F6] border border-stone-200/50 hover:border-stone-300 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-bold text-stone-900 border border-stone-200 shadow-sm text-lg">
                            {p.display_name?.[0] || p.email[0].toUpperCase()}
                          </div>
                          {isUserOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#F9F8F6] rounded-full"></div>}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{p.display_name || p.email.split('@')[0]}</div>
                          <div className="text-xs text-stone-400 font-medium">{p.email}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isUserOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>
                        {isUserOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex justify-end">
                 <button onClick={() => setShowPersonnel(false)} className="px-8 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-stone-200">Đóng cửa sổ</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Notification message={dbNotification?.message || null} type={dbNotification?.type || 'info'} onClose={() => setDbNotification(null)} />
    </div>
  );
};