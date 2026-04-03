export type TaskStatus = 'todo' | 'in-progress' | 'done';

export const MAINTENANCE_CYCLES: Record<string, string> = {
  'daily': 'Hằng ngày',
  'weekly': 'Hằng tuần',
  'monthly': 'Hằng tháng',
  '4-months': '4 tháng',
  '6-months': '6 tháng',
  'yearly': '1 năm',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'Cần làm',
  'in-progress': 'Đang làm',
  'done': 'Hoàn thành'
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  user_id: string;
  assigned_to: string | null;
  task_assignees?: { 
    user_id: string;
    profiles?: { email: string };
  }[];
  task_comments?: {
    created_at: string;
  }[];
  position?: number;
  start_time?: string | null;
  completion_time?: string | null;
  maintenance_cycle?: string | null;
  last_generated_at?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_email: string | null;
  content: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  last_seen?: string | null;
}
