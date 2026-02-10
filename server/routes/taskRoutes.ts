// server/routes/taskRoutes.ts
// API маршруты для работы с задачами

import { Router, Request, Response } from 'express';
import { getTaskDatabase, StoredTask } from '../database/taskDatabase';

const router = Router();

// Получить все задачи
router.get('/:tenantId/tasks', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { clientId, employeeId, status, startDate, endDate, taskSource } = req.query;

        const db = getTaskDatabase(tenantId);
        let tasks: StoredTask[];

        if (clientId) {
            tasks = db.getByClient(clientId as string);
        } else if (employeeId) {
            tasks = db.getByEmployee(employeeId as string);
        } else if (status) {
            tasks = db.getByStatus(status as StoredTask['status']);
        } else if (startDate && endDate) {
            tasks = db.getByDateRange(startDate as string, endDate as string);
        } else {
            tasks = db.getAll();
        }

        // Filter by taskSource if specified
        if (taskSource) {
            tasks = tasks.filter(t => t.taskSource === taskSource);
        }

        res.json(tasks);
    } catch (error) {
        console.error('[TaskRoutes] Error getting tasks:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

// Получить задачу по ID
router.get('/:tenantId/tasks/:taskId', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;
        const db = getTaskDatabase(tenantId);
        const task = db.getById(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error('[TaskRoutes] Error getting task:', error);
        res.status(500).json({ error: 'Failed to get task' });
    }
});

// Создать задачу
router.post('/:tenantId/tasks', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const taskData = req.body;

        // Валидация
        if (!taskData.id || !taskData.title || !taskData.clientId || !taskData.clientName) {
            return res.status(400).json({ error: 'Missing required fields: id, title, clientId, clientName' });
        }

        const db = getTaskDatabase(tenantId);
        const task = db.create({
            id: taskData.id,
            title: taskData.title,
            description: taskData.description || null,
            taskSource: taskData.taskSource || 'manual',
            recurrence: taskData.recurrence || 'oneTime',
            cyclePattern: taskData.cyclePattern || null,
            clientId: taskData.clientId,
            clientName: taskData.clientName,
            assignedToId: taskData.assignedToId || null,
            assignedToName: taskData.assignedToName || null,
            completedById: null,
            completedByName: null,
            originalDueDate: taskData.originalDueDate || taskData.dueDate,
            currentDueDate: taskData.currentDueDate || taskData.dueDate,
            rescheduledDates: null,
            status: taskData.status || 'pending',
            completionLeadDays: taskData.completionLeadDays ?? 3,
            ruleId: taskData.ruleId || null,
            dueDateRule: taskData.dueDateRule || 'next_business_day'
        });

        console.log('[TaskRoutes] Created task:', task.id);
        res.status(201).json(task);
    } catch (error) {
        console.error('[TaskRoutes] Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Создать много задач (bulk)
router.post('/:tenantId/tasks/bulk', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { tasks } = req.body;

        if (!Array.isArray(tasks)) {
            return res.status(400).json({ error: 'tasks must be an array' });
        }

        const db = getTaskDatabase(tenantId);
        const preparedTasks = tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || null,
            taskSource: t.taskSource || 'auto',
            recurrence: t.recurrence || 'cyclic',
            cyclePattern: t.cyclePattern || null,
            clientId: t.clientId,
            clientName: t.clientName,
            assignedToId: t.assignedToId || null,
            assignedToName: t.assignedToName || null,
            completedById: null,
            completedByName: null,
            originalDueDate: t.originalDueDate || t.dueDate,
            currentDueDate: t.currentDueDate || t.dueDate,
            rescheduledDates: null,
            status: t.status || 'pending',
            dueDateRule: t.dueDateRule || 'next_business_day'
        }));

        const count = db.createMany(preparedTasks);
        console.log('[TaskRoutes] Bulk created tasks:', count);
        res.status(201).json({ created: count });
    } catch (error) {
        console.error('[TaskRoutes] Error bulk creating tasks:', error);
        res.status(500).json({ error: 'Failed to create tasks' });
    }
});

// Обновить задачу
router.patch('/:tenantId/tasks/:taskId', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;
        const updates = req.body;

        const db = getTaskDatabase(tenantId);
        const task = db.update(taskId, updates);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[TaskRoutes] Updated task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[TaskRoutes] Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Выполнить задачу
router.post('/:tenantId/tasks/:taskId/complete', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;
        const { completedById, completedByName } = req.body;

        const db = getTaskDatabase(tenantId);
        const task = db.complete(taskId, completedById || '', completedByName || '');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[TaskRoutes] Completed task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[TaskRoutes] Error completing task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
});

// Вернуть задачу в работу
router.post('/:tenantId/tasks/:taskId/reopen', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;

        const db = getTaskDatabase(tenantId);
        const task = db.update(taskId, {
            status: 'pending',
            completedById: null,
            completedByName: null,
            completedAt: null
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[TaskRoutes] Reopened task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[TaskRoutes] Error reopening task:', error);
        res.status(500).json({ error: 'Failed to reopen task' });
    }
});

// Удалить задачу (soft delete)
router.delete('/:tenantId/tasks/:taskId', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;

        const db = getTaskDatabase(tenantId);
        const deleted = db.softDelete(taskId);

        if (!deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[TaskRoutes] Deleted task:', taskId);
        res.json({ success: true });
    } catch (error) {
        console.error('[TaskRoutes] Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Архивировать задачу
router.post('/:tenantId/tasks/:taskId/archive', (req: Request, res: Response) => {
    try {
        const { tenantId, taskId } = req.params;

        const db = getTaskDatabase(tenantId);
        const archived = db.archive(taskId);

        if (!archived) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[TaskRoutes] Archived task:', taskId);
        res.json({ success: true });
    } catch (error) {
        console.error('[TaskRoutes] Error archiving task:', error);
        res.status(500).json({ error: 'Failed to archive task' });
    }
});

// Получить статистику
router.get('/:tenantId/tasks-stats', (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const db = getTaskDatabase(tenantId);
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('[TaskRoutes] Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
