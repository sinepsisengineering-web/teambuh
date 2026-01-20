// services/permissionService.ts
// Сервис управления правами доступа

import { Role, Permission, UserRole, UserPermission, RoleType } from '../types/data';
import { generateId } from './idService';

// ============================================
// БАЗОВЫЕ РОЛИ (системные)
// ============================================

export const SYSTEM_ROLES: Role[] = [
    {
        id: 'role_admin',
        name: 'Администратор',
        description: 'Полный доступ ко всем функциям',
        isSystem: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'role_accountant',
        name: 'Бухгалтер',
        description: 'Работа с клиентами и задачами',
        isSystem: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'role_assistant',
        name: 'Помощник бухгалтера',
        description: 'Ограниченный доступ к задачам',
        isSystem: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
];

// ============================================
// БАЗОВЫЕ РАЗРЕШЕНИЯ
// ============================================

export const SYSTEM_PERMISSIONS: Permission[] = [
    // Сотрудники
    { id: 'perm_emp_view', code: 'employees.view', name: 'Просмотр сотрудников', category: 'employees' },
    { id: 'perm_emp_edit', code: 'employees.edit', name: 'Редактирование сотрудников', category: 'employees' },
    { id: 'perm_emp_delete', code: 'employees.delete', name: 'Удаление сотрудников', category: 'employees' },
    { id: 'perm_emp_docs', code: 'employees.documents', name: 'Доступ к документам сотрудников', category: 'employees' },

    // Клиенты
    { id: 'perm_cli_view', code: 'clients.view', name: 'Просмотр клиентов', category: 'clients' },
    { id: 'perm_cli_view_own', code: 'clients.view.own', name: 'Просмотр своих клиентов', category: 'clients' },
    { id: 'perm_cli_edit', code: 'clients.edit', name: 'Редактирование клиентов', category: 'clients' },
    { id: 'perm_cli_delete', code: 'clients.delete', name: 'Удаление клиентов', category: 'clients' },
    { id: 'perm_cli_docs', code: 'clients.documents', name: 'Доступ к документам клиентов', category: 'clients' },

    // Задачи
    { id: 'perm_task_view_own', code: 'tasks.view.own', name: 'Просмотр своих задач', category: 'tasks' },
    { id: 'perm_task_view_all', code: 'tasks.view.all', name: 'Просмотр всех задач', category: 'tasks' },
    { id: 'perm_task_create', code: 'tasks.create', name: 'Создание задач', category: 'tasks' },
    { id: 'perm_task_edit', code: 'tasks.edit', name: 'Редактирование задач', category: 'tasks' },
    { id: 'perm_task_assign', code: 'tasks.assign', name: 'Назначение задач другим', category: 'tasks' },

    // Зарплата
    { id: 'perm_payroll_view', code: 'payroll.view', name: 'Просмотр зарплат', category: 'payroll' },
    { id: 'perm_payroll_calculate', code: 'payroll.calculate', name: 'Расчёт зарплат', category: 'payroll' },
    { id: 'perm_payroll_pay', code: 'payroll.pay', name: 'Проведение выплат', category: 'payroll' },

    // Система
    { id: 'perm_settings', code: 'system.settings', name: 'Настройки системы', category: 'system' },
    { id: 'perm_roles', code: 'system.roles', name: 'Управление ролями', category: 'system' },
    { id: 'perm_audit', code: 'system.audit', name: 'Просмотр аудита', category: 'system' },
];

// ============================================
// ПРАВА ПО РОЛЯМ (по умолчанию)
// ============================================

export const ROLE_PERMISSIONS: Record<string, string[]> = {
    'role_admin': [
        'employees.view', 'employees.edit', 'employees.delete', 'employees.documents',
        'clients.view', 'clients.edit', 'clients.delete', 'clients.documents',
        'tasks.view.own', 'tasks.view.all', 'tasks.create', 'tasks.edit', 'tasks.assign',
        'payroll.view', 'payroll.calculate', 'payroll.pay',
        'system.settings', 'system.roles', 'system.audit',
    ],
    'role_accountant': [
        'clients.view.own', 'clients.edit', 'clients.documents',
        'tasks.view.own', 'tasks.create', 'tasks.edit',
    ],
    'role_assistant': [
        'tasks.view.own',
    ],
};

// ============================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ
// ============================================

let userRolesCache: Map<string, UserRole[]> = new Map();
let userPermissionsCache: Map<string, UserPermission[]> = new Map();

// Инициализация мок-данными
const initMockData = () => {
    // Иванова — админ
    userRolesCache.set('emp_1705680000_a1b2', [{
        userId: 'emp_1705680000_a1b2',
        roleId: 'role_admin',
        assignedAt: '2023-01-15T10:00:00Z',
        isActive: true,
    }]);

    // Петров — бухгалтер
    userRolesCache.set('emp_1705680001_c3d4', [{
        userId: 'emp_1705680001_c3d4',
        roleId: 'role_accountant',
        assignedAt: '2023-06-01T10:00:00Z',
        isActive: true,
    }]);

    // Сидорова — бухгалтер
    userRolesCache.set('emp_1705680002_e5f6', [{
        userId: 'emp_1705680002_e5f6',
        roleId: 'role_accountant',
        assignedAt: '2022-03-10T10:00:00Z',
        isActive: true,
    }]);

    // Козлов — помощник
    userRolesCache.set('emp_1705680003_g7h8', [{
        userId: 'emp_1705680003_g7h8',
        roleId: 'role_assistant',
        assignedAt: '2024-01-01T10:00:00Z',
        isActive: true,
    }]);
};

initMockData();

// ============================================
// ФУНКЦИИ ПРОВЕРКИ ПРАВ
// ============================================

/**
 * Проверяет, истёк ли срок
 */
function isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}

