import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskComment } from '../types';
import { Send, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface TaskCommentsProps {
  taskId: string;
  userId: string;
  userEmail: string | undefined;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, userId, userEmail }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setComments((prev) => [...prev, payload.new as TaskComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('task_comments').insert([
        {
          task_id: taskId,
          user_id: userId,
          user_email: userEmail,
          content: newComment.trim(),
        },
      ]);

      if (error) throw error;
      setNewComment('');
    } catch (err) {
      console.error('Error sending comment:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-stone-300 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm italic">
            Chưa có trao đổi nào. Hãy bắt đầu cuộc hội thoại!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${comment.user_id === userId ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {comment.user_id === userId ? 'Bạn' : comment.user_email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-stone-300">
                    {format(new Date(comment.created_at), 'HH:mm')}
                  </span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${
                  comment.user_id === userId 
                    ? 'bg-stone-900 text-white rounded-tr-none' 
                    : 'bg-stone-100 text-stone-800 rounded-tl-none'
                }`}>
                  {comment.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <form onSubmit={sendComment} className="p-4 border-t border-stone-100 bg-stone-50/50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Nhập nội dung trao đổi..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white text-sm"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || sending}
            className="absolute right-2 p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};
