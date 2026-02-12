// server/database/taskDatabase.js
// Сервис работы с SQLite базой данных задач

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Путь к базе данных
const getDbPath = (tenantId = 'org_default') => {
    const dbDir = path.join(process.cwd(), 'data', 'tenants', tenantId, 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'tasks.db');
};

// Инициализация базы данных
const initDatabase = (tenantId = 'org_default') => {
    const dbPath = getDbPath(tenantId);
    const db = new Database(dbPath);

    // Включаем WAL режим для лучшей производительности
    db.pragma('journal_mode = WAL');

    // Создаём таблицу если не существует
    db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            
            full_description TEXT,
            legal_basis TEXT,
            rule_id TEXT,
            
            task_source TEXT CHECK(task_source IN ('auto', 'manual')) DEFAULT 'auto',
            recurrence TEXT CHECK(recurrence IN ('oneTime', 'cyclic')) DEFAULT 'cyclic',
            cycle_pattern TEXT,
            
            client_id TEXT NOT NULL,
            client_name TEXT NOT NULL,
            
            assigned_to_id TEXT,
            assigned_to_name TEXT,
            completed_by_id TEXT,
            completed_by_name TEXT,
            
            original_due_date TEXT NOT NULL,
            current_due_date TEXT NOT NULL,
            rescheduled_dates TEXT,
            
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'inProgress', 'completed', 'archived')),
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            archived_at TEXT,
            deleted_at TEXT,
            is_deleted INTEGER DEFAULT 0,
            completion_lead_days INTEGER DEFAULT 3,
            due_date_rule TEXT DEFAULT 'next_business_day'
        );
        
        CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(current_due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(is_deleted);
    `);

    // Миграция: добавляем новые колонки если их нет
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN full_description TEXT');
        console.log('[TaskDB] Added column: full_description');
    } catch (e) { /* Колонка уже существует */ }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN legal_basis TEXT');
        console.log('[TaskDB] Added column: legal_basis');
    } catch (e) { /* Колонка уже существует */ }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN rule_id TEXT');
        console.log('[TaskDB] Added column: rule_id');
    } catch (e) { /* Колонка уже существует */ }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN completion_lead_days INTEGER DEFAULT 3');
        console.log('[TaskDB] Added column: completion_lead_days');
    } catch (e) { /* Колонка уже существует */ }
    try {
        db.exec("ALTER TABLE tasks ADD COLUMN due_date_rule TEXT DEFAULT 'next_business_day'");
        console.log('[TaskDB] Added column: due_date_rule');
    } catch (e) { /* Колонка уже существует */ }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN is_floating INTEGER DEFAULT 0');
        console.log('[TaskDB] Added column: is_floating');
    } catch (e) { /* Колонка уже существует */ }

    console.log('[TaskDB] Database initialized:', dbPath);
    return db;
};

// Мапинг строки БД в объект задачи
const mapRowToTask = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        fullDescription: row.full_description,
        legalBasis: row.legal_basis,
        ruleId: row.rule_id,
        taskSource: row.task_source,
        recurrence: row.recurrence,
        cyclePattern: row.cycle_pattern,
        clientId: row.client_id,
        clientName: row.client_name,
        assignedToId: row.assigned_to_id,
        assignedToName: row.assigned_to_name,
        completedById: row.completed_by_id,
        completedByName: row.completed_by_name,
        originalDueDate: row.original_due_date,
        currentDueDate: (row.is_floating === 1 && row.status !== 'completed')
            ? new Date().toISOString().split('T')[0]
            : row.current_due_date,
        rescheduledDates: row.rescheduled_dates,
        status: row.status,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        archivedAt: row.archived_at,
        deletedAt: row.deleted_at,
        isDeleted: row.is_deleted,
        completionLeadDays: row.completion_lead_days ?? 3,
        dueDateRule: row.due_date_rule || 'next_business_day',
        isFloating: row.is_floating === 1
    };
};

// Класс для работы с задачами
class TaskDatabase {
    constructor(tenantId = 'org_default') {
        this.db = initDatabase(tenantId);
    }

    // Создать задачу
    create(task) {
        const stmt = this.db.prepare(`
            INSERT INTO tasks (
                id, title, description,
                full_description, legal_basis, rule_id,
                task_source, recurrence, cycle_pattern,
                client_id, client_name,
                assigned_to_id, assigned_to_name,
                completed_by_id, completed_by_name,
                original_due_date, current_due_date, rescheduled_dates,
                status, completion_lead_days, due_date_rule
            ) VALUES (
                @id, @title, @description,
                @fullDescription, @legalBasis, @ruleId,
                @taskSource, @recurrence, @cyclePattern,
                @clientId, @clientName,
                @assignedToId, @assignedToName,
                @completedById, @completedByName,
                @originalDueDate, @currentDueDate, @rescheduledDates,
                @status, @completionLeadDays, @dueDateRule
            )
        `);

        stmt.run({
            id: task.id,
            title: task.title,
            description: task.description || null,
            fullDescription: task.fullDescription || null,
            legalBasis: task.legalBasis || null,
            ruleId: task.ruleId || null,
            taskSource: task.taskSource || 'auto',
            recurrence: task.recurrence || 'cyclic',
            cyclePattern: task.cyclePattern || null,
            clientId: task.clientId,
            clientName: task.clientName,
            assignedToId: task.assignedToId || null,
            assignedToName: task.assignedToName || null,
            completedById: task.completedById || null,
            completedByName: task.completedByName || null,
            originalDueDate: task.originalDueDate,
            currentDueDate: task.currentDueDate,
            rescheduledDates: task.rescheduledDates || null,
            status: task.status || 'pending',
            completionLeadDays: task.completionLeadDays ?? 3,
            dueDateRule: task.dueDateRule || 'next_business_day'
        });

        return this.getById(task.id);
    }

    // Создать много задач (транзакция)
    createMany(tasks) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO tasks (
                id, title, description,
                full_description, legal_basis, rule_id,
                task_source, recurrence, cycle_pattern,
                client_id, client_name,
                assigned_to_id, assigned_to_name,
                completed_by_id, completed_by_name,
                original_due_date, current_due_date, rescheduled_dates,
                status, completion_lead_days, due_date_rule
            ) VALUES (
                @id, @title, @description,
                @fullDescription, @legalBasis, @ruleId,
                @taskSource, @recurrence, @cyclePattern,
                @clientId, @clientName,
                @assignedToId, @assignedToName,
                @completedById, @completedByName,
                @originalDueDate, @currentDueDate, @rescheduledDates,
                @status, @completionLeadDays, @dueDateRule
            )
        `);

        const insertMany = this.db.transaction((tasks) => {
            for (const task of tasks) {
                stmt.run({
                    id: task.id,
                    title: task.title,
                    description: task.description || null,
                    fullDescription: task.fullDescription || null,
                    legalBasis: task.legalBasis || null,
                    ruleId: task.ruleId || null,
                    taskSource: task.taskSource || 'auto',
                    recurrence: task.recurrence || 'cyclic',
                    cyclePattern: task.cyclePattern || null,
                    clientId: task.clientId,
                    clientName: task.clientName,
                    assignedToId: task.assignedToId || null,
                    assignedToName: task.assignedToName || null,
                    completedById: task.completedById || null,
                    completedByName: task.completedByName || null,
                    originalDueDate: task.originalDueDate,
                    currentDueDate: task.currentDueDate,
                    rescheduledDates: task.rescheduledDates || null,
                    status: task.status || 'pending',
                    completionLeadDays: task.completionLeadDays ?? 3,
                    dueDateRule: task.dueDateRule || 'next_business_day'
                });
            }
            return tasks.length;
        });

        return insertMany(tasks);
    }

    // Получить по ID
    getById(id) {
        const row = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(id);
        return mapRowToTask(row);
    }

    // Получить все активные задачи
    getAll() {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY current_due_date').all();
        return rows.map(mapRowToTask);
    }

    // Получить задачи по клиенту
    getByClient(clientId) {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE client_id = ? AND is_deleted = 0 ORDER BY current_due_date').all(clientId);
        return rows.map(mapRowToTask);
    }

    // Получить задачи по сотруднику
    getByEmployee(employeeId) {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE assigned_to_id = ? AND is_deleted = 0 ORDER BY current_due_date').all(employeeId);
        return rows.map(mapRowToTask);
    }

    // Получить задачи по дате
    getByDateRange(startDate, endDate) {
        const rows = this.db.prepare(`
            SELECT * FROM tasks 
            WHERE current_due_date >= ? AND current_due_date <= ? 
            AND is_deleted = 0 
            ORDER BY current_due_date
        `).all(startDate, endDate);
        return rows.map(mapRowToTask);
    }

    // Получить задачи по статусу
    getByStatus(status) {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE status = ? AND is_deleted = 0 ORDER BY current_due_date').all(status);
        return rows.map(mapRowToTask);
    }

    // Обновить задачу
    update(id, updates) {
        const fields = [];
        const values = { id };

        if (updates.title !== undefined) {
            fields.push('title = @title');
            values.title = updates.title;
        }
        if (updates.description !== undefined) {
            fields.push('description = @description');
            values.description = updates.description;
        }
        if (updates.status !== undefined) {
            fields.push('status = @status');
            values.status = updates.status;
        }
        if (updates.assignedToId !== undefined) {
            fields.push('assigned_to_id = @assignedToId');
            values.assignedToId = updates.assignedToId;
        }
        if (updates.assignedToName !== undefined) {
            fields.push('assigned_to_name = @assignedToName');
            values.assignedToName = updates.assignedToName;
        }
        if (updates.completedById !== undefined) {
            fields.push('completed_by_id = @completedById');
            values.completedById = updates.completedById;
        }
        if (updates.completedByName !== undefined) {
            fields.push('completed_by_name = @completedByName');
            values.completedByName = updates.completedByName;
        }
        if (updates.currentDueDate !== undefined) {
            fields.push('current_due_date = @currentDueDate');
            values.currentDueDate = updates.currentDueDate;
        }
        if (updates.completedAt !== undefined) {
            fields.push('completed_at = @completedAt');
            values.completedAt = updates.completedAt;
        }
        if (updates.rescheduledDates !== undefined) {
            fields.push('rescheduled_dates = @rescheduledDates');
            values.rescheduledDates = updates.rescheduledDates;
        }
        if (updates.completionLeadDays !== undefined) {
            fields.push('completion_lead_days = @completionLeadDays');
            values.completionLeadDays = updates.completionLeadDays;
        }
        if (updates.dueDateRule !== undefined) {
            fields.push('due_date_rule = @dueDateRule');
            values.dueDateRule = updates.dueDateRule;
        }
        if (updates.recurrence !== undefined) {
            fields.push('recurrence = @recurrence');
            values.recurrence = updates.recurrence;
        }
        if (updates.cyclePattern !== undefined) {
            fields.push('cycle_pattern = @cyclePattern');
            values.cyclePattern = updates.cyclePattern;
        }
        if (updates.isFloating !== undefined) {
            fields.push('is_floating = @isFloating');
            values.isFloating = updates.isFloating ? 1 : 0;
        }

        if (fields.length === 0) return this.getById(id);

        const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`;
        this.db.prepare(sql).run(values);

        return this.getById(id);
    }

    // Выполнить задачу
    complete(id, completedById, completedByName) {
        const now = new Date().toISOString();
        this.db.prepare(`
            UPDATE tasks 
            SET status = 'completed', 
                completed_by_id = ?, 
                completed_by_name = ?,
                completed_at = ?
            WHERE id = ?
        `).run(completedById, completedByName, now, id);

        return this.getById(id);
    }

    // Мягкое удаление
    softDelete(id) {
        const now = new Date().toISOString();
        const result = this.db.prepare('UPDATE tasks SET is_deleted = 1, deleted_at = ? WHERE id = ?').run(now, id);
        return result.changes > 0;
    }

    // Переместить в архив
    archive(id) {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
            UPDATE tasks 
            SET status = 'archived', archived_at = ? 
            WHERE id = ?
        `).run(now, id);
        return result.changes > 0;
    }

    // Получить удалённые (для архива)
    getDeleted() {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE is_deleted = 1 ORDER BY deleted_at DESC').all();
        return rows.map(mapRowToTask);
    }

    // Статистика
    getStats() {
        const row = this.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
            FROM tasks WHERE is_deleted = 0
        `).get();

        return {
            total: row.total || 0,
            pending: row.pending || 0,
            completed: row.completed || 0,
            archived: row.archived || 0
        };
    }

    // Удалить автоматические невыполненные задачи клиента после указанной даты
    // Используется при пересчёте задач после изменения профиля клиента
    deleteAutoTasksAfterDate(clientId, afterDate) {
        const result = this.db.prepare(`
            DELETE FROM tasks 
            WHERE client_id = ? 
            AND task_source = 'auto' 
            AND status != 'completed' 
            AND current_due_date >= ?
            AND is_deleted = 0
        `).run(clientId, afterDate);
        console.log(`[TaskDB] Deleted ${result.changes} auto-tasks for client ${clientId} after ${afterDate}`);
        return result.changes;
    }

    // Закрыть соединение
    close() {
        this.db.close();
    }
}

// Singleton instance
let instance = null;

const getTaskDatabase = (tenantId = 'org_default') => {
    if (!instance) {
        instance = new TaskDatabase(tenantId);
    }
    return instance;
};

module.exports = {
    TaskDatabase,
    getTaskDatabase,
    initDatabase
};
