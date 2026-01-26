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

// ============================================
// ЦВЕТА ДЛЯ КАЛЕНДАРЯ (черта под датой)
// ============================================

/**
 * Получить цвет черты-индикатора под датой в календаре
 * Приоритет определяется на основе computeTaskStatus
 */
export const getCalendarDayColor = (tasks: CalendarTask[], date: Date): string => {
    if (tasks.length === 0) return '';

    // Вычисляем статус для каждой задачи
    const statusPriorities: TaskStatusType[] = tasks.map(t =>
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

    // Находим самый приоритетный статус (наименьший priority)
    let highestPriority = 999;
    let highestPriorityStatus: TaskStatusType = 'inProgress';

    for (const status of statusPriorities) {
        const config = STATUS_CONFIG[status];
        if (config && config.priority < highestPriority) {
            highestPriority = config.priority;
            highestPriorityStatus = status;
        }
    }

    return getCalendarColorByStatus(highestPriorityStatus);
};
