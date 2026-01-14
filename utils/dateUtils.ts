// utils/dateUtils.ts
// Унифицированные утилиты для работы с датами

/**
 * Преобразует дату в строку формата YYYY-MM-DD
 */
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Проверяет, является ли дата выходным (суббота или воскресенье)
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 6 || day === 0;
};

/**
 * Возвращает последний день месяца
 */
export const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Названия месяцев (именительный падеж)
 */
export const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

/**
 * Названия месяцев (родительный падеж)
 */
export const MONTH_NAMES_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];
