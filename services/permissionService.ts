// services/permissionService.ts
// Сервис проверки прав доступа по ролям

import { UserRole } from '../types/auth';

// ============================================
// ИЕРАРХИЯ РОЛЕЙ (чем выше число, тем больше прав)
// ============================================

const ROLE_LEVEL: Record<UserRole, number> = {
    'junior': 1,
    'senior': 2,
    'admin': 3,
    'super-admin': 4,
};

// ============================================
// ПРОВЕРКИ ПРАВ
// ============================================

/** Роль >= заданного уровня */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
    return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

// --- Приглашения ---

/** Может приглашать сотрудников */
export function canInvite(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

/** Может менять роли сотрудников */
export function canChangeRoles(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

// --- Персонал ---

/** Видит вкладку Персонал */
export function canViewStaff(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

/** Может редактировать сотрудников */
export function canEditStaff(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

// --- Клиенты ---

/** Видит всех клиентов (false = только своих по accountantId) */
export function canViewAllClients(role: UserRole): boolean {
    return hasMinRole(role, 'senior');
}

/** Может добавлять клиентов */
export function canAddClients(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

/** Может редактировать клиентов */
export function canEditClients(role: UserRole): boolean {
    return hasMinRole(role, 'senior');
}

/** Может удалять клиентов */
export function canDeleteClients(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

// --- Задачи ---

/** Видит все задачи (false = только свои) */
export function canViewAllTasks(role: UserRole): boolean {
    return hasMinRole(role, 'senior');
}

/** Может переназначать задачи */
export function canReassignTasks(role: UserRole): boolean {
    return hasMinRole(role, 'senior');
}

// --- Правила ---

/** Может редактировать налоговые (системные) правила */
export function canEditSystemRules(role: UserRole): boolean {
    return role === 'super-admin';
}

/** Может редактировать пользовательские правила */
export function canEditCustomRules(role: UserRole): boolean {
    return hasMinRole(role, 'admin');
}

// --- Архив ---

/** Видит вкладку Архив */
export function canViewArchive(role: UserRole): boolean {
    return hasMinRole(role, 'senior');
}
