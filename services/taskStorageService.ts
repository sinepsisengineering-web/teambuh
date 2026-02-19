// services/taskStorageService.ts
// Сервис работы с задачами через API (фронтенд)

import { API_BASE_URL } from '../apiConfig';

const SERVER_URL = API_BASE_URL;
const TENANT_ID = 'org_default';

// Типы для задач в хранилище
export interface StoredTask {
    id: string;
    title: string;
    description: string | null;

    // Поля из справочника правил (для отображения в модальном окне)
    fullDescription: string | null;  // Полное описание из правила
    legalBasis: string | null;       // Основание (ссылка на закон)
    ruleId: string | null;           // ID правила (для связи со справочником)

    taskSource: 'auto' | 'manual';
    recurrence: 'oneTime' | 'cyclic';
    cyclePattern: string | null;

    clientId: string;
    clientName: string;

    assignedToId: string | null;
    assignedToName: string | null;
    completedById: string | null;
    completedByName: string | null;

    originalDueDate: string;
    currentDueDate: string;
    rescheduledDates: string | null;

    status: 'pending' | 'inProgress' | 'completed' | 'archived';

    createdAt: string;
    completedAt: string | null;
    archivedAt: string | null;
    deletedAt: string | null;
    isDeleted: number;
    completionLeadDays: number;
    dueDateRule: string;  // 'next_business_day' | 'previous_business_day' | 'no_transfer'
    isFloating: boolean;  // Плавающая задача — автоматически переносится на "сегодня"
}

export interface TaskStats {
    total: number;
    pending: number;
    completed: number;
    archived: number;
}

// Получить все задачи
export const getAllTasks = async (filters?: {
    clientId?: string;
    employeeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    taskSource?: string;
}): Promise<StoredTask[]> => {
    try {
        const params = new URLSearchParams();
        if (filters?.clientId) params.append('clientId', filters.clientId);
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.taskSource) params.append('taskSource', filters.taskSource);

        const queryString = params.toString();
        const url = `${SERVER_URL}/api/${TENANT_ID}/tasks${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn('[TaskStorage] Failed to get tasks:', response.status);
            return [];
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error getting tasks:', error);
        return [];
    }
};

// Получить задачу по ID
export const getTaskById = async (taskId: string): Promise<StoredTask | null> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}`);
        if (!response.ok) {
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error getting task:', error);
        return null;
    }
};

// Создать задачу
export const createTask = async (task: {
    id: string;
    title: string;
    description?: string;
    taskSource?: 'auto' | 'manual';
    recurrence?: 'oneTime' | 'cyclic';
    cyclePattern?: string;
    clientId: string;
    clientName: string;
    assignedToId?: string;
    assignedToName?: string;
    dueDate: string;
    status?: string;
    completionLeadDays?: number;
    ruleId?: string;
    dueDateRule?: string;  // Правило переноса даты с выходных
}): Promise<StoredTask | null> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...task,
                originalDueDate: task.dueDate,
                currentDueDate: task.dueDate,
            })
        });

        if (!response.ok) {
            console.error('[TaskStorage] Failed to create task:', response.status);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error creating task:', error);
        return null;
    }
};

// Создать много задач
export const createManyTasks = async (tasks: {
    id: string;
    title: string;
    description?: string | null;
    fullDescription?: string | null;  // Полное описание из правила
    legalBasis?: string | null;       // Основание (ссылка на закон)
    ruleId?: string | null;           // ID правила
    taskSource?: 'auto' | 'manual';
    recurrence?: 'oneTime' | 'cyclic';
    cyclePattern?: string | null;
    clientId: string;
    clientName: string;
    assignedToId?: string | null;
    assignedToName?: string | null;
    originalDueDate: string;  // ← Оригинальная дата (из правила)
    currentDueDate: string;   // ← Текущая дата (после переноса)
    status?: string;
    dueDateRule?: string;  // Правило переноса даты с выходных
}[]): Promise<number> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tasks: tasks.map(t => ({
                    ...t,
                    originalDueDate: t.originalDueDate,  // ← Используем переданные даты
                    currentDueDate: t.currentDueDate,    // ← А не дублируем одну
                }))
            })
        });

        if (!response.ok) {
            console.error('[TaskStorage] Failed to bulk create tasks:', response.status);
            return 0;
        }
        const result = await response.json();
        return result.created;
    } catch (error) {
        console.error('[TaskStorage] Error bulk creating tasks:', error);
        return 0;
    }
};

// Обновить задачу
export const updateTask = async (
    taskId: string,
    updates: Partial<StoredTask>
): Promise<StoredTask | null> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            console.error('[TaskStorage] Failed to update task:', response.status);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error updating task:', error);
        return null;
    }
};

// Выполнить задачу
export const completeTask = async (
    taskId: string,
    completedById?: string,
    completedByName?: string
): Promise<StoredTask | null> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completedById, completedByName })
        });

        if (!response.ok) {
            console.error('[TaskStorage] Failed to complete task:', response.status);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error completing task:', error);
        return null;
    }
};

// Вернуть задачу в работу
export const reopenTask = async (taskId: string): Promise<StoredTask | null> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}/reopen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.error('[TaskStorage] Failed to reopen task:', response.status);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error reopening task:', error);
        return null;
    }
};

// Удалить задачу (soft delete)
export const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}`, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (error) {
        console.error('[TaskStorage] Error deleting task:', error);
        return false;
    }
};

// Архивировать задачу
export const archiveTask = async (taskId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks/${taskId}/archive`, {
            method: 'POST'
        });

        return response.ok;
    } catch (error) {
        console.error('[TaskStorage] Error archiving task:', error);
        return false;
    }
};

// Получить статистику
export const getTaskStats = async (): Promise<TaskStats> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks-stats`);
        if (!response.ok) {
            return { total: 0, pending: 0, completed: 0, archived: 0 };
        }
        return response.json();
    } catch (error) {
        console.error('[TaskStorage] Error getting stats:', error);
        return { total: 0, pending: 0, completed: 0, archived: 0 };
    }
};

// Проверить доступность базы данных задач
export const isTaskDatabaseAvailable = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${SERVER_URL}/api/${TENANT_ID}/tasks-stats`);
        return response.ok;
    } catch {
        return false;
    }
};
