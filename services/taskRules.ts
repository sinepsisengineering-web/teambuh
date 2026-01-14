// src/services/taskRules.ts

import { LegalEntity, TaskDueDateRule, RepeatFrequency, LegalForm, TaxSystem } from '../types';

/**
 * Определяет тип задачи для лучшей классификации.
 */
export enum TaskType {
  Notification = 'Уведомление',
  Payment = 'Уплата',
  Report = 'Отчет',
}

/**
 * Описывает, как рассчитать базовую дату для задачи.
 */
export interface DateCalculationConfig {
  day: number;
  month?: number; 
  monthOffset?: number; 
  quarterMonthOffset?: number; 
  specialRule?: 'LAST_WORKING_DAY_OF_YEAR';
}

/**
 * Интерфейс, описывающий одно полное правило для генерации серии задач.
 */
export interface TaskRule {
  id: string;
  titleTemplate: string;
  taskType: TaskType;
  periodicity: RepeatFrequency;
  appliesTo: (entity: LegalEntity) => boolean;
  dateConfig: DateCalculationConfig;
  dueDateRule: TaskDueDateRule;
  excludeMonths?: number[]; 
}

// --- НАЧАЛО ОПИСАНИЯ ПРАВИЛ ---

// -- Группа 1: Задачи для сотрудников --

const employeeMonthlyRules: TaskRule[] = [
  {
    id: 'EMPLOYEE_NDFL_NOTIFICATION_1',
    titleTemplate: 'Уведомление по НДФЛ (период с 1 по 22 {monthNameGenitive})',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, monthOffset: 0 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_1',
    titleTemplate: 'Уплата НДФЛ (период с 1 по 22 {monthNameGenitive})',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 28, monthOffset: 0 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_NDFL_NOTIFICATION_2',
    titleTemplate: 'Уведомление по НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 3, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    excludeMonths: [11], // Исключаем декабрь
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_2',
    titleTemplate: 'Уплата НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 5, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    excludeMonths: [11], // Исключаем декабрь
  },
  {
    id: 'EMPLOYEE_NDFL_NOTIFICATION_2_DECEMBER',
    titleTemplate: 'Уведомление по НДФЛ (период с 23 по 31 декабря)',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
    dueDateRule: TaskDueDateRule.NoTransfer,
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_2_DECEMBER',
    titleTemplate: 'Уплата НДФЛ (период с 23 по 31 декабря)',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
    dueDateRule: TaskDueDateRule.NoTransfer,
  },
  {
    id: 'EMPLOYEE_INSURANCE_NOTIFICATION',
    titleTemplate: 'Уведомление по Страховым взносам за {monthName}',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_INSURANCE_PAYMENT',
    titleTemplate: 'Уплата Страховых взносов за {monthName}',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 28, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_PSV_REPORT',
    titleTemplate: 'Персонифицированные сведения о физ. лицах за {monthName}',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_TRAUMATISM_PAYMENT',
    titleTemplate: 'Уплата взносов на травматизм за {monthName}',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 15, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

const employeeQuarterlyRules: TaskRule[] = [
  {
    id: 'EMPLOYEE_6NDFL_REPORT',
    titleTemplate: 'Отчет 6-НДФЛ за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_RSV_REPORT',
    titleTemplate: 'РСВ (Расчет по страховым взносам) за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'EMPLOYEE_EFS1_TRAUMA_REPORT',
    titleTemplate: 'Отчет ЕФС-1 (травматизм) за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

const employeeYearlyRules: TaskRule[] = [
  {
    id: 'EMPLOYEE_EFS1_STAZH_REPORT',
    titleTemplate: 'Отчет ЕФС-1 (сведения о стаже) за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, month: 0 }, // 25 января
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

// -- Группа 2: Задачи для УСН --

const usnRules: TaskRule[] = [
  {
    id: 'USN_AVANS_NOTIFICATION',
    titleTemplate: 'Уведомление об авансе по УСН за {quarter} квартал',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'USN_AVANS_PAYMENT',
    titleTemplate: 'Уплата аванса по УСН за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY,
    dateConfig: { day: 28, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'USN_YEAR_DECLARATION_OOO',
    titleTemplate: 'Декларация по УСН за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm !== LegalForm.IP,
    dateConfig: { day: 25, month: 2 }, // 25 марта
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'USN_YEAR_PAYMENT_OOO',
    titleTemplate: 'Уплата налога по УСН за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm !== LegalForm.IP,
    dateConfig: { day: 28, month: 2 }, // 28 марта
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'USN_YEAR_DECLARATION_IP',
    titleTemplate: 'Декларация по УСН за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm === LegalForm.IP,
    dateConfig: { day: 25, month: 3 }, // 25 апреля
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'USN_YEAR_PAYMENT_IP',
    titleTemplate: 'Уплата налога по УСН за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm === LegalForm.IP,
    dateConfig: { day: 28, month: 3 }, // 28 апреля
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

// -- Группа 3: Задачи по НДС (для ОСНО и УСН) --

const ndsRules: TaskRule[] = [
  {
    id: 'NDS_DECLARATION',
    titleTemplate: 'Декларация по НДС за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'NDS_PAYMENT_1',
    titleTemplate: 'Уплата 1/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'NDS_PAYMENT_2',
    titleTemplate: 'Уплата 2/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 2 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'NDS_PAYMENT_3',
    titleTemplate: 'Уплата 3/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 3 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

// -- Группа 4: Задачи только для ИП --

const ipOnlyRules: TaskRule[] = [
  {
    id: 'IP_FIXED_INSURANCE_PAYMENT',
    titleTemplate: 'Уплата фиксированных взносов за себя за {year} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.legalForm === LegalForm.IP,
    dateConfig: { day: 28, month: 11 }, // 28 декабря
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
  {
    id: 'IP_1_PERCENT_INSURANCE_PAYMENT',
    titleTemplate: 'Уплата 1% взносов (доход свыше 300 тыс.) за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.legalForm === LegalForm.IP,
    dateConfig: { day: 1, month: 6 }, // 1 июля
    dueDateRule: TaskDueDateRule.NextBusinessDay,
  },
];

// --- КОНЕЦ ОПИСАНИЯ ПРАВИЛ ---

/**
 * Главный экспорт: массив всех правил, по которым будет работать генератор.
 */
export const TASK_RULES: TaskRule[] = [
  ...employeeMonthlyRules,
  ...employeeQuarterlyRules,
  ...employeeYearlyRules,
  ...usnRules,
  ...ndsRules,
  ...ipOnlyRules,
];