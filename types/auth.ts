// types/auth.ts
// Типы для системы авторизации

export type UserRole = 'super-admin' | 'admin' | 'accountant';

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
