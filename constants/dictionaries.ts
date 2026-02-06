// constants/dictionaries.ts
// Единый справочник типов для всего приложения
// ВСЕ компоненты должны использовать эти типы для обеспечения согласованности

// ============================================
// ЮРИДИЧЕСКИЕ ФОРМЫ
// ============================================

export const LEGAL_FORMS = {
    OOO: { id: 'OOO', label: 'ООО', fullName: 'Общество с ограниченной ответственностью' },
    AO: { id: 'AO', label: 'АО', fullName: 'Акционерное общество' },
    IP: { id: 'IP', label: 'ИП', fullName: 'Индивидуальный предприниматель' },
} as const;

export type LegalFormId = keyof typeof LEGAL_FORMS;

// Хелперы для работы с юридическими формами
export const getLegalFormLabel = (id: LegalFormId | string): string => {
    const form = Object.values(LEGAL_FORMS).find(f => f.id === id);
    return form?.label || id;
};

export const getLegalFormById = (id: string) => {
    return Object.values(LEGAL_FORMS).find(f => f.id === id);
};

export const LEGAL_FORM_OPTIONS = Object.values(LEGAL_FORMS).map(f => ({
    id: f.id,       // ID для использования в компонентах
    value: f.id,    // value для select/options совместимости
    label: f.label,
}));

// ============================================
// СИСТЕМЫ НАЛОГООБЛОЖЕНИЯ
// ============================================

export const TAX_SYSTEMS = {
    OSNO: { id: 'OSNO', label: 'ОСНО', fullName: 'Общая система налогообложения' },
    USN6: { id: 'USN6', label: 'УСН "Доходы"', fullName: 'Упрощённая система налогообложения (доходы)', rate: 6 },
    USN15: { id: 'USN15', label: 'УСН "Д-Р"', fullName: 'Упрощённая система налогообложения (доходы минус расходы)', rate: 15 },
    PATENT: { id: 'PATENT', label: 'Патент', fullName: 'Патентная система налогообложения' },
    ESHN: { id: 'ESHN', label: 'ЕСХН', fullName: 'Единый сельскохозяйственный налог' },
    AUSN: { id: 'AUSN', label: 'АУСН', fullName: 'Автоматизированная упрощённая система налогообложения' },
    NPD: { id: 'NPD', label: 'НПД', fullName: 'Налог на профессиональный доход (самозанятые)' },
} as const;

export type TaxSystemId = keyof typeof TAX_SYSTEMS;

// Хелперы для работы с системами налогообложения
export const getTaxSystemLabel = (id: TaxSystemId | string): string => {
    const system = Object.values(TAX_SYSTEMS).find(s => s.id === id);
    return system?.label || id;
};

export const getTaxSystemById = (id: string) => {
    return Object.values(TAX_SYSTEMS).find(s => s.id === id);
};

export const TAX_SYSTEM_OPTIONS = Object.values(TAX_SYSTEMS).map(s => ({
    id: s.id,       // ID для использования в компонентах
    value: s.id,    // value для select/options совместимости
    label: s.label,
}));

// ============================================
// МЕСЯЦЫ
// ============================================

export const MONTHS = [
    { id: 0, label: 'Январь', genitive: 'января', short: 'Янв' },
    { id: 1, label: 'Февраль', genitive: 'февраля', short: 'Фев' },
    { id: 2, label: 'Март', genitive: 'марта', short: 'Мар' },
    { id: 3, label: 'Апрель', genitive: 'апреля', short: 'Апр' },
    { id: 4, label: 'Май', genitive: 'мая', short: 'Май' },
    { id: 5, label: 'Июнь', genitive: 'июня', short: 'Июн' },
    { id: 6, label: 'Июль', genitive: 'июля', short: 'Июл' },
    { id: 7, label: 'Август', genitive: 'августа', short: 'Авг' },
    { id: 8, label: 'Сентябрь', genitive: 'сентября', short: 'Сен' },
    { id: 9, label: 'Октябрь', genitive: 'октября', short: 'Окт' },
    { id: 10, label: 'Ноябрь', genitive: 'ноября', short: 'Ноя' },
    { id: 11, label: 'Декабрь', genitive: 'декабря', short: 'Дек' },
] as const;

