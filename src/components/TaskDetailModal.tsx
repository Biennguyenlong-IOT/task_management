import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, PlayCircle, CheckCircle2, MessageSquare, User as UserIcon, Loader2, Plus, Pencil, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TaskComments } from './TaskComments';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface TaskDetailModalProps {
  task: Task;
  userId: string;
  userEmail: string | undefined;
  onClose: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  task, 
  userId, 
  userEmail, 
  onClose,
  onStatusChange,
  onUpdate,
  onDelete
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentAssignees, setCurrentAssignees] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedStartTime, setEditedStartTime] = useState(task.start_time ? task.start_time.substring(0, 16) : '');
  const [editedCompletionTime, setEditedCompletionTime] = useState(task.completion_time ? task.completion_time.substring(0, 16) : '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchCurrentAssignees();
    // Mark comments as read
    localStorage.setItem(`last_read_comments_${task.id}`, new Date().toISOString());
  }, [task.id]);

  useEffect(() => {
    setEditedTitle(task.title);
    setEditedStartTime(task.start_time ? task.start_time.substring(0, 16) : '');
    setEditedCompletionTime(task.completion_time ? task.completion_time.substring(0, 16) : '');
  }, [task.id, task.title, task.start_time, task.completion_time]);

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) return;
    setIsSaving(true);
    try {
      const updates: Partial<Task> = {
        title: editedTitle,
        start_time: editedStartTime ? new Date(editedStartTime).toISOString() : null,
        completion_time: editedCompletionTime ? new Date(editedCompletionTime).toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
      
      onUpdate(task.id, updates);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating task:', err);
      alert('Không thể cập nhật task: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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

          <div className="group relative mb-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1 ml-1">Tiêu đề</label>
                  <input
                    autoFocus
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full text-2xl font-sans font-medium text-stone-900 px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1 ml-1">Ngày giờ thực hiện (Bắt đầu)</label>
                  <input
                    type="datetime-local"
                    value={editedStartTime}
                    onChange={(e) => setEditedStartTime(e.target.value)}
                    className="w-full text-sm font-medium text-stone-600 px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50"
                  />
                </div>
                {task.status === 'done' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1 ml-1">Ngày giờ hoàn thành</label>
                    <input
                      type="datetime-local"
                      value={editedCompletionTime}
                      onChange={(e) => setEditedCompletionTime(e.target.value)}
                      className="w-full text-sm font-medium text-stone-600 px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    disabled={isSaving}
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Lưu thay đổi
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setEditedTitle(task.title);
                      setEditedStartTime(task.start_time ? task.start_time.substring(0, 16) : '');
                      setEditedCompletionTime(task.completion_time ? task.completion_time.substring(0, 16) : '');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-3xl font-sans font-medium text-stone-900 leading-tight">
                    {task.title}
                  </h2>
                  {task.user_id === userId && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all"
                      title="Chỉnh sửa tiêu đề và ngày giờ"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-stone-400 mt-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      Tạo ngày {format(parseISO(task.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  {task.start_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium">
                        Bắt đầu: {format(parseISO(task.start_time), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                  {task.completion_time && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium">
                        Hoàn thành: {format(parseISO(task.completion_time), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
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
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                {/* Assigned Members */}
                <div className="space-y-2">
                  {profiles
                    .filter(p => currentAssignees.includes(p.id))
                    .map((profile) => {
                      const isMe = profile.id === userId;
                      return (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                              {profile.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[180px]">
                              {profile.email} {isMe && "(Bạn)"}
                            </span>
                          </div>
                          {task.user_id === userId && (
                            <button 
                              disabled={updatingAssignee}
                              onClick={() => toggleAssignee(profile.id)}
                              className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Add Member Section (Owner only) */}
                {task.user_id === userId && (
                  <div className="mt-6">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">Thêm thành viên</h4>
                    <div className="space-y-1">
                      {profiles
                        .filter(p => !currentAssignees.includes(p.id))
                        .map((profile) => (
                          <button
                            key={profile.id}
                            disabled={updatingAssignee}
                            onClick={() => toggleAssignee(profile.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-50 text-stone-600 text-xs transition-colors border border-transparent hover:border-stone-100"
                          >
                            <div className="w-5 h-5 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-[9px] font-bold">
                              {profile.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{profile.email}</span>
                            <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}
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