/**
 * Получить активные роли пользователя
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
    const roles = userRolesCache.get(userId) || [];
    return roles.filter(r => r.isActive && !isExpired(r.expiresAt));
}

/**
 * Получить индивидуальные разрешения пользователя
 */
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
    const perms = userPermissionsCache.get(userId) || [];
    return perms.filter(p => !isExpired(p.expiresAt));
}

/**
 * Проверить наличие разрешения у пользователя
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    // 1. Проверяем индивидуальный запрет
    const userPerms = await getUserPermissions(userId);
    const deny = userPerms.find(p => {
        const perm = SYSTEM_PERMISSIONS.find(sp => sp.id === p.permissionId);
        return perm?.code === permissionCode && !p.granted;
    });
    if (deny) return false;

    // 2. Проверяем индивидуальное разрешение
    const allow = userPerms.find(p => {
        const perm = SYSTEM_PERMISSIONS.find(sp => sp.id === p.permissionId);
        return perm?.code === permissionCode && p.granted;
    });
    if (allow) return true;

    // 3. Проверяем роли
    const roles = await getUserRoles(userId);
    for (const userRole of roles) {
        const rolePerms = ROLE_PERMISSIONS[userRole.roleId] || [];
        if (rolePerms.includes(permissionCode)) {
            return true;
        }
    }

    return false;
}

/**
 * Получить все разрешения пользователя (объединённые из ролей)
 */
export async function getAllUserPermissions(userId: string): Promise<string[]> {
    const permissions = new Set<string>();

    // Добавляем из ролей
    const roles = await getUserRoles(userId);
    for (const userRole of roles) {
        const rolePerms = ROLE_PERMISSIONS[userRole.roleId] || [];
        rolePerms.forEach(p => permissions.add(p));
    }

    // Добавляем индивидуальные
    const userPerms = await getUserPermissions(userId);
    for (const up of userPerms) {
        const perm = SYSTEM_PERMISSIONS.find(sp => sp.id === up.permissionId);
        if (perm) {
            if (up.granted) {
                permissions.add(perm.code);
            } else {
                permissions.delete(perm.code);
            }
        }
    }

    return Array.from(permissions);
}

// ============================================
// УПРАВЛЕНИЕ РОЛЯМИ
// ============================================

/**
 * Назначить роль пользователю
 */
export async function assignRole(
    userId: string,
    roleId: string,
    assignedBy?: string,
    expiresAt?: string
): Promise<UserRole> {
    const userRole: UserRole = {
        userId,
        roleId,
        assignedAt: new Date().toISOString(),
        assignedBy,
        expiresAt,
        isActive: true,
    };

    const existing = userRolesCache.get(userId) || [];
    // Удаляем старую такую же роль если есть
    const filtered = existing.filter(r => r.roleId !== roleId);
    filtered.push(userRole);
    userRolesCache.set(userId, filtered);

    return userRole;
}

/**
 * Отозвать роль у пользователя
 */
export async function revokeRole(userId: string, roleId: string): Promise<boolean> {
    const existing = userRolesCache.get(userId) || [];
    const filtered = existing.filter(r => r.roleId !== roleId);
    userRolesCache.set(userId, filtered);
    return existing.length !== filtered.length;
}

/**
 * Выдать индивидуальное разрешение
 */
export async function grantPermission(
    userId: string,
    permissionCode: string,
    grantedBy?: string,
    expiresAt?: string,
    reason?: string
): Promise<UserPermission> {
    const perm = SYSTEM_PERMISSIONS.find(p => p.code === permissionCode);
    if (!perm) throw new Error(`Permission ${permissionCode} not found`);

    const userPerm: UserPermission = {
        id: generateId('perm'),
        userId,
        permissionId: perm.id,
        granted: true,
        grantedAt: new Date().toISOString(),
        grantedBy,
        expiresAt,
        reason,
    };

    const existing = userPermissionsCache.get(userId) || [];
    existing.push(userPerm);
    userPermissionsCache.set(userId, existing);

    return userPerm;
}

/**
 * Отозвать индивидуальное разрешение
 */
export async function revokePermission(userId: string, permissionCode: string): Promise<boolean> {
    const perm = SYSTEM_PERMISSIONS.find(p => p.code === permissionCode);
    if (!perm) return false;

    const existing = userPermissionsCache.get(userId) || [];
    const filtered = existing.filter(p => p.permissionId !== perm.id);
    userPermissionsCache.set(userId, filtered);

    return existing.length !== filtered.length;
}

/**
 * Получить роль по ID
 */
export function getRoleById(roleId: string): Role | undefined {
    return SYSTEM_ROLES.find(r => r.id === roleId);
}

/**
 * Получить все роли
 */
export function getAllRoles(): Role[] {
    return [...SYSTEM_ROLES];
}

/**
 * Получить разрешения по категории
 */
export function getPermissionsByCategory(category: string): Permission[] {
    return SYSTEM_PERMISSIONS.filter(p => p.category === category);
}
