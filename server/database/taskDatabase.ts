// server/database/taskDatabase.ts
// Сервис работы с SQLite базой данных задач

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Типы
export interface StoredTask {
    id: string;
    title: string;
    description: string | null;

    // Поля из справочника правил (для отображения в модальном окне)
    fullDescription: string | null;  // Полное описание из правила
    legalBasis: string | null;       // Основание (ссылка на закон)
    ruleId: string | null;           // ID правила (для связи со справочником)

    // Тип задачи
    taskSource: 'auto' | 'manual';
    recurrence: 'oneTime' | 'cyclic';
    cyclePattern: string | null;

    // Клиент (сохраняем имя навсегда)
    clientId: string;
    clientName: string;

    // Назначение
    assignedToId: string | null;
    assignedToName: string | null;

    // Выполнение
    completedById: string | null;
    completedByName: string | null;

    // Даты
    originalDueDate: string;
    currentDueDate: string;
    rescheduledDates: string | null; // JSON массив

    // Статус
    status: 'pending' | 'inProgress' | 'completed' | 'archived';

    // Метаданные
    createdAt: string;
    completedAt: string | null;
    archivedAt: string | null;
    deletedAt: string | null;
    isDeleted: number; // 0 или 1
}

// Путь к базе данных
const getDbPath = (tenantId: string = 'org_default'): string => {
    const dbDir = path.join(process.cwd(), 'data', 'tenants', tenantId, 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'tasks.db');
};

// Инициализация базы данных
export const initDatabase = (tenantId: string = 'org_default'): Database.Database => {
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
            is_deleted INTEGER DEFAULT 0
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

    console.log('[TaskDB] Database initialized:', dbPath);
    return db;
};

// Класс для работы с задачами
export class TaskDatabase {
    private db: Database.Database;

    constructor(tenantId: string = 'org_default') {
        this.db = initDatabase(tenantId);
    }

    // ==========================================
    // CRUD операции
    // ==========================================

    // Создать задачу
    create(task: Omit<StoredTask, 'createdAt' | 'completedAt' | 'archivedAt' | 'deletedAt' | 'isDeleted'>): StoredTask {
        const stmt = this.db.prepare(`
            INSERT INTO tasks (
                id, title, description,
                full_description, legal_basis, rule_id,
                task_source, recurrence, cycle_pattern,
                client_id, client_name,
                assigned_to_id, assigned_to_name,
                completed_by_id, completed_by_name,
                original_due_date, current_due_date, rescheduled_dates,
                status
            ) VALUES (
                @id, @title, @description,
                @fullDescription, @legalBasis, @ruleId,
                @taskSource, @recurrence, @cyclePattern,
                @clientId, @clientName,
                @assignedToId, @assignedToName,
                @completedById, @completedByName,
                @originalDueDate, @currentDueDate, @rescheduledDates,
                @status
            )
        `);

        stmt.run({
            id: task.id,
            title: task.title,
            description: task.description,
            fullDescription: task.fullDescription,
            legalBasis: task.legalBasis,
            ruleId: task.ruleId,
            taskSource: task.taskSource,
            recurrence: task.recurrence,
            cyclePattern: task.cyclePattern,
            clientId: task.clientId,
            clientName: task.clientName,
            assignedToId: task.assignedToId,
            assignedToName: task.assignedToName,
            completedById: task.completedById,
            completedByName: task.completedByName,
            originalDueDate: task.originalDueDate,
            currentDueDate: task.currentDueDate,
            rescheduledDates: task.rescheduledDates,
            status: task.status
        });

        return this.getById(task.id)!;
    }

