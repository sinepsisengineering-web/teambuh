// services/taskSyncService.ts
// Сервис синхронизации задач между генератором и SQLite хранилищем

import { Task, LegalEntity, TaskStatus } from '../types';
import { generateTasksForLegalEntity, updateTaskStatuses } from './taskGenerator';
import * as taskStorage from './taskStorageService';
import { StoredTask } from './taskStorageService';

// Форматирование даты в локальном формате YYYY-MM-DD (без UTC сдвига)
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Преобразование Task в формат StoredTask
const taskToStoredTask = (
    task: Task,
    legalEntity: LegalEntity
): Omit<StoredTask, 'createdAt' | 'completedAt' | 'archivedAt' | 'deletedAt' | 'isDeleted'> => {
    // Определяем тип задачи
    const taskSource = task.isAutomatic ? 'auto' : 'manual';

    // Определяем периодичность
    let recurrence: 'oneTime' | 'cyclic' = 'oneTime';
    if (task.repeat && task.repeat !== 'none') {
        recurrence = 'cyclic';
    }

    // Формируем описание
    let description = task.description || '';
    if (task.isAutomatic) {
        // Для автоматических задач добавляем информацию о периоде
        const dueDate = new Date(task.dueDate);
        const month = dueDate.toLocaleDateString('ru-RU', { month: 'long' });
        const year = dueDate.getFullYear();
        description = `Автоматическая задача за ${month} ${year}`;
    }

    // Маппинг статуса
    let status: StoredTask['status'] = 'pending';
    if (task.status === TaskStatus.Completed) {
        status = 'completed';
    }

    // Оригинальная дата (до переноса) — если есть, иначе используем dueDate
    const originalDate = task.originalDueDate
        ? formatLocalDate(new Date(task.originalDueDate))
        : formatLocalDate(new Date(task.dueDate));

    // Текущая дата (после переноса с выходных)
    const currentDate = formatLocalDate(new Date(task.dueDate));

    // DEBUG: Проверяем даты при сохранении
    if (task.isAutomatic && originalDate !== currentDate) {
        console.log(`[TaskSync] DATE DIFF: ${task.title} - original=${originalDate}, current=${currentDate}`);
    }
    if (task.isAutomatic && !task.originalDueDate) {
        console.log(`[TaskSync] WARNING: No originalDueDate for ${task.title}`);
    }

    return {
        id: task.id,
        title: task.title,
        description: description || null,
        taskSource,
        recurrence,
        cyclePattern: task.repeat || null,
        clientId: legalEntity.id,
        clientName: legalEntity.name,
        assignedToId: typeof task.assignedTo === 'string' && task.assignedTo !== 'shared'
            ? task.assignedTo
            : null,
        assignedToName: null, // Заполняется отдельно
        completedById: null,
        completedByName: null,
        originalDueDate: originalDate,  // Дата по правилу (до переноса)
        currentDueDate: currentDate,     // Дата после переноса
        rescheduledDates: null,
        status
    };
};

// Преобразование StoredTask обратно в Task
export const storedTaskToTask = (storedTask: StoredTask): Task => {
    // Маппинг статуса
    let status: TaskStatus;
    switch (storedTask.status) {
        case 'completed':
            status = TaskStatus.Completed;
            break;
        case 'archived':
            status = TaskStatus.Completed;
            break;
        default:
            status = TaskStatus.Upcoming;
    }

    // Парсим текущую дату (после переноса)
    const [year, month, day] = storedTask.currentDueDate.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);

    // Парсим оригинальную дату (до переноса)
    const [origYear, origMonth, origDay] = storedTask.originalDueDate.split('-').map(Number);
    const originalDueDate = new Date(origYear, origMonth - 1, origDay);

    return {
        id: storedTask.id,
        legalEntityId: storedTask.clientId,
        title: storedTask.title,
        description: storedTask.description || undefined,
        originalDueDate,  // Оригинальная дата по правилу
        dueDate,          // Текущая дата (после переноса)
        dueDateRule: 'none' as any,
        repeat: storedTask.cyclePattern as any || 'none',
        reminder: '1w' as any,
        status,
        isAutomatic: storedTask.taskSource === 'auto',
        assignedTo: storedTask.assignedToId || undefined,
    };
};

