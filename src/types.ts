export type TaskStatus = 'todo' | 'in-progress' | 'done';

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
  position?: number;
  start_time?: string | null;
  completion_time?: string | null;
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
