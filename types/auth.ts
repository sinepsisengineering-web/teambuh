// types/auth.ts
// Типы для системы авторизации

export type UserRole = 'super-admin' | 'admin' | 'senior' | 'junior';

export const ROLE_LABELS: Record<UserRole, string> = {
    'super-admin': 'Рут (Владелец)',
    'admin': 'Директор',
    'senior': 'Старший бухгалтер',
    'junior': 'Бухгалтер',
};

// Какие роли может назначать каждый уровень
export function getAssignableRoles(myRole: UserRole): UserRole[] {
    switch (myRole) {
        case 'super-admin': return ['admin'];
        case 'admin': return ['senior', 'junior'];
        default: return [];
    }
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId?: string;
    createdAt?: Date;
}

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    token: string | null;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    user?: User;
    token?: string;
    error?: string;
}

// Приглашение
export interface Invitation {
    token: string;
    email: string;
    name: string;
    role: UserRole;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    status: 'pending' | 'accepted' | 'expired';
}
