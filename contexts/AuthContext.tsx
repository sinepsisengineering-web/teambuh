// contexts/AuthContext.tsx
// Контекст авторизации (пока заглушка для будущей реализации)

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types/auth';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    register: (data: RegisterData) => Promise<boolean>;
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
                    const user = JSON.parse(savedUser) as User;
                    setState({
                        isAuthenticated: true,
                        isLoading: false,
                        user,
                        token: savedToken,
                        error: null,
                    });
                } catch {
                    // Невалидные данные - очищаем
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_user');
                    setState({ ...initialState, isLoading: false });
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
            // TODO: Заменить на реальный API-запрос
            // const response = await fetch('/api/auth/login', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(credentials),
            // });

            // Временная заглушка для локальной разработки
            console.log('Login attempt:', credentials.email);

            // Симуляция успешного входа для тестирования
            const mockUser: User = {
                id: 'local-user-1',
                email: credentials.email,
                name: 'Локальный пользователь',
                role: 'admin',
            };
            const mockToken = 'local-dev-token-' + Date.now();

            localStorage.setItem('auth_token', mockToken);
            localStorage.setItem('auth_user', JSON.stringify(mockUser));

            setState({
                isAuthenticated: true,
                isLoading: false,
                user: mockUser,
                token: mockToken,
                error: null,
            });

            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Ошибка входа. Проверьте подключение.',
            }));
            return false;
        }
    };

    const register = async (data: RegisterData): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // TODO: Заменить на реальный API-запрос
            console.log('Register attempt:', data.email);

            // Временная заглушка
            const mockUser: User = {
                id: 'local-user-' + Date.now(),
                email: data.email,
                name: data.name,
                role: 'user',
            };
            const mockToken = 'local-dev-token-' + Date.now();

            localStorage.setItem('auth_token', mockToken);
            localStorage.setItem('auth_user', JSON.stringify(mockUser));

            setState({
                isAuthenticated: true,
                isLoading: false,
                user: mockUser,
                token: mockToken,
                error: null,
            });

            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Ошибка регистрации.',
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
                register,
                logout,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
