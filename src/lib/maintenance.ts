import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { addDays, addMonths, addYears, isBefore, parseISO, startOfWeek, startOfMonth } from 'date-fns';

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
    let targetDate = null;

    switch (task.maintenance_cycle) {
      case 'daily':
        // Hằng ngày
        targetDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        // Thứ 7 hàng tuần (Tuần bắt đầu từ Thứ 7)
        targetDate = startOfWeek(now, { weekStartsOn: 6 });
        break;
      case 'monthly':
        // Ngày đầu tháng
        targetDate = startOfMonth(now);
        break;
      case '4-months':
        if (task.last_generated_at) {
          targetDate = addMonths(parseISO(task.last_generated_at), 4);
        }
        break;
      case '6-months':
        if (task.last_generated_at) {
          targetDate = addMonths(parseISO(task.last_generated_at), 6);
        }
        break;
      case 'yearly':
        if (task.last_generated_at) {
          targetDate = addYears(parseISO(task.last_generated_at), 1);
        }
        break;
    }

    if (!task.last_generated_at) {
      // Nếu chưa bao giờ tạo, và là daily/weekly/monthly thì kiểm tra xem đã đến ngày chưa
      if (['daily', 'weekly', 'monthly'].includes(task.maintenance_cycle || '')) {
        shouldGenerate = true; // Tạo ngay lần đầu tiên nếu chưa có
      } else {
        shouldGenerate = true;
      }
    } else {
      const lastGen = parseISO(task.last_generated_at);
      if (targetDate && (isBefore(lastGen, targetDate) || lastGen.getTime() === targetDate.getTime())) {
        // Đối với daily/weekly/monthly, nếu lastGen trước targetDate (ngày bắt đầu chu kỳ hiện tại)
        if (['daily', 'weekly', 'monthly'].includes(task.maintenance_cycle || '')) {
          if (isBefore(lastGen, targetDate)) {
            shouldGenerate = true;
          }
        } else {
          // Đối với các chu kỳ khác, dùng logic cộng dồn
          if (isBefore(targetDate, now)) {
            shouldGenerate = true;
          }
        }
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

      // Lấy danh sách nhân viên được giao từ task bảo trì gốc
      const { data: assignees } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', task.id);

      // Create new task instance
      const { data: newTask, error: insertError } = await supabase.from('tasks').insert([
        {
          title: task.title,
          description: task.description,
          status: 'todo',
          user_id: user_id,
          maintenance_cycle: null, // Regular task
        },
      ]).select();

      if (!insertError && newTask && newTask[0]) {
        // Giao việc cho nhân viên giống task gốc
        if (assignees && assignees.length > 0) {
          await supabase.from('task_assignees').insert(
            assignees.map(a => ({
              task_id: newTask[0].id,
              user_id: a.user_id
            }))
          );
        }

        // Update last_generated_at của task gốc
        await supabase
          .from('tasks')
          .update({ last_generated_at: now.toISOString() })
          .eq('id', task.id);
      }
    }
  }
};
