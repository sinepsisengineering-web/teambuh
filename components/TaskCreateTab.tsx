// components/TaskCreateTab.tsx
// Вкладка создания ручных задач

import React, { useState, useMemo, useEffect } from 'react';
import { LegalEntity, Employee, TaskDueDateRule, RepeatFrequency } from '../types';
import * as taskStorage from '../services/taskStorageService';
import { generateId } from '../services/idService';
import { adjustDate } from '../services/taskGenerator';
import { RuleCreateModal } from './RuleCreateModal';
import { DbRule, CreateCustomRule, getAllRules, createRule } from '../services/rulesService';

// ============================================
// ТИПЫ
// ============================================

type BindingType = 'clients' | 'staff' | 'unassigned';
// RepeatFrequency импортирован из ../types

interface EditingTaskInput {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    repeat: string;
    completionLeadDays?: number;
    legalEntityId: string;
    ruleId?: string;
}

interface TaskCreateTabProps {
    legalEntities: LegalEntity[];
    employees: Employee[];
    onTaskCreated?: () => void;  // Колбэк после создания задачи (для обновления списка)
    editingTask?: EditingTaskInput | null;  // Задача для редактирования
    prefillDate?: string | null; // Предзаполненная дата из календаря (YYYY-MM-DD)
}

// ============================================
// КОМПОНЕНТ
// ============================================

