// services/taskLifecycle.ts
// Правила жизненного цикла и классификации статусов задач
// Этот файл содержит правила для определения статуса и активации задач

// ============================================
// ТИПЫ ЦИКЛИЧНОСТИ
// ============================================

export type TaskCycleType =
    | 'once'       // Разовая
    | 'daily'      // Ежедневная
    | 'weekly'     // Еженедельная
    | 'monthly'    // Ежемесячная
    | 'quarterly'  // Квартальная
    | 'yearly';    // Годовая

// Настройки активации по типу цикла
export const CYCLE_ACTIVATION_RULES: Record<TaskCycleType, {
    daysBeforeDue: number;  // За сколько дней до срока активировать
    description: string;
}> = {
    once: { daysBeforeDue: 7, description: 'Разовая задача' },
    daily: { daysBeforeDue: 0, description: 'Активируется в день назначения' },
    weekly: { daysBeforeDue: 0, description: 'Активируется в начале недели' },
    monthly: { daysBeforeDue: 7, description: 'Активируется за неделю до срока' },
    quarterly: { daysBeforeDue: 7, description: 'Активируется за неделю до конца квартала' },
    yearly: { daysBeforeDue: 14, description: 'Активируется за 2 недели до срока' },
};

// ============================================
// СТАТУСЫ ЗАДАЧ
// ============================================

export type TaskStatusType =
    | 'paused'      // На паузе (период не наступил)
    | 'blocked'     // Заблокирована (предыдущая не выполнена)
    | 'pending'     // Ожидает выполнения
    | 'inProgress'  // В работе
    | 'urgent'      // Срочная (за 1 день до срока)
    | 'overdue'     // Просрочена
    | 'completed'   // Выполнена
    | 'archived';   // Архивирована

// Описание статусов
export const STATUS_CONFIG: Record<TaskStatusType, {
    icon: string;
    label: string;
    colorClass: string;        // CSS класс для текста
    bgColorClass: string;      // CSS класс для фона
    calendarColor: string;     // CSS класс для черты в календаре
    priority: number;          // Приоритет для сортировки (чем меньше, тем важнее)
}> = {
    overdue: {
        icon: '‼️',
        label: 'Просрочено',
        colorClass: 'text-red-600',
        bgColorClass: 'bg-red-100',
        calendarColor: 'bg-red-500',
        priority: 1
    },
    urgent: {
        icon: '🔥',
        label: 'Срочная',
        colorClass: 'text-orange-600',
        bgColorClass: 'bg-orange-100',
        calendarColor: 'bg-orange-500',
        priority: 2
    },
    inProgress: {
        icon: '🔵',
        label: 'В работе',
        colorClass: 'text-blue-600',
        bgColorClass: 'bg-blue-100',
        calendarColor: 'bg-blue-500',
        priority: 3
    },
    pending: {
        icon: '⏳',
        label: 'Ожидание',
        colorClass: 'text-amber-600',
        bgColorClass: 'bg-amber-100',
        calendarColor: 'bg-amber-500',
        priority: 4
    },
    blocked: {
        icon: '🔒',
        label: 'Заблокирована',
        colorClass: 'text-slate-500',
        bgColorClass: 'bg-slate-100',
        calendarColor: 'bg-slate-400',
        priority: 5
    },
    paused: {
        icon: '⏸️',
        label: 'На паузе',
        colorClass: 'text-slate-400',
        bgColorClass: 'bg-slate-50',
        calendarColor: 'bg-slate-300',
        priority: 6
    },
    completed: {
        icon: '✅',
        label: 'Выполнено',
        colorClass: 'text-green-600',
        bgColorClass: 'bg-green-100',
        calendarColor: 'bg-green-500',
        priority: 7
    },
    archived: {
        icon: '📦',
        label: 'Архив',
        colorClass: 'text-slate-400',
        bgColorClass: 'bg-slate-50',
        calendarColor: 'bg-slate-200',
        priority: 8
    },
};

// ============================================
// ПРАВИЛА ОПРЕДЕЛЕНИЯ СТАТУСА
// ============================================

export interface TaskForStatusCheck {
    id: string;
    dueDate: Date | string;
    cyclePattern?: string;           // daily, weekly, monthly, quarterly, yearly
    recurrence?: 'oneTime' | 'cyclic';
    taskSource?: 'auto' | 'manual';
    isUrgent?: boolean;
    isBlocked?: boolean;
    previousTaskCompleted?: boolean;  // Выполнена ли предыдущая задача цикла
    status?: string;
}

/**
 * Определить тип цикла из cyclePattern
 */
export function getCycleType(cyclePattern?: string): TaskCycleType {
    if (!cyclePattern) return 'monthly';
    const lower = cyclePattern.toLowerCase();
    if (lower.includes('daily') || lower.includes('ежедн')) return 'daily';
    if (lower.includes('weekly') || lower.includes('еженед')) return 'weekly';
    if (lower.includes('quarter') || lower.includes('кварт')) return 'quarterly';
    if (lower.includes('year') || lower.includes('год')) return 'yearly';
    if (lower.includes('once') || lower.includes('разов')) return 'once';
    return 'monthly';
}

/**
 * Определить вычисляемый статус задачи на основе правил
 */
export function computeTaskStatus(task: TaskForStatusCheck): TaskStatusType {
    // Если уже выполнена или архивирована — оставляем
    if (task.status === 'completed') return 'completed';
    if (task.status === 'archived') return 'archived';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Просрочена
    if (diffDays < 0) return 'overdue';

    // 2. Заблокирована (предыдущая не выполнена для цикличных)
    if (task.recurrence === 'cyclic' && task.previousTaskCompleted === false) {
        return 'blocked';
    }

    // 3. Явная блокировка
    if (task.isBlocked) return 'paused';

    // 4. Период не наступил (на паузе)
    const cycleType = getCycleType(task.cyclePattern);
    const activationDays = CYCLE_ACTIVATION_RULES[cycleType].daysBeforeDue;

    if (diffDays > activationDays) {
        // Для ручных задач — сразу в работе
        if (task.taskSource === 'manual') {
            return task.isUrgent ? 'urgent' : 'inProgress';
        }
        return 'paused';
    }

    // 5. Срочная (за 1 день до срока или флаг isUrgent)
    if (diffDays <= 1 || task.isUrgent) return 'urgent';

    // 6. В работе (период активен)
    return 'inProgress';
}

// ============================================
// УТИЛИТЫ ДЛЯ КАЛЕНДАРЯ
// ============================================

/**
 * Получить цвет черты в календаре по статусу
 */
export function getCalendarColorByStatus(status: TaskStatusType): string {
    return STATUS_CONFIG[status]?.calendarColor || 'bg-blue-500';
}

/**
 * Получить иконку по статусу
 */
export function getStatusIconByType(status: TaskStatusType): string {
    return STATUS_CONFIG[status]?.icon || '🔵';
}

/**
 * Получить конфиг статуса
 */
export function getStatusConfig(status: TaskStatusType) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

// ============================================
// ЛЕГЕНДА ДЛЯ UI
// ============================================

export const STATUS_LEGEND = Object.entries(STATUS_CONFIG)
    .filter(([key]) => !['archived', 'blocked'].includes(key))
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([key, config]) => ({
        status: key as TaskStatusType,
        icon: config.icon,
        label: config.label,
        colorClass: config.colorClass,
    }));

export const CYCLE_LEGEND = Object.entries(CYCLE_ACTIVATION_RULES).map(([key, config]) => ({
    cycle: key as TaskCycleType,
    description: config.description,
    daysBeforeDue: config.daysBeforeDue,
}));
