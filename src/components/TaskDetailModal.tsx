import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, PlayCircle, CheckCircle2, MessageSquare, User as UserIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TaskComments } from './TaskComments';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface TaskDetailModalProps {
  task: Task;
  userId: string;
  userEmail: string | undefined;
  onClose: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  task, 
  userId, 
  userEmail, 
  onClose,
  onStatusChange,
  onDelete
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentAssignees, setCurrentAssignees] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchCurrentAssignees();
  }, [task.id]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchCurrentAssignees = async () => {
    try {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', task.id);
      if (error) throw error;
      setCurrentAssignees(data?.map(a => a.user_id) || []);
    } catch (err) {
      console.error('Error fetching assignees:', err);
    }
  };

  const toggleAssignee = async (assigneeId: string) => {
    if (task.user_id !== userId) return;
    
    setUpdatingAssignee(true);
    const isAssigned = currentAssignees.includes(assigneeId);
    
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', task.id)
          .eq('user_id', assigneeId);
        if (error) throw error;
        setCurrentAssignees(prev => prev.filter(id => id !== assigneeId));
      } else {
        const { error } = await supabase
          .from('task_assignees')
          .insert([{ task_id: task.id, user_id: assigneeId }]);
        if (error) throw error;
        setCurrentAssignees(prev => [...prev, assigneeId]);
      }
    } catch (err: any) {
      console.error('Error updating assignee:', err);
      alert('Không thể cập nhật người thực hiện: ' + (err.message || 'Lỗi quyền truy cập (RLS)'));
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const statusIcons = {
    todo: <Clock className="w-5 h-5" />,
    'in-progress': <PlayCircle className="w-5 h-5" />,
    done: <CheckCircle2 className="w-5 h-5" />,
  };

  const statusColors = {
    todo: 'bg-stone-100 text-stone-600',
    'in-progress': 'bg-amber-50 text-amber-600',
    done: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh] max-h-[700px]"
      >
        {/* Left Side: Task Info */}
        <div className="flex-1 p-8 border-r border-stone-100 overflow-y-auto">
          <div className="flex justify-between items-start mb-8">
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2",
              statusColors[task.status]
            )}>
              {statusIcons[task.status]}
              {task.status.replace('-', ' ')}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors md:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>

          <h2 className="text-3xl font-serif font-medium text-stone-900 mb-4 leading-tight">
            {task.title}
          </h2>
          
          <div className="flex items-center gap-4 text-stone-400 mb-8">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">
                Tạo ngày {format(new Date(task.created_at), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Mô tả công việc</h3>
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                {task.description || 'Không có mô tả cho công việc này.'}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Nhóm thực hiện</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
                {profiles
                  .map((profile) => {
                    const isAssigned = currentAssignees.includes(profile.id);
                    const isMe = profile.id === userId;
                    return (
                      <button
                        key={profile.id}
                        disabled={updatingAssignee || task.user_id !== userId}
                        onClick={() => toggleAssignee(profile.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-sm",
                          isAssigned 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            isAssigned ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400"
                          )}>
                            {profile.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[180px]">
                            {profile.email} {isMe && "(Bạn)"}
                          </span>
                        </div>
                        {isAssigned && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    );
                  })}
              </div>
              {task.user_id !== userId && (
                <p className="text-[10px] text-stone-400 mt-2 italic">
                  * Chỉ người tạo task mới có quyền thêm/bớt nhân sự.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Thao tác</h3>
              <div className="flex flex-wrap gap-2">
                {(['todo', 'in-progress', 'done'] as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(task.id, s)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                      task.status === s 
                        ? "bg-stone-900 text-white border-stone-900" 
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                    )}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
                
                {task.user_id === userId && (
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xoá task này?')) {
                        onDelete(task.id);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Xoá Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Discussion */}
        <div className="w-full md:w-[380px] flex flex-col bg-stone-50/30">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-stone-900" />
              <h3 className="font-medium text-stone-900">Trao đổi</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors hidden md:block">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <TaskComments taskId={task.id} userId={userId} userEmail={userEmail} />
        </div>
      </motion.div>
    </div>
  );
};
