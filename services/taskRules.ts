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
 * Категория правила для справочника
 */
export type RuleCategory = 'налоговые' | 'финансовые' | 'организационные';

/**
 * Тип правила: системное (вшитое) или пользовательское
 */
export type RuleType = 'system' | 'custom';

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

  // Новые поля для справочника
  ruleType: RuleType;           // 'system' для вшитых, 'custom' для пользовательских
  category: RuleCategory;       // Вид: налоговые / финансовые / организационные
  shortTitle: string;           // Краткое название для списка
  shortDescription: string;     // Короткое описание (подзаголовок)
  description: string;          // Подробное описание
  lawReference?: string;        // Ссылка на НК РФ (для налоговых)
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
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ уведомление (1-22)',
    shortDescription: 'Уведомление по НДФЛ за период с 1 по 22 число месяца',
    description: 'Уведомление об исчисленных суммах НДФЛ за период с 1 по 22 число месяца. Налоговые агенты обязаны представить уведомление не позднее 25 числа текущего месяца.',
    lawReference: 'НК РФ ст. 58 п. 9',
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_1',
    titleTemplate: 'Уплата НДФЛ (период с 1 по 22 {monthNameGenitive})',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 28, monthOffset: 0 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ оплата (1-22)',
    shortDescription: 'Уплата НДФЛ за период с 1 по 22 число месяца',
    description: 'Уплата НДФЛ, удержанного за период с 1 по 22 число месяца. Перечисление осуществляется не позднее 28 числа текущего месяца.',
    lawReference: 'НК РФ ст. 226 п. 6',
  },
  {
    id: 'EMPLOYEE_NDFL_NOTIFICATION_2',
    titleTemplate: 'Уведомление по НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 3, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    excludeMonths: [11],
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ уведомление (23-конец)',
    shortDescription: 'Уведомление по НДФЛ за период с 23 по конец месяца',
    description: 'Уведомление об исчисленных суммах НДФЛ за период с 23 по последний день месяца. Представляется не позднее 3 числа следующего месяца.',
    lawReference: 'НК РФ ст. 58 п. 9',
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_2',
    titleTemplate: 'Уплата НДФЛ (период с 23 по {lastDayOfMonth} {monthNameGenitive})',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 5, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    excludeMonths: [11],
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ оплата (23-конец)',
    shortDescription: 'Уплата НДФЛ за период с 23 по конец месяца',
    description: 'Уплата НДФЛ за период с 23 по последний день месяца. Перечисление не позднее 5 числа следующего месяца.',
    lawReference: 'НК РФ ст. 226 п. 6',
  },
  {
    id: 'EMPLOYEE_NDFL_NOTIFICATION_2_DECEMBER',
    titleTemplate: 'Уведомление по НДФЛ (период с 23 по 31 декабря)',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
    dueDateRule: TaskDueDateRule.NoTransfer,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ декабрь уведомление',
    shortDescription: 'Уведомление по НДФЛ за 23-31 декабря',
    description: 'Уведомление об исчисленных суммах НДФЛ за период с 23 по 31 декабря. Представляется в последний рабочий день года.',
    lawReference: 'НК РФ ст. 58 п. 9',
  },
  {
    id: 'EMPLOYEE_NDFL_PAYMENT_2_DECEMBER',
    titleTemplate: 'Уплата НДФЛ (период с 23 по 31 декабря)',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 0, month: 11, specialRule: 'LAST_WORKING_DAY_OF_YEAR' },
    dueDateRule: TaskDueDateRule.NoTransfer,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДФЛ декабрь оплата',
    shortDescription: 'Уплата НДФЛ за 23-31 декабря',
    description: 'Уплата НДФЛ за период с 23 по 31 декабря. Перечисляется в последний рабочий день года.',
    lawReference: 'НК РФ ст. 226 п. 6',
  },
  {
    id: 'EMPLOYEE_INSURANCE_NOTIFICATION',
    titleTemplate: 'Уведомление по Страховым взносам за {monthName}',
    taskType: TaskType.Notification,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'СВ уведомление',
    shortDescription: 'Уведомление по страховым взносам за месяц',
    description: 'Уведомление об исчисленных суммах страховых взносов за предыдущий месяц.',
    lawReference: 'НК РФ ст. 58 п. 9',
  },
  {
    id: 'EMPLOYEE_INSURANCE_PAYMENT',
    titleTemplate: 'Уплата Страховых взносов за {monthName}',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 28, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'СВ оплата',
    shortDescription: 'Уплата страховых взносов за месяц',
    description: 'Уплата страховых взносов за предыдущий месяц. Взносы уплачиваются ежемесячно не позднее 28 числа следующего месяца.',
    lawReference: 'НК РФ ст. 431 п. 3',
  },
  {
    id: 'EMPLOYEE_PSV_REPORT',
    titleTemplate: 'Персонифицированные сведения о физ. лицах за {monthName}',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'Персонифицированные сведения',
    shortDescription: 'Сведения о застрахованных лицах за месяц',
    description: 'Сведения о застрахованных лицах. Представляется ежемесячно не позднее 25 числа следующего месяца.',
    lawReference: 'ФЗ-27 ст. 11',
  },
  {
    id: 'EMPLOYEE_TRAUMATISM_PAYMENT',
    titleTemplate: 'Уплата взносов на травматизм за {monthName}',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Monthly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 15, monthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'Травматизм оплата',
    shortDescription: 'Уплата взносов на травматизм за месяц',
    description: 'Уплата страховых взносов на обязательное социальное страхование от несчастных случаев на производстве.',
    lawReference: 'ФЗ-125 ст. 22',
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
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: '6-НДФЛ',
    shortDescription: 'Отчёт 6-НДФЛ за квартал',
    description: 'Расчет сумм налога на доходы физических лиц, исчисленных и удержанных налоговым агентом (форма 6-НДФЛ). Представляется ежеквартально.',
    lawReference: 'НК РФ ст. 230 п. 2',
  },
  {
    id: 'EMPLOYEE_RSV_REPORT',
    titleTemplate: 'РСВ (Расчет по страховым взносам) за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'РСВ',
    shortDescription: 'Расчёт по страховым взносам за квартал',
    description: 'Расчет по страховым взносам. Представляется ежеквартально не позднее 25 числа месяца, следующего за отчетным периодом.',
    lawReference: 'НК РФ ст. 431 п. 7',
  },
  {
    id: 'EMPLOYEE_EFS1_TRAUMA_REPORT',
    titleTemplate: 'Отчет ЕФС-1 (травматизм) за {quarter} квартал',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'ЕФС-1 травматизм',
    shortDescription: 'Сведения по травматизму за квартал',
    description: 'Сведения о застрахованных лицах и взносах на травматизм (раздел ЕФС-1). Представляется ежеквартально.',
    lawReference: 'ФЗ-125 ст. 24',
  },
];

