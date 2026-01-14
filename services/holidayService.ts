// services/holidayService.ts
// Сервис для загрузки и кэширования производственного календаря с API isDayOff.ru

import { toISODateString } from '../utils/dateUtils';

// ==========================================
// ТИПЫ И КОНСТАНТЫ
// ==========================================

interface HolidayCache {
    year: number;
    holidays: string[];      // Массив дат в формате YYYY-MM-DD
    fetchedAt: string;       // ISO дата загрузки
    isDownloaded: boolean;   // Флаг что данные с API
}

interface HolidayState {
    [year: number]: HolidayCache;
}

const CACHE_KEY = 'holiday_calendar_cache';
const API_BASE_URL = 'https://isdayoff.ru/api/getdata';

// Базовые праздники (используются как fallback)
const BASE_HOLIDAYS = [
    '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', // Новогодние
    '02-23', // День защитника Отечества
    '03-08', // Международный женский день
    '05-01', // Праздник Весны и Труда
    '05-09', // День Победы
    '06-12', // День России
    '11-04', // День народного единства
];

// ==========================================
// ВНУТРЕННИЕ ФУНКЦИИ
// ==========================================

/**
 * Загрузить кэш из localStorage
 */
const loadCache = (): HolidayState => {
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
const saveCache = (state: HolidayState): void => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
};

/**
 * Парсит ответ API isDayOff в массив дат праздников
 * API возвращает строку типа "0110010..." где 1 = выходной/праздник
 */
const parseApiResponse = (data: string, year: number): string[] => {
    const holidays: string[] = [];
    const startDate = new Date(year, 0, 1);

    for (let i = 0; i < data.length; i++) {
        if (data[i] === '1' || data[i] === '2') { // 1=выходной, 2=сокращённый
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            holidays.push(toISODateString(date));
        }
    }

    return holidays;
};

/**
 * Генерирует fallback праздники на год (базовые + выходные)
 */
const generateFallbackHolidays = (year: number): string[] => {
    return BASE_HOLIDAYS.map(md => `${year}-${md}`);
};

/**
 * Проверяет есть ли интернет
 */
const hasInternet = (): boolean => {
    return navigator.onLine;
};

/**
 * Показать системное уведомление
 */
const showNotification = (title: string, body: string): void => {
    if ((window as any).electronAPI) {
        (window as any).electronAPI.showNotification(title, body);
    } else {
        console.warn('[HolidayService] Уведомление:', title, body);
    }
};

// ==========================================
// ПУБЛИЧНЫЕ ФУНКЦИИ
// ==========================================

/**
 * Скачать календарь с API для указанного года
 */
export const fetchHolidaysFromApi = async (year: number): Promise<string[] | null> => {
    if (!hasInternet()) {
        console.log(`[HolidayService] Нет интернета, не могу загрузить ${year}`);
        return null;
    }

    try {
        const url = `${API_BASE_URL}?year=${year}&cc=ru`;
        console.log(`[HolidayService] Загрузка календаря: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек таймаут

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[HolidayService] Ошибка API: ${response.status}`);
            return null;
        }

        const data = await response.text();

        // Валидация: должна быть строка из 0, 1, 2
        if (!/^[012]+$/.test(data)) {
            console.error('[HolidayService] Неверный формат ответа API');
            return null;
        }

        const holidays = parseApiResponse(data, year);
        console.log(`[HolidayService] Загружено ${holidays.length} выходных дней на ${year}`);

        return holidays;
    } catch (error) {
        console.error('[HolidayService] Ошибка загрузки:', error);
        return null;
    }
};

/**
 * Получить праздники для года (из кэша или API)
 */
export const getHolidaysForYear = async (year: number): Promise<Set<string>> => {
    const cache = loadCache();

    // Если есть в кэше и скачан с API — используем
    if (cache[year]?.isDownloaded) {
        console.log(`[HolidayService] Используем кэш для ${year}`);
        return new Set(cache[year].holidays);
    }

    // Пробуем скачать с API
    const holidays = await fetchHolidaysFromApi(year);

    if (holidays) {
        // Сохраняем в кэш
        cache[year] = {
            year,
            holidays,
            fetchedAt: new Date().toISOString(),
            isDownloaded: true,
        };
        saveCache(cache);
        return new Set(holidays);
    }

    // Fallback: базовые праздники (только даты без выходных)
    console.log(`[HolidayService] Используем fallback для ${year}`);
    const fallback = generateFallbackHolidays(year);

    cache[year] = {
        year,
        holidays: fallback,
        fetchedAt: new Date().toISOString(),
        isDownloaded: false,
    };
    saveCache(cache);

    return new Set(fallback);
};

/**
 * Синхронно получить праздники (из кэша, без API)
 * Используется в функциях где нельзя await
 */
export const getHolidaysSync = (year: number): Set<string> => {
    const cache = loadCache();

    if (cache[year]) {
        return new Set(cache[year].holidays);
    }

    // Генерируем fallback
    return new Set(generateFallbackHolidays(year));
};

/**
 * Проверить, является ли дата праздником/выходным
 */
export const isHoliday = (date: Date): boolean => {
    const year = date.getFullYear();
    const holidays = getHolidaysSync(year);
    return holidays.has(toISODateString(date));
};

/**
 * Инициализация при запуске приложения
 * - Загружает текущий год если не загружен
 * - В октябре проверяет следующий год
 * - С 1 ноября уведомляет если следующий год не загружен
 */
export const initializeHolidayService = async (): Promise<void> => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    console.log('[HolidayService] Инициализация...');

    // Загружаем текущий год
    await getHolidaysForYear(currentYear);

    // Если октябрь или позже — проверяем следующий год
    if (currentMonth >= 9) { // 9 = октябрь
        const nextYear = currentYear + 1;
        const cache = loadCache();

        if (!cache[nextYear]?.isDownloaded) {
            console.log(`[HolidayService] Проверяем календарь на ${nextYear}...`);
            const holidays = await fetchHolidaysFromApi(nextYear);

            if (holidays) {
                cache[nextYear] = {
                    year: nextYear,
                    holidays,
                    fetchedAt: new Date().toISOString(),
                    isDownloaded: true,
                };
                saveCache(cache);
                console.log(`[HolidayService] Календарь ${nextYear} успешно загружен`);
            } else if (currentMonth >= 10) { // 10 = ноябрь
                // С 1 ноября показываем уведомление
                showNotification(
                    'Производственный календарь',
                    `Не удалось загрузить календарь на ${nextYear} год. Проверьте подключение к интернету.`
                );
            }
        }
    }

    console.log('[HolidayService] Инициализация завершена');
};

/**
 * Проверить статус загрузки календарей
 */
export const getHolidayStatus = (): { currentYear: boolean; nextYear: boolean } => {
    const cache = loadCache();
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;

    return {
        currentYear: cache[currentYear]?.isDownloaded ?? false,
        nextYear: cache[nextYear]?.isDownloaded ?? false,
    };
};
