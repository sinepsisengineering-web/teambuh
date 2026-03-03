// components/RulesView.tsx
// Справочник правил — новый дизайн с папками и модалкой

import React, { useState, useMemo, useEffect } from 'react';
import { TaskRule, TaskType, RuleCategory, RuleType, RepeatFrequency, TaskDueDateRule } from '../types';
import {
    syncRulesOnLogin,
    DbRule,
    CustomRule,
    CreateCustomRule,
    deleteRule as deleteRuleFromApi,
    createRule,
    updateRule,
    getAllRules as getAllCustomRules,
    PERIODICITY_OPTIONS
} from '../services/rulesService';
import { RuleCreateModal } from './RuleCreateModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { archiveItem } from '../services/storageService';
// Импорт справочника типов
import {
    LEGAL_FORMS, TAX_SYSTEMS,
    getLegalFormLabel as getDictLegalFormLabel,
    getTaxSystemLabel as getDictTaxSystemLabel,
    LegalFormId, TaxSystemId,
    LEGAL_FORM_OPTIONS, TAX_SYSTEM_OPTIONS,
    normalizeLegalForm, normalizeTaxSystem,
} from '../constants/dictionaries';

// ============================================
// ТИПЫ
// ============================================

interface RulesViewProps {
    isSuperAdmin?: boolean;
    isAdmin?: boolean;
}

// Категории-папки
type FolderCategory = 'system-tax' | 'custom-finance' | 'custom-org' | 'templates';

interface FolderConfig {
    id: FolderCategory;
    label: string;
    icon: string;
    ruleType: RuleType;
    category?: RuleCategory;
}

const FOLDERS: FolderConfig[] = [
    { id: 'system-tax', label: 'Общие налоговые', icon: '📊', ruleType: 'system', category: 'налоговые' },
    { id: 'custom-finance', label: 'Внутренние финансовые', icon: '💰', ruleType: 'custom', category: 'финансовые' },
    { id: 'custom-org', label: 'Внутренние организационные', icon: '📋', ruleType: 'custom', category: 'организационные' },
    { id: 'templates', label: 'Шаблоны', icon: '⭐', ruleType: 'custom', category: 'шаблоны' },
];

// Объединённое правило для отображения
interface DisplayRule {
    id: string;
    titleTemplate: string;
    shortTitle: string;
    shortDescription: string;  // Новое поле для короткого описания
    ruleType: RuleType;
    category: RuleCategory;
    description: string;
    lawReference?: string;
    taskType: TaskType;
    periodicity: RepeatFrequency;
    dueDateRule: TaskDueDateRule;
    dateConfig: any;
    isCustom: boolean;
    // Условия применимости (для отображения в модалке)
    applicability?: {
        legalForms?: string[];
        taxSystems?: string[];
        requiresEmployees?: boolean;
        requiresNds?: boolean;
        profitAdvancePeriodicity?: 'monthly' | 'quarterly' | null;
    };
    originalRule: TaskRule | CustomRule;
}

// ============================================
// УТИЛИТЫ
// ============================================

