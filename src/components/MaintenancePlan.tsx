import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Calendar, ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenancePlanProps {
  user: User;
  onBack: () => void;
}

const cycles = [
  { id: 'weekly', title: 'Hằng tuần' },
  { id: 'monthly', title: 'Hằng tháng' },
  { id: '4-months', title: '4 tháng' },
  { id: '6-months', title: '6 tháng' },
  { id: 'yearly', title: '1 năm' },
];

export const MaintenancePlan: React.FC<MaintenancePlanProps> = ({ user, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .not('maintenance_cycle', 'is', null);
    if (data) setTasks(data as Task[]);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !selectedCycle) return;

    const { error } = await supabase.from('tasks').insert([
      {
        title: newTask.title,
        description: newTask.description,
        status: 'todo',
        user_id: user.id,
        maintenance_cycle: selectedCycle,
      },
    ]);

    if (!error) {
      setNewTask({ title: '', description: '' });
      setIsModalOpen(false);
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string, taskUserId: string) => {
    if (taskUserId !== user.id) {
      alert('Bạn không có quyền xóa công việc này.');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      await supabase.from('tasks').delete().eq('id', taskId);
      fetchTasks();
    }
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
                <div key={task.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl text-sm">
                  <span>{task.title}</span>
                  {task.user_id === user.id && (
                    <button onClick={() => deleteTask(task.id, task.user_id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-medium mb-6">Tạo công việc bảo trì</h2>
              <form onSubmit={createTask} className="space-y-4">
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-3 rounded-xl border border-stone-200" placeholder="Tên công việc" required />
                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full p-3 rounded-xl border border-stone-200" placeholder="Mô tả" />
                <button type="submit" className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium">Lưu công việc</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
