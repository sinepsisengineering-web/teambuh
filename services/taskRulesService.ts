// services/taskRulesService.ts
// Сервис для работы со справочником правил задач (API клиент)

import { API_CONFIG } from '../config/api';

// ==========================================
// ТИПЫ
// ==========================================

export type RuleType = 'auto' | 'manual';
export type TaskType = 'Уведомление' | 'Уплата' | 'Отчет' | 'Задача';
export type Periodicity = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'once';
export type DueDateRule = 'next_business_day' | 'previous_business_day' | 'no_transfer';

export interface DateConfig {
    day: number;
    month?: number;
    monthOffset?: number;
    quarterMonthOffset?: number;
    specialRule?: string;
}

export interface TaskRule {
    id: string;
    code: string | null;

    // Название
    titleTemplate: string;
    shortTitle: string | null;

    // Тип
    ruleType: RuleType;
    taskType: TaskType;
    periodicity: Periodicity;

    // Описание
    description: string | null;
    lawReference: string | null;
    penaltyInfo: string | null;

    // Применимость
    legalForms: string[] | null;
    taxSystems: string[] | null;
    requiresEmployees: boolean;
    requiresNds: boolean;

    // Сроки
    dateConfig: DateConfig;
    dueDateRule: DueDateRule;
    excludeMonths: number[] | null;

    // Группировка
    groupName: string | null;
    sortOrder: number;

    // Метаданные
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
}

export type CreateTaskRule = Omit<TaskRule, 'createdAt' | 'updatedAt'>;

export interface TaskRulesStats {
    total: number;
    auto: number;
    manual: number;
    active: number;
}

// ==========================================
// API КЛИЕНТ
// ==========================================

const getBaseUrl = () => {
    return `${API_CONFIG.baseUrl}/api/${API_CONFIG.tenantId}/task-rules`;
};

// Получить все правила
export const getAllRules = async (): Promise<TaskRule[]> => {
    const response = await fetch(getBaseUrl());
    if (!response.ok) {
        throw new Error('Failed to fetch task rules');
    }
    return response.json();
};

// Получить автоматические правила (для генератора)
export const getAutoRules = async (): Promise<TaskRule[]> => {
    const response = await fetch(`${getBaseUrl()}?type=auto`);
    if (!response.ok) {
        throw new Error('Failed to fetch auto rules');
    }
    return response.json();
};

// Получить ручные шаблоны
export const getManualRules = async (): Promise<TaskRule[]> => {
    const response = await fetch(`${getBaseUrl()}?type=manual`);
    if (!response.ok) {
        throw new Error('Failed to fetch manual rules');
    }
    return response.json();
};

// Получить правила по группе
export const getRulesByGroup = async (groupName: string): Promise<TaskRule[]> => {
    const response = await fetch(`${getBaseUrl()}?group=${encodeURIComponent(groupName)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch rules by group');
    }
    return response.json();
};

// Получить правило по ID
export const getRuleById = async (ruleId: string): Promise<TaskRule | null> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`);
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error('Failed to fetch task rule');
    }
    return response.json();
};

// Получить статистику
export const getRulesStats = async (): Promise<TaskRulesStats> => {
    const response = await fetch(`${getBaseUrl()}/stats`);
    if (!response.ok) {
        throw new Error('Failed to fetch rules stats');
    }
    return response.json();
};

// Создать правило (супер-админ)
export const createRule = async (rule: CreateTaskRule): Promise<TaskRule> => {
    const response = await fetch(getBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
    });
    if (!response.ok) {
        throw new Error('Failed to create task rule');
    }
    return response.json();
};

// Массовое создание правил (миграция)
export const createManyRules = async (rules: CreateTaskRule[]): Promise<{ created: number }> => {
    const response = await fetch(`${getBaseUrl()}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
    });
    if (!response.ok) {
        throw new Error('Failed to bulk create task rules');
    }
    return response.json();
};

// Обновить правило (супер-админ)
export const updateRule = async (ruleId: string, updates: Partial<CreateTaskRule>): Promise<TaskRule> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!response.ok) {
        throw new Error('Failed to update task rule');
    }
    return response.json();
};

// Деактивировать правило
export const deactivateRule = async (ruleId: string): Promise<boolean> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}/deactivate`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error('Failed to deactivate task rule');
    }
    const result = await response.json();
    return result.success;
};

// Удалить правило (только ручные)
export const deleteRule = async (ruleId: string): Promise<boolean> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        throw new Error('Failed to delete task rule');
    }
    const result = await response.json();
    return result.success;
};

// ==========================================
// ХЕЛПЕРЫ
// ==========================================

// Группы правил для UI
export const RULE_GROUPS = {
    employee: { name: 'Сотрудники', icon: '👥' },
    usn: { name: 'УСН', icon: '📊' },
    nds: { name: 'НДС', icon: '💰' },
    ip: { name: 'ИП', icon: '👤' },
    custom: { name: 'Пользовательские', icon: '✏️' }
};

// Типы задач для UI
export const TASK_TYPES = {
    'Уведомление': { name: 'Уведомление', icon: '📝', color: 'text-blue-600' },
    'Уплата': { name: 'Уплата', icon: '💳', color: 'text-green-600' },
    'Отчет': { name: 'Отчет', icon: '📋', color: 'text-purple-600' },
    'Задача': { name: 'Задача', icon: '✅', color: 'text-slate-600' }
};

// Периодичность для UI
export const PERIODICITIES = {
    daily: { name: 'Ежедневно', short: 'Ежедн.' },
    weekly: { name: 'Еженедельно', short: 'Еженед.' },
    biweekly: { name: 'Раз в 2 недели', short: '2 нед.' },
    monthly: { name: 'Ежемесячно', short: 'Ежемес.' },
    quarterly: { name: 'Ежеквартально', short: 'Ежекв.' },
    yearly: { name: 'Ежегодно', short: 'Ежегод.' },
    once: { name: 'Однократно', short: 'Разово' }
};

// Правила переноса сроков для UI
export const DUE_DATE_RULES = {
    next_business_day: { name: 'На следующий рабочий день', short: 'Вперёд' },
    previous_business_day: { name: 'На предыдущий рабочий день', short: 'Назад' },
    no_transfer: { name: 'Без переноса', short: 'Без' }
};
