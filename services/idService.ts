// services/idService.ts
// Сервис генерации и валидации ID

import { EntityPrefix } from '../types/data';

/**
 * Генерирует уникальный ID
 * Формат: prefix_timestamp_random
 * @example generateId('emp') → "emp_1705680000_x7k2"
 */
export function generateId(prefix: EntityPrefix): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Проверяет валидность формата ID
 */
export function isValidId(id: string, expectedPrefix?: EntityPrefix): boolean {
    const pattern = /^([a-z]+)_(\d+)_([a-z0-9]+)$/;
    const match = id.match(pattern);

    if (!match) return false;
    if (expectedPrefix && match[1] !== expectedPrefix) return false;

    return true;
}

/**
 * Извлекает префикс из ID
 */
export function getIdPrefix(id: string): string | null {
    const match = id.match(/^([a-z]+)_/);
    return match ? match[1] : null;
}

/**
 * Извлекает timestamp из ID
 */
export function getIdTimestamp(id: string): Date | null {
    const match = id.match(/_(\d+)_/);
    if (!match) return null;
    return new Date(parseInt(match[1]) * 1000);
}

/**
 * Префиксы для разных сущностей
 */
export const ID_PREFIXES: Record<string, EntityPrefix> = {
    organization: 'org',
    employee: 'emp',
    client: 'cli',
    task: 'task',
    document: 'doc',
    payroll: 'payroll',
    role: 'role',
    permission: 'perm',
};
