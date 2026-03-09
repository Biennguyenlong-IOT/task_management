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
  ArrowLeft, BarChart3, PieChart as PieChartIcon, Activity, LayoutGrid
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onBack: () => void;
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBack, user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-sm"
          >
            <LayoutGrid className="w-4 h-4" /> Trang kéo thả
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all"
          >
            <TrendingUp className="w-4 h-4" /> Làm mới
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
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <PlayCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Đang Làm</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{inProgressTasks}</div>
          <p className="text-sm text-stone-500 mt-1">Cần tập trung xử lý</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-stone-100 rounded-lg">
              <Users className="w-5 h-5 text-stone-600" />
            </div>
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Nhân Sự</span>
          </div>
          <div className="text-3xl font-serif font-medium text-stone-900">{profiles.length}</div>
          <p className="text-sm text-stone-500 mt-1">Thành viên trong nhóm</p>
        </motion.div>
      </div>

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
