// components/RuleCreateModal.tsx
// Модальное окно создания/редактирования правила

import React, { useState, useMemo, useEffect } from 'react';
import { TaskType, RuleCategory, DateCalculationConfig } from '../services/taskRules';
import { CreateCustomRule, CustomRule, PERIODICITY_OPTIONS, DUE_DATE_RULE_OPTIONS } from '../services/customRulesService';
import { RepeatFrequency, TaskDueDateRule } from '../types';

// ============================================
// ТИПЫ
// ============================================

interface RuleCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: CreateCustomRule, isEdit: boolean, ruleId?: string) => Promise<void>;
    isSuperAdmin?: boolean;
    editingRule?: CustomRule | null;  // Если передано — режим редактирования
    defaultCategory?: RuleCategory;   // Категория из активной папки
}

// Конфигурация для UI формы
interface DateFormConfig {
    periodicity: RepeatFrequency;
    periodType: 'current' | 'past';  // За текущий / За прошедший период
    day: number;
    month?: number;                   // Только для ежегодно
    quarterMonth?: 1 | 2 | 3;         // Только для ежеквартально + за прошедший
}

// ============================================
// КОНСТАНТЫ
// ============================================

const TASK_TYPES: { value: TaskType; label: string }[] = [
    { value: 'Уведомление' as TaskType, label: 'Уведомление' },
    { value: 'Отчет' as TaskType, label: 'Отчёт' },
    { value: 'Уплата' as TaskType, label: 'Оплата' },
    { value: 'прочее' as TaskType, label: 'Прочее' },
];

const CATEGORIES_ADMIN: { value: RuleCategory; label: string }[] = [
    { value: 'финансовые', label: '💰 Внутренние финансовые' },
    { value: 'организационные', label: '📋 Внутренние организационные' },
];

const CATEGORIES_SUPERADMIN: { value: RuleCategory; label: string }[] = [
    { value: 'налоговые', label: '📊 Общие налоговые' },
    ...CATEGORIES_ADMIN,
];

const MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const QUARTER_MONTHS = [
    { value: 1, label: '1-й месяц квартала после отчетного' },
    { value: 2, label: '2-й месяц квартала после отчетного' },
    { value: 3, label: '3-й месяц квартала после отчетного' },
];

// ============================================
// ФУНКЦИИ ФОРМИРОВАНИЯ ТЕКСТА
// ============================================

/**
 * Формирует текст даты из выбранных параметров меню
 */
function buildDateText(config: DateFormConfig): string {
    const { periodicity, periodType, day, month, quarterMonth } = config;

    // Ежемесячно
    if (periodicity === 'monthly') {
        if (periodType === 'current') {
            return `до ${day} числа текущего месяца`;
        }
        return `до ${day} числа следующего месяца за отчетным`;
    }

    // Ежеквартально
    if (periodicity === 'quarterly') {
        if (periodType === 'current') {
            return `до ${day} числа текущего квартала`;
        }
        return `до ${day} числа ${quarterMonth}-го месяца квартала после отчетного`;
    }

    // Ежегодно
    if (periodicity === 'yearly') {
        const monthName = MONTHS[month ?? 0];
        if (periodType === 'current') {
            return `до ${day} ${monthName} текущего года`;
        }
        return `до ${day} ${monthName} следующего года за отчетным`;
    }

    return '';
}

/**
 * Конвертирует UI конфиг в DateCalculationConfig для сохранения
 */
