import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { Calendar, MoreVertical, Trash2, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TaskCardProps {
  task: Task;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, currentUserId, onDelete, onStatusChange, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = currentUserId === task.user_id;

  const statusIcons = {
    todo: <Clock className="w-4 h-4 text-stone-400" />,
    'in-progress': <PlayCircle className="w-4 h-4 text-amber-500" />,
    done: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  };

  const statusColors = {
    todo: 'bg-stone-100 text-stone-600',
    'in-progress': 'bg-amber-50 text-amber-600',
    done: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick(task)}
      className="group bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all relative cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1.5",
          statusColors[task.status]
        )}>
          {statusIcons[task.status]}
          {task.status.replace('-', ' ')}
        </span>
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 py-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'todo');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" /> Move to To Do
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'in-progress');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" /> Move to In Progress
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'done');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Move to Done
              </button>
              {isOwner && (
                <>
                  <div className="h-px bg-stone-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Task
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <h3 className="text-stone-900 font-medium mb-2 leading-snug">{task.title}</h3>
      {task.description && (
        <p className="text-stone-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-top border-stone-100">
        <div className="flex items-center gap-1.5 text-stone-400">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">
            {format(new Date(task.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex -space-x-2 overflow-hidden">
          {task.task_assignees?.slice(0, 3).map((assignee, i) => (
            <div 
              key={i}
              className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              title={assignee.profiles?.email || assignee.user_id}
            >
              {(assignee.profiles?.email || 'U').charAt(0).toUpperCase()}
            </div>
          ))}
          {task.task_assignees && task.task_assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-400 shrink-0">
              +{task.task_assignees.length - 3}
            </div>
          )}
          {(!task.task_assignees || task.task_assignees.length === 0) && (
            <div className="w-6 h-6 rounded-full bg-stone-50 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-300 shrink-0">
              ?
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
