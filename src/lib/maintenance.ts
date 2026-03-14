import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { addDays, addMonths, addYears, isBefore, parseISO } from 'date-fns';

export const checkAndGenerateMaintenanceTasks = async (user_id: string) => {
  const { data: maintenanceTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .not('maintenance_cycle', 'is', null)
    .eq('user_id', user_id);

  if (error || !maintenanceTasks) return;

  const now = new Date();

  for (const task of maintenanceTasks) {
    let shouldGenerate = false;
    let nextGenerationDate = null;

    if (!task.last_generated_at) {
      shouldGenerate = true;
    } else {
      const lastGen = parseISO(task.last_generated_at);
      switch (task.maintenance_cycle) {
        case 'weekly':
          nextGenerationDate = addDays(lastGen, 7);
          break;
        case 'monthly':
          nextGenerationDate = addMonths(lastGen, 1);
          break;
        case '4-months':
          nextGenerationDate = addMonths(lastGen, 4);
          break;
        case '6-months':
          nextGenerationDate = addMonths(lastGen, 6);
          break;
        case 'yearly':
          nextGenerationDate = addYears(lastGen, 1);
          break;
      }
      if (nextGenerationDate && isBefore(nextGenerationDate, now)) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      // Kiểm tra xem đã có task nào được tạo từ task bảo trì này trong ngày hôm nay chưa
      const { data: existingTasks, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('title', task.title)
        .eq('user_id', user_id)
        .is('maintenance_cycle', null)
        .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());

      if (checkError) {
        continue;
      }

      if (existingTasks && existingTasks.length > 0) {
        // Nếu đã có task, cập nhật last_generated_at để không kiểm tra lại nữa
        await supabase
          .from('tasks')
          .update({ last_generated_at: now.toISOString() })
          .eq('id', task.id);
        continue;
      }

      // Create new task instance
      const { error: insertError } = await supabase.from('tasks').insert([
        {
          title: task.title,
          description: task.description,
          status: 'todo',
          user_id: user_id,
          maintenance_cycle: null, // Regular task
        },
      ]);

      if (!insertError) {
        // Update last_generated_at của task gốc
        await supabase
          .from('tasks')
          .update({ last_generated_at: now.toISOString() })
          .eq('id', task.id);
      }
    }
  }
};
