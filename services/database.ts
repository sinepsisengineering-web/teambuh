// services/database.ts
// Сервис для работы с локальной базой данных PouchDB

// @ts-ignore - PouchDB не имеет встроенных типов
import PouchDB from 'pouchdb';
// @ts-ignore
import PouchDBFind from 'pouchdb-find';
import { Task, LegalEntity } from '../types';

// Подключаем плагин для поиска
PouchDB.plugin(PouchDBFind);

// Типы для PouchDB документов
interface TaskDoc extends Task {
    _id: string;
    _rev?: string;
}

interface ClientDoc extends LegalEntity {
    _id: string;
    _rev?: string;
}

// Инициализация баз данных
const tasksDB = new PouchDB<TaskDoc>('teambuh_tasks');
const clientsDB = new PouchDB<ClientDoc>('teambuh_clients');

// ==================== TASKS ====================

/**
 * Получить все задачи
 */
export const getAllTasks = async (): Promise<Task[]> => {
    try {
        const result = await tasksDB.allDocs({ include_docs: true });
        return result.rows
            .filter((row: { doc?: TaskDoc; id: string }) => row.doc && !row.id.startsWith('_'))
            .map((row: { doc?: TaskDoc; id: string }) => {
                const doc = row.doc!;
                // Удаляем служебные поля PouchDB
                const { _id, _rev: _, ...task } = doc;
                return {
                    ...task,
                    id: _id,
                    dueDate: new Date(task.dueDate as unknown as string),
                } as Task;
            });
    } catch (error) {
        console.error('Ошибка получения задач:', error);
        return [];
    }
};

/**
 * Сохранить задачу (создать или обновить)
 */
export const saveTask = async (task: Task): Promise<Task> => {
    try {
        const docId = task.id;
        let existingDoc;

        try {
            existingDoc = await tasksDB.get(docId);
        } catch {
            // Документ не существует - это нормально для новых задач
        }

        const docToSave = {
            _id: docId,
            ...(existingDoc?._rev && { _rev: existingDoc._rev }),
            ...task,
            dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
        };

        await tasksDB.put(docToSave);
        return task;
    } catch (error) {
        console.error('Ошибка сохранения задачи:', error);
        throw error;
    }
};

/**
 * Сохранить несколько задач
 */
export const saveTasks = async (tasks: Task[]): Promise<void> => {
    try {
        // Получаем существующие документы для получения _rev
        const existingDocs = await tasksDB.allDocs({ include_docs: true });
        const revMap = new Map<string, string>();
        existingDocs.rows.forEach((row: { doc?: TaskDoc; id: string }) => {
            if (row.doc?._rev) {
                revMap.set(row.id, row.doc._rev);
            }
        });

        const docs = tasks.map(task => ({
            _id: task.id,
            ...(revMap.has(task.id) && { _rev: revMap.get(task.id) }),
            ...task,
            dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
        }));

        await tasksDB.bulkDocs(docs);
    } catch (error) {
        console.error('Ошибка массового сохранения задач:', error);
        throw error;
    }
};

/**
 * Удалить задачу
 */
export const deleteTask = async (taskId: string): Promise<void> => {
    try {
        const doc = await tasksDB.get(taskId);
        await tasksDB.remove(doc);
    } catch (error) {
        console.error('Ошибка удаления задачи:', error);
    }
};

// ==================== CLIENTS ====================

/**
 * Получить всех клиентов
 */
export const getAllClients = async (): Promise<LegalEntity[]> => {
    try {
        const result = await clientsDB.allDocs({ include_docs: true });
        return result.rows
            .filter((row: { doc?: ClientDoc; id: string }) => row.doc && !row.id.startsWith('_'))
            .map((row: { doc?: ClientDoc; id: string }) => {
                const doc = row.doc!;
                const { _id, _rev: _, ...client } = doc;
                return {
                    ...client,
                    id: _id,
                    createdAt: client.createdAt ? new Date(client.createdAt as unknown as string) : undefined,
                    ogrnDate: client.ogrnDate ? new Date(client.ogrnDate as unknown as string) : undefined,
                } as LegalEntity;
            });
    } catch (error) {
        console.error('Ошибка получения клиентов:', error);
        return [];
    }
};

/**
 * Сохранить клиента
 */
export const saveClient = async (client: LegalEntity): Promise<LegalEntity> => {
    try {
        const docId = client.id;
        let existingDoc;

        try {
            existingDoc = await clientsDB.get(docId);
        } catch {
            // Документ не существует
        }

        const docToSave = {
            _id: docId,
            ...(existingDoc?._rev && { _rev: existingDoc._rev }),
            ...client,
            createdAt: client.createdAt instanceof Date ? client.createdAt.toISOString() : client.createdAt,
            ogrnDate: client.ogrnDate instanceof Date ? client.ogrnDate.toISOString() : client.ogrnDate,
        };

        await clientsDB.put(docToSave);
        return client;
    } catch (error) {
        console.error('Ошибка сохранения клиента:', error);
        throw error;
    }
};

/**
 * Удалить клиента
 */
export const deleteClient = async (clientId: string): Promise<void> => {
    try {
        const doc = await clientsDB.get(clientId);
        await clientsDB.remove(doc);
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
    }
};

// ==================== МИГРАЦИЯ ====================

/**
 * Мигрировать данные из localStorage в PouchDB
 */
export const migrateFromLocalStorage = async (): Promise<{ tasks: number; clients: number }> => {
    let tasksMigrated = 0;
    let clientsMigrated = 0;

    // Миграция задач
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        try {
            const tasks: Task[] = JSON.parse(savedTasks);
            if (tasks.length > 0) {
                await saveTasks(tasks);
                tasksMigrated = tasks.length;
                console.log(`Мигрировано ${tasksMigrated} задач из localStorage`);
            }
        } catch {
            console.error('Ошибка миграции задач');
        }
    }

    // Миграция клиентов
    const savedClients = localStorage.getItem('legalEntities');
    if (savedClients) {
        try {
            const clients: LegalEntity[] = JSON.parse(savedClients);
            for (const client of clients) {
                await saveClient(client);
                clientsMigrated++;
            }
            console.log(`Мигрировано ${clientsMigrated} клиентов из localStorage`);
        } catch {
            console.error('Ошибка миграции клиентов');
        }
    }

    return { tasks: tasksMigrated, clients: clientsMigrated };
};

/**
 * Проверить нужна ли миграция
 */
export const checkMigrationNeeded = async (): Promise<boolean> => {
    const hasLocalStorageData =
        localStorage.getItem('tasks') !== null ||
        localStorage.getItem('legalEntities') !== null;

    if (!hasLocalStorageData) return false;

    // Проверяем есть ли уже данные в PouchDB
    const existingTasks = await tasksDB.allDocs();
    const existingClients = await clientsDB.allDocs();

    // Если в PouchDB пусто, а в localStorage есть данные - нужна миграция
    return existingTasks.total_rows === 0 && existingClients.total_rows === 0;
};

// ==================== СИНХРОНИЗАЦИЯ (заглушка) ====================

/**
 * Настроить синхронизацию с удалённым сервером
 * @param remoteUrl - URL удалённой CouchDB
 */
export const setupSync = (remoteUrl: string) => {
    // TODO: Реализовать после настройки сервера
    console.log('Синхронизация будет настроена с:', remoteUrl);
};

export { tasksDB, clientsDB };