export const TaskCreateTab: React.FC<TaskCreateTabProps> = ({
    legalEntities,
    employees,
    onTaskCreated,
    editingTask,
    prefillDate,
}) => {
    // --- Режим редактирования ---
    const isEditMode = !!editingTask;

    // --- Состояние формы ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Привязка
    const [bindingType, setBindingType] = useState<BindingType>('unassigned');
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    // Дата
    const [dueDate, setDueDate] = useState(prefillDate || '');
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Повторение
    const [isRepeating, setIsRepeating] = useState(false);

    // За сколько дней до срока можно начать выполнение
    const [completionLeadDays, setCompletionLeadDays] = useState(3);
    const [repeatFrequency, setRepeatFrequency] = useState<RepeatFrequency>(RepeatFrequency.Monthly);

    // ID правила (если задача создаётся из правила)
    const [appliedRuleId, setAppliedRuleId] = useState<string | null>(null);
    // Правило переноса даты с выходных
    const [dueDateRuleValue, setDueDateRuleValue] = useState<string>('no_transfer');

    // Поиск
    const [clientSearch, setClientSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    // --- Модалки правил ---
    const [showRulePickerModal, setShowRulePickerModal] = useState(false);
    const [showRuleCreateModal, setShowRuleCreateModal] = useState(false);
    const [internalRules, setInternalRules] = useState<DbRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [ruleSearch, setRuleSearch] = useState('');
    const [pickerFilter, setPickerFilter] = useState<'all' | 'шаблоны' | 'финансовые' | 'организационные'>('all');
    const [templateSaved, setTemplateSaved] = useState(false);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

    // Загрузка правил и шаблонов для пикера
    const loadInternalRules = async () => {
        setRulesLoading(true);
        try {
            const allRules = await getAllRules();
            // Все активные правила + шаблоны
            const filtered = allRules.filter(r => r.isActive);
            setInternalRules(filtered);
        } catch (e) {
            console.error('[TaskCreateTab] Error loading rules:', e);
            setInternalRules([]);
        } finally {
            setRulesLoading(false);
        }
    };

    // Предзагрузка правил при монтировании (для автокомплита)
    useEffect(() => {
        loadInternalRules();
    }, []);

    // Фильтрация правил по поиску и категории (пикер)
    const filteredRules = useMemo(() => {
        // Исключаем налоговые/системные — только шаблоны, финансовые, организационные
        let rules = internalRules.filter(r =>
            r.source === 'custom' && r.storageCategory !== 'налоговые'
        );
        // Фильтр по категории
        if (pickerFilter !== 'all') {
            rules = rules.filter(r => r.storageCategory === pickerFilter);
        }
        // Поиск
        if (ruleSearch.trim()) {
            const q = ruleSearch.toLowerCase();
            rules = rules.filter(r =>
                r.shortTitle.toLowerCase().includes(q) ||
                r.shortDescription.toLowerCase().includes(q)
            );
        }
        return rules;
    }, [internalRules, ruleSearch, pickerFilter]);

    // Автокомплит подсказки по названию (мин 2 символа)
    const titleSuggestions = useMemo(() => {
        if (!title.trim() || title.trim().length < 2 || internalRules.length === 0) return [];
        const q = title.toLowerCase();
        return internalRules.filter(r =>
            r.shortTitle.toLowerCase().includes(q) ||
            r.shortDescription.toLowerCase().includes(q)
        ).slice(0, 5); // Максимум 5 подсказок
    }, [title, internalRules]);

    // --- Предзаполнение формы при редактировании ---
    useEffect(() => {
        if (!editingTask) return;
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setDueDate(editingTask.dueDate);
        setCompletionLeadDays(editingTask.completionLeadDays ?? 3);
        setAppliedRuleId(editingTask.ruleId || null);
        // Повторение
        if (editingTask.repeat && editingTask.repeat !== 'none') {
            setIsRepeating(true);
            setRepeatFrequency(editingTask.repeat as RepeatFrequency);
        } else {
            setIsRepeating(false);
        }
        // Привязка к клиенту
        if (editingTask.legalEntityId && editingTask.legalEntityId !== '__unassigned__') {
            setBindingType('clients');
            setSelectedClientIds([editingTask.legalEntityId]);
        }
    }, [editingTask]);
    const calculateNextDueDateFromRule = (rule: DbRule): string | null => {
        const config = rule.dateConfig;
        if (!config || !config.day) return null;

        const today = new Date();
        const year = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11

        let targetMonth: number = currentMonth;
        let targetYear = year;

        if (rule.periodicity === 'yearly' && config.month !== undefined) {
            // Ежегодные — конкретный месяц
            targetMonth = config.month;
            if (targetMonth < currentMonth || (targetMonth === currentMonth && config.day < today.getDate())) {
                targetYear++;
            }
        } else if (rule.periodicity === 'quarterly') {
            // Ежеквартальные — ближайший квартальный месяц
            const qOffset = config.quarterMonthOffset ?? 0; // 0,1,2 внутри квартала
            const quarterStarts = [0, 3, 6, 9]; // Январь, Апрель, Июль, Октябрь
            const monthOffset = config.monthOffset ?? 1; // сдвиг после конца квартала
            // Ищем ближайший подходящий месяц
            let found = false;
            for (let q = 0; q < 8; q++) { // Проверяем 8 кварталов вперёд
                const qStart = quarterStarts[q % 4];
                const qYear = year + Math.floor(q / 4);
                const m = qStart + qOffset + monthOffset;
                const candidateDate = new Date(qYear, m, config.day);
                if (candidateDate > today) {
                    targetMonth = candidateDate.getMonth();
                    targetYear = candidateDate.getFullYear();
                    found = true;
                    break;
                }
            }
            if (!found) {
                targetMonth = currentMonth + 1;
            }
        } else {
            // Ежемесячные и прочие — следующий подходящий месяц
            const offset = config.monthOffset ?? 0;
            targetMonth = currentMonth + offset;
            const candidateDate = new Date(year, targetMonth, config.day);
            if (candidateDate <= today) {
                targetMonth++;
            }
        }

        const resultDate = new Date(targetYear, targetMonth, Math.min(config.day, 28));
        // Корректируем на последний день месяца
        const lastDayOfMonth = new Date(resultDate.getFullYear(), resultDate.getMonth() + 1, 0).getDate();
        const finalDay = Math.min(config.day, lastDayOfMonth);
        const d = new Date(resultDate.getFullYear(), resultDate.getMonth(), finalDay);

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Применить правило — заполнить форму из выбранного правила
    const applyRule = (rule: DbRule) => {
        setTitle(rule.shortTitle);
        setDescription(rule.shortDescription || rule.description || '');
        // Устанавливаем повторение из правила
        if (rule.periodicity && rule.periodicity !== 'oneTime') {
            setIsRepeating(true);
            setRepeatFrequency(rule.periodicity as RepeatFrequency);
        } else {
            setIsRepeating(false);
        }
        // completionLeadDays
        setCompletionLeadDays(rule.completionLeadDays ?? 3);
        // Рассчитываем дату из dateConfig
        const calculatedDate = calculateNextDueDateFromRule(rule);
        if (calculatedDate) {
            setDueDate(calculatedDate);
        }
        // Запоминаем ID правила и правило переноса
        setAppliedRuleId(rule.id);
        setDueDateRuleValue(rule.dueDateRule || 'next_business_day');
        setShowRulePickerModal(false);
    };

    // Сохранить как шаблон
    const handleSaveAsTemplate = async () => {
        if (!title.trim()) return;
        try {
            const templateData: CreateCustomRule & { id: string; source: string } = {
                id: generateId('task'),
                source: 'custom',
                storageCategory: 'шаблоны',
                isActive: true,
                taskType: 'custom',
                shortTitle: title.trim(),
                shortDescription: description.trim() || title.trim(),
                description: description.trim() || null,
                titleTemplate: title.trim(),
                lawReference: null,
                periodicity: (isRepeating ? repeatFrequency : RepeatFrequency.Yearly) as RepeatFrequency,  // yearly для одноразовых (manualOnly=true, не влияет)
                periodType: 'current',
                dateConfig: { type: 'fixed_day', day: 1, month: 1 },
                dueDateRule: dueDateRuleValue as TaskDueDateRule,
                applicabilityConfig: {
                    allClients: true,
                    legalForms: null,
                    taxSystems: null,
                    requiresEmployees: false,
                    requiresNds: false,
                    clientIds: null,
                },
                excludeMonths: null,
                completionLeadDays: completionLeadDays,
                manualOnly: true,
                createdBy: 'user',
            };
            await createRule(templateData);
            setTemplateSaved(true);
            console.log('[TaskCreateTab] Template saved:', title);
            // Через 1.5 сек закрываем модалку и очищаем форму
            setTimeout(() => {
                setTemplateSaved(false);
                handleCloseSuccessModal();
            }, 1500);
        } catch (e) {
            console.error('[TaskCreateTab] Error saving template:', e);
        }
    };

    // Статус сохранения и модалка
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalType, setSaveModalType] = useState<'confirm' | 'success' | 'error'>('confirm');
    const [saveModalError, setSaveModalError] = useState('');
    const [savedCount, setSavedCount] = useState(0);

    const formatDateYmd = (d: Date): string => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const addCycleStep = (base: Date, freq: RepeatFrequency, step: number): Date => {
        const d = new Date(base);
        switch (freq) {
            case RepeatFrequency.Daily:
                d.setDate(d.getDate() + step);
                break;
            case RepeatFrequency.Weekly:
                d.setDate(d.getDate() + (7 * step));
                break;
            case RepeatFrequency.Biweekly:
                d.setDate(d.getDate() + (14 * step));
                break;
            case RepeatFrequency.Quarterly:
                d.setMonth(d.getMonth() + (3 * step));
                break;
            case RepeatFrequency.Yearly:
                d.setFullYear(d.getFullYear() + step);
                break;
            case RepeatFrequency.Monthly:
            default:
                d.setMonth(d.getMonth() + step);
                break;
        }
        return d;
    };

    const getOccurrencesCount = (freq: RepeatFrequency): number => {
        switch (freq) {
            case RepeatFrequency.Daily:
                return 30;   // 30 дней вперед
            case RepeatFrequency.Weekly:
                return 12;   // 12 недель вперед
            case RepeatFrequency.Biweekly:
                return 12;   // 24 недели вперед
            case RepeatFrequency.Monthly:
                return 12;   // 12 месяцев вперед
            case RepeatFrequency.Quarterly:
                return 8;    // 2 года вперед
            case RepeatFrequency.Yearly:
                return 3;    // 3 года вперед
            default:
                return 1;
        }
    };

    // --- Фильтрованные списки ---
    const filteredClients = useMemo(() => {
        if (!clientSearch) return legalEntities;
        const q = clientSearch.toLowerCase();
        return legalEntities.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.inn?.toLowerCase().includes(q)
        );
    }, [legalEntities, clientSearch]);

    const filteredEmployees = useMemo(() => {
        if (!employeeSearch) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter(e =>
            `${e.lastName} ${e.firstName}`.toLowerCase().includes(q) ||
            e.email?.toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    // --- Календарь ---
    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
        const days: (Date | null)[] = [];

        for (let i = 0; i < startOfWeek; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        return days;
    }, [calendarMonth]);

    const selectedDateObj = dueDate ? new Date(dueDate) : null;

    // --- Валидация ---
    const isValid = title.trim() !== '' && description.trim() !== '' && dueDate !== '' && (
        bindingType === 'unassigned' ||
        (bindingType === 'clients' && selectedClientIds.length > 0) ||
        (bindingType === 'staff' && selectedEmployeeIds.length > 0)
    );

    // --- Обработчики чекбоксов привязки ---
    const handleBindingChange = (type: BindingType) => {
        setBindingType(type);
        if (type !== 'clients') setSelectedClientIds([]);
        if (type !== 'staff') setSelectedEmployeeIds([]);
    };

    // --- Получить текст привязки ---
    const getBindingLabel = () => {
        if (bindingType === 'clients') return `Клиенты: ${selectedClientIds.length}`;
        if (bindingType === 'staff') return `Персонал: ${selectedEmployeeIds.length}`;
        return 'Без привязки';
    };

    // --- Шаг 1: Открыть confirm ---
    const handleSave = () => {
        if (!isValid || isSaving) return;
        setSaveModalType('confirm');
        setShowSaveModal(true);
    };

    // --- Шаг 2: Подтвердить и создать/обновить ---
    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            // --- Режим редактирования: обновляем существующую задачу ---
            if (isEditMode && editingTask) {
                // Применяем перенос даты с выходных
                const adjustedDate = adjustDate(new Date(dueDate + 'T00:00:00'), dueDateRuleValue as TaskDueDateRule);
                const adjustedDateStr = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getDate()).padStart(2, '0')}`;

                const result = await taskStorage.updateTask(editingTask.id, {
                    title,
                    description,
                    currentDueDate: adjustedDateStr,
                    completionLeadDays,
                    dueDateRule: dueDateRuleValue,
                    recurrence: isRepeating ? 'cyclic' : 'oneTime',
                    cyclePattern: isRepeating ? repeatFrequency : null,
                });
                if (result) {
                    setSavedCount(1);
                    setSaveModalType('success');
                    onTaskCreated?.();
                } else {
                    setSaveModalError('Не удалось обновить задачу.');
                    setSaveModalType('error');
                }
                return;
            }

            // --- Режим создания ---
            const baseDate = new Date(`${dueDate}T00:00:00`);
            const occurrenceCount = isRepeating ? getOccurrencesCount(repeatFrequency) : 1;
            const occurrenceDates: string[] = [];
            for (let i = 0; i < occurrenceCount; i++) {
                const rawDate = isRepeating ? addCycleStep(baseDate, repeatFrequency, i) : baseDate;
                const adjustedDate = adjustDate(rawDate, dueDateRuleValue as TaskDueDateRule);
                occurrenceDates.push(formatDateYmd(adjustedDate));
            }

            const tasksToCreate: Parameters<typeof taskStorage.createTask>[0][] = [];
            const baseTask = {
                title,
                description,
                taskSource: 'manual' as const,
                recurrence: isRepeating ? 'cyclic' as const : 'oneTime' as const,
                cyclePattern: isRepeating ? repeatFrequency : undefined,
                status: 'pending',
                completionLeadDays,
                ruleId: appliedRuleId || undefined,
                dueDateRule: dueDateRuleValue,
            };

            if (bindingType === 'clients') {
                for (const clientId of selectedClientIds) {
                    const client = legalEntities.find(c => c.id === clientId);
                    if (client) {
                        for (const taskDate of occurrenceDates) {
                            tasksToCreate.push({
                                ...baseTask,
                                id: generateId('task'),
                                dueDate: taskDate,
                                clientId: client.id,
                                clientName: client.name,
                            });
                        }
                    }
                }
            } else if (bindingType === 'staff') {
                for (const empId of selectedEmployeeIds) {
                    const emp = employees.find(e => e.id === empId);
                    if (emp) {
                        for (const taskDate of occurrenceDates) {
                            tasksToCreate.push({
                                ...baseTask,
                                id: generateId('task'),
                                dueDate: taskDate,
                                clientId: empId,
                                clientName: `${emp.lastName} ${emp.firstName}`,
                            });
                        }
                    }
                }
            } else {
                for (const taskDate of occurrenceDates) {
                    tasksToCreate.push({
                        ...baseTask,
                        id: generateId('task'),
                        dueDate: taskDate,
                        clientId: '__unassigned__',
                        clientName: 'Без привязки',
                    });
                }
            }

            let successCount = 0;
            for (const task of tasksToCreate) {
                const result = await taskStorage.createTask(task);
                if (result) successCount++;
            }

            setSavedCount(successCount);
            setSaveModalType('success');
            onTaskCreated?.();
        } catch (error) {
            console.error('[TaskCreateTab] Error saving task:', error);
            setSaveModalError('Не удалось сохранить задачу. Попробуйте снова.');
            setSaveModalType('error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Закрыть модалку успеха (и очистить форму) ---
    const handleCloseSuccessModal = () => {
        setShowSaveModal(false);
        setTitle('');
        setDescription('');
        setBindingType('unassigned');
        setSelectedClientIds([]);
        setSelectedEmployeeIds([]);
        setDueDate('');
        setIsRepeating(false);
        setRepeatFrequency(RepeatFrequency.Monthly);
        setCompletionLeadDays(3);
        setAppliedRuleId(null);
        setClientSearch('');
        setEmployeeSearch('');
    };

    // --- Вспомогательные ---
    const toggleClient = (id: string) => {
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // ============================================
    // РЕНДЕР
    // ============================================

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto py-6 px-4">
                {/* Заголовок + кнопки правил */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-800">{isEditMode ? 'Редактировать задачу' : 'Создать задачу'}</h2>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            onClick={() => {
                                loadInternalRules();
                                setShowRulePickerModal(true);
                            }}
                        >
                            📋 Использовать правило
                        </button>
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            onClick={() => setShowRuleCreateModal(true)}
                        >
                            ➕ Добавить правило
                        </button>
                    </div>
                </div>

                {/* Форма */}
                <div className="space-y-5">

                    {/* Название */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Название <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                onChange={e => {
                                    setTitle(e.target.value);
                                    setShowTitleSuggestions(true);
                                }}
                                onFocus={() => setShowTitleSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                placeholder="Например: Подготовить квартальный отчёт"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                autoComplete="off"
                            />
                            {/* Автокомплит подсказки */}
                            {showTitleSuggestions && titleSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {titleSuggestions.map(rule => (
                                        <button
                                            key={rule.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                applyRule(rule);
                                                setShowTitleSuggestions(false);
                                            }}
                                        >
                                            <div className="text-sm font-medium text-slate-800">{rule.shortTitle}</div>
                                            <div className="text-xs text-slate-500 truncate">{rule.shortDescription}</div>
                                            {rule.source === 'custom' && (
                                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">шаблон</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Описание */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Описание <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Подробное описание задачи..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                        />
                    </div>

                    {/* Применять к */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Применять к <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            {[
                                { type: 'clients' as const, label: '🏢 Клиенты', icon: '🏢' },
                                { type: 'staff' as const, label: '👤 Персонал', icon: '👤' },
                                { type: 'unassigned' as const, label: '📌 Без привязки', icon: '📌' },
                            ].map(opt => (
                                <label
                                    key={opt.type}
                                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all text-sm ${bindingType === opt.type
                                        ? 'border-primary bg-primary/5 text-primary font-medium ring-2 ring-primary/20'
                                        : 'border-slate-300 text-slate-600 hover:border-slate-400'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="binding"
                                        checked={bindingType === opt.type}
                                        onChange={() => handleBindingChange(opt.type)}
                                        className="sr-only"
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Выбор клиентов */}
                    {bindingType === 'clients' && (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-slate-700">
                                    Выберите клиентов
                                    {selectedClientIds.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                            {selectedClientIds.length}
                                        </span>
                                    )}
                                </span>
                                {selectedClientIds.length > 0 && (
                                    <button
                                        onClick={() => setSelectedClientIds([])}
                                        className="text-xs text-slate-400 hover:text-red-500"
                                    >
                                        Очистить
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={clientSearch}
                                onChange={e => setClientSearch(e.target.value)}
                                placeholder="Поиск клиента..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {filteredClients.map(client => (
                                    <label
                                        key={client.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedClientIds.includes(client.id)
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedClientIds.includes(client.id)}
                                            onChange={() => toggleClient(client.id)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary/50"
                                        />
                                        <span className="flex-1">{client.name}</span>
                                        {client.inn && (
                                            <span className="text-xs text-slate-400">ИНН: {client.inn}</span>
                                        )}
                                    </label>
                                ))}
                                {filteredClients.length === 0 && (
                                    <div className="text-sm text-slate-400 text-center py-3">Не найдено</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Выбор персонала */}
                    {bindingType === 'staff' && (
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-slate-700">
                                    Выберите сотрудников
                                    {selectedEmployeeIds.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                            {selectedEmployeeIds.length}
                                        </span>
                                    )}
                                </span>
                                {selectedEmployeeIds.length > 0 && (
                                    <button
                                        onClick={() => setSelectedEmployeeIds([])}
                                        className="text-xs text-slate-400 hover:text-red-500"
                                    >
                                        Очистить
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={employeeSearch}
                                onChange={e => setEmployeeSearch(e.target.value)}
                                placeholder="Поиск сотрудника..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {filteredEmployees.map(emp => (
                                    <label
                                        key={emp.id}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedEmployeeIds.includes(emp.id)
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary/50"
                                        />
                                        <span className="flex-1">{emp.lastName} {emp.firstName}</span>
                                        <span className="text-xs text-slate-400">{emp.email}</span>
                                    </label>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <div className="text-sm text-slate-400 text-center py-3">Не найдено</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Дата + Повторение */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Дата */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Срок выполнения <span className="text-red-500">*</span>
                            </label>
                            <div
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm cursor-pointer hover:border-slate-400 flex items-center justify-between"
                            >
                                <span className={dueDate ? 'text-slate-800' : 'text-slate-400'}>
                                    {dueDate
                                        ? new Date(dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : 'Выберите дату'
                                    }
                                </span>
                                <span className="text-slate-400">📅</span>
                            </div>

                            {/* Мини-календарь */}
                            {showCalendar && (
                                <div className="absolute z-50 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-72">
                                    {/* Навигация по месяцу */}
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                        >
                                            ◀
                                        </button>
                                        <span className="text-sm font-medium text-slate-700">
                                            {calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button
                                            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                        >
                                            ▶
                                        </button>
                                    </div>

                                    {/* Дни недели */}
                                    <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-medium mb-1">
                                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                                            <div key={d}>{d}</div>
                                        ))}
                                    </div>

                                    {/* Дни */}
                                    <div className="grid grid-cols-7 gap-0.5">
                                        {calendarDays.map((day, i) => (
                                            <div key={i}>
                                                {day ? (
                                                    <button
                                                        onClick={() => {
                                                            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                                            setDueDate(dateStr);
                                                            setShowCalendar(false);
                                                        }}
                                                        className={`w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${selectedDateObj?.toDateString() === day.toDateString()
                                                            ? 'bg-primary text-white font-bold'
                                                            : new Date().toDateString() === day.toDateString()
                                                                ? 'bg-primary/10 text-primary font-medium'
                                                                : 'hover:bg-slate-100 text-slate-700'
                                                            }`}
                                                    >
                                                        {day.getDate()}
                                                    </button>
                                                ) : (
                                                    <div />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Повторение */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Повторение
                            </label>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isRepeating}
                                        onChange={e => setIsRepeating(e.target.checked)}
                                        className="rounded border-slate-300 text-primary focus:ring-primary/50"
                                    />
                                    <span className="text-sm text-slate-600">Повторять</span>
                                </label>
                                {isRepeating && (
                                    <select
                                        value={repeatFrequency}
                                        onChange={e => setRepeatFrequency(e.target.value as RepeatFrequency)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="daily">Ежедневно</option>
                                        <option value="weekly">Еженедельно</option>
                                        <option value="monthly">Ежемесячно</option>
                                        <option value="quarterly">Ежеквартально</option>
                                        <option value="yearly">Ежегодно</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Допуск к выполнению */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Допуск к выполнению
                        </label>
                        <select
                            value={completionLeadDays}
                            onChange={e => setCompletionLeadDays(parseInt(e.target.value))}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                            <option value={0}>В день срока</option>
                            <option value={3}>За 3 дня до срока</option>
                            <option value={7}>За неделю до срока</option>
                            <option value={14}>За 2 недели до срока</option>
                            <option value={30}>За месяц до срока</option>
                            <option value={-1}>Без ограничений</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">За сколько дней до срока задачу можно выполнить</p>
                    </div>

                    {/* Правило переноса с выходных — только при повторении */}
                    {isRepeating && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">📅 Перенос с выходных</label>
                            <select
                                value={dueDateRuleValue}
                                onChange={e => setDueDateRuleValue(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            >
                                <option value="no_transfer">Не переносить</option>
                                <option value="next_business_day">На следующий рабочий день →</option>
                                <option value="previous_business_day">На предыдущий рабочий день ←</option>
                            </select>
                            <p className="text-xs text-slate-400 mt-1">Куда переносить, если срок выпадает на выходной</p>
                        </div>
                    )}

                    {/* Кнопка сохранения */}
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSave}
                            disabled={!isValid || isSaving}
                            className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${isValid && !isSaving
                                ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? '⏳ Сохранение...' : '💾 Сохранить задачу'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* МОДАЛЬНОЕ ОКНО СОХРАНЕНИЯ (как в ClientsView) */}
            {/* ============================================ */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Заголовок */}
                        <div className={`px-5 py-4 ${saveModalType === 'error' ? 'bg-red-50' :
                            saveModalType === 'success' ? 'bg-green-50' :
                                'bg-primary/5'
                            }`}>
                            <div className="flex items-center gap-3">
                                {saveModalType === 'confirm' && (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xl">💾</span>
                                    </div>
                                )}
                                {saveModalType === 'success' && (
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <span className="text-xl">✅</span>
                                    </div>
                                )}
                                {saveModalType === 'error' && (
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                        <span className="text-xl">⚠️</span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-slate-800">
                                        {saveModalType === 'confirm' && 'Подтверждение сохранения'}
                                        {saveModalType === 'success' && 'Успешно сохранено'}
                                        {saveModalType === 'error' && 'Ошибка'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {saveModalType === 'confirm' && 'Создание новой задачи'}
                                        {saveModalType === 'success' && 'Задача сохранена в базу данных'}
                                        {saveModalType === 'error' && 'Произошла ошибка при сохранении'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Контент */}
                        <div className="px-5 py-4">
                            {saveModalType === 'confirm' && (
                                <div className="text-sm text-slate-600">
                                    <p className="mb-3">Вы уверены, что хотите сохранить задачу?</p>
                                    <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Название:</span>
                                            <span className="font-medium text-right max-w-[250px] truncate">{title}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Привязка:</span>
                                            <span className="font-medium">{getBindingLabel()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Срок:</span>
                                            <span className="font-medium">{new Date(dueDate).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        {isRepeating && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Повторение:</span>
                                                <span className="font-medium">{getFreqLabel(repeatFrequency)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {saveModalType === 'success' && (
                                <div className="text-center py-2">
                                    <div className="text-4xl mb-2">🎉</div>
                                    <p className="text-sm text-slate-600">Создано задач: <span className="font-bold">{savedCount}</span></p>
                                </div>
                            )}
                            {saveModalType === 'error' && (
                                <div className="text-sm text-red-600">
                                    <p>{saveModalError}</p>
                                </div>
                            )}
                        </div>

                        {/* Кнопки */}
                        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                            {saveModalType === 'confirm' && (
                                <>
                                    <button
                                        onClick={() => setShowSaveModal(false)}
                                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleConfirmSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? '⏳ Сохранение...' : '💾 Сохранить'}
                                    </button>
                                </>
                            )}
                            {saveModalType === 'success' && (
                                <>
                                    <button
                                        onClick={handleSaveAsTemplate}
                                        disabled={!title.trim() || templateSaved}
                                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${templateSaved
                                            ? 'bg-green-100 text-green-700 cursor-default'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                            }`}
                                    >
                                        {templateSaved ? '✅ Сохранено!' : '💾 Сохранить как шаблон'}
                                    </button>
                                    <button
                                        onClick={handleCloseSuccessModal}
                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Отлично!
                                    </button>
                                </>
                            )}
                            {saveModalType === 'error' && (
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
                                >
                                    Понятно
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* МОДАЛКА ВЫБОРА ПРАВИЛА */}
            {/* ============================================ */}
            {showRulePickerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[70vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Шапка */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                            <span className="text-lg font-semibold text-slate-800">Выбрать правило</span>
                            <button onClick={() => { setShowRulePickerModal(false); setRuleSearch(''); setPickerFilter('all'); }} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Поиск + фильтр */}
                        <div className="px-5 pt-3 space-y-2">
                            <input
                                type="text"
                                value={ruleSearch}
                                onChange={e => setRuleSearch(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {/* Мини-фильтр по типу */}
                            <div className="flex gap-1">
                                {[
                                    { id: 'all' as const, label: 'Все' },
                                    { id: 'шаблоны' as const, label: '⭐ Шаблоны' },
                                    { id: 'финансовые' as const, label: '💰 Финансовые' },
                                    { id: 'организационные' as const, label: '📋 Организационные' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setPickerFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pickerFilter === tab.id
                                            ? 'bg-primary text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Список */}
                        <div className="px-5 py-3 overflow-y-auto max-h-[50vh] space-y-2">
                            {rulesLoading ? (
                                <div className="text-center text-slate-400 py-8">Загрузка...</div>
                            ) : filteredRules.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">
                                    <div className="text-3xl mb-2">📋</div>
                                    <p className="text-sm">Ничего не найдено</p>
                                    <p className="text-xs mt-1">Создайте шаблон или правило в справочнике</p>
                                </div>
                            ) : (
                                filteredRules.map(rule => {
                                    const isTemplateItem = rule.storageCategory === 'шаблоны';
                                    const categoryIcon = isTemplateItem ? '⭐' : rule.storageCategory === 'финансовые' ? '💰' : '📋';
                                    const categoryLabel = isTemplateItem ? 'шаблон' : rule.storageCategory === 'финансовые' ? 'финансовое' : 'организационное';
                                    return (
                                        <button
                                            key={rule.id}
                                            onClick={() => applyRule(rule)}
                                            className={`w-full text-left p-3 border rounded-lg hover:shadow-md transition-all ${isTemplateItem
                                                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                                                : 'bg-white border-slate-200 hover:border-primary'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${isTemplateItem
                                                    ? 'bg-amber-100 text-amber-600'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {categoryIcon}
                                                </span>
                                                <span className="font-medium text-slate-900 text-sm">{rule.shortTitle}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto ${isTemplateItem
                                                    ? 'text-amber-600 bg-amber-100'
                                                    : 'text-slate-500 bg-slate-100'
                                                    }`}>
                                                    {categoryLabel}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 ml-8 line-clamp-1">{rule.shortDescription}</div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* МОДАЛКА СОЗДАНИЯ ПРАВИЛА (из RuleCreateModal) */}
            {/* ============================================ */}
            <RuleCreateModal
                isOpen={showRuleCreateModal}
                onClose={() => setShowRuleCreateModal(false)}
                onSave={async (ruleData) => {
                    await createRule(ruleData);
                    setShowRuleCreateModal(false);
                }}
                isSuperAdmin={false}
                defaultCategory={'финансовые'}
            />
        </div>
    );
};

// Хелпер для отображения частоты
const getFreqLabel = (freq: RepeatFrequency): string => {
    const map: Partial<Record<RepeatFrequency, string>> = {
        [RepeatFrequency.Daily]: 'Ежедневно',
        [RepeatFrequency.Weekly]: 'Еженедельно',
        [RepeatFrequency.Biweekly]: 'Раз в 2 недели',
        [RepeatFrequency.Monthly]: 'Ежемесячно',
        [RepeatFrequency.Quarterly]: 'Ежеквартально',
        [RepeatFrequency.Yearly]: 'Ежегодно',
        [RepeatFrequency.OneTime]: 'Одноразовая',
        [RepeatFrequency.None]: 'Без повтора',
    };
    return map[freq] || freq;
};
