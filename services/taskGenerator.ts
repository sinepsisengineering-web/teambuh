// src/services/taskGenerator.ts

import { LegalEntity, Task, TaskStatus, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';
import { TASK_RULES, TaskRule } from './taskRules';
import { toISODateString, isWeekend, MONTH_NAMES, MONTH_NAMES_GENITIVE } from '../utils/dateUtils';
import { isHoliday } from './holidayService';

// ==========================================
// 1. БАЗОВЫЕ УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ
// ==========================================

const getNextBusinessDay = (date: Date): Date => {
  const nextDay = new Date(date);
  while (isWeekend(nextDay) || isHoliday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  return nextDay;
};

const getPreviousBusinessDay = (date: Date): Date => {
  const prevDay = new Date(date);
  while (isWeekend(prevDay) || isHoliday(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }
  return prevDay;
};

export const adjustDate = (date: Date, rule: TaskDueDateRule): Date => {
  switch (rule) {
    case TaskDueDateRule.NextBusinessDay: return getNextBusinessDay(date);
    case TaskDueDateRule.PreviousBusinessDay: return getPreviousBusinessDay(date);
    default: return date;
  }
};

const getLastWorkingDayOfYear = (year: number): Date => {
  const date = new Date(year, 11, 31);
  while (isWeekend(date) || isHoliday(date)) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

function formatTaskTitle(template: string, year: number, periodIndex: number, periodicity: RepeatFrequency): string {
  const month = (periodicity === RepeatFrequency.Monthly) ? periodIndex : new Date(year, periodIndex * 3).getMonth();
  const quarter = (periodicity === RepeatFrequency.Quarterly) ? periodIndex + 1 : 0;
  return template
    .replace('{year}', year.toString())
    .replace('{year-1}', (year - 1).toString())
    .replace('{quarter}', quarter.toString())
    .replace('{monthName}', MONTH_NAMES[month])
    .replace('{monthNameGenitive}', MONTH_NAMES_GENITIVE[month])
    .replace('{lastDayOfMonth}', new Date(year, month + 1, 0).getDate().toString());
}

// Вычисляет ЧИСТУЮ дату по правилу (без переноса)
function calculateRawDueDate(year: number, periodIndex: number, rule: TaskRule): Date {
  const { day, month, monthOffset, quarterMonthOffset, specialRule } = rule.dateConfig;

  // Для special rule — возвращаем базовую дату (31 декабря), перенос будет в adjustDate
  if (specialRule === 'LAST_WORKING_DAY_OF_YEAR') {
    return new Date(year, 11, 31); // 31 декабря
  }

  let targetMonth: number;
  switch (rule.periodicity) {
    case RepeatFrequency.Monthly:
      targetMonth = periodIndex + (monthOffset || 0);
      break;
    case RepeatFrequency.Quarterly:
      const quarterEndMonth = periodIndex * 3 + 2;
      targetMonth = quarterEndMonth + (quarterMonthOffset || 0);
      break;
    case RepeatFrequency.Yearly:
      targetMonth = month !== undefined ? month : 0;
      break;
    default:
      return new Date();
  }
  return new Date(year, targetMonth, day);
}

// Вычисляет ИТОГОВУЮ дату (с переносом)
function calculateDueDate(year: number, periodIndex: number, rule: TaskRule): Date {
  const { specialRule } = rule.dateConfig;

  // Для LAST_WORKING_DAY_OF_YEAR — используем специальную функцию
  if (specialRule === 'LAST_WORKING_DAY_OF_YEAR') {
    return getLastWorkingDayOfYear(year);
  }

  // Для остальных — вычисляем чистую дату и применяем перенос
  const rawDate = calculateRawDueDate(year, periodIndex, rule);
  return adjustDate(rawDate, rule.dueDateRule);
}

// ==========================================
// 2. ГЕНЕРАЦИЯ АВТОМАТИЧЕСКИХ ЗАДАЧ
// ==========================================

export const generateTasksForLegalEntity = (legalEntity: LegalEntity): Task[] => {
  const allTasks: Task[] = [];
  const startDate = legalEntity.createdAt ? new Date(legalEntity.createdAt) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const startYear = startDate.getFullYear();
  const yearsToGenerate = [startYear, startYear + 1, startYear + 2, startYear + 3];

  // --- Генерация задач по правилам ---
  TASK_RULES.forEach(rule => {
    if (!rule.appliesTo(legalEntity)) { return; }
    yearsToGenerate.forEach(year => {
      const periods = rule.periodicity === RepeatFrequency.Monthly ? 12
        : rule.periodicity === RepeatFrequency.Quarterly ? 4 : 1;

      for (let i = 0; i < periods; i++) {
        const periodIndex = i;

        // Пропускаем исключённые месяцы
        if (rule.periodicity === RepeatFrequency.Monthly && rule.excludeMonths?.includes(periodIndex)) {
          continue;
        }
        // Пропускаем 4 квартал для авансов
        if (rule.periodicity === RepeatFrequency.Quarterly && rule.id.includes('AVANS') && periodIndex === 3) {
          continue;
        }

        // Определяем конец периода
        let periodEndDate: Date;
        if (rule.periodicity === RepeatFrequency.Monthly) {
          periodEndDate = new Date(year, i + 1, 0);
        } else if (rule.periodicity === RepeatFrequency.Quarterly) {
          periodEndDate = new Date(year, i * 3 + 3, 0);
        } else {
          periodEndDate = new Date(year, 11, 31);
        }

        // Пропускаем периоды, которые закончились до создания клиента
        if (periodEndDate < startDate) { continue; }

        // ЧИСТАЯ дата по правилу (для original_due_date)
        const rawDueDate = calculateRawDueDate(year, periodIndex, rule);
        // ИТОГОВАЯ дата с переносом (для current_due_date)
        const dueDate = calculateDueDate(year, periodIndex, rule);

        // DEBUG: Логируем если дата была перенесена
        if (rawDueDate.getTime() !== dueDate.getTime()) {
          console.log(`[TaskGen] DATE TRANSFER: ${rule.id} - raw=${rawDueDate.toISOString().split('T')[0]}, adjusted=${dueDate.toISOString().split('T')[0]}`);
        }

        // Не создаём задачи с датой раньше создания клиента
        if (dueDate < startDate) { continue; }

        const title = formatTaskTitle(rule.titleTemplate, year, periodIndex, rule.periodicity);

        const task: Task = {
          id: `auto-${legalEntity.id}-${rule.id}-${year}-${periodIndex}`,
          legalEntityId: legalEntity.id,
          title,
          originalDueDate: rawDueDate,  // Чистая дата по правилу (25-е)
          dueDate,                       // Дата после переноса (27-е если выходной)
          status: TaskStatus.Upcoming,
          isAutomatic: true,
          dueDateRule: rule.dueDateRule,
          repeat: rule.periodicity,
          reminder: ReminderSetting.OneWeek,
          seriesId: `series-auto-${legalEntity.id}-${rule.id}`,
          isPeriodLocked: true,
        };
        allTasks.push(task);
      }
    });
  });

  // --- Генерация задач по патентам ---
  if (legalEntity.patents && legalEntity.patents.length > 0) {
    legalEntity.patents.forEach(patent => {
      const originalStartDate = new Date(patent.startDate);
      const patentYearsToGenerate = yearsToGenerate.filter(y => y >= originalStartDate.getFullYear());

      patentYearsToGenerate.forEach(year => {
        if (year > originalStartDate.getFullYear() && !patent.autoRenew) return;

        const originalEndDate = new Date(patent.endDate);
        const yearOffset = year - originalStartDate.getFullYear();
        const currentYearStartDate = new Date(originalStartDate);
        currentYearStartDate.setFullYear(originalStartDate.getFullYear() + yearOffset);
        const currentYearEndDate = new Date(originalEndDate);
        currentYearEndDate.setFullYear(originalEndDate.getFullYear() + yearOffset);

        if (currentYearEndDate < startDate) { return; }

        const durationMonths = (currentYearEndDate.getFullYear() - currentYearStartDate.getFullYear()) * 12
          + (currentYearEndDate.getMonth() - currentYearStartDate.getMonth()) + 1;
        const seriesId = `series-patent-${patent.id}-${year}`;

        const createPatentTask = (idSuffix: string, title: string, date: Date, dueDateRule: TaskDueDateRule, locked: boolean = true): Task => ({
          id: `patent-${idSuffix}-${patent.id}-${year}`,
          legalEntityId: legalEntity.id,
          title: `${title} «${patent.name}» за ${year}г.`,
          dueDate: adjustDate(date, dueDateRule),
          status: TaskStatus.Upcoming,
          isAutomatic: true,
          dueDateRule: dueDateRule,
          repeat: RepeatFrequency.Yearly,
          reminder: ReminderSetting.OneWeek,
          seriesId,
          isPeriodLocked: locked
        });

        const safePush = (task: Task) => {
          if (task.dueDate >= startDate) {
            allTasks.push(task);
          }
        };

        // Напоминание о подаче уведомления на уменьшение налога (за 22 дня до оплаты)
        const createTaxReductionNotification = (paymentDate: Date, paymentTitle: string) => {
          const notificationDate = new Date(paymentDate);
          notificationDate.setDate(notificationDate.getDate() - 22);
          return createPatentTask(
            `tax-reduction-${paymentTitle.replace(/\s/g, '-')}`,
            'Напоминание: через 2 дня подать уведомление на уменьшение налога',
            notificationDate,
            TaskDueDateRule.PreviousBusinessDay,
            false
          );
        };

        if (durationMonths <= 6) {
          safePush(createTaxReductionNotification(currentYearEndDate, 'full'));
          safePush(createPatentTask('payment-full', 'Оплата патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay));
        } else if (durationMonths > 6 && durationMonths <= 12) {
          const firstPaymentDate = new Date(currentYearStartDate);
          firstPaymentDate.setDate(firstPaymentDate.getDate() + 90);

          safePush(createTaxReductionNotification(firstPaymentDate, '1-of-2'));
          safePush(createPatentTask('payment-1-of-2', 'Оплата 1/3 патента', firstPaymentDate, TaskDueDateRule.NextBusinessDay));

          safePush(createTaxReductionNotification(currentYearEndDate, '2-of-2'));
          safePush(createPatentTask('payment-2-of-2', 'Оплата 2/3 патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay));
        }

        if (patent.autoRenew) {
          const renewalDate = new Date(currentYearEndDate);
          renewalDate.setMonth(renewalDate.getMonth() - 1);
          if (renewalDate >= startDate) {
            safePush(createPatentTask('renewal', 'Продление патента', renewalDate, TaskDueDateRule.PreviousBusinessDay, false));
          }
        }
      });
    });
  }

  return allTasks;
};

// ==========================================
// 3. ЦЕПОЧКИ ПОСЛЕДОВАТЕЛЬНОГО ВЫПОЛНЕНИЯ
// ==========================================

/**
 * Карта цепочек задач: задача требует выполнения предшественника.
 * Формат: { ruleId: predecessorRuleId }
 */
const TASK_CHAINS: Record<string, string> = {
  // === НДС: 1/3 → 2/3 → 3/3 ===
  'NDS_PAYMENT_2': 'NDS_PAYMENT_1',
  'NDS_PAYMENT_3': 'NDS_PAYMENT_2',

  // === НДФЛ: уведомление → оплата ===
  'EMPLOYEE_NDFL_PAYMENT_1': 'EMPLOYEE_NDFL_NOTIFICATION_1',
  'EMPLOYEE_NDFL_PAYMENT_2': 'EMPLOYEE_NDFL_NOTIFICATION_2',

  // === Страховые взносы: уведомление → оплата ===
  'EMPLOYEE_INSURANCE_PAYMENT': 'EMPLOYEE_INSURANCE_NOTIFICATION',

  // === УСН авансы: уведомление → оплата ===
  'USN_AVANS_PAYMENT': 'USN_AVANS_NOTIFICATION',

  // === Годовые декларации: декларация → оплата ===
  'USN_YEAR_PAYMENT_OOO': 'USN_YEAR_DECLARATION_OOO',
  'USN_YEAR_PAYMENT_IP': 'USN_YEAR_DECLARATION_IP',
};

/**
 * Карта цепочек для патентов: оплата требует выполнения напоминания
 */
const PATENT_CHAINS: Record<string, string> = {
  'payment-full': 'tax-reduction-full',
  'payment-1-of-2': 'tax-reduction-1-of-2',
  'payment-2-of-2': 'tax-reduction-2-of-2',
};

/**
 * Получить ID предыдущей задачи в цепочке
 */
export const getPredecessorTaskId = (task: Task): string | null => {
  if (!task.isAutomatic) return null;

  // Обработка патентов
  if (task.id.startsWith('patent-')) {
    // Формат: patent-{type}-{patentId}-{year}
    const patentMatch = task.id.match(/^patent-([a-z0-9-]+)-([a-z0-9-]+)-(\d{4})$/i);
    if (!patentMatch) return null;

    const [, taskType, patentId, year] = patentMatch;
    const predecessorType = PATENT_CHAINS[taskType];
    if (!predecessorType) return null;

    return `patent-${predecessorType}-${patentId}-${year}`;
  }

  // Обработка автоматических задач по правилам
  if (!task.id.startsWith('auto-')) return null;

  const regex = /auto-(.+)-([A-Za-z0-9_]+)-(\d{4})-(\d+)$/;
  const match = task.id.match(regex);
  if (!match) return null;

  const [, clientId, ruleId, year, periodIndex] = match;
  const predecessorRuleId = TASK_CHAINS[ruleId];
  if (!predecessorRuleId) return null;

  return `auto-${clientId}-${predecessorRuleId}-${year}-${periodIndex}`;
};

/**
 * Проверить, можно ли выполнить задачу (предшественник завершён)
 */
export const canCompleteTask = (task: Task, allTasks: Task[]): boolean => {
  // Амнистия для задач прошлых лет — выполняем без проверок
  const taskYear = new Date(task.dueDate).getFullYear();
  const currentYear = new Date().getFullYear();
  if (taskYear < currentYear) return true;

  const predecessorId = getPredecessorTaskId(task);
  if (!predecessorId) return true;

  const predecessor = allTasks.find(t => t.id === predecessorId);
  if (!predecessor) return true;

  return predecessor.status === TaskStatus.Completed;
};

/**
 * Получить блокирующую задачу-предшественника
 */
export const getBlockingPredecessor = (task: Task, allTasks: Task[]): Task | null => {
  // Амнистия для задач прошлых лет — нет блокировки
  const taskYear = new Date(task.dueDate).getFullYear();
  const currentYear = new Date().getFullYear();
  if (taskYear < currentYear) return null;

  const predecessorId = getPredecessorTaskId(task);
  if (!predecessorId) return null;

  const predecessor = allTasks.find(t => t.id === predecessorId);
  if (!predecessor || predecessor.status === TaskStatus.Completed) return null;

  return predecessor;
};

// ==========================================
// 4. ЛОГИКА БЛОКИРОВКИ ПО ПЕРИОДУ
// ==========================================

export const getTaskStatus = (dueDate: Date): TaskStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return TaskStatus.Overdue;
  if (diffDays === 0) return TaskStatus.DueToday;
  if (diffDays <= 7) return TaskStatus.DueSoon;
  return TaskStatus.Upcoming;
};

const getPeriodStartDateForTask = (task: Task): Date | null => {
  if (!task.isAutomatic) return null;

  // Патенты: разблокируются с 1 января года
  if (task.id.startsWith('patent-')) {
    const parts = task.id.split('-');
    const year = parseInt(parts[parts.length - 1], 10);
    return !isNaN(year) ? new Date(year, 0, 1) : null;
  }

  // Автоматические задачи по правилам
  const regex = /auto-.*-([A-Za-z0-9_]+)-(\d{4})-(\d+)$/;
  const match = task.id.match(regex);
  if (!match) return null;

  const ruleId = match[1];
  const year = parseInt(match[2], 10);
  const periodIndex = parseInt(match[3], 10);

  const taskRule = TASK_RULES.find(r => r.id === ruleId);
  if (!taskRule) return null;

  let periodStartDate: Date;

  switch (taskRule.periodicity) {
    case RepeatFrequency.Monthly: {
      const monthOffset = taskRule.dateConfig.monthOffset || 0;
      periodStartDate = new Date(year, periodIndex + monthOffset, 1);
      // Для задач второго периода (с 23 по конец месяца)
      if (taskRule.id.includes('_2') && monthOffset === 0) {
        periodStartDate.setDate(23);
      }
      break;
    }

    case RepeatFrequency.Quarterly: {
      // Период начинается с месяца выполнения задачи
      const quarterStartMonth = (periodIndex + 1) * 3;
      const quarterMonthOffset = taskRule.dateConfig.quarterMonthOffset || 1;
      periodStartDate = new Date(year, quarterStartMonth + quarterMonthOffset - 1, 1);
      break;
    }

    case RepeatFrequency.Yearly: {
      // Разблокировка с 1 числа месяца срока выполнения
      const dueMonth = taskRule.dateConfig.month ?? 0;

      if (taskRule.dateConfig.specialRule === 'LAST_WORKING_DAY_OF_YEAR' || taskRule.id.includes('DECEMBER')) {
        // Декабрьские задачи — разблокируем 1 декабря
        periodStartDate = new Date(year, 11, 1);
      } else {
        // Обычные годовые задачи — разблокируем 1-го числа месяца срока
        periodStartDate = new Date(year, dueMonth, 1);
      }
      break;
    }

    default:
      return null;
  }

  return periodStartDate;
};

export const isTaskLocked = (task: Task): boolean => {
  if (!task.isAutomatic || task.isPeriodLocked === false) return false;

  const periodStartDate = getPeriodStartDateForTask(task);
  if (!periodStartDate) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return now < periodStartDate;
};

export const updateTaskStatuses = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    if (task.status === TaskStatus.Completed) return task;

    const locked = isTaskLocked(task);

    if (locked) {
      return task.status === TaskStatus.Locked ? task : { ...task, status: TaskStatus.Locked };
    }

    const statusByDate = getTaskStatus(task.dueDate);
    return task.status === statusByDate ? task : { ...task, status: statusByDate };
  });
};