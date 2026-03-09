import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Task, TaskStatus, UserProfile } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, CheckCircle2, Clock, PlayCircle, Users, 
  ArrowLeft, BarChart3, PieChart as PieChartIcon, Activity, LayoutGrid, X, Circle, LogOut, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  onBack: () => void;
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBack, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    updateLastSeen();
    
    // Update last seen every 30 seconds
    const interval = setInterval(updateLastSeen, 30000);
    
    // Poll for online users every 20 seconds
    const pollInterval = setInterval(fetchProfilesOnly, 20000);
    
    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, []);

  const fetchProfilesOnly = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const currentOnline = data.filter(p => 
          p.id !== user.id && 
          p.last_seen && 
          (new Date().getTime() - new Date(p.last_seen).getTime() < 120000)
        ).map(p => p.id);
        
        const newOnlineIds = currentOnline.filter(id => !onlineUsers.has(id));
        if (newOnlineIds.length > 0) {
          const newUser = data.find(p => p.id === newOnlineIds[0]);
          if (newUser) {
            setNotification(`${newUser.display_name || newUser.email.split('@')[0]} vừa online`);
            setTimeout(() => setNotification(null), 5000);
          }
        }
        
        setOnlineUsers(new Set(currentOnline));
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error polling profiles:', err);
    }
  };

  const updateLastSeen = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (err) {
      console.error('Error updating last seen:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select('*, task_assignees(user_id)'),
        supabase.from('profiles').select('*')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setTasks(tasksRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Statistics calculations
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Data for Status Pie Chart
  const statusData = [
    { name: 'To Do', value: todoTasks, color: '#94a3b8' },
    { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { name: 'Completed', value: doneTasks, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Data for User Workload Bar Chart
  const userData = profiles.map(profile => {
    const userTasks = tasks.filter(task => 
      task.task_assignees?.some(a => a.user_id === profile.id)
    );
    return {
      name: profile.display_name || profile.email.split('@')[0],
      total: userTasks.length,
      done: userTasks.filter(t => t.status === 'done').length,
    };
  }).filter(u => u.total > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium">
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-serif font-medium text-stone-900">Dashboard Thống Kê</h1>
            <p className="text-stone-500">Chào mừng, <span className="text-stone-700 font-medium">{user.email}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium"
              >
                <Circle className="w-2 h-2 fill-white animate-pulse" />
                {notification}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-sm"
          >
            <LayoutGrid className="w-4 h-4" /> Trang kéo thả
          </button>
          <button 
            onClick={fetchData}
            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={async () => {
              try {
                await supabase.auth.signOut();
                window.location.href = '/';
              } catch (err) {
                console.error('Logout error:', err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-stone-100 rounded-lg">
              <Activity className="w-5 h-5 text-stone-600" />
            </div>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Tổng Task</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{totalTasks}</div>
          <p className="text-sm text-stone-500 mt-1">Tất cả các trạng thái</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Hoàn Thành</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{doneTasks}</div>
          <p className="text-sm text-stone-500 mt-1">{completionRate}% tỷ lệ đáp ứng</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onBack}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm cursor-pointer hover:border-amber-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <PlayCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Đang Làm</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{inProgressTasks}</div>
          <p className="text-sm text-stone-500 mt-1">Cần tập trung xử lý (Click để xem)</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setShowPersonnel(true)}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm cursor-pointer hover:border-stone-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-stone-100 rounded-lg group-hover:bg-stone-200 transition-colors">
              <Users className="w-5 h-5 text-stone-600" />
            </div>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Nhân Sự</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{profiles.length}</div>
          <p className="text-sm text-stone-500 mt-1">Thành viên trong nhóm (Click để xem)</p>
        </motion.div>
      </div>

      {/* Personnel Modal */}
      <AnimatePresence>
        {showPersonnel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-900 text-white rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-medium text-stone-900">Danh Sách Nhân Sự</h2>
                    <p className="text-sm text-stone-500">Thành viên tham gia dự án</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchProfilesOnly}
                    className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-600"
                    title="Cập nhật trạng thái"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowPersonnel(false)}
                    className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {profiles.map((profile) => {
                    const lastSeenDate = profile.last_seen ? new Date(profile.last_seen) : null;
                    const isOnline = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime() < 120000);
                    const userTasks = tasks.filter(t => t.task_assignees?.some(a => a.user_id === profile.id));
                    const completedTasks = userTasks.filter(t => t.status === 'done').length;
                    
                    return (
                      <div key={profile.id} className="flex items-center justify-between p-4 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 font-medium text-lg border-2 border-white shadow-sm">
                              {profile.display_name?.[0] || profile.email[0].toUpperCase()}
                            </div>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-stone-900">{profile.display_name || profile.email.split('@')[0]}</h3>
                              {isOnline ? (
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                              ) : (
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-1.5 py-0.5 rounded">Offline</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500">{profile.email}</p>
                            {lastSeenDate && !isOnline && (
                              <p className="text-[10px] text-stone-400 mt-0.5">
                                Hoạt động: {lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {lastSeenDate.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-stone-900">{completedTasks}/{userTasks.length} Task</div>
                          <p className="text-[10px] text-stone-400 uppercase tracking-wider">Hoàn thành</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
                <button 
                  onClick={() => setShowPersonnel(false)}
                  className="px-6 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-8">
            <PieChartIcon className="w-5 h-5 text-stone-400" />
            <h2 className="text-xl font-serif font-medium text-stone-900">Trạng Thái Công Việc</h2>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* User Workload */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="w-5 h-5 text-stone-400" />
            <h2 className="text-xl font-serif font-medium text-stone-900">Phân Bổ Nhân Sự</h2>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" name="Tổng Task" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Đã Xong" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Quality Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-emerald-900 text-white p-8 rounded-3xl overflow-hidden relative"
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-serif font-medium mb-2">Chất Lượng Đáp Ứng</h2>
          <p className="text-emerald-100/80 mb-6 max-w-md">
            Dựa trên tỷ lệ hoàn thành công việc hiện tại của toàn bộ hệ thống.
          </p>
          <div className="flex items-end gap-4">
            <div className="text-6xl font-serif font-medium">{completionRate}%</div>
            <div className="mb-2 text-emerald-200">Hiệu suất tổng thể</div>
          </div>
          <div className="mt-8 w-full bg-emerald-800/50 h-3 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-emerald-400"
            />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full -ml-24 -mb-24 blur-2xl" />
      </motion.div>
    </div>
  );
};
