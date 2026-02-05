// hooks/useTasks.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
import { generateTasksForLegalEntity, updateTaskStatuses } from '../services/taskGenerator';
import * as taskSync from '../services/taskSyncService';
import * as taskStorage from '../services/taskStorageService';

export const useTasks = (legalEntities: LegalEntity[], legalEntityMap: Map<string, LegalEntity>) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDBAvailable, setIsDBAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const notificationCheckRef = useRef(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);

  // Проверяем доступность SQLite при старте
  useEffect(() => {
    const checkDB = async () => {
      const available = await taskSync.isDBAvailable();
      setIsDBAvailable(available);
      console.log('[useTasks] SQLite database available:', available);
    };
    checkDB();
  }, []);

  // Загрузка и синхронизация задач
  useEffect(() => {
    console.log(`[useTasks] Effect triggered: legalEntities=${legalEntities.length}, isDBAvailable=${isDBAvailable}`);

    if (legalEntities.length === 0) {
      console.log('[useTasks] No legal entities, skipping sync');
      setIsInitialized(true);
      return;
    }

    const syncTasks = async () => {
      if (isDBAvailable) {
        // SQLite доступен — синхронизируем через базу
        console.log('[useTasks] Syncing tasks via SQLite...');
        const syncedTasks = await taskSync.syncAllTasks(legalEntities);
        console.log('[useTasks] Received', syncedTasks.length, 'tasks from sync');
        setTasks(updateTaskStatuses(syncedTasks));
      } else {
        // Fallback на localStorage + генератор
        console.log('[useTasks] SQLite not available, using generator + localStorage');
        const savedTasks = localStorage.getItem('tasks');
        let existingTasks: Task[] = [];
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          const validStatuses = Object.values(TaskStatus);
          existingTasks = parsedTasks.map((task: any) => {
            if (!task.status || !validStatuses.includes(task.status)) {
              task.status = TaskStatus.Upcoming;
            }
            return { ...task, dueDate: new Date(task.dueDate) };
          });
        }

        const expectedAutoTasks = legalEntities.flatMap(le => generateTasksForLegalEntity(le));
        const manualTasks = existingTasks.filter(t => !t.isAutomatic);
        const existingAutoTasksMap = new Map<string, Task>();
        existingTasks.forEach(t => {
          if (t.isAutomatic && t.id) {
            existingAutoTasksMap.set(t.id, t);
          }
        });
        const updatedAutoTasks = expectedAutoTasks.map((expectedTask: Task) => {
          const existingTask = existingAutoTasksMap.get(expectedTask.id);
          if (existingTask) {
            return { ...expectedTask, status: existingTask.status };
          }
          return expectedTask;
        });
        const allTasks = [...manualTasks, ...updatedAutoTasks];
        setTasks(updateTaskStatuses(allTasks));
      }
      setIsInitialized(true);
    };

    syncTasks();
  }, [legalEntities, isDBAvailable]);

  // Сохранение в localStorage как fallback
  useEffect(() => {
    if (isInitialized && !isDBAvailable) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks, isInitialized, isDBAvailable]);

  // Периодическое обновление статусов
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Плановая проверка и обновление статусов задач...');
      setTasks(currentTasks => updateTaskStatuses(currentTasks));
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Сохранение задачи (ручной)
  const handleSaveTask = useCallback(async (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
    let savedTask: Task | undefined;
    let updatedTasks: Task[];

    if (taskToEdit && taskToEdit.id) {
      // Редактирование
      updatedTasks = tasks.map(t => {
        if (t.id === taskToEdit.id) {
          savedTask = { ...t, ...taskData, reminder: taskData.reminder };
          return savedTask;
        }
        return t;
      });

      // Обновляем в БД если доступна
      if (isDBAvailable && savedTask) {
        await taskStorage.updateTask(savedTask.id, {
          currentDueDate: new Date(savedTask.dueDate).toISOString().split('T')[0],
          assignedToId: typeof savedTask.assignedTo === 'string' && savedTask.assignedTo !== 'shared'
            ? savedTask.assignedTo
            : null,
        });
      }
    } else {
      // Новая задача
      const newTask: Task = {
        id: `task-${Date.now()}`,
        status: TaskStatus.Upcoming,
        isAutomatic: false,
        ...taskData,
      };
      savedTask = newTask;
      updatedTasks = [...tasks, newTask];

      // Сохраняем в БД если доступна
      if (isDBAvailable) {
        const legalEntity = legalEntityMap.get(taskData.legalEntityId);
        if (legalEntity) {
          await taskSync.saveManualTask(newTask, legalEntity);
        }
      }
    }

    setTasks(updateTaskStatuses(updatedTasks));
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  }, [tasks, taskToEdit, isDBAvailable, legalEntityMap]);

  // Переключение статуса выполнения
  const handleToggleComplete = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleting = task.status !== TaskStatus.Completed;

    setTasks(currentTasks => {
      const newTasks = currentTasks.map(t => {
        if (t.id === taskId) {
          const temporaryStatus = t.status === TaskStatus.Completed
            ? TaskStatus.Upcoming
            : TaskStatus.Completed;
          return { ...t, status: temporaryStatus };
        }
        return t;
      });
      return updateTaskStatuses(newTasks);
    });

    // Обновляем в БД
    if (isDBAvailable) {
      if (isCompleting) {
        await taskSync.markTaskCompleted(taskId);
      } else {
        await taskStorage.reopenTask(taskId);
      }
    }
  }, [tasks, isDBAvailable]);

  // Удаление задачи
  const handleDeleteTask = useCallback(async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setIsTaskDetailModalOpen(false);

    // Удаляем из БД
    if (isDBAvailable) {
      await taskSync.removeTask(taskId);
    }
  }, [tasks, isDBAvailable]);

  const handleOpenNewTaskForm = useCallback((defaultValues?: Partial<Task>) => {
    const date = defaultValues?.dueDate instanceof Date ? defaultValues.dueDate : new Date();
    const newTaskScaffold: Partial<Task> = {
      dueDate: date,
      ...defaultValues
    };
    setTaskModalDefaultDate(date);
    setTaskToEdit(newTaskScaffold as Task);
    setIsTaskModalOpen(true);
  }, []);

  const handleOpenTaskDetail = useCallback((tasks: Task[], date: Date) => {
    setTasksForDetailView(tasks);
    setIsTaskDetailModalOpen(true);
  }, []);

  const handleEditTaskFromDetail = useCallback((task: Task) => {
    setIsTaskDetailModalOpen(false);
    setTimeout(() => {
      setTaskToEdit(task);
      setIsTaskModalOpen(true);
    }, 200);
  }, []);

  const handleBulkComplete = useCallback(async (taskIds: string[]) => {
    const updatedTasks = tasks.map(t => {
      if (taskIds.includes(t.id)) {
        return { ...t, status: TaskStatus.Completed };
      }
      return t;
    });
    setTasks(updateTaskStatuses(updatedTasks));

    // Обновляем в БД
    if (isDBAvailable) {
      for (const taskId of taskIds) {
        await taskSync.markTaskCompleted(taskId);
      }
    }
  }, [tasks, isDBAvailable]);

  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
    const idsToDelete = new Set(taskIds);
    setTasks(prevTasks => prevTasks.filter(task => !idsToDelete.has(task.id)));

    // Удаляем из БД
    if (isDBAvailable) {
      for (const taskId of taskIds) {
        await taskSync.removeTask(taskId);
      }
    }
  }, [isDBAvailable]);

  const handleDeleteTasksForLegalEntity = useCallback(async (legalEntityId: string) => {
    const tasksToDelete = tasks.filter(task => task.legalEntityId === legalEntityId);
    setTasks(prevTasks => prevTasks.filter(task => task.legalEntityId !== legalEntityId));

    // Удаляем из БД
    if (isDBAvailable) {
      for (const task of tasksToDelete) {
        await taskSync.removeTask(task.id);
      }
    }
  }, [tasks, isDBAvailable]);

  return {
    tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
    isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView, setTasksForDetailView,
    handleSaveTask,
    handleOpenNewTaskForm,
    handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask, handleBulkComplete,
    handleBulkDelete,
    handleDeleteTasksForLegalEntity,
    isDBAvailable, // Экспортируем для отладки
  };
};