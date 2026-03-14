import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Task, TaskStatus, UserProfile } from '../types';
import { TaskCard } from './TaskCard';
import { SortableTaskCard } from './SortableTaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { Plus, LogOut, LayoutGrid, List, CheckCircle2, Clock, PlayCircle, Search, GripVertical, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TaskBoardProps {
  user: User;
  onGoToDashboard: () => void;
}

interface DroppableColumnProps {
  id: TaskStatus;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'Column',
    },
  });

  return (
    <div ref={setNodeRef} className="flex flex-col gap-4 bg-stone-100/50 p-3 rounded-2xl border border-stone-200/50">
      {children}
    </div>
  );
};

import { parseISO, formatISO } from 'date-fns';
import { Notification, NotificationType } from './Notification';

export const TaskBoard: React.FC<TaskBoardProps> = ({ user, onGoToDashboard }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', start_time: '' });
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const ensureProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && (error.code === 'PGRST116' || error.message.includes('JSON object requested'))) {
        // Profile not found, create it
        console.log('Creating missing profile for user:', user.email);
        await supabase.from('profiles').insert([
          { 
            id: user.id, 
            email: user.email, 
            display_name: user.email?.split('@')[0],
            last_seen: new Date().toISOString()
          }
        ]);
        fetchProfiles();
      }
    };

    ensureProfile();
    fetchTasks();
    fetchProfiles();
    updateLastSeen();

    const lastSeenInterval = setInterval(updateLastSeen, 30000);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Realtime task change received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const oldTask = tasksRef.current.find(t => t.id === payload.new.id);
            if (oldTask && oldTask.status !== payload.new.status) {
              showNotification(`Task "${payload.new.title}" chuyển sang: ${payload.new.status.replace('-', ' ')}`, 'info');
            }
          }
          
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_assignees',
        },
        async (payload) => {
          console.log('Realtime assignee change received:', payload);
          if (payload.new.user_id === user.id) {
            const existingTask = tasksRef.current.find(t => t.id === payload.new.task_id);
            if (existingTask) {
              showNotification(`Bạn đã được gán vào task: ${existingTask.title}`, 'success');
            } else {
              const { data } = await supabase.from('tasks').select('title').eq('id', payload.new.task_id).single();
              if (data) {
                showNotification(`Bạn vừa được gán vào task mới: ${data.title}`, 'success');
              }
            }
          }
          fetchTasks(); 
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
        },
        (payload) => {
            console.log('Realtime comment received:', payload);
            const newComment = payload.new;
            
            // Update local state to trigger re-render of TaskCard
            setTasks(prev => prev.map(task => {
              if (task.id === newComment.task_id) {
                return {
                  ...task,
                  task_comments: [...(task.task_comments || []), { created_at: newComment.created_at }]
                };
              }
              return task;
            }));

            if (newComment.user_id === user.id) return;

            const relatedTask = tasksRef.current.find(t => t.id === newComment.task_id);
            if (relatedTask) {
              showNotification(`Trao đổi mới từ ${newComment.user_email?.split('@')[0]} trong task: ${relatedTask.title}`, 'info');
            }
          }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      clearInterval(lastSeenInterval);
    };
  }, [user.id]);

  const updateLastSeen = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('column "last_seen" does not exist')) {
          // Silently fail if column doesn't exist yet
          return;
        }
        console.error('Error updating last seen:', error);
        showNotification('Lỗi cập nhật trạng thái online: ' + error.message, 'error');
      }
    } catch (err) {
      console.error('Unexpected error updating last seen:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees (
            user_id,
            profiles (email)
          ),
          task_comments (
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .order('position', { ascending: true });

      if (error) {
        // Fallback if position column doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tasks')
          .select(`
            *,
            task_assignees (
              user_id,
              profiles (email)
            ),
            task_comments (
              created_at
            )
          `)
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        const relatedFallback = ((fallbackData || []) as Task[]).filter(task => 
          task && (
            task.user_id === user.id || 
            (Array.isArray(task.task_assignees) && task.task_assignees.some(a => a.user_id === user.id))
          )
        );
        setTasks(relatedFallback);
      } else {
        const relatedData = ((data || []) as Task[]).filter(task => 
          task && (
            task.user_id === user.id || 
            (Array.isArray(task.task_assignees) && task.task_assignees.some(a => a.user_id === user.id))
          )
        );
        setTasks(relatedData);
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      showNotification('Không thể tải danh sách công việc: ' + (err.message || 'Lỗi kết nối'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      showNotification('Không thể tải danh sách nhân sự: ' + (err.message || 'Lỗi kết nối'), 'error');
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const maxPos = tasks.length > 0 
        ? Math.max(...tasks.map(t => t.position || 0)) 
        : 0;

      const { data, error } = await supabase.from('tasks').insert([
        {
          title: newTask.title,
          description: newTask.description,
          status: 'todo',
          user_id: user.id,
          position: maxPos + 1000,
          start_time: newTask.start_time ? formatISO(parseISO(newTask.start_time)) : null,
        },
      ]).select();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }
      
      const createdTask = data?.[0];
      if (createdTask) {
        // Always assign the creator, plus any selected users
        const allAssignees = Array.from(new Set([user.id, ...newTaskAssignees]));
        const assigneeData = allAssignees.map(userId => ({
          task_id: createdTask.id,
          user_id: userId
        }));
        const { error: assigneeError } = await supabase.from('task_assignees').insert(assigneeData);
        if (assigneeError) {
          console.error('Error assigning users:', assigneeError);
          showNotification('Task đã được tạo nhưng không thể gán người thực hiện: ' + assigneeError.message, 'error');
        }
      }

      setNewTask({ title: '', description: '', start_time: '' });
      setNewTaskAssignees([]);
      setIsModalOpen(false);
      fetchTasks();
      showNotification('Đã tạo task mới thành công. Lưu ý: Nếu bạn đang xem trong khung Preview, hãy mở tab mới để thấy đúng múi giờ địa phương.', 'success');
    } catch (err: any) {
      console.error('Error creating task:', err);
      showNotification('Không thể tạo task: ' + (err.message || 'Lỗi không xác định'), 'error');
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      const updateData: any = { status };
      if (status === 'done') {
        updateData.completion_time = new Date().toISOString();
      } else {
        updateData.completion_time = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, ...updateData });
      }
    } catch (err: any) {
      console.error('Error updating task:', err);
      showNotification('Không thể thay đổi trạng thái: ' + (err.message || 'Bạn không có quyền thực hiện thao tác này'), 'error');
      fetchTasks(); // Revert UI state
    }
  };

  const deleteTask = async (id: string) => {
    // Optimistic update
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        // Rollback on error
        setTasks(previousTasks);
        showNotification('Không thể xóa task: ' + error.message, 'error');
        throw error;
      }
      showNotification('Đã xóa task thành công', 'success');
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === 'Task';
    const isOverATask = over.data.current?.type === 'Task';

    if (!isActiveATask) return;

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: tasks[overIndex].status };
          return arrayMove(newTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    const isOverAColumn = over.data.current?.type === 'Column';

    // Dropping a Task over a Column
    if (isActiveATask && isOverAColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        if (tasks[activeIndex].status !== overId) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: overId as TaskStatus };
          return arrayMove(newTasks, activeIndex, activeIndex);
        }
        return tasks;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    
    // Find the task in the current state
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    // Determine the new status
    // If dropped over a column, overId is the status
    // If dropped over another task, use that task's status
    let newStatus = task.status;
    const overTask = tasks.find(t => t.id === overId);
    
    if (['todo', 'in-progress', 'done'].includes(overId as string)) {
      newStatus = overId as TaskStatus;
    } else if (overTask) {
      newStatus = overTask.status;
    }

    // Calculate new position
    const newIndex = tasks.findIndex(t => t.id === activeId);
    const prevTask = tasks[newIndex - 1];
    const nextTask = tasks[newIndex + 1];

    let newPosition = task.position || 0;
    if (!prevTask && !nextTask) {
      newPosition = 1000;
    } else if (!prevTask) {
      newPosition = (nextTask.position || 0) / 2;
    } else if (!nextTask) {
      newPosition = (prevTask.position || 0) + 1000;
    } else {
      newPosition = ((prevTask.position || 0) + (nextTask.position || 0)) / 2;
    }

    console.log(`Updating task ${activeId} to status ${newStatus} at position ${newPosition}`);

    try {
      const updateData: any = { 
        status: newStatus,
        position: newPosition 
      };

      if (newStatus === 'done') {
        updateData.completion_time = new Date().toISOString();
      } else {
        updateData.completion_time = null;
      }

      const { error, data } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', activeId)
        .select();

      if (error) {
        console.error('Database update failed:', error);
        showNotification(error.message || 'Bạn không có quyền cập nhật task này.', 'error');
        fetchTasks(); // Revert UI
      } else {
        console.log('Database update successful:', data);
        showNotification('Đã cập nhật trạng thái task', 'success');
        // Local state is already updated by handleDragOver, 
        // but we ensure position is synced
        const updatedTask = { 
          ...task, 
          status: newStatus, 
          position: newPosition,
          completion_time: updateData.completion_time
        };
        setTasks(prev => prev.map(t => t.id === activeId ? updatedTask : t));
        if (selectedTask?.id === activeId) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      console.error('Error in handleDragEnd:', err);
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: { id: TaskStatus; title: string; icon: React.ReactNode; color: string }[] = [
    { id: 'todo', title: 'To Do', icon: <Clock className="w-4 h-4" />, color: 'text-stone-400' },
    { id: 'in-progress', title: 'In Progress', icon: <PlayCircle className="w-4 h-4" />, color: 'text-amber-500' },
    { id: 'done', title: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-medium text-lg">
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-sans font-medium text-stone-900">My Workspace</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-stone-500">Chào, <span className="text-emerald-600 font-medium">{user.email}</span></p>
              <span className="w-1 h-1 rounded-full bg-stone-300" />
              <p className="text-stone-400 text-sm">Quản lý công việc và năng suất.</p>
              {new Date().getTimezoneOffset() === 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                  <p className="text-amber-500 text-[10px] italic">Lưu ý: Trình duyệt đang ở múi giờ UTC. Thời gian có thể lệch so với giờ địa phương.</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all font-medium shadow-sm"
          >
            <BarChart3 className="w-4 h-4" /> Trang thống kê
          </button>
          <button
            onClick={() => fetchTasks()}
            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            title="Tải lại dữ liệu"
          >
            <Clock className="w-5 h-5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full md:w-64"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-stone-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-stone-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
          <button
            onClick={async () => {
              try {
                // Set last_seen to null on logout
                await supabase
                  .from('profiles')
                  .update({ last_seen: null })
                  .eq('id', user.id);
                await supabase.auth.signOut();
              } catch (err) {
                console.error('Logout error:', err);
              } finally {
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Board Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {columns.map((column) => {
            const tasksInColumn = filteredTasks.filter((t) => t.status === column.id);
            const displayedTasks = column.id === 'done' && !showAllCompleted 
              ? tasksInColumn.slice(0, 5) 
              : tasksInColumn;

            return (
              <div key={column.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={column.color}>{column.icon}</span>
                    <h2 className="font-medium text-stone-900">{column.title}</h2>
                    <span className="bg-stone-200 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {tasksInColumn.length}
                    </span>
                  </div>
                </div>
                
                <DroppableColumn id={column.id}>
                  <SortableContext
                    items={tasksInColumn.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence mode="popLayout">
                      {displayedTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          currentUserId={user.id}
                          onDelete={deleteTask}
                          onStatusChange={updateTaskStatus}
                          onClick={setSelectedTask}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                  
                  {column.id === 'done' && tasksInColumn.length > 5 && (
                    <button 
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {showAllCompleted ? 'Ẩn bớt' : `Xem tất cả (${tasksInColumn.length})`}
                    </button>
                  )}
                  
                  {tasksInColumn.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-400 py-12 px-4 text-center pointer-events-none">
                      <p className="text-sm italic mb-2">Kéo thả vào đây</p>
                    </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay adjustScale={false}>
          {activeTask ? (
            <div className="rotate-3 scale-105 shadow-2xl">
              <TaskCard
                task={activeTask}
                currentUserId={user.id}
                onDelete={() => {}}
                onStatusChange={() => {}}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            userId={user.id}
            userEmail={user.email}
            onClose={() => {
              window.dispatchEvent(new CustomEvent('task-comments-read', { detail: { taskId: selectedTask?.id } }));
              setSelectedTask(null);
            }}
            onStatusChange={updateTaskStatus}
            onDelete={deleteTask}
          />
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-sans font-medium text-stone-900 mb-6">Create New Task</h2>
                <form onSubmit={createTask} className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-stone-400 mb-2 ml-1">
                      Task Title
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50"
                      placeholder="What needs to be done?"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-stone-400 mb-2 ml-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50 min-h-[100px] resize-none"
                      placeholder="Add more details about this task..."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-stone-400 mb-2 ml-1">
                        Thời gian bắt đầu
                      </label>
                      <input
                        type="datetime-local"
                        value={newTask.start_time}
                        onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-stone-50/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-stone-400 mb-2 ml-1">
                      Assign To
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1 scrollbar-hide">
                      {profiles
                        .filter(profile => profile.id !== user.id)
                        .map((profile) => {
                          const isSelected = newTaskAssignees.includes(profile.id);
                          return (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => {
                                setNewTaskAssignees(prev => 
                                  isSelected ? prev.filter(id => id !== profile.id) : [...prev, profile.id]
                                );
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                isSelected 
                                  ? "bg-emerald-500 text-white border-emerald-500" 
                                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                              )}
                            >
                              {profile.email?.split('@')[0]}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/20"
                    >
                      Create Task
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Notification 
        message={notification?.message || null} 
        type={notification?.type || 'info'} 
        onClose={() => setNotification(null)} 
      />
    </div>
  );
};
