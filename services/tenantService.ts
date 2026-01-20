// services/tenantService.ts
// Сервис управления организациями (мультитенант)

import { TenantMeta, TenantOwner, TenantSettings, TenantSubscription } from '../types/data';
import { generateId } from './idService';

// ============================================
// ТИПЫ
// ============================================

export interface TenantRegistryEntry {
    id: string;
    name: string;
    folder: string;
    createdAt: string;
    status: 'active' | 'suspended' | 'deleted';
    plan: 'basic' | 'professional' | 'enterprise';
    adminEmail: string;
}

// ============================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ
// ============================================

let tenantsRegistry: Map<string, TenantRegistryEntry> = new Map();
let tenantsMeta: Map<string, TenantMeta> = new Map();

// Текущий тенант (для работы приложения)
let currentTenantId: string | null = null;

// Инициализация мок-данными
const initMockData = () => {
    // Регистрируем тестовую организацию
    const testTenant: TenantRegistryEntry = {
        id: 'org_1705680000_test',
        name: 'ООО Тестовая Бухгалтерия',
        folder: 'org_test',
        createdAt: '2024-01-01T00:00:00Z',
        status: 'active',
        plan: 'professional',
        adminEmail: 'admin@test.ru',
    };

    tenantsRegistry.set(testTenant.id, testTenant);

    const testMeta: TenantMeta = {
        id: testTenant.id,
        name: testTenant.name,
        inn: '7700000001',
        createdAt: testTenant.createdAt,
        owner: {
            employeeId: 'emp_1705680000_a1b2',
            name: 'Иванова Мария Петровна',
            email: testTenant.adminEmail,
        },
        settings: {
            timezone: 'Europe/Moscow',
            language: 'ru',
            currency: 'RUB',
        },
        subscription: {
            plan: 'professional',
            expiresAt: '2025-12-31T23:59:59Z',
        },
    };

    tenantsMeta.set(testTenant.id, testMeta);
    currentTenantId = testTenant.id;
};

initMockData();

// ============================================
// УПРАВЛЕНИЕ ТЕКУЩИМ ТЕНАНТОМ
// ============================================

/**
 * Получить ID текущей организации
 */
export function getCurrentTenantId(): string | null {
    return currentTenantId;
}

/**
 * Установить текущую организацию
 */
export function setCurrentTenant(tenantId: string): boolean {
    const tenant = tenantsRegistry.get(tenantId);
    if (!tenant || tenant.status !== 'active') return false;

    currentTenantId = tenantId;
    return true;
}

/**
 * Получить метаданные текущей организации
 */
export function getCurrentTenantMeta(): TenantMeta | null {
    if (!currentTenantId) return null;
    return tenantsMeta.get(currentTenantId) || null;
}

// ============================================
// CRUD ОПЕРАЦИИ
// ============================================

/**
 * Получить список всех организаций
 */
export async function getAllTenants(): Promise<TenantRegistryEntry[]> {
    return Array.from(tenantsRegistry.values());
}

/**
 * Получить организацию по ID
 */
export async function getTenantById(id: string): Promise<TenantRegistryEntry | null> {
    return tenantsRegistry.get(id) || null;
}

/**
 * Получить метаданные организации
 */
export async function getTenantMeta(id: string): Promise<TenantMeta | null> {
    return tenantsMeta.get(id) || null;
}

/**
 * Создать новую организацию
 */
export async function createTenant(data: {
    name: string;
    inn?: string;
    adminName: string;
    adminEmail: string;
    plan?: 'basic' | 'professional' | 'enterprise';
}): Promise<TenantMeta> {
    const tenantId = generateId('org');
    const now = new Date().toISOString();
    const folder = tenantId.replace('org_', 'org_');

    // Регистрация
    const registryEntry: TenantRegistryEntry = {
        id: tenantId,
        name: data.name,
        folder,
        createdAt: now,
        status: 'active',
        plan: data.plan || 'basic',
        adminEmail: data.adminEmail,
    };

    tenantsRegistry.set(tenantId, registryEntry);

    // Метаданные
    const meta: TenantMeta = {
        id: tenantId,
        name: data.name,
        inn: data.inn,
        createdAt: now,
        owner: {
            employeeId: '', // Будет заполнено после создания первого сотрудника
            name: data.adminName,
            email: data.adminEmail,
        },
        settings: {
            timezone: 'Europe/Moscow',
            language: 'ru',
            currency: 'RUB',
        },
        subscription: {
            plan: data.plan || 'basic',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
    };

    tenantsMeta.set(tenantId, meta);

    // TODO: Создать структуру папок на сервере
    // await createTenantFolders(tenantId);
    // await initializeTenantDatabase(tenantId);
    // await generateEncryptionKey(tenantId);

    return meta;
}

/**
 * Обновить метаданные организации
 */
export async function updateTenantMeta(
    id: string,
    data: Partial<TenantMeta>
): Promise<TenantMeta | null> {
    const existing = tenantsMeta.get(id);
    if (!existing) return null;

    const updated: TenantMeta = {
        ...existing,
        ...data,
        owner: { ...existing.owner, ...data.owner },
        settings: { ...existing.settings, ...data.settings },
        subscription: { ...existing.subscription, ...data.subscription },
    };

    tenantsMeta.set(id, updated);

    // Обновляем регистрацию
    const reg = tenantsRegistry.get(id);
    if (reg && data.name) {
        reg.name = data.name;
        tenantsRegistry.set(id, reg);
    }

    return updated;
}

/**
 * Приостановить организацию
 */
export async function suspendTenant(id: string): Promise<boolean> {
    const reg = tenantsRegistry.get(id);
    if (!reg) return false;

    reg.status = 'suspended';
    tenantsRegistry.set(id, reg);

    return true;
}

/**
 * Активировать организацию
 */
export async function activateTenant(id: string): Promise<boolean> {
    const reg = tenantsRegistry.get(id);
    if (!reg) return false;

    reg.status = 'active';
    tenantsRegistry.set(id, reg);

    return true;
}

/**
 * Удалить организацию (soft delete)
 */
export async function deleteTenant(id: string): Promise<boolean> {
    const reg = tenantsRegistry.get(id);
    if (!reg) return false;

    reg.status = 'deleted';
    tenantsRegistry.set(id, reg);

    // TODO: Архивировать данные

    return true;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Получить путь к папке организации
 */
export function getTenantPath(tenantId: string): string {
    const reg = tenantsRegistry.get(tenantId);
    if (!reg) throw new Error(`Tenant ${tenantId} not found`);

    return `/server/tenants/${reg.folder}`;
}

/**
 * Проверить активность подписки
 */
export function isSubscriptionActive(tenantId: string): boolean {
    const meta = tenantsMeta.get(tenantId);
    if (!meta) return false;

    return new Date(meta.subscription.expiresAt) > new Date();
}

/**
 * Найти организацию по email администратора
 */
export async function findTenantByAdminEmail(email: string): Promise<TenantRegistryEntry | null> {
    const all = await getAllTenants();
    return all.find(t => t.adminEmail.toLowerCase() === email.toLowerCase()) || null;
}