const employeeYearlyRules: TaskRule[] = [
  {
    id: 'EMPLOYEE_EFS1_STAZH_REPORT',
    titleTemplate: 'Отчет ЕФС-1 (сведения о стаже) за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.hasEmployees,
    dateConfig: { day: 25, month: 0 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'ЕФС-1 стаж',
    shortDescription: 'Сведения о стаже за год',
    description: 'Сведения о страховом стаже застрахованных лиц (подраздел 1.2 ЕФС-1). Представляется ежегодно не позднее 25 января.',
    lawReference: 'ФЗ-27 ст. 11',
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
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН аванс уведомление',
    shortDescription: 'Уведомление об авансе по УСН за квартал',
    description: 'Уведомление об исчисленной сумме авансового платежа по УСН за отчетный период.',
    lawReference: 'НК РФ ст. 58 п. 9',
  },
  {
    id: 'USN_AVANS_PAYMENT',
    titleTemplate: 'Уплата аванса по УСН за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY,
    dateConfig: { day: 28, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН аванс оплата',
    shortDescription: 'Уплата аванса по УСН за квартал',
    description: 'Уплата авансового платежа по УСН за отчетный период. Авансовые платежи уплачиваются не позднее 28 числа месяца, следующего за истекшим отчетным периодом.',
    lawReference: 'НК РФ ст. 346.21 п. 7',
  },
  {
    id: 'USN_YEAR_DECLARATION_OOO',
    titleTemplate: 'Декларация по УСН за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm !== LegalForm.IP,
    dateConfig: { day: 25, month: 2 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН декларация (ООО)',
    shortDescription: 'Декларация по УСН для организаций за год',
    description: 'Годовая налоговая декларация по УСН для организаций. Представляется не позднее 25 марта года, следующего за истекшим налоговым периодом.',
    lawReference: 'НК РФ ст. 346.23 п. 1',
  },
  {
    id: 'USN_YEAR_PAYMENT_OOO',
    titleTemplate: 'Уплата налога по УСН за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm !== LegalForm.IP,
    dateConfig: { day: 28, month: 2 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН оплата (ООО)',
    shortDescription: 'Уплата налога УСН для организаций за год',
    description: 'Уплата налога по УСН за год для организаций. Уплачивается не позднее 28 марта года, следующего за истекшим налоговым периодом.',
    lawReference: 'НК РФ ст. 346.21 п. 7',
  },
  {
    id: 'USN_YEAR_DECLARATION_IP',
    titleTemplate: 'Декларация по УСН за {year-1} год',
    taskType: TaskType.Report,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm === LegalForm.IP,
    dateConfig: { day: 25, month: 3 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН декларация (ИП)',
    shortDescription: 'Декларация по УСН для ИП за год',
    description: 'Годовая налоговая декларация по УСН для ИП. Представляется не позднее 25 апреля года, следующего за истекшим налоговым периодом.',
    lawReference: 'НК РФ ст. 346.23 п. 2',
  },
  {
    id: 'USN_YEAR_PAYMENT_IP',
    titleTemplate: 'Уплата налога по УСН за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => (entity.taxSystem === TaxSystem.USN_DOHODY || entity.taxSystem === TaxSystem.USN_DOHODY_RASHODY) && entity.legalForm === LegalForm.IP,
    dateConfig: { day: 28, month: 3 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'УСН оплата (ИП)',
    shortDescription: 'Уплата налога УСН для ИП за год',
    description: 'Уплата налога по УСН за год для ИП. Уплачивается не позднее 28 апреля года, следующего за истекшим налоговым периодом.',
    lawReference: 'НК РФ ст. 346.21 п. 7',
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
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДС декларация',
    shortDescription: 'Декларация по НДС за квартал',
    description: 'Налоговая декларация по НДС. Представляется ежеквартально не позднее 25 числа месяца, следующего за истекшим кварталом.',
    lawReference: 'НК РФ ст. 174 п. 5',
  },
  {
    id: 'NDS_PAYMENT_1',
    titleTemplate: 'Уплата 1/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 1 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДС 1/3',
    shortDescription: 'Уплата 1/3 НДС за квартал',
    description: 'Уплата 1/3 суммы НДС за истекший квартал. НДС уплачивается равными долями не позднее 28 числа каждого из трёх месяцев.',
    lawReference: 'НК РФ ст. 174 п. 1',
  },
  {
    id: 'NDS_PAYMENT_2',
    titleTemplate: 'Уплата 2/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 2 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДС 2/3',
    shortDescription: 'Уплата 2/3 НДС за квартал',
    description: 'Уплата 2/3 суммы НДС за истекший квартал.',
    lawReference: 'НК РФ ст. 174 п. 1',
  },
  {
    id: 'NDS_PAYMENT_3',
    titleTemplate: 'Уплата 3/3 НДС за {quarter} квартал',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Quarterly,
    appliesTo: (entity) => entity.isNdsPayer,
    dateConfig: { day: 28, quarterMonthOffset: 3 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'НДС 3/3',
    shortDescription: 'Уплата 3/3 НДС за квартал',
    description: 'Уплата последней трети суммы НДС за истекший квартал.',
    lawReference: 'НК РФ ст. 174 п. 1',
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
    dateConfig: { day: 28, month: 11 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'ИП фикс. взносы',
    shortDescription: 'Фиксированные страховые взносы ИП за себя',
    description: 'Уплата фиксированных страховых взносов ИП за себя. Взносы уплачиваются не позднее 28 декабря текущего года.',
    lawReference: 'НК РФ ст. 432 п. 2',
  },
  {
    id: 'IP_1_PERCENT_INSURANCE_PAYMENT',
    titleTemplate: 'Уплата 1% взносов (доход свыше 300 тыс.) за {year-1} год',
    taskType: TaskType.Payment,
    periodicity: RepeatFrequency.Yearly,
    appliesTo: (entity) => entity.legalForm === LegalForm.IP,
    dateConfig: { day: 1, month: 6 },
    dueDateRule: TaskDueDateRule.NextBusinessDay,
    ruleType: 'system',
    category: 'налоговые',
    shortTitle: 'ИП 1% с дохода',
    shortDescription: '1% с дохода свыше 300 тыс. руб.',
    description: 'Уплата страховых взносов ИП в размере 1% с дохода, превышающего 300 000 рублей. Уплачивается не позднее 1 июля следующего года.',
    lawReference: 'НК РФ ст. 432 п. 2',
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