// Синхронизация задач: генерация + сохранение в БД
export const syncTasksForLegalEntity = async (
    legalEntity: LegalEntity,
    forceRegenerate: boolean = false
): Promise<Task[]> => {
    console.log('[TaskSync] Syncing tasks for:', legalEntity.name);

    // Получаем существующие задачи из БД
    const existingStored = await taskStorage.getAllTasks({ clientId: legalEntity.id });
    const existingMap = new Map(existingStored.map(t => [t.id, t]));

    // Генерируем задачи по правилам (с уже применённым переносом дат)
    const generatedTasks = generateTasksForLegalEntity(legalEntity);

    const newTasks: Task[] = [];
    const tasksToUpdate: { id: string; dueDate: string }[] = [];

    for (const genTask of generatedTasks) {
        const existing = existingMap.get(genTask.id);
        const genDueDate = formatLocalDate(new Date(genTask.dueDate));

        if (!existing) {
            // Новая задача
            newTasks.push(genTask);
        } else if (existing.status !== 'completed' && existing.currentDueDate !== genDueDate) {
            // Существующая задача с неправильной датой — обновляем
            console.log(`[TaskSync] Updating date for ${genTask.id}: ${existing.currentDueDate} -> ${genDueDate}`);
            tasksToUpdate.push({ id: genTask.id, dueDate: genDueDate });
        }
    }

    // Сохраняем новые задачи в БД
    if (newTasks.length > 0) {
        const tasksToSave = newTasks.map(t => taskToStoredTask(t, legalEntity));

        // Bulk create
        const created = await taskStorage.createManyTasks(
            tasksToSave.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                taskSource: t.taskSource,
                recurrence: t.recurrence,
                cyclePattern: t.cyclePattern,
                clientId: t.clientId,
                clientName: t.clientName,
                assignedToId: t.assignedToId,
                assignedToName: t.assignedToName,
                originalDueDate: t.originalDueDate,  // ← Оригинальная дата (25-е)
                currentDueDate: t.currentDueDate,    // ← После переноса (27-е)
                status: t.status
            }))
        );

        console.log(`[TaskSync] Created ${created} new tasks for ${legalEntity.name}`);
    }

    // Обновляем даты для существующих задач
    for (const update of tasksToUpdate) {
        await taskStorage.updateTask(update.id, { currentDueDate: update.dueDate });
    }

    if (tasksToUpdate.length > 0) {
        console.log(`[TaskSync] Updated ${tasksToUpdate.length} task dates for ${legalEntity.name}`);
    }

    // Возвращаем все задачи (из БД + обновлённые статусы)
    const allStored = await taskStorage.getAllTasks({ clientId: legalEntity.id });
    const tasks = allStored.map(storedTaskToTask);

    // Обновляем статусы по датам
    return updateTaskStatuses(tasks);
};

// Синхронизация задач для всех клиентов
export const syncAllTasks = async (legalEntities: LegalEntity[]): Promise<Task[]> => {
    console.log('[TaskSync] Syncing tasks for', legalEntities.length, 'clients');

    const allTasks: Task[] = [];

    for (const entity of legalEntities) {
        try {
            const tasks = await syncTasksForLegalEntity(entity);
            allTasks.push(...tasks);
        } catch (error) {
            console.error(`[TaskSync] Error syncing tasks for ${entity.name}:`, error);
            // Продолжаем с остальными клиентами
        }
    }

    return allTasks;
};

// Загрузить все задачи из БД (без генерации)
export const loadAllTasksFromDB = async (): Promise<Task[]> => {
    try {
        const storedTasks = await taskStorage.getAllTasks();
        const tasks = storedTasks.map(storedTaskToTask);
        return updateTaskStatuses(tasks);
    } catch (error) {
        console.error('[TaskSync] Error loading tasks from DB:', error);
        return [];
    }
};

// Сохранить ручную задачу
export const saveManualTask = async (
    task: Task,
    legalEntity: LegalEntity
): Promise<StoredTask | null> => {
    const storedTask = taskToStoredTask(task, legalEntity);
    return taskStorage.createTask({
        id: storedTask.id,
        title: storedTask.title,
        description: storedTask.description || undefined,
        taskSource: 'manual',
        recurrence: storedTask.recurrence,
        clientId: storedTask.clientId,
        clientName: storedTask.clientName,
        assignedToId: storedTask.assignedToId || undefined,
        assignedToName: storedTask.assignedToName || undefined,
        dueDate: storedTask.currentDueDate,
        status: storedTask.status
    });
};

// Отметить задачу выполненной
export const markTaskCompleted = async (
    taskId: string,
    employeeId?: string,
    employeeName?: string
): Promise<boolean> => {
    const result = await taskStorage.completeTask(taskId, employeeId, employeeName);
    return result !== null;
};

// Удалить задачу
export const removeTask = async (taskId: string): Promise<boolean> => {
    return taskStorage.deleteTask(taskId);
};

// Проверить доступность SQLite
export const isDBAvailable = async (): Promise<boolean> => {
    return taskStorage.isTaskDatabaseAvailable();
};
