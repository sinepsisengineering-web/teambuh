// services/timedNotificationService.ts

// --- ИЗМЕНЕНИЙ НЕТ ---
import { Task, TaskStatus, ReminderSetting } from '../types';

const showTimedNotification = (title: string, body: string) => {
  if (window.electronAPI) {
    window.electronAPI.showNotification(title, body);
  } else {
    console.warn('[Timer] Electron API не доступно. Уведомление:', title, body);
  }
};

const activeTimers = new Map<string, { reminderTimeoutId?: NodeJS.Timeout, dueTimeoutId?: NodeJS.Timeout }>();

export function cancelNotificationsForTask(taskId: string): void {
  if (activeTimers.has(taskId)) {
    const timers = activeTimers.get(taskId);
    if (timers?.reminderTimeoutId) clearTimeout(timers.reminderTimeoutId);
    if (timers?.dueTimeoutId) clearTimeout(timers.dueTimeoutId);
    activeTimers.delete(taskId);
    console.log(`[Timer] Отменены таймеры для задачи ID: ${taskId}`);
  }
}

// --- ИЗМЕНЕНА ПРОВЕРКА ВНУТРИ ---
function calculateReminderDelay(dueDateTime: Date, reminder: ReminderSetting): number { // <--- ИЗМЕНЕНО: reminderSetting на reminder
  const now = new Date().getTime();
  let reminderTime = dueDateTime.getTime();

  switch (reminder) { // <--- ИЗМЕНЕНО: reminderSetting на reminder
    case ReminderSetting.OneHour:
      reminderTime -= 60 * 60 * 1000;
      break;
    case ReminderSetting.OneDay:
      reminderTime -= 24 * 60 * 60 * 1000;
      break;
    case ReminderSetting.ThreeDays:
       reminderTime -= 3 * 24 * 60 * 60 * 1000;
       break;
    // Добавил OneWeek, так как он есть в вашем enum
    case ReminderSetting.OneWeek:
        reminderTime -= 7 * 24 * 60 * 60 * 1000;
        break;
    default:
      return -1;
  }

  const delay = reminderTime - now;
  return delay > 0 ? delay : -1;
}

// --- СИЛЬНЫЕ ИЗМЕНЕНИЯ ВНУТРИ ---
export function scheduleNotificationsForTask(task: Task): void {
  cancelNotificationsForTask(task.id);

  if (task.status === TaskStatus.Completed || task.status === TaskStatus.Locked || !task.dueDate || !task.dueTime) {
    return;
  }

  const dueDate = new Date(task.dueDate);
  const [hours, minutes] = task.dueTime.split(':').map(Number);
  dueDate.setHours(hours, minutes, 0, 0);

  const now = new Date().getTime();
  const taskTimers: { reminderTimeoutId?: NodeJS.Timeout, dueTimeoutId?: NodeJS.Timeout } = {};

  const dueDelay = dueDate.getTime() - now;
  if (dueDelay > 0) {
    const dueTimeoutId = setTimeout(() => {
      showTimedNotification('Срок задачи истек!', task.title);
      activeTimers.delete(task.id);
    }, dueDelay);
    taskTimers.dueTimeoutId = dueTimeoutId;
    console.log(`[Timer] Запланировано основное уведомление для "${task.title}" через ${Math.round(dueDelay / 1000)} сек.`);
  }

  // --- ИЗМЕНЕНО: Проверяем task.reminder вместо task.reminderSetting и убираем сравнение с None ---
  if (task.reminder) {
    const reminderDelay = calculateReminderDelay(dueDate, task.reminder);
    if (reminderDelay > 0) {
      const reminderTimeoutId = setTimeout(() => {
        showTimedNotification('Напоминание о задаче', task.title);
      }, reminderDelay);
      taskTimers.reminderTimeoutId = reminderTimeoutId;
      console.log(`[Timer] Запланировано напоминание для "${task.title}" через ${Math.round(reminderDelay / 1000)} сек.`);
    }
  }

  if (Object.keys(taskTimers).length > 0) {
    activeTimers.set(task.id, taskTimers);
  }
}

// --- ИЗМЕНЕНИЙ НЕТ ---
export function initializeAllTimers(tasks: Task[]): void {
  console.log('[Timer] Запуск инициализации всех таймеров...');
  
  for (const taskId of activeTimers.keys()) {
    cancelNotificationsForTask(taskId);
  }
  
  for (const task of tasks) {
    scheduleNotificationsForTask(task);
  }
  
  console.log('[Timer] Инициализация таймеров завершена.');
}