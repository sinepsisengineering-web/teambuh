// components/LoginScreen.tsx
// Экран входа — авторизация через JWT
// Поддерживает три режима:
//   - Обычный вход (email + пароль)
//   - Регистрация по приглашению (?invite=TOKEN)
//   - Регистрация директора (?register&email=xxx)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, UserRole } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface InvitationInfo {
    name: string;
    email: string;
    role: UserRole;
    expiresAt: string;
}

type ScreenMode = 'login' | 'register' | 'register-admin' | 'invite-error';

export const LoginScreen: React.FC = () => {
    const { login, isLoading, error, clearError } = useAuth();

    // Режим: login, register (по invite), register-admin (директор)
    const [mode, setMode] = useState<ScreenMode>('login');
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteInfo, setInviteInfo] = useState<InvitationInfo | null>(null);
    const [inviteError, setInviteError] = useState('');

    // Данные для регистрации директора
    const [adminEmail, setAdminEmail] = useState('');

    // Поля
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [registerLoading, setRegisterLoading] = useState(false);

    // Проверяем URL на наличие ?invite=TOKEN или ?register&email=xxx
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite');
        const registerEmail = params.get('email');
        const isRegister = params.has('register');

        if (token) {
            setInviteToken(token);
            checkInvitation(token);
        } else if (isRegister && registerEmail) {
            // Режим регистрации директора
            setAdminEmail(registerEmail);
            // Пытаемся извлечь имя из email (часть до @)
            const namePart = registerEmail.split('@')[0];
            const prettyName = namePart
                .replace(/[._-]/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
            setName(prettyName);
            setMode('register-admin');
        }
    }, []);

    const checkInvitation = async (token: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/invite/${token}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setInviteError(data.error || 'Приглашение недействительно');
                setMode('invite-error');
                return;
            }

            setInviteInfo(data.invitation);
            setMode('register');
        } catch {
            setInviteError('Ошибка проверки приглашения');
            setMode('invite-error');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError('Заполните все поля');
            return;
        }

        await login({ email, password });
    };

    // Регистрация сотрудника по приглашению
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!password || !confirmPassword) {
            setLocalError('Заполните все поля');
            return;
        }

        if (password.length < 6) {
            setLocalError('Пароль должен быть не менее 6 символов');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Пароли не совпадают');
            return;
        }

        setRegisterLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: inviteToken, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setLocalError(data.error || 'Ошибка регистрации');
                return;
            }

            // Автовход: сохраняем токен и перезагружаем
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            // Очищаем ?invite из URL
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
        } catch {
            setLocalError('Ошибка сети');
        } finally {
            setRegisterLoading(false);
        }
    };

    // Регистрация директора (admin)
    const handleRegisterAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!name || !password || !confirmPassword) {
            setLocalError('Заполните все поля');
            return;
        }

        if (password.length < 6) {
            setLocalError('Пароль должен быть не менее 6 символов');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Пароли не совпадают');
            return;
        }

        setRegisterLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: adminEmail, name, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setLocalError(data.error || 'Ошибка регистрации');
                return;
            }

            // Автовход
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));

            // Очищаем URL
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
        } catch {
            setLocalError('Ошибка сети');
        } finally {
            setRegisterLoading(false);
        }
    };

    const displayError = localError || error;
    const isSubmitting = isLoading || registerLoading;

    // Заголовок в зависимости от режима
    const getSubtitle = () => {
        switch (mode) {
            case 'register':
                return `Добро пожаловать, ${inviteInfo?.name}!`;
            case 'register-admin':
                return 'Регистрация руководителя';
            case 'invite-error':
                return 'Ошибка приглашения';
            default:
                return 'Войдите в свой аккаунт';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[linear-gradient(135deg,#0f172a_0%,#312e81_50%,#0f172a_100%)]">
            <div className="w-full max-w-[400px]">
                {/* Логотип и заголовок */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-glow">
                        <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">TeamBuh</h1>
                    <p className="text-slate-400 text-sm">
                        {getSubtitle()}
                    </p>
                </div>

                {/* Форма */}
                <div className="bg-white/10 backdrop-blur-[16px] rounded-xl p-6 border border-white/10 shadow-xl">
                    {mode === 'invite-error' ? (
                        /* Ошибка приглашения */
                        <div className="text-center">
                            <div className="p-4 rounded-lg text-sm bg-red-500/10 border border-red-500 text-red-400 mb-4">
                                {inviteError}
                            </div>
                            <button
                                onClick={() => {
                                    window.history.replaceState({}, '', window.location.pathname);
                                    setMode('login');
                                    setInviteToken(null);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 text-sm"
                            >
                                Перейти к входу →
                            </button>
                        </div>

                    ) : mode === 'register-admin' ? (
                        /* Регистрация директора */
                        <form onSubmit={handleRegisterAdmin} className="flex flex-col gap-5">
                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                                <div className="w-full h-11 px-4 flex items-center text-base rounded-lg border border-white/10 bg-white/5 text-white/70">
                                    {adminEmail}
                                </div>
                            </div>

                            {/* Роль (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Роль</label>
                                <div className="w-full h-11 px-4 flex items-center text-base rounded-lg border border-white/10 bg-white/5 text-indigo-300">
                                    {ROLE_LABELS['admin']}
                                </div>
                            </div>

                            {/* Имя */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Ваше имя</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="Имя Фамилия"
                                    autoComplete="name"
                                />
                            </div>

                            {/* Пароль */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Придумайте пароль</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="Минимум 6 символов"
                                    autoComplete="new-password"
                                    minLength={6}
                                />
                            </div>

                            {/* Подтверждение */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Повторите пароль</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Ошибка */}
                            {displayError && (
                                <div className="p-4 rounded-lg text-sm text-center bg-red-500/10 border border-red-500 text-red-500">
                                    {displayError}
                                </div>
                            )}

                            {/* Кнопка */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-lg border-none cursor-pointer transition-colors outline-none w-full
                                    bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20
                                    ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}
                                `}
                            >
                                {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                            </button>
                        </form>

                    ) : mode === 'register' ? (
                        /* Регистрация по приглашению */
                        <form onSubmit={handleRegister} className="flex flex-col gap-5">
                            {/* Имя (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Ваше имя</label>
                                <div className="w-full h-11 px-4 flex items-center text-base rounded-lg border border-white/10 bg-white/5 text-white/70">
                                    {inviteInfo?.name}
                                </div>
                            </div>

                            {/* Роль (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Роль</label>
                                <div className="w-full h-11 px-4 flex items-center text-base rounded-lg border border-white/10 bg-white/5 text-indigo-300">
                                    {inviteInfo ? ROLE_LABELS[inviteInfo.role] : ''}
                                </div>
                            </div>

                            {/* Пароль */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Придумайте пароль</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="Минимум 6 символов"
                                    autoComplete="new-password"
                                    minLength={6}
                                />
                            </div>

                            {/* Подтверждение */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Повторите пароль</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Ошибка */}
                            {displayError && (
                                <div className="p-4 rounded-lg text-sm text-center bg-red-500/10 border border-red-500 text-red-500">
                                    {displayError}
                                </div>
                            )}

                            {/* Кнопка */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-lg border-none cursor-pointer transition-colors outline-none w-full
                                    bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20
                                    ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}
                                `}
                            >
                                {isSubmitting ? 'Регистрация...' : 'Создать аккаунт'}
                            </button>
                        </form>
                    ) : (
                        /* Обычный вход */
                        <form onSubmit={handleLogin} className="flex flex-col gap-6">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                />
                            </div>

                            {/* Пароль */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Пароль</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>

                            {/* Ошибка */}
                            {displayError && (
                                <div className="p-4 rounded-lg text-sm text-center bg-red-500/10 border border-red-500 text-red-500">
                                    {displayError}
                                </div>
                            )}

                            {/* Кнопка */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-lg border-none cursor-pointer transition-colors outline-none w-full
                                    bg-primary text-white shadow-glow hover:bg-primary-hover
                                    ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}
                                `}
                            >
                                {isSubmitting ? 'Вход...' : 'Войти'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
