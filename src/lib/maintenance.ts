import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { addDays, addMonths, addYears, isBefore, parseISO, startOfWeek, startOfMonth } from 'date-fns';

export const checkAndGenerateMaintenanceTasks = async (user_id: string) => {
  console.log('Checking maintenance tasks for user:', user_id);
  const { data: maintenanceTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .not('maintenance_cycle', 'is', null)
    .eq('user_id', user_id);

  if (error) {
    console.error('Error fetching maintenance tasks:', error);
    return;
  }
  
  if (!maintenanceTasks || maintenanceTasks.length === 0) {
    console.log('No maintenance tasks found.');
    return;
  }

  const now = new Date();
  console.log('Current time:', now.toISOString());

  for (const task of maintenanceTasks) {
    console.log(`Processing task: "${task.title}" (Cycle: ${task.maintenance_cycle})`);
    let shouldGenerate = false;
    let targetDate = null;

    // Sử dụng bản sao của now để không làm thay đổi giá trị gốc
    const currentNow = new Date(now.getTime());

    switch (task.maintenance_cycle) {
      case 'daily':
        // Hằng ngày
        targetDate = new Date(currentNow.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        // Thứ 7 hàng tuần (Tuần bắt đầu từ Thứ 7)
        targetDate = startOfWeek(currentNow, { weekStartsOn: 6 });
        break;
      case 'monthly':
        // Ngày đầu tháng
        targetDate = startOfMonth(currentNow);
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
        console.log('First time generation for periodic task.');
        shouldGenerate = true; // Tạo ngay lần đầu tiên nếu chưa có
      } else {
        console.log('First time generation for non-periodic task.');
        shouldGenerate = true;
      }
    } else {
      const lastGen = parseISO(task.last_generated_at);
      console.log('Last generated at:', lastGen.toISOString());
      console.log('Target date:', targetDate?.toISOString());
      
      if (targetDate && (isBefore(lastGen, targetDate) || lastGen.getTime() === targetDate.getTime())) {
        // Đối với daily/weekly/monthly, nếu lastGen trước targetDate (ngày bắt đầu chu kỳ hiện tại)
        if (['daily', 'weekly', 'monthly'].includes(task.maintenance_cycle || '')) {
          if (isBefore(lastGen, targetDate)) {
            console.log('Periodic task: lastGen is before targetDate. Generating...');
            shouldGenerate = true;
          } else {
            console.log('Periodic task: already generated for this period.');
          }
        } else {
          // Đối với các chu kỳ khác, dùng logic cộng dồn
          if (isBefore(targetDate, currentNow)) {
            console.log('Non-periodic task: targetDate is before currentNow. Generating...');
            shouldGenerate = true;
          } else {
            console.log('Non-periodic task: targetDate is in the future.');
          }
        }
      } else {
        console.log('No generation needed based on targetDate logic.');
      }
    }

    if (shouldGenerate) {
      console.log('Attempting to generate task...');
      // Kiểm tra xem đã có task nào được tạo từ task bảo trì này trong chu kỳ hiện tại chưa
      // Sử dụng parent_maintenance_id để kiểm tra chính xác task được tạo từ kế hoạch này
      const checkStartDate = targetDate || new Date(currentNow.setHours(0, 0, 0, 0));
      const { data: existingTasks, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('parent_maintenance_id', task.id)
        .eq('user_id', user_id)
        .is('maintenance_cycle', null)
        .gte('created_at', checkStartDate.toISOString());

      if (checkError) {
        console.error('Error checking existing tasks:', checkError);
        continue;
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log('Task already exists for today. Skipping creation but updating last_generated_at.');
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
          parent_maintenance_id: task.id, // Lưu ID của task bảo trì gốc để kiểm tra trùng lặp chính xác hơn
        },
      ]).select();

      if (!insertError && newTask && newTask[0]) {
        console.log('Successfully created new task instance:', newTask[0].id);
        // Giao việc cho nhân viên giống task gốc
        if (assignees && assignees.length > 0) {
          console.log(`Assigning ${assignees.length} employees to the new task.`);
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
        console.log('Updated last_generated_at for maintenance task.');
      } else if (insertError) {
        console.error('Error creating task instance:', insertError);
      }
    }
  }
};