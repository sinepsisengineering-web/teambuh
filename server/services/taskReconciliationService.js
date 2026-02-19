// server/services/taskReconciliationService.js
// Сервис пересчёта задач при изменении данных клиента
//
// Алгоритм:
// 1. Получить необработанные изменения из client_changes (processed = 0)
// 2. Для каждого изменения:
//    a. Удалить автоматические невыполненные задачи клиента после effective_date
//    b. Перегенерировать задачи с учётом новых данных
//    c. Пометить изменение как обработанное

const { getClientsDatabase } = require('../database/clientsDatabase');
const { getTaskDatabase } = require('../database/taskDatabase');

/**
 * Обрабатывает все необработанные изменения клиентов
 * @param {string} tenantId - ID тенанта
 * @returns {{processed: number, deleted: number}} Результат обработки
 */
function processUnprocessedChanges(tenantId = 'org_default') {
    const clientsDb = getClientsDatabase(tenantId);
    const tasksDb = getTaskDatabase(tenantId);

    // Получаем необработанные изменения
    const changes = clientsDb.getUnprocessedChanges();

    if (changes.length === 0) {
        console.log('[Reconciler] No unprocessed changes found');
        return { processed: 0, deleted: 0 };
    }

    console.log(`[Reconciler] Found ${changes.length} unprocessed changes`);

    let totalDeleted = 0;
    const processedClientIds = new Set();

    // Группируем изменения по клиенту (берём самую раннюю дату для каждого клиента)
    const clientChanges = new Map();
    for (const change of changes) {
        const existing = clientChanges.get(change.clientId);
        if (!existing || change.effectiveDate < existing.effectiveDate) {
            clientChanges.set(change.clientId, change);
        }
    }

    // Обрабатываем каждого клиента
    for (const [clientId, change] of clientChanges) {
        console.log(`[Reconciler] Processing client ${clientId}, effective date: ${change.effectiveDate}`);

        // Удаляем невыполненные авто-задачи после даты изменения
        const deleted = tasksDb.deleteAutoTasksAfterDate(clientId, change.effectiveDate);
        totalDeleted += deleted;

        processedClientIds.add(clientId);
    }

    // Помечаем все изменения как обработанные
    for (const change of changes) {
        clientsDb.markChangeProcessed(change.id);
    }

    console.log(`[Reconciler] Processed ${processedClientIds.size} clients, deleted ${totalDeleted} tasks`);

    return {
        processed: processedClientIds.size,
        deleted: totalDeleted,
        clientIds: Array.from(processedClientIds)
    };
}

/**
 * Пересчитывает задачи для конкретного клиента с указанной даты
 * @param {string} clientId - ID клиента
 * @param {string} fromDate - Дата начала пересчёта (YYYY-MM-DD)
 * @param {string} tenantId - ID тенанта
 * @returns {{deleted: number}}
 */
function reconcileClientTasks(clientId, fromDate, tenantId = 'org_default') {
    const tasksDb = getTaskDatabase(tenantId);

    console.log(`[Reconciler] Reconciling tasks for client ${clientId} from ${fromDate}`);

    // Удаляем невыполненные авто-задачи после указанной даты
    const deleted = tasksDb.deleteAutoTasksAfterDate(clientId, fromDate);

    console.log(`[Reconciler] Deleted ${deleted} tasks for client ${clientId}`);

    return { deleted };
}

/**
 * Получает статистику необработанных изменений
 * @param {string} tenantId - ID тенанта
 * @returns {{count: number, clients: string[]}}
 */
function getUnprocessedStats(tenantId = 'org_default') {
    const clientsDb = getClientsDatabase(tenantId);
    const changes = clientsDb.getUnprocessedChanges();

    const clientIds = [...new Set(changes.map(c => c.clientId))];

    return {
        count: changes.length,
        clients: clientIds
    };
}

module.exports = {
    processUnprocessedChanges,
    reconcileClientTasks,
    getUnprocessedStats
};
