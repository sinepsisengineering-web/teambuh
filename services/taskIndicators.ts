// services/taskIndicators.ts
// Утилиты для отображения индикаторов задач
// Использует правила из taskLifecycle.ts

import {
    computeTaskStatus,
    getCalendarColorByStatus,
    getStatusIconByType,
    STATUS_CONFIG,
    STATUS_LEGEND as LIFECYCLE_LEGEND,
    TaskStatusType,
    TaskForStatusCheck
} from './taskLifecycle';

// Re-export для обратной совместимости
export { STATUS_LEGEND } from './taskLifecycle';
export type { TaskStatusType, TaskForStatusCheck } from './taskLifecycle';

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

export interface TaskIndicatorInput {
    status?: string;
    dueDate: Date | string;
    isBlocked?: boolean;
    isUrgent?: boolean;
    cyclePattern?: string;
    recurrence?: 'oneTime' | 'cyclic';
    taskSource?: 'auto' | 'manual';
}

interface CalendarTask {
    id: string;
    dueDate: Date | string;
    status?: string;
    isUrgent?: boolean;
    isBlocked?: boolean;
    cyclePattern?: string;
    recurrence?: 'oneTime' | 'cyclic';
    taskSource?: 'auto' | 'manual';
}

// ============================================
// ИКОНКИ СТАТУСОВ
// ============================================

/**
 * Получить иконку статуса задачи
 */
export const getStatusIcon = (task: TaskIndicatorInput, size: 'sm' | 'md' | 'lg' = 'md'): string => {
    const computedStatus = computeTaskStatus({
        id: 'temp',
        dueDate: task.dueDate,
        status: task.status,
        isBlocked: task.isBlocked,
        isUrgent: task.isUrgent,
        cyclePattern: task.cyclePattern,
        recurrence: task.recurrence,
        taskSource: task.taskSource,
    });

    return getStatusIconByType(computedStatus);
};

/**
 * Получить CSS-класс для иконки статуса
 */
export const getStatusIconClass = (size: 'sm' | 'md' | 'lg' = 'md'): string => {
    const sizeMap = { sm: 'text-[10px]', md: 'text-sm', lg: 'text-lg' };
    return sizeMap[size];
};

// ============================================
// ЦВЕТА ПРИОРИТЕТА (для фона строк)
// ============================================

/**
 * Получить CSS-классы цвета приоритета по близости к дедлайну
 */
export const getPriorityColor = (dueDate: Date | string, status?: string): string => {
    const computedStatus = computeTaskStatus({
        id: 'temp',
        dueDate,
        status,
    });

    const config = STATUS_CONFIG[computedStatus];
    return config ? `${config.bgColorClass} ${config.colorClass}` : 'bg-slate-100 text-slate-500';
};

/**
 * Получить CSS-класс для цветной полосы приоритета (насыщенный цвет)
 * 4 градации по дням до дедлайна (синхронизированы с легендой):
 * - 5-7 дней: голубой (bg-sky-400)
 * - 2-4 дня: зелёный (bg-green-500)
 * - 1 день и сегодня: светло-жёлтый (bg-yellow-300)
 * - Просрочено: красный (bg-red-500)
 * - Выполнено: серый (bg-slate-300)
 */
export const getPriorityBarColor = (task: TaskIndicatorInput): string => {
    // Выполнено = серый
    const s = (task.status || '').toLowerCase();
    if (s === 'completed' || s === 'выполнена') return 'bg-slate-300';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = typeof task.dueDate === 'string' ? new Date(task.dueDate) : new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'bg-red-500';       // Просрочено
    if (daysUntilDue <= 1) return 'bg-yellow-300';  // 1 день и сегодня
    if (daysUntilDue <= 4) return 'bg-green-500';   // 2-4 дня
    return 'bg-sky-400';                             // 5+ дней (голубой)
};

// ============================================
// ЦВЕТА ДЛЯ КАЛЕНДАРЯ (черта под датой)
// ============================================

/**
 * Получить цвет черты-индикатора под датой в календаре
 * Логика:
 *   🟢 Зелёный — все задачи выполнены
 *   🔴 Красный — есть просроченные невыполненные задачи
 *   🔵 Синий — есть задачи, которые можно выполнять (inProgress / urgent)
 *   ⚪ Серый — задачи ещё не активны (paused / blocked / pending)
 */
export const getCalendarDayColor = (tasks: CalendarTask[], date: Date): string => {
    if (tasks.length === 0) return '';

    // Вычисляем статус для каждой задачи
    const statuses: TaskStatusType[] = tasks.map(t =>
        computeTaskStatus({
            id: t.id,
            dueDate: t.dueDate,
            status: t.status,
            isBlocked: t.isBlocked,
            isUrgent: t.isUrgent,
            cyclePattern: t.cyclePattern,
            recurrence: t.recurrence,
            taskSource: t.taskSource,
        })
    );

    // Все выполнены → зелёный
    const allCompleted = statuses.every(s => s === 'completed' || s === 'archived');
    if (allCompleted) return 'bg-green-500';

    // Есть просроченные (невыполненные) → красный
    const hasOverdue = statuses.some(s => s === 'overdue');
    if (hasOverdue) return 'bg-red-500';

    // Есть задачи в работе / срочные → синий
    const hasActionable = statuses.some(s => s === 'inProgress' || s === 'urgent');
    if (hasActionable) return 'bg-blue-500';

    // Остальное (paused, blocked, pending) → серый
    return 'bg-slate-300';
};
