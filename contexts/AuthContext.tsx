// contexts/AuthContext.tsx
// Контекст авторизации — реальный JWT через API

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials } from '../types/auth';
import { API_BASE_URL } from '../apiConfig';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>(initialState);

    // Проверка сохранённой сессии при загрузке
    useEffect(() => {
        const checkAuth = async () => {
            const savedToken = localStorage.getItem('auth_token');
            const savedUser = localStorage.getItem('auth_user');

            if (savedToken && savedUser) {
                try {
                    // Проверяем что токен ещё валиден через API
                    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                        headers: { 'Authorization': `Bearer ${savedToken}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setState({
                            isAuthenticated: true,
                            isLoading: false,
                            user: data.user,
                            token: savedToken,
                            error: null,
                        });
                    } else {
                        // Токен истёк или невалидный
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('auth_user');
                        setState({ ...initialState, isLoading: false });
                    }
                } catch {
                    // Сервер недоступен — используем сохранённые данные
                    try {
                        const user = JSON.parse(savedUser) as User;
                        setState({
                            isAuthenticated: true,
                            isLoading: false,
                            user,
                            token: savedToken,
                            error: null,
                        });
                    } catch {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('auth_user');
                        setState({ ...initialState, isLoading: false });
                    }
                }
            } else {
                setState({ ...initialState, isLoading: false });
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: data.error || 'Ошибка входа',
                }));
                return false;
            }

            // Сохраняем токен и данные пользователя
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            setState({
                isAuthenticated: true,
                isLoading: false,
                user: data.user,
                token: data.token,
                error: null,
            });

            console.log(`[Auth] Logged in as: ${data.user.name} (${data.user.role})`);
            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Ошибка подключения к серверу',
            }));
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
            error: null,
        });
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
