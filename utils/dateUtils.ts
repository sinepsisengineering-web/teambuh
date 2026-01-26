// utils/dateUtils.ts
// Унифицированные утилиты для работы с датами

/**
 * Преобразует дату в строку формата YYYY-MM-DD (локальное время, без UTC сдвига)
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
