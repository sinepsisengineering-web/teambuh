// services/dateRegistry.ts
// Единый реестр свойств дат (выходные, праздники, рабочие дни)
// Singleton-паттерн: один источник правды для всех календарей

import { toISODateString } from '../utils/dateUtils';

// ==========================================
// ТИПЫ
// ==========================================

export interface DateProps {
    date: string;            // YYYY-MM-DD
    isWorkday: boolean;      // Рабочий день (можно назначать задачи)
    isWeekend: boolean;      // Суббота или воскресенье
    isHoliday: boolean;      // Официальный праздник
    isShortenedDay: boolean; // Сокращённый предпраздничный день
}

interface YearCache {
    year: number;
    data: string;            // Строка из API: "0110010..." 
    fetchedAt: string;
    isFromApi: boolean;
}

// ==========================================
// КОНСТАНТЫ
// ==========================================

const CACHE_KEY = 'date_registry_cache';
const API_BASE_URL = 'https://isdayoff.ru/api/getdata';

// Базовые праздники (fallback без API)
const BASE_HOLIDAYS: Record<string, boolean> = {
    '01-01': true, '01-02': true, '01-03': true, '01-04': true,
    '01-05': true, '01-06': true, '01-07': true, '01-08': true,
    '02-23': true, '03-08': true, '05-01': true, '05-09': true,
    '06-12': true, '11-04': true
};

// ==========================================
// ВНУТРЕННЕЕ СОСТОЯНИЕ
// ==========================================

let yearDataCache: Map<number, string> = new Map();
let isInitialized = false;

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

/**
 * Загрузить кэш из localStorage
 */
const loadCache = (): Record<number, YearCache> => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch {
        return {};
    }
};

/**
 * Сохранить кэш в localStorage
 */
const saveCache = (cache: Record<number, YearCache>): void => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

/**
 * Получить индекс дня в году (0-based)
 */
const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) - 1;
};

/**
 * Проверить, является ли день выходным (Сб/Вс)
 */
const isWeekendDay = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Вс, 6 = Сб
};

/**
 * Проверить, является ли дата базовым праздником
 */
const isBaseHoliday = (date: Date): boolean => {
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return BASE_HOLIDAYS[monthDay] ?? false;
};

// ==========================================
// API ФУНКЦИИ
// ==========================================

/**
 * Загрузить данные года с API isDayOff
 */
export const fetchYearData = async (year: number): Promise<string | null> => {
    if (!navigator.onLine) {
        console.log(`[DateRegistry] Нет интернета, пропускаем ${year}`);
        return null;
    }

    try {
        const url = `${API_BASE_URL}?year=${year}&cc=ru`;
        console.log(`[DateRegistry] Загрузка: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[DateRegistry] Ошибка API: ${response.status}`);
            return null;
        }

        const data = await response.text();

        // Валидация: строка из 0, 1, 2, 4
        // 0 = рабочий, 1 = выходной, 2 = сокращённый, 4 = рабочий (перенесённый)
        if (!/^[0124]+$/.test(data)) {
            console.error('[DateRegistry] Неверный формат ответа');
            return null;
        }

        console.log(`[DateRegistry] Загружено ${data.length} дней на ${year}`);
        return data;

    } catch (error) {
        console.error('[DateRegistry] Ошибка загрузки:', error);
        return null;
    }
};

/**
 * Получить данные года (из кэша или API)
 */
export const getYearData = async (year: number): Promise<string> => {
    // Проверяем memory cache
    if (yearDataCache.has(year)) {
        return yearDataCache.get(year)!;
    }

    // Проверяем localStorage
    const cache = loadCache();
    if (cache[year]?.isFromApi) {
        yearDataCache.set(year, cache[year].data);
        return cache[year].data;
    }

    // Загружаем с API
    const data = await fetchYearData(year);

    if (data) {
        cache[year] = {
            year,
            data,
            fetchedAt: new Date().toISOString(),
            isFromApi: true
        };
        saveCache(cache);
        yearDataCache.set(year, data);
        return data;
    }

    // Fallback: пустая строка (будем использовать isWeekendDay + isBaseHoliday)
    return '';
};

/**
 * Получить данные года СИНХРОННО (только из кэша)
 */
export const getYearDataSync = (year: number): string => {
    if (yearDataCache.has(year)) {
        return yearDataCache.get(year)!;
    }

    const cache = loadCache();
    if (cache[year]) {
        yearDataCache.set(year, cache[year].data);
        return cache[year].data;
    }

    return '';
};

// ==========================================
// ПУБЛИЧНЫЕ API
// ==========================================

/**
 * Получить свойства даты
 */
export const getDateProps = (dateInput: Date | string): DateProps => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const dateStr = toISODateString(date);
    const year = date.getFullYear();
    const dayIndex = getDayOfYear(date);

    const yearData = getYearDataSync(year);
    const isWeekend = isWeekendDay(date);

    let isHoliday = false;
    let isShortenedDay = false;
    let isWorkday = true;

    if (yearData && dayIndex < yearData.length) {
        const dayCode = yearData[dayIndex];
        // 0 = рабочий, 1 = выходной, 2 = сокращённый, 4 = рабочий (перенос)
        isWorkday = dayCode === '0' || dayCode === '2' || dayCode === '4';
        isShortenedDay = dayCode === '2';
        // Праздник = выходной по API, но НЕ обычный weekend
        isHoliday = dayCode === '1' && !isWeekend;
    } else {
        // Fallback: выходные + базовые праздники
        isHoliday = isBaseHoliday(date);
        isWorkday = !isWeekend && !isHoliday;
    }

    return {
        date: dateStr,
        isWorkday,
        isWeekend,
        isHoliday,
        isShortenedDay
    };
};

/**
 * Проверить, является ли дата рабочим днём
 */
export const isWorkday = (dateInput: Date | string): boolean => {
    return getDateProps(dateInput).isWorkday;
};

/**
 * Найти ближайший рабочий день (для переноса задач)
 */
export const findNextWorkday = (fromDate: Date | string, direction: 'forward' | 'backward' = 'backward'): string => {
    let date = typeof fromDate === 'string' ? new Date(fromDate) : new Date(fromDate);
    const step = direction === 'forward' ? 1 : -1;

    // Максимум 30 дней поиска
    for (let i = 0; i < 30; i++) {
        date.setDate(date.getDate() + step);
        if (isWorkday(date)) {
            return toISODateString(date);
        }
    }

    // Если не нашли — возвращаем исходную дату
    return toISODateString(typeof fromDate === 'string' ? new Date(fromDate) : fromDate);
};

/**
 * Инициализация при запуске приложения
 */
export const initializeDateRegistry = async (): Promise<void> => {
    if (isInitialized) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    console.log('[DateRegistry] Инициализация...');

    // Загружаем текущий год
    await getYearData(currentYear);

    // С октября загружаем следующий год
    if (currentMonth >= 9) {
        await getYearData(currentYear + 1);
    }

    isInitialized = true;
    console.log('[DateRegistry] Готов');
};

/**
 * Предзагрузить данные для диапазона (для отображения календаря)
 */
export const preloadYears = async (years: number[]): Promise<void> => {
    for (const year of years) {
        if (!yearDataCache.has(year)) {
            await getYearData(year);
        }
    }
};

export default {
    getDateProps,
    isWorkday,
    findNextWorkday,
    initializeDateRegistry,
    preloadYears
};