function toDateCalculationConfig(config: DateFormConfig): DateCalculationConfig {
    const { periodicity, periodType, day, month, quarterMonth } = config;

    const result: DateCalculationConfig = { day };

    // Ежегодно — добавляем месяц
    if (periodicity === 'yearly' && month !== undefined) {
        result.month = month;
    }

    // За прошедший период — добавляем offset
    if (periodType === 'past') {
        if (periodicity === 'monthly') {
            result.monthOffset = 1;
        } else if (periodicity === 'quarterly') {
            // quarterMonth: 1 = +0, 2 = +1, 3 = +2 от начала следующего квартала
            result.quarterMonthOffset = (quarterMonth ?? 1) - 1;
        }
        // Для yearly offset не нужен — year автоматически следующий
    }

    return result;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export const RuleCreateModal: React.FC<RuleCreateModalProps> = ({
    isOpen,
    onClose,
    onSave,
    isSuperAdmin = false,
    editingRule = null,
    defaultCategory = 'налоговые'
}) => {
    const isEditMode = !!editingRule;

    // Форма — category берётся из активной папки (defaultCategory)
    const [taskType, setTaskType] = useState<TaskType>('прочее');
    const [category, setCategory] = useState<RuleCategory>(defaultCategory);
    const [shortTitle, setShortTitle] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [description, setDescription] = useState('');
    const [lawReference, setLawReference] = useState('');

    // Применимость
    const [requiresNds, setRequiresNds] = useState(false);
    const [requiresEmployees, setRequiresEmployees] = useState(false);
    const [selectedLegalForms, setSelectedLegalForms] = useState<string[]>([]);
    const [selectedTaxSystems, setSelectedTaxSystems] = useState<string[]>([]);

    // Конфигурация даты
    const [dateConfig, setDateConfig] = useState<DateFormConfig>({
        periodicity: 'monthly',
        periodType: 'past',
        day: 25,
        month: 2,      // Март
        quarterMonth: 1
    });

    const [dueDateRule, setDueDateRule] = useState<TaskDueDateRule>('next_business_day');
    const [isSaving, setIsSaving] = useState(false);

    // Категории в зависимости от роли
    const categories = isSuperAdmin ? CATEGORIES_SUPERADMIN : CATEGORIES_ADMIN;

    // Ref для отслеживания какое правило уже инициализировано
    // (нужно для React.StrictMode который вызывает useEffect дважды)
    const initializedRuleIdRef = React.useRef<string | null>(null);

    // Предзаполнение формы при редактировании
    useEffect(() => {
        console.log('[RuleCreateModal useEffect] isOpen:', isOpen, 'editingRule:', editingRule?.id, 'initialized:', initializedRuleIdRef.current);

        if (!isOpen) {
            // Сброс ref когда модалка закрыта
            initializedRuleIdRef.current = null;
            return;
        }

        const targetRuleId = editingRule?.id || 'create-mode';

        // Если уже инициализировали это правило — пропускаем (защита от StrictMode)
        if (initializedRuleIdRef.current === targetRuleId) {
            console.log('[RuleCreateModal useEffect] Already initialized for:', targetRuleId);
            return;
        }

        // Запоминаем что инициализировали
        initializedRuleIdRef.current = targetRuleId;

        if (editingRule) {
            // Режим редактирования — заполняем форму
            console.log('[RuleCreateModal] Prefilling form with:', editingRule);
            console.log('[RuleCreateModal] applicabilityConfig:', editingRule.applicabilityConfig);

            setTaskType(editingRule.taskType);
            setCategory(editingRule.category as RuleCategory);
            setShortTitle(editingRule.shortTitle);
            setShortDescription(editingRule.shortDescription);
            setDescription(editingRule.description);
            setLawReference(editingRule.lawReference || '');

            // Применимость
            const appConfig = editingRule.applicabilityConfig || {};
            console.log('[RuleCreateModal] appConfig:', appConfig);
            console.log('[RuleCreateModal] legalForms from config:', appConfig.legalForms);
            console.log('[RuleCreateModal] taxSystems from config:', appConfig.taxSystems);

            setRequiresNds(!!appConfig.requiresNds);
            setRequiresEmployees(!!appConfig.requiresEmployees);

            // Интерпретация значений:
            // - null = для всех (allClients=true) → выбираем все варианты
            // - массив = конкретные значения
            // - пустой массив = ничего не выбрано
            const ALL_LEGAL_FORMS = ['ООО', 'ИП', 'АО'];
            const ALL_TAX_SYSTEMS = ['ОСНО', 'УСН', 'Патент'];

            const legalForms = appConfig.legalForms === null
                ? ALL_LEGAL_FORMS  // null = для всех
                : (Array.isArray(appConfig.legalForms) ? appConfig.legalForms : []);

            const taxSystems = appConfig.taxSystems === null
                ? ALL_TAX_SYSTEMS  // null = для всех
                : (Array.isArray(appConfig.taxSystems) ? appConfig.taxSystems : []);

            console.log('[RuleCreateModal] Setting legalForms:', legalForms);
            console.log('[RuleCreateModal] Setting taxSystems:', taxSystems);

            setSelectedLegalForms(legalForms);
            setSelectedTaxSystems(taxSystems);

            // Дата
            const dc = editingRule.dateConfig;
            setDateConfig({
                periodicity: editingRule.periodicity,
                periodType: (dc.monthOffset || dc.quarterMonthOffset !== undefined) ? 'past' : 'current',
                day: dc.day,
                month: dc.month,
                quarterMonth: dc.quarterMonthOffset !== undefined ? (dc.quarterMonthOffset + 1) as 1 | 2 | 3 : 1
            });

            setDueDateRule(editingRule.dueDateRule as any);
        } else {
            // Режим создания — сброс формы
            console.log('[RuleCreateModal] Resetting form for create mode');
            setTaskType('прочее');
            setCategory(defaultCategory);
            setShortTitle('');
            setShortDescription('');
            setDescription('');
            setLawReference('');
            setRequiresNds(false);
            setRequiresEmployees(false);
            setSelectedLegalForms([]);
            setSelectedTaxSystems([]);
            setDateConfig({
                periodicity: 'monthly',
                periodType: 'past',
                day: 25,
                month: 2,
                quarterMonth: 1
            });
            setDueDateRule('next_business_day' as any);
        }
    }, [editingRule, isOpen]);

    // Текст даты (формируется автоматически)
    const dateText = useMemo(() => buildDateText(dateConfig), [dateConfig]);

    // Обработчик сохранения
    const handleSave = async () => {
        if (!shortTitle.trim() || !shortDescription.trim()) {
            alert('Заполните название и уточнение');
            return;
        }

        setIsSaving(true);

        try {
            const ruleData: CreateCustomRule = {
                titleTemplate: shortTitle,
                shortTitle: shortTitle,
                shortDescription: shortDescription,
                category: category as 'финансовые' | 'организационные' | 'налоговые',
                storageCategory: category as 'финансовые' | 'организационные' | 'налоговые', // Для совместимости с БД
                description: description || shortDescription,
                taskType,
                periodicity: dateConfig.periodicity,
                applicabilityConfig: {
                    allClients: selectedLegalForms.length === 0 && selectedTaxSystems.length === 0 && !requiresNds && !requiresEmployees,
                    legalForms: selectedLegalForms.length > 0 ? selectedLegalForms : undefined,
                    taxSystems: selectedTaxSystems.length > 0 ? selectedTaxSystems : undefined,
                    requiresNds: requiresNds || undefined,
                    requiresEmployees: requiresEmployees || undefined,
                },
                dateConfig: toDateCalculationConfig(dateConfig),
                dueDateRule,
                createdBy: editingRule?.createdBy || 'admin',
                isActive: true,
                lawReference: lawReference || undefined,
            };

            await onSave(ruleData, isEditMode, editingRule?.id);
            onClose();
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения правила');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto m-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Шапка */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-800">
                        {isEditMode ? 'Редактирование правила' : 'Новое правило'}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Форма */}
                <div className="px-6 py-5 space-y-5">
                    {/* Тип задачи */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Тип задачи</label>
                        <div className="flex gap-2">
                            {TASK_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setTaskType(t.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${taskType === t.value
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Категория */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Категория</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as RuleCategory)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            {categories.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Название */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Название (кратко)</label>
                        <input
                            type="text"
                            value={shortTitle}
                            onChange={e => setShortTitle(e.target.value)}
                            placeholder="Например: Аванс по прибыли 1/3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Уточнение */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Уточнение</label>
                        <input
                            type="text"
                            value={shortDescription}
                            onChange={e => setShortDescription(e.target.value)}
                            placeholder="Например: Авансовый платёж за 1-й месяц квартала"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Описание */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Полное описание</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Подробное описание правила..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Ссылка на закон (только для налоговых) */}
                    {category === 'налоговые' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Основание (ссылка на закон)</label>
                            <input
                                type="text"
                                value={lawReference}
                                onChange={e => setLawReference(e.target.value)}
                                placeholder="Например: НК РФ ст. 174 п. 1"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    )}

                    {/* Применимость */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                        <div className="text-xs font-semibold text-amber-700 uppercase">Применимость</div>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={requiresNds}
                                    onChange={e => setRequiresNds(e.target.checked)}
                                    className="rounded text-primary"
                                />
                                <span className="text-sm text-slate-700">Только для плательщиков НДС</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={requiresEmployees}
                                    onChange={e => setRequiresEmployees(e.target.checked)}
                                    className="rounded text-primary"
                                />
                                <span className="text-sm text-slate-700">Только с сотрудниками</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Форма (ОПФ)</label>
                                <div className="flex flex-wrap gap-2">
                                    {['ООО', 'ИП', 'АО'].map(form => (
                                        <button
                                            key={form}
                                            type="button"
                                            onClick={() => {
                                                setSelectedLegalForms(prev =>
                                                    prev.includes(form)
                                                        ? prev.filter(f => f !== form)
                                                        : [...prev, form]
                                                );
                                            }}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedLegalForms.includes(form)
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                                                }`}
                                        >
                                            {form}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">СНО</label>
                                <div className="flex flex-wrap gap-2">
                                    {['ОСНО', 'УСН', 'Патент'].map(tax => (
                                        <button
                                            key={tax}
                                            type="button"
                                            onClick={() => {
                                                setSelectedTaxSystems(prev =>
                                                    prev.includes(tax)
                                                        ? prev.filter(t => t !== tax)
                                                        : [...prev, tax]
                                                );
                                            }}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedTaxSystems.includes(tax)
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                                                }`}
                                        >
                                            {tax}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-amber-600">
                            {selectedLegalForms.length === 0 && selectedTaxSystems.length === 0 && !requiresNds && !requiresEmployees
                                ? 'Применяется ко всем клиентам'
                                : 'Применяется к выбранным'}
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* РАСПИСАНИЕ */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase">Расписание</div>

                        {/* Периодичность */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Периодичность</label>
                            <select
                                value={dateConfig.periodicity}
                                onChange={e => setDateConfig(prev => ({
                                    ...prev,
                                    periodicity: e.target.value as RepeatFrequency
                                }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {PERIODICITY_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* За какой период */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">За какой период</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="periodType"
                                        checked={dateConfig.periodType === 'current'}
                                        onChange={() => setDateConfig(prev => ({ ...prev, periodType: 'current' }))}
                                        className="text-primary"
                                    />
                                    <span className="text-sm text-slate-700">За текущий период</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="periodType"
                                        checked={dateConfig.periodType === 'past'}
                                        onChange={() => setDateConfig(prev => ({ ...prev, periodType: 'past' }))}
                                        className="text-primary"
                                    />
                                    <span className="text-sm text-slate-700">За прошедший период</span>
                                </label>
                            </div>
                        </div>

                        {/* День */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">День</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={dateConfig.day}
                                    onChange={e => setDateConfig(prev => ({ ...prev, day: parseInt(e.target.value) || 1 }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Месяц (только для ежегодно) */}
                            {dateConfig.periodicity === 'yearly' && (
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Месяц</label>
                                    <select
                                        value={dateConfig.month ?? 0}
                                        onChange={e => setDateConfig(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        {MONTHS.map((m, i) => (
                                            <option key={i} value={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Месяц квартала (только для ежеквартально + за прошедший) */}
                        {dateConfig.periodicity === 'quarterly' && dateConfig.periodType === 'past' && (
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">В каком месяце после отчетного квартала</label>
                                <div className="space-y-2">
                                    {QUARTER_MONTHS.map(qm => (
                                        <label key={qm.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="quarterMonth"
                                                checked={dateConfig.quarterMonth === qm.value}
                                                onChange={() => setDateConfig(prev => ({ ...prev, quarterMonth: qm.value as 1 | 2 | 3 }))}
                                                className="text-primary"
                                            />
                                            <span className="text-sm text-slate-700">{qm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Перенос выходных */}
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Если выпадает на выходной</label>
                            <select
                                value={dueDateRule}
                                onChange={e => setDueDateRule(e.target.value as TaskDueDateRule)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {DUE_DATE_RULE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Итоговый текст */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-xs text-blue-600 font-medium mb-1">Итоговая формулировка:</div>
                            <div className="text-sm text-blue-800 font-semibold">{dateText}</div>
                        </div>
                    </div>
                </div>

                {/* Кнопки */}
                <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Создать правило')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RuleCreateModal;
