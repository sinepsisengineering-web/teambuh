// services/customRulesService.ts
// Сервис для работы с пользовательскими правилами (цикличные шаблоны)
// Хранение: data/tenants/{tenantId}/customRules.json

import { TaskRule, RuleCategory, TaskType, DateCalculationConfig } from './taskRules';
import { RepeatFrequency, TaskDueDateRule, LegalEntity } from '../types';

// API конфигурация (как в других сервисах)
const SERVER_URL = 'http://localhost:3001';
const TENANT_ID = 'org_default';

// ==========================================
// ТИПЫ
// ==========================================

/**
 * Пользовательское правило — та же структура что и системное,
 * но без функции appliesTo (вместо этого declarative поля)
 */
export interface CustomRule {
    id: string;
    titleTemplate: string;
    shortTitle: string;
    shortDescription: string;  // Короткое описание для справочника

    ruleType: 'custom';                                    // Всегда 'custom'
    category: 'финансовые' | 'организационные' | 'налоговые';  // Налоговые только для SuperAdmin
    description: string;
    lawReference?: string;                                  // Ссылка на закон (НК РФ и т.д.)

    taskType: TaskType;
    periodicity: RepeatFrequency;

    // Декларативные условия применимости (вместо функции appliesTo)
    applicabilityConfig: {
        allClients?: boolean;                                // Для всех клиентов
        clientIds?: string[];                                // Или для конкретных клиентов
        legalForms?: string[];                               // Для определенных ОПФ
        taxSystems?: string[];                               // Для определенных СНО
        requiresEmployees?: boolean;                         // Только с сотрудниками
        requiresNds?: boolean;                               // Только плательщики НДС
    };

    // Сроки
    dateConfig: DateCalculationConfig;
    dueDateRule: TaskDueDateRule;
    excludeMonths?: number[];

    // Метаданные
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isActive: boolean;
}

export type CreateCustomRule = Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt' | 'ruleType'>;

// ==========================================
// API КЛИЕНТ
// ==========================================

const getBaseUrl = () => {
    return `${SERVER_URL}/api/${TENANT_ID}/custom-rules`;
};

/**
 * Получить все пользовательские правила
 */
export const getAllCustomRules = async (): Promise<CustomRule[]> => {
    const response = await fetch(getBaseUrl());
    if (!response.ok) {
        if (response.status === 404) return []; // Нет правил
        throw new Error('Failed to fetch custom rules');
    }
    return response.json();
};

/**
 * Получить правило по ID
 */
export const getCustomRuleById = async (ruleId: string): Promise<CustomRule | null> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch custom rule');
    return response.json();
};

/**
 * Создать новое пользовательское правило
 */
export const createCustomRule = async (rule: CreateCustomRule): Promise<CustomRule> => {
    const response = await fetch(getBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
    });
    if (!response.ok) throw new Error('Failed to create custom rule');
    return response.json();
};

/**
 * Обновить пользовательское правило
 */
export const updateCustomRule = async (ruleId: string, updates: Partial<CreateCustomRule>): Promise<CustomRule> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update custom rule');
    return response.json();
};

/**
 * Удалить пользовательское правило
 */
export const deleteCustomRule = async (ruleId: string): Promise<boolean> => {
    const response = await fetch(`${getBaseUrl()}/${ruleId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete custom rule');
    const result = await response.json();
    return result.success;
};

// ==========================================
// КОНВЕРТАЦИЯ В TaskRule
// ==========================================

/**
 * Конвертирует CustomRule в TaskRule для использования в генераторе
 */
export const convertToTaskRule = (customRule: CustomRule): TaskRule => {
    const { applicabilityConfig } = customRule;

    // Создаём функцию appliesTo на основе декларативных полей
    const appliesTo = (entity: LegalEntity): boolean => {
        // Если для всех клиентов
        if (applicabilityConfig.allClients) {
            // Но проверяем дополнительные условия
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

        return false;
    };

    return {
        id: customRule.id,
        titleTemplate: customRule.titleTemplate,
        taskType: customRule.taskType,
        periodicity: customRule.periodicity,
        appliesTo,
        dateConfig: customRule.dateConfig,
        dueDateRule: customRule.dueDateRule,
        excludeMonths: customRule.excludeMonths,
        ruleType: 'custom',
        category: customRule.category,
        shortTitle: customRule.shortTitle,
        shortDescription: customRule.shortDescription,
        description: customRule.description,
    };
};

/**
 * Получить все кастомные правила в формате TaskRule[]
 */
export const getCustomRulesAsTaskRules = async (): Promise<TaskRule[]> => {
    const customRules = await getAllCustomRules();
    return customRules.filter(r => r.isActive).map(convertToTaskRule);
};

// ==========================================
// ХЕЛПЕРЫ ДЛЯ UI
// ==========================================

export const CUSTOM_CATEGORIES: Record<string, { name: string; icon: string }> = {
    'финансовые': { name: 'Финансовые', icon: '💰' },
    'организационные': { name: 'Организационные', icon: '📋' },
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
