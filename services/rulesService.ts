// services/rulesService.ts
// Унифицированный сервис для работы с правилами задач (SQLite через API)
// Заменяет customRulesService.ts для работы с новой единой таблицей

import { TaskRule, RuleCategory, TaskType, DateCalculationConfig } from './taskRules';
import { RepeatFrequency, TaskDueDateRule, LegalEntity } from '../types';

// API конфигурация
const SERVER_URL = 'http://localhost:3001';
const TENANT_ID = 'org_default';

// ==========================================
// ТИПЫ
// ==========================================

/**
 * Правило из базы данных (унифицированный формат)
 */
export interface DbRule {
    id: string;
    source: 'system' | 'custom';
    storageCategory: 'налоговые' | 'финансовые' | 'организационные';
    isActive: boolean;
    version: number;

    taskType: string;
    shortTitle: string;
    shortDescription: string;
    description: string | null;
    titleTemplate: string;
    lawReference: string | null;

    periodicity: RepeatFrequency;
    periodType: 'current' | 'past';

    dateConfig: DateCalculationConfig;
    dueDateRule: TaskDueDateRule;

    applicabilityConfig: {
        allClients: boolean;
        legalForms: string[] | null;
        taxSystems: string[] | null;
        requiresEmployees: boolean;
        requiresNds: boolean;
        clientIds: string[] | null;
    };

    excludeMonths: number[] | null;

    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}

/**
 * Ответ синхронизации
 */
export interface SyncResponse {
    rules: DbRule[];
    synced: number;
    total: number;
}

/**
 * Данные для создания правила
 */
export type CreateRuleData = Omit<DbRule, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'version'>;

// ==========================================
// API КЛИЕНТ
// ==========================================

const getBaseUrl = (tenantId = TENANT_ID) => {
    return `${SERVER_URL}/api/${tenantId}/rules`;
};

/**
 * Синхронизация правил при входе пользователя
 * Загружает актуальные правила и обновляет tenant DB
 */
export const syncRulesOnLogin = async (tenantId = TENANT_ID): Promise<SyncResponse> => {
    const response = await fetch(`${getBaseUrl(tenantId)}/sync`);
    if (!response.ok) {
        throw new Error('Failed to sync rules');
    }
    return response.json();
};

/**
 * Получить все правила тенанта
 */
export const getAllRules = async (tenantId = TENANT_ID): Promise<DbRule[]> => {
    const response = await fetch(getBaseUrl(tenantId));
    if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch rules');
    }
    return response.json();
};

/**
 * Получить правила по источнику (system/custom)
 */
export const getRulesBySource = async (source: 'system' | 'custom', tenantId = TENANT_ID): Promise<DbRule[]> => {
    const response = await fetch(`${getBaseUrl(tenantId)}?source=${source}`);
    if (!response.ok) {
        throw new Error('Failed to fetch rules by source');
    }
    return response.json();
};

/**
 * Получить правила по категории
 */
