import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Calendar, ArrowLeft, Plus, Trash2, X, Pencil, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Task, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MaintenancePlanProps {
  user: User;
  onBack: () => void;
}

const cycles = [
  { id: 'daily', title: 'Hằng ngày' },
  { id: 'weekly', title: 'Hằng tuần' },
  { id: 'monthly', title: 'Hằng tháng' },
  { id: '4-months', title: '4 tháng' },
  { id: '6-months', title: '6 tháng' },
  { id: 'yearly', title: '1 năm' },
];

export const MaintenancePlan: React.FC<MaintenancePlanProps> = ({ user, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id)')
      .not('maintenance_cycle', 'is', null);
    if (data) setTasks(data as Task[]);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !selectedCycle) return;

    let taskId = editingTask?.id;

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTask.title,
          description: newTask.description,
          maintenance_cycle: selectedCycle,
        })
        .eq('id', editingTask.id);

      if (error) return;
      
      // Update assignees
      await supabase.from('task_assignees').delete().eq('task_id', editingTask.id);
    } else {
      const { data, error } = await supabase.from('tasks').insert([
        {
          title: newTask.title,
          description: newTask.description,
          status: 'todo',
          user_id: user.id,
          maintenance_cycle: selectedCycle,
        },
      ]).select();

      if (error || !data) return;
      taskId = data[0].id;
    }

    // Insert new assignees
    if (taskId && selectedAssignees.length > 0) {
      await supabase.from('task_assignees').insert(
        selectedAssignees.map(userId => ({
          task_id: taskId,
          user_id: userId
        }))
      );
    }

    setNewTask({ title: '', description: '' });
    setSelectedAssignees([]);
    setEditingTask(null);
    setIsModalOpen(false);
    fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setIsDeleteConfirmOpen(null);
    fetchTasks();
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, description: task.description || '' });
    setSelectedCycle(task.maintenance_cycle || null);
    setSelectedAssignees(task.task_assignees?.map(a => a.user_id) || []);
    setIsModalOpen(true);
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-sans font-medium text-stone-900">Kế hoạch bảo trì định kỳ</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cycles.map((cycle) => (
          <div key={cycle.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-medium text-stone-900">{cycle.title}</h2>
              </div>
              <button 
                onClick={() => { setSelectedCycle(cycle.id); setIsModalOpen(true); }}
                className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 mt-4">
              {tasks.filter(t => t.maintenance_cycle === cycle.id).map(task => (
                <div key={task.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl text-sm group">
                  <div className="flex-1 truncate mr-2">
                    <div className="font-medium">{task.title}</div>
                    {task.task_assignees && task.task_assignees.length > 0 && (
                      <div className="flex -space-x-1 mt-1 overflow-hidden">
                        {task.task_assignees.map((a, i) => {
                          const profile = profiles.find(p => p.id === a.user_id);
                          return (
                            <div 
                              key={i}
                              className="w-5 h-5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                              title={profile?.display_name || profile?.email || 'Nhân viên'}
                            >
                              {(profile?.display_name || profile?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.user_id === user.id && (
                      <>
                        <button 
                          onClick={() => openEditModal(task)} 
                          className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setIsDeleteConfirmOpen(task.id)} 
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); setEditingTask(null); setNewTask({ title: '', description: '' }); }} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-medium">{editingTask ? 'Chỉnh sửa công việc' : 'Tạo công việc bảo trì'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingTask(null); setNewTask({ title: '', description: '' }); }} className="p-2 hover:bg-stone-100 rounded-xl transition-all">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              <form onSubmit={createTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Tên công việc</label>
                  <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-3 rounded-xl border border-stone-200 focus:border-stone-900 outline-none transition-all" placeholder="Nhập tên công việc..." required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Mô tả</label>
                  <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full p-3 rounded-xl border border-stone-200 focus:border-stone-900 outline-none transition-all h-24 resize-none" placeholder="Nhập mô tả chi tiết..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Chu kỳ</label>
                    <select 
                      value={selectedCycle || ''} 
                      onChange={(e) => setSelectedCycle(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 focus:border-stone-900 outline-none transition-all bg-white"
                    >
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Users size={14} /> Giao cho nhân viên
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-1">
                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => toggleAssignee(profile.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          selectedAssignees.includes(profile.id)
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {profile.display_name || profile.email.split('@')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all mt-4">
                  {editingTask ? 'Cập nhật kế hoạch' : 'Lưu kế hoạch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteConfirmOpen(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Xác nhận xóa</h3>
              <p className="text-stone-500 text-sm mb-8">Bạn có chắc chắn muốn xóa kế hoạch bảo trì này? Hành động này không thể hoàn tác.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsDeleteConfirmOpen(null)} className="py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all">Hủy</button>
                <button onClick={() => deleteTask(isDeleteConfirmOpen)} className="py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200">Xóa ngay</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