export type MonthId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const getMonthLabel = (id: MonthId): string => {
    return MONTHS[id]?.label || '';
};

export const getMonthGenitive = (id: MonthId): string => {
    return MONTHS[id]?.genitive || '';
};

export const MONTH_OPTIONS = MONTHS.map(m => ({
    value: m.id,
    label: m.label,
}));

// ============================================
// ПРАВИЛА ПЕРЕНОСА ДАТ
// ============================================

export const DUE_DATE_RULES = {
    NEXT: { id: 'next', label: 'На ближайший рабочий день вперёд' },
    PREVIOUS: { id: 'previous', label: 'На ближайший рабочий день назад' },
    NONE: { id: 'none', label: 'Без переноса' },
} as const;

export type DueDateRuleId = 'next' | 'previous' | 'none';

export const getDueDateRuleLabel = (id: DueDateRuleId | string): string => {
    const rule = Object.values(DUE_DATE_RULES).find(r => r.id === id);
    return rule?.label || id;
};

export const DUE_DATE_RULE_OPTIONS = Object.values(DUE_DATE_RULES).map(r => ({
    value: r.id,
    label: r.label,
}));

// ============================================
// ПЕРИОДИЧНОСТЬ
// ============================================

export const PERIODICITIES = {
    MONTHLY: { id: 'monthly', label: 'Ежемесячно' },
    QUARTERLY: { id: 'quarterly', label: 'Ежеквартально' },
    YEARLY: { id: 'yearly', label: 'Ежегодно' },
} as const;

export type PeriodicityId = 'monthly' | 'quarterly' | 'yearly';

export const getPeriodicityLabel = (id: PeriodicityId | string): string => {
    const period = Object.values(PERIODICITIES).find(p => p.id === id);
    return period?.label || id;
};

export const PERIODICITY_OPTIONS = Object.values(PERIODICITIES).map(p => ({
    value: p.id,
    label: p.label,
}));

// ============================================
// ТИПЫ ЗАДАЧ
// ============================================

export const TASK_TYPES = {
    REPORT: { id: 'report', label: 'Отчёт' },
    PAYMENT: { id: 'payment', label: 'Уплата' },
    NOTIFICATION: { id: 'notification', label: 'Уведомление' },
} as const;

export const TASK_TYPE_OPTIONS = Object.values(TASK_TYPES).map(t => ({
    value: t.id,
    label: t.label,
}));

// ============================================
// КАТЕГОРИИ ЗАДАЧ
// ============================================

export const TASK_CATEGORIES = {
    TAX: { id: 'tax', label: 'Налоговые' },
    HR: { id: 'hr', label: 'Кадровые' },
    ACCOUNTING: { id: 'accounting', label: 'Бухгалтерские' },
} as const;

export const TASK_CATEGORY_OPTIONS = Object.values(TASK_CATEGORIES).map(c => ({
    value: c.id,
    label: c.label,
}));

// ============================================
// ИСТОЧНИКИ ПРАВИЛ
// ============================================

export const RULE_SOURCES = {
    GLOBAL: { id: 'global', label: 'Общие налоговые' },
    LOCAL: { id: 'local', label: 'Локальные' },
    CUSTOM: { id: 'custom', label: 'Кастомные' },
} as const;

export type RuleSourceId = 'global' | 'local' | 'custom';

export const RULE_SOURCE_OPTIONS = Object.values(RULE_SOURCES).map(s => ({
    value: s.id,
    label: s.label,
}));

// ============================================
// ПЕРИОДИЧНОСТЬ АВАНСОВ ПО ПРИБЫЛИ
// ============================================

export const PROFIT_ADVANCE_PERIODICITIES = {
    QUARTERLY: { id: 'quarterly', label: 'Ежеквартально' },
    MONTHLY: { id: 'monthly', label: 'Ежемесячно' },
} as const;

export type ProfitAdvancePeriodicityId = 'quarterly' | 'monthly';

export const PROFIT_ADVANCE_PERIODICITY_OPTIONS = Object.values(PROFIT_ADVANCE_PERIODICITIES).map(p => ({
    value: p.id,
    label: p.label,
}));

// ============================================
// СТАТУСЫ КЛИЕНТОВ
// ============================================