    // Создать много задач (транзакция)
    createMany(tasks: Omit<StoredTask, 'createdAt' | 'completedAt' | 'archivedAt' | 'deletedAt' | 'isDeleted'>[]): number {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO tasks (
                id, title, description,
                full_description, legal_basis, rule_id,
                task_source, recurrence, cycle_pattern,
                client_id, client_name,
                assigned_to_id, assigned_to_name,
                completed_by_id, completed_by_name,
                original_due_date, current_due_date, rescheduled_dates,
                status
            ) VALUES (
                @id, @title, @description,
                @fullDescription, @legalBasis, @ruleId,
                @taskSource, @recurrence, @cyclePattern,
                @clientId, @clientName,
                @assignedToId, @assignedToName,
                @completedById, @completedByName,
                @originalDueDate, @currentDueDate, @rescheduledDates,
                @status
            )
        `);

        const insertMany = this.db.transaction((tasks: any[]) => {
            for (const task of tasks) {
                stmt.run({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    fullDescription: task.fullDescription,
                    legalBasis: task.legalBasis,
                    ruleId: task.ruleId,
                    taskSource: task.taskSource,
                    recurrence: task.recurrence,
                    cyclePattern: task.cyclePattern,
                    clientId: task.clientId,
                    clientName: task.clientName,
                    assignedToId: task.assignedToId,
                    assignedToName: task.assignedToName,
                    completedById: task.completedById,
                    completedByName: task.completedByName,
                    originalDueDate: task.originalDueDate,
                    currentDueDate: task.currentDueDate,
                    rescheduledDates: task.rescheduledDates,
                    status: task.status
                });
            }
            return tasks.length;
        });

        return insertMany(tasks);
    }

    // Получить по ID
    getById(id: string): StoredTask | null {
        const row = this.db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(id) as any;
        return row ? this.mapRowToTask(row) : null;
    }

    // Получить все активные задачи
    getAll(): StoredTask[] {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE is_deleted = 0 ORDER BY current_due_date').all() as any[];
        return rows.map(this.mapRowToTask);
    }

    // Получить задачи по клиенту
    getByClient(clientId: string): StoredTask[] {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE client_id = ? AND is_deleted = 0 ORDER BY current_due_date').all(clientId) as any[];
        return rows.map(this.mapRowToTask);
    }

    // Получить задачи по сотруднику
    getByEmployee(employeeId: string): StoredTask[] {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE assigned_to_id = ? AND is_deleted = 0 ORDER BY current_due_date').all(employeeId) as any[];
        return rows.map(this.mapRowToTask);
    }

    // Получить задачи по дате
    getByDateRange(startDate: string, endDate: string): StoredTask[] {
        const rows = this.db.prepare(`
            SELECT * FROM tasks 
            WHERE current_due_date >= ? AND current_due_date <= ? 
            AND is_deleted = 0 
            ORDER BY current_due_date
        `).all(startDate, endDate) as any[];
        return rows.map(this.mapRowToTask);
    }

    // Получить задачи по статусу
    getByStatus(status: StoredTask['status']): StoredTask[] {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE status = ? AND is_deleted = 0 ORDER BY current_due_date').all(status) as any[];
        return rows.map(this.mapRowToTask);
    }

    // Обновить задачу
    update(id: string, updates: Partial<StoredTask>): StoredTask | null {
        const fields: string[] = [];
        const values: any = { id };

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

        if (fields.length === 0) return this.getById(id);

        const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`;
        this.db.prepare(sql).run(values);

        return this.getById(id);
    }

    // Выполнить задачу
    complete(id: string, completedById: string, completedByName: string): StoredTask | null {
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
    softDelete(id: string): boolean {
        const now = new Date().toISOString();
        const result = this.db.prepare('UPDATE tasks SET is_deleted = 1, deleted_at = ? WHERE id = ?').run(now, id);
        return result.changes > 0;
    }

    // Переместить в архив
    archive(id: string): boolean {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
            UPDATE tasks 
            SET status = 'archived', archived_at = ? 
            WHERE id = ?
        `).run(now, id);
        return result.changes > 0;
    }

    // Получить удалённые (для архива)
    getDeleted(): StoredTask[] {
        const rows = this.db.prepare('SELECT * FROM tasks WHERE is_deleted = 1 ORDER BY deleted_at DESC').all() as any[];
        return rows.map(this.mapRowToTask);
    }

    // Статистика
    getStats(): { total: number; pending: number; completed: number; archived: number } {
        const row = this.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
            FROM tasks WHERE is_deleted = 0
        `).get() as any;

        return {
            total: row.total || 0,
            pending: row.pending || 0,
            completed: row.completed || 0,
            archived: row.archived || 0
        };
    }

    // Закрыть соединение
    close(): void {
        this.db.close();
    }

    // ==========================================
    // Вспомогательные методы
    // ==========================================

    private mapRowToTask(row: any): StoredTask {
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
            currentDueDate: row.current_due_date,
            rescheduledDates: row.rescheduled_dates,
            status: row.status,
            createdAt: row.created_at,
            completedAt: row.completed_at,
            archivedAt: row.archived_at,
            deletedAt: row.deleted_at,
            isDeleted: row.is_deleted
        };
    }
}

// Экспорт singleton instance
let instance: TaskDatabase | null = null;

export const getTaskDatabase = (tenantId: string = 'org_default'): TaskDatabase => {
    if (!instance) {
        instance = new TaskDatabase(tenantId);
    }
    return instance;
};

export default TaskDatabase;