// Очистка шаблонных переменных — убираем только плейсхолдеры, оставляем текст с датами
const cleanTemplateText = (text: string): string => {
    return text
        // Убираем только плейсхолдеры {xxx}, оставляя остальной текст
        .replace(/\s*\{monthNameGenitive\}/g, '')
        .replace(/\s*\{monthName\}/g, '')
        .replace(/\s*\{lastDayOfMonth\}/g, 'последнее число')
        .replace(/\s*\{year\}/g, '')
        .replace(/\s*\{quarter\}/g, '')
        .replace(/\{[^}]+\}/g, '')
        // Убираем лишние пробелы и скобки
        .replace(/\(\s*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Извлечение условий применимости из функции appliesTo
const extractApplicabilityFromTaskRule = (rule: TaskRule): DisplayRule['applicability'] => {
    const fnStr = rule.appliesTo.toString();
    const result: DisplayRule['applicability'] = {};

    // Анализируем исходный код функции
    if (fnStr.includes('hasEmployees')) {
        result.requiresEmployees = true;
    }
    if (fnStr.includes('isNdsPayer')) {
        result.requiresNds = true;
    }
    if (fnStr.includes('legalForm')) {
        if (fnStr.includes("'ООО'") || fnStr.includes('LegalForm.OOO')) {
            result.legalForms = result.legalForms || [];
            result.legalForms.push('ООО');
        }
        if (fnStr.includes("'ИП'") || fnStr.includes('LegalForm.IP')) {
            result.legalForms = result.legalForms || [];
            result.legalForms.push('ИП');
        }
        if (fnStr.includes("'АО'") || fnStr.includes('LegalForm.AO')) {
            result.legalForms = result.legalForms || [];
            result.legalForms.push('АО');
        }
    }
    if (fnStr.includes('taxSystem')) {
        if (fnStr.includes('OSNO')) {
            result.taxSystems = result.taxSystems || [];
            result.taxSystems.push('ОСНО');
        }
        if (fnStr.includes('USN')) {
            result.taxSystems = result.taxSystems || [];
            result.taxSystems.push('УСН');
        }
    }

    return Object.keys(result).length > 0 ? result : undefined;
};

const getPeriodicityLabel = (periodicity: RepeatFrequency): string => {
    const option = PERIODICITY_OPTIONS.find(o => o.value === periodicity);
    return option?.label || periodicity;
};

const getTaskTypeLabel = (taskType: TaskType): string => {
    if (typeof taskType === 'string') return taskType;
    return String(taskType);
};

const getDueDateLabel = (rule: TaskDueDateRule | string): string => {
    // Обрабатываем как enum значения, так и строковые
    const ruleStr = String(rule);
    switch (ruleStr) {
        case TaskDueDateRule.NextBusinessDay:
        case 'next_business_day':
            return 'перенос на след. раб. день';
        case TaskDueDateRule.PreviousBusinessDay:
        case 'previous_business_day':
            return 'перенос на пред. раб. день';
        case TaskDueDateRule.NoTransfer:
        case 'no_transfer':
            return 'без переноса';
        default:
            return ruleStr;
    }
};

const getDateLabel = (dateConfig: any): string => {
    if (!dateConfig) return '—';

    // Если это строка-шаблон, заменяем плейсхолдеры
    if (typeof dateConfig === 'string') {
        return dateConfig
            .replace('{lastDayOfMonth}', 'последний день')
            .replace('{monthNameGenitive}', 'месяца')
            .replace(/[{}]/g, '');
    }

    const parts: string[] = [];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    if (dateConfig.day) parts.push(`${dateConfig.day} число`);

    if (dateConfig.month !== undefined) {
        parts.push(months[dateConfig.month]);
    }

    // Квартальный offset — показываем "N-й мес. квартала после отчетного"
    if (dateConfig.quarterMonthOffset !== undefined) {
        parts.push(`${dateConfig.quarterMonthOffset + 1}-го мес. квартала после отчетного`);
    }
    // Месячный offset — показываем "следующего месяца за отчетным"
    else if (dateConfig.monthOffset) {
        parts.push('следующего месяца за отчетным');
    }

    if (dateConfig.specialRule === 'LAST_WORKING_DAY_OF_YEAR') {
        parts.push('посл. раб. день года');
    }

    return parts.join(' ') || '—';
};

// Используем справочник для отображения label (с нормализацией старых форматов)
const getLegalFormLabel = (form: string): string => {
    const normalizedId = normalizeLegalForm(form);
    return getDictLegalFormLabel(normalizedId);
};

const getTaxSystemLabel = (system: string): string => {
    const normalizedId = normalizeTaxSystem(system);
    return getDictTaxSystemLabel(normalizedId);
};

// ============================================
// КОМПОНЕНТ МОДАЛКИ
// ============================================

interface RuleDetailModalProps {
    rule: DisplayRule | null;
    onClose: () => void;
    canEdit: boolean;
    canDelete?: boolean;  // true для супер-админа (может удалять все) или для кастомных правил
    onEdit?: () => void;
    onDelete?: () => void;
}

// Определяем условия применимости для системных правил на основе ID
const getSystemRuleApplicability = (ruleId: string): {
    requiresEmployees?: boolean;
    requiresNds?: boolean;
    legalForms?: string[];
    taxSystems?: string[];
} => {
    // Правила для сотрудников
    if (ruleId.startsWith('EMPLOYEE_')) {
        return { requiresEmployees: true };
    }
    // Правила НДС
    if (ruleId.startsWith('NDS_')) {
        return { requiresNds: true };
    }
    // Правила УСН
    if (ruleId.startsWith('USN_')) {
        const systems = ['УСН Доходы', 'УСН Доходы-Расходы'];
        if (ruleId.includes('_OOO')) {
            return { taxSystems: systems, legalForms: ['ООО', 'АО'] };
        }
        if (ruleId.includes('_IP')) {
            return { taxSystems: systems, legalForms: ['ИП'] };
        }
        return { taxSystems: systems };
    }
    // Правила только для ИП
    if (ruleId.startsWith('IP_')) {
        return { legalForms: ['ИП'] };
    }
    return {};
};

const RuleDetailModal: React.FC<RuleDetailModalProps> = ({
    rule,
    onClose,
    canEdit,
    canDelete = false,
    onEdit,
    onDelete
}) => {
    if (!rule) return null;

    // ВСЕГДА берём applicability из БД (не генерируем автоматически)
    const applicability = rule.applicability;

    const hasApplicability = applicability && (
        applicability.requiresEmployees ||
        applicability.requiresNds ||
        (applicability.legalForms && applicability.legalForms.length > 0) ||
        (applicability.taxSystems && applicability.taxSystems.length > 0)
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Шапка с кнопкой закрытия и меткой типа правила */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                        {rule.ruleType === 'system' ? 'Системное правило' : 'Пользовательское правило'}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Контент */}
                <div className="px-6 py-5 space-y-4">
                    {/* Тип задачи (серым, меньше) */}
                    <div className="text-sm text-slate-500">{getTaskTypeLabel(rule.taskType)}</div>

                    {/* Название (крупно) */}
                    <h2 className="text-xl font-bold text-slate-900 -mt-2">{rule.shortTitle}</h2>

                    {/* Уточнение (меньше, серым) */}
                    <p className="text-base text-slate-600">{rule.shortDescription}</p>

                    {/* Разделитель */}
                    <hr className="border-slate-200" />

                    {/* Описание */}
                    <p className="text-sm text-slate-600 leading-relaxed">{rule.description}</p>

                    {/* Применимость (если есть) */}
                    {hasApplicability && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                            <div className="text-xs font-semibold text-amber-700 uppercase">Применяется</div>

                            {applicability?.legalForms && applicability.legalForms.length > 0 && (
                                <p className="text-sm text-amber-800">
                                    Для: {applicability.legalForms.map(f => getLegalFormLabel(f)).join(', ')}
                                </p>
                            )}

                            {applicability?.taxSystems && applicability.taxSystems.length > 0 && (
                                <p className="text-sm text-amber-800">
                                    СНО: {applicability.taxSystems.map(s => getTaxSystemLabel(s)).join(', ')}
                                </p>
                            )}

                            {applicability?.requiresEmployees && (
                                <p className="text-sm text-amber-800">
                                    Только для организаций с сотрудниками
                                </p>
                            )}

                            {applicability?.requiresNds && (
                                <p className="text-sm text-amber-800">
                                    Только для плательщиков НДС
                                </p>
                            )}

                            {applicability?.profitAdvancePeriodicity && (
                                <p className="text-sm text-amber-800">
                                    Авансы по прибыли: {applicability.profitAdvancePeriodicity === 'monthly' ? 'ежемесячные' : 'ежеквартальные'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Основание (только для системных) */}
                    {rule.lawReference && (
                        <div className="text-sm">
                            <span className="text-slate-500">Основание: </span>
                            <span className="font-medium text-slate-700">{rule.lawReference}</span>
                        </div>
                    )}

                    {/* Расписание */}
                    <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex flex-wrap gap-6">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Периодичность</div>
                                <div className="text-sm font-medium text-slate-700">{getPeriodicityLabel(rule.periodicity)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Срок</div>
                                <div className="text-sm text-slate-700">{getDateLabel(rule.dateConfig)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Перенос</div>
                                <div className="text-sm text-slate-700">{getDueDateLabel(rule.dueDateRule)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Действия */}
                {canEdit && (
                    <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                        {canDelete && (
                            <button
                                onClick={onDelete}
                                className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                                🗑️ Удалить
                            </button>
                        )}
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            ✏️ Редактировать
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// КОМПОНЕНТ ЭЛЕМЕНТА СПИСКА
// ============================================

interface RuleListItemProps {
    rule: DisplayRule;
    onClick: () => void;
}

const RuleListItem: React.FC<RuleListItemProps> = ({ rule, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
    >
        <div className="font-medium text-slate-900">{rule.shortTitle}</div>
        <div className="text-sm text-slate-500 mt-1 line-clamp-1">{rule.shortDescription}</div>
    </button>
);

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

export const RulesView: React.FC<RulesViewProps> = ({
    isSuperAdmin = false,
    isAdmin = false
}) => {
    // Состояние
    const [dbRules, setDbRules] = useState<DbRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFolder, setActiveFolder] = useState<FolderCategory>('system-tax');
    const [selectedRule, setSelectedRule] = useState<DisplayRule | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingRule, setEditingRule] = useState<CustomRule | null>(null);

    // Загрузка правил из БД через API
    const loadRules = async () => {
        try {
            setLoading(true);
            const response = await syncRulesOnLogin();
            setDbRules(response.rules);
            console.log(`[RulesView] Loaded ${response.total} rules (synced: ${response.synced})`);
        } catch (e) {
            console.error('Failed to load rules from DB:', e);
            // Fallback на старый метод если БД недоступна
            try {
                const customRules = await getAllCustomRules();
                const fallbackRules: DbRule[] = TASK_RULES.map(rule => ({
                    id: rule.id,
                    source: 'system' as const,
                    storageCategory: rule.category,
                    isActive: true,
                    version: 1,
                    taskType: rule.taskType as string,
                    shortTitle: rule.shortTitle,
                    shortDescription: rule.shortDescription,
                    description: rule.description,
                    titleTemplate: rule.titleTemplate,
                    lawReference: rule.lawReference || null,
                    periodicity: rule.periodicity,
                    periodType: 'past' as const,
                    dateConfig: rule.dateConfig,
                    dueDateRule: rule.dueDateRule,
                    applicabilityConfig: {
                        allClients: false,
                        legalForms: null,
                        taxSystems: null,
                        requiresEmployees: rule.appliesTo.toString().includes('hasEmployees'),
                        requiresNds: rule.appliesTo.toString().includes('isNdsPayer'),
                        clientIds: null,
                    },
                    excludeMonths: rule.excludeMonths || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: null,
                }));
                setDbRules([...fallbackRules, ...customRules.map(r => ({
                    ...r,
                    source: 'custom' as const,
                    storageCategory: r.category,
                } as unknown as DbRule))]);
            } catch (e2) {
                console.error('Fallback also failed:', e2);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    // Преобразование DbRule в DisplayRule
    const allRules = useMemo((): DisplayRule[] => {
        return dbRules.map(rule => ({
            id: rule.id,
            titleTemplate: rule.titleTemplate,
            shortTitle: rule.shortTitle,
            shortDescription: rule.shortDescription,
            ruleType: rule.source as RuleType,
            category: rule.storageCategory as RuleCategory,
            description: rule.description || '',
            lawReference: rule.lawReference || undefined,
            taskType: rule.taskType as TaskType,
            periodicity: rule.periodicity,
            dueDateRule: rule.dueDateRule,
            dateConfig: rule.dateConfig,
            isCustom: rule.source === 'custom',
            // Сохраняем оригинальные значения из БД без конвертации
            // null означает "для всех", [] означает "ничего не выбрано"
            applicability: {
                requiresEmployees: rule.applicabilityConfig.requiresEmployees,
                requiresNds: rule.applicabilityConfig.requiresNds,
                legalForms: rule.applicabilityConfig.legalForms,
                taxSystems: rule.applicabilityConfig.taxSystems,
                profitAdvancePeriodicity: rule.applicabilityConfig.profitAdvancePeriodicity || (rule as any).profitAdvancePeriodicity,
            },
            originalRule: rule as any,
        }));
    }, [dbRules]);

    // Фильтрация по папке
    const filteredRules = useMemo(() => {
        const folder = FOLDERS.find(f => f.id === activeFolder);
        if (!folder) return [];

        let rules = allRules.filter(rule => {
            // Папка "Общие налоговые" показывает системные + кастомные с категорией "налоговые"
            if (folder.id === 'system-tax') {
                return rule.ruleType === 'system' ||
                    (rule.ruleType === 'custom' && rule.category === 'налоговые');
            }
            // Остальные папки — только кастомные с соответствующей категорией
            return rule.ruleType === 'custom' && rule.category === folder.category;
        });

        // Поиск
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            rules = rules.filter(r =>
                r.shortTitle.toLowerCase().includes(query) ||
                r.titleTemplate.toLowerCase().includes(query)
            );
        }

        return rules;
    }, [allRules, activeFolder, searchQuery]);

    // Обработчики
    const handleDeleteClick = () => {
        // Супер-админ может удалять любые правила.
        // Директор — только кастомные НЕналоговые.
        if (!selectedRule) return;
        if (!isSuperAdmin) {
            if (!selectedRule.isCustom) return;
            if (selectedRule.category === 'налоговые') return;
        }
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedRule) return;
        // Супер-админ может удалять любые правила.
        // Директор — только кастомные НЕналоговые.
        if (!isSuperAdmin) {
            if (!selectedRule.isCustom) return;
            if (selectedRule.category === 'налоговые') return;
        }
        try {
            // Сначала удаляем из БД (soft delete — is_active = 0)
            await deleteRuleFromApi(selectedRule.id);
            // Затем добавляем в архив для истории
            await archiveItem('rules', selectedRule);
            // Перезагружаем список
            await loadRules();
            setSelectedRule(null);
        } catch (e) {
            console.error('Failed to delete rule:', e);
        }
        setShowDeleteConfirm(false);
    };

    const canEditRule = (rule: DisplayRule): boolean => {
        if (rule.isCustom) {
            if (isSuperAdmin) return true;
            if (isAdmin && rule.category !== 'налоговые') return true;
            return false;
        }
        return isSuperAdmin;
    };

    // Рендер
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">Загрузка справочника...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex gap-6">
            {/* Левая панель — список (70%) */}
            <div className="w-[70%] flex flex-col min-w-0 bg-white rounded-xl shadow-sm p-6">
                {/* Шапка с поиском */}
                <div className="flex items-center gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Поиск правил..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Список правил */}
                <div className="flex-1 overflow-auto space-y-2">
                    {filteredRules.length === 0 ? (
                        <div className="text-center text-slate-400 py-12">
                            {searchQuery ? 'Ничего не найдено' : 'Нет правил в этой категории'}
                        </div>
                    ) : (
                        filteredRules.map(rule => (
                            <RuleListItem
                                key={rule.id}
                                rule={rule}
                                onClick={() => setSelectedRule(rule)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Правая панель — категории (30%) */}
            <div className="w-[30%] flex-shrink-0 flex flex-col gap-4">
                {/* Кнопка добавления */}
                {(isAdmin || isSuperAdmin) && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        + Добавить правило
                    </button>
                )}

                {/* Карточка категорий */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Категории
                    </h3>
                    <div className="space-y-1">
                        {FOLDERS.map(folder => (
                            <button
                                key={folder.id}
                                onClick={() => setActiveFolder(folder.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${activeFolder === folder.id
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <span>{folder.icon}</span>
                                <span>{folder.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Счётчик */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                            Правил: <span className="font-medium text-slate-700">{filteredRules.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модалка деталей */}
            {selectedRule && (
                <RuleDetailModal
                    rule={selectedRule}
                    onClose={() => setSelectedRule(null)}
                    canEdit={canEditRule(selectedRule)}
                    canDelete={isSuperAdmin || selectedRule.isCustom}
                    onEdit={() => {
                        // Используем данные напрямую из DbRule, не из промежуточного applicability
                        const dbRule = selectedRule.originalRule as DbRule;

                        if (!dbRule) {
                            console.error('[RulesView] No originalRule found for editing');
                            return;
                        }

                        const ruleToEdit: CustomRule = {
                            id: selectedRule.id,
                            titleTemplate: selectedRule.titleTemplate,
                            shortTitle: selectedRule.shortTitle,
                            shortDescription: selectedRule.shortDescription,
                            ruleType: selectedRule.isCustom ? 'custom' : 'system',
                            category: selectedRule.category,
                            description: selectedRule.description,
                            lawReference: selectedRule.lawReference,
                            taskType: selectedRule.taskType,
                            periodicity: selectedRule.periodicity,
                            dateConfig: selectedRule.dateConfig,
                            dueDateRule: selectedRule.dueDateRule,
                            // Берём applicabilityConfig НАПРЯМУЮ из DbRule без конвертаций
                            applicabilityConfig: {
                                allClients: dbRule.applicabilityConfig.allClients,
                                requiresEmployees: dbRule.applicabilityConfig.requiresEmployees,
                                requiresNds: dbRule.applicabilityConfig.requiresNds,
                                legalForms: dbRule.applicabilityConfig.legalForms,
                                taxSystems: dbRule.applicabilityConfig.taxSystems,
                            },
                            createdAt: dbRule.createdAt || new Date().toISOString(),
                            updatedAt: dbRule.updatedAt || new Date().toISOString(),
                            createdBy: dbRule.createdBy || 'admin',
                            isActive: dbRule.isActive ?? true,
                        };

                        console.log('[RulesView] Editing rule:', ruleToEdit);
                        console.log('[RulesView] applicabilityConfig:', ruleToEdit.applicabilityConfig);

                        // Все изменения синхронно — React батчит их в один рендер
                        setEditingRule(ruleToEdit);
                        setShowCreateModal(true);
                        setSelectedRule(null);
                    }}
                    onDelete={handleDeleteClick}
                />
            )}

            {/* Модалка подтверждения архивации */}
            <ArchiveConfirmModal
                isOpen={showDeleteConfirm && !!selectedRule}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteConfirm}
                entityType="Правило"
                entityName={selectedRule?.shortTitle || ''}
            />

            {/* Модалка создания/редактирования */}
            <RuleCreateModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingRule(null);
                }}
                onSave={async (ruleData, isEdit, ruleId) => {
                    if (isEdit && ruleId) {
                        await updateRule(ruleId, ruleData);
                    } else {
                        await createRule(ruleData);
                    }
                    // Перезагружаем список из БД
                    await loadRules();
                    setShowCreateModal(false);
                    setEditingRule(null);
                }}
                isSuperAdmin={isSuperAdmin}
                editingRule={editingRule}
                defaultCategory={
                    (() => {
                        const folderCategory = FOLDERS.find(f => f.id === activeFolder)?.category;
                        if (folderCategory === 'налоговые' && !isSuperAdmin) return 'финансовые';
                        return folderCategory || (isSuperAdmin ? 'налоговые' : 'финансовые');
                    })()
                }
            />
        </div>
    );
};

export default RulesView;