export const getRulesByCategory = async (category: string, tenantId = TENANT_ID): Promise<DbRule[]> => {
    const response = await fetch(`${getBaseUrl(tenantId)}?category=${encodeURIComponent(category)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch rules by category');
    }
    return response.json();
};

/**
 * Получить правило по ID
 */
export const getRuleById = async (ruleId: string, tenantId = TENANT_ID): Promise<DbRule | null> => {
    const response = await fetch(`${getBaseUrl(tenantId)}/${ruleId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch rule');
    return response.json();
};

/**
 * Создать новое правило (только custom)
 */
export const createRule = async (data: CreateRuleData, tenantId = TENANT_ID): Promise<DbRule> => {
    const response = await fetch(getBaseUrl(tenantId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create rule');
    return response.json();
};

/**
 * Обновить правило (только custom)
 */
export const updateRule = async (ruleId: string, updates: Partial<CreateRuleData>, tenantId = TENANT_ID): Promise<DbRule> => {
    const response = await fetch(`${getBaseUrl(tenantId)}/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update rule');
    return response.json();
};

/**
 * Удалить правило (только custom)
 */
export const deleteRule = async (ruleId: string, tenantId = TENANT_ID): Promise<boolean> => {
    const response = await fetch(`${getBaseUrl(tenantId)}/${ruleId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete rule');
    const result = await response.json();
    return result.success;
};

// ==========================================
// КОНВЕРТАЦИЯ В TaskRule (для генератора)
// ==========================================

/**
 * Конвертирует DbRule в TaskRule для использования в генераторе задач
 */
export const convertToTaskRule = (dbRule: DbRule): TaskRule => {
    const { applicabilityConfig } = dbRule;

    // Создаём функцию appliesTo на основе декларативных полей
    const appliesTo = (entity: LegalEntity): boolean => {
        // Если для всех клиентов
        if (applicabilityConfig.allClients) {
            // Проверяем дополнительные условия
            if (applicabilityConfig.requiresEmployees && !entity.hasEmployees) return false;
            if (applicabilityConfig.requiresNds && !entity.isNdsPayer) return false;
            if (applicabilityConfig.legalForms?.length && !applicabilityConfig.legalForms.includes(entity.legalForm)) return false;
            if (applicabilityConfig.taxSystems?.length && !applicabilityConfig.taxSystems.includes(entity.taxSystem)) return false;
            return true;
        }

        // Для конкретных клиентов
        if (applicabilityConfig.clientIds?.length) {
            return applicabilityConfig.clientIds.includes(entity.id);
        }

        // Проверяем условия применимости
        if (applicabilityConfig.requiresEmployees && !entity.hasEmployees) return false;
        if (applicabilityConfig.requiresNds && !entity.isNdsPayer) return false;
        if (applicabilityConfig.legalForms?.length && !applicabilityConfig.legalForms.includes(entity.legalForm)) return false;
        if (applicabilityConfig.taxSystems?.length && !applicabilityConfig.taxSystems.includes(entity.taxSystem)) return false;

        return true;
    };

    return {
        id: dbRule.id,
        titleTemplate: dbRule.titleTemplate,
        taskType: dbRule.taskType as TaskType,
        periodicity: dbRule.periodicity,
        appliesTo,
        dateConfig: dbRule.dateConfig,
        dueDateRule: dbRule.dueDateRule,
        excludeMonths: dbRule.excludeMonths || undefined,
        ruleType: dbRule.source === 'system' ? 'system' : 'custom',
        category: dbRule.storageCategory as RuleCategory,
        shortTitle: dbRule.shortTitle,
        shortDescription: dbRule.shortDescription,
        description: dbRule.description || '',
        lawReference: dbRule.lawReference || undefined,
    };
};

/**
 * Получить все правила в формате TaskRule[] для генератора
 */
export const getRulesForGeneration = async (tenantId = TENANT_ID): Promise<TaskRule[]> => {
    const dbRules = await getAllRules(tenantId);
    return dbRules.filter(r => r.isActive).map(convertToTaskRule);
};

// ==========================================
// ХЕЛПЕРЫ ДЛЯ UI
// ==========================================

export const CATEGORIES: Record<string, { name: string; icon: string }> = {
    'налоговые': { name: 'Налоговые', icon: '📋' },
    'финансовые': { name: 'Финансовые', icon: '💰' },
    'организационные': { name: 'Организационные', icon: '🗂️' },
};

export const PERIODICITY_OPTIONS = [
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'biweekly', label: 'Раз в 2 недели' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'quarterly', label: 'Ежеквартально' },
    { value: 'yearly', label: 'Ежегодно' },
];

export const TASK_TYPE_OPTIONS = [
    { value: 'Уведомление', label: 'Уведомление' },
    { value: 'Уплата', label: 'Уплата' },
    { value: 'Отчет', label: 'Отчёт' },
    { value: 'Задача', label: 'Задача' },
];

export const DUE_DATE_RULE_OPTIONS = [
    { value: 'next_business_day', label: 'Перенос на след. рабочий день' },
    { value: 'previous_business_day', label: 'Перенос на пред. рабочий день' },
    { value: 'no_transfer', label: 'Без переноса' },
];