export const CLIENT_STATUSES = {
    PERMANENT: { id: 'permanent', label: 'Постоянный' },
    ONETIME: { id: 'onetime', label: 'Разовый' },
} as const;

export type ClientStatusId = 'permanent' | 'onetime';

export const CLIENT_STATUS_OPTIONS = Object.values(CLIENT_STATUSES).map(s => ({
    value: s.id,
    label: s.label,
}));

// ============================================
// МАППИНГ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// ============================================

// Старые значения (кириллица) → новые ID
export const LEGACY_LEGAL_FORM_MAP: Record<string, LegalFormId> = {
    'ООО': 'OOO',
    'АО': 'AO',
    'ИП': 'IP',
    // Также поддержка уже новых ID (на случай если уже мигрировано)
    'OOO': 'OOO',
    'AO': 'AO',
    'IP': 'IP',
};

export const LEGACY_TAX_SYSTEM_MAP: Record<string, TaxSystemId> = {
    'ОСНО': 'OSNO',
    'УСН "Доходы"': 'USN6',
    'УСН "Д-Р"': 'USN15',
    'УСН "Доходы минус расходы"': 'USN15',
    'Патент': 'PATENT',
    'АУСН': 'AUSN',
    'НПД': 'NPD',
    'ЕСХН': 'ESHN',
    // Также поддержка уже новых ID
    'OSNO': 'OSNO',
    'USN6': 'USN6',
    'USN15': 'USN15',
    'PATENT': 'PATENT',
    'AUSN': 'AUSN',
    'NPD': 'NPD',
    'ESHN': 'ESHN',
    // Поддержка старых латинских ID из ClientsView
    'osn': 'OSNO',
    'usn6': 'USN6',
    'usn15': 'USN15',
    'eshn': 'ESHN',
};

// Маппинг для старых ID из ClientsView
export const LEGACY_LOCAL_LEGAL_FORM_MAP: Record<string, LegalFormId> = {
    'ooo': 'OOO',
    'ao': 'AO',
    'ip': 'IP',
};

// Функции нормализации для обратной совместимости
export const normalizeLegalForm = (value: string): LegalFormId => {
    return LEGACY_LEGAL_FORM_MAP[value] || LEGACY_LOCAL_LEGAL_FORM_MAP[value] || 'OOO';
};

export const normalizeTaxSystem = (value: string): TaxSystemId => {
    return LEGACY_TAX_SYSTEM_MAP[value] || 'OSNO';
};

// ============================================
// BOOLEAN ПОЛЯ КЛИЕНТА (для UI)
// ============================================

export const CLIENT_BOOLEAN_FIELDS = {
    isNdsPayer: { id: 'isNdsPayer', label: 'Плательщик НДС' },
    hasEmployees: { id: 'hasEmployees', label: 'Есть сотрудники' },
    hasPatents: { id: 'hasPatents', label: 'Есть патенты' },
    paysNdflSelf: { id: 'paysNdflSelf', label: 'Платит НДФЛ за себя' },
    isNdflAgent: { id: 'isNdflAgent', label: 'НДФЛ агент (за сотрудников)' },
    isEshn: { id: 'isEshn', label: 'Плательщик ЕСХН' },
} as const;

export const getClientBooleanLabel = (id: string): string => {
    const field = Object.values(CLIENT_BOOLEAN_FIELDS).find(f => f.id === id);
    return field?.label || id;
};

// ============================================
// ПЕРИОДИЧНОСТЬ АВАНСОВ ПО ПРИБЫЛИ
// ============================================

export const PROFIT_ADVANCE_TYPES = {
    MONTHLY: { id: 'monthly', label: 'Ежемесячные авансы' },
    QUARTERLY: { id: 'quarterly', label: 'Ежеквартальные авансы' },
} as const;

export type ProfitAdvanceType = 'monthly' | 'quarterly';

export const getProfitAdvanceLabel = (id: ProfitAdvanceType | string): string => {
    const type = Object.values(PROFIT_ADVANCE_TYPES).find(t => t.id === id);
    return type?.label || id;
};

export const PROFIT_ADVANCE_OPTIONS = Object.values(PROFIT_ADVANCE_TYPES).map(t => ({
    value: t.id,
    label: t.label,
}));
