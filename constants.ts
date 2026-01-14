import { TaskStatus } from './types';

export const TASK_STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  [TaskStatus.Overdue]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
  [TaskStatus.DueToday]: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-500' }, // Новый стиль
  [TaskStatus.DueSoon]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  [TaskStatus.Upcoming]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' }, // Переименован из InProgress
  [TaskStatus.Completed]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  [TaskStatus.Locked]: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-400' }, // Новый стиль
};