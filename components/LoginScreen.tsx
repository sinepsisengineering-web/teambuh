// components/LoginScreen.tsx
// Экран входа и регистрации — использует Tailwind CSS v4
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register';

export const LoginScreen: React.FC = () => {
    const { login, register, isLoading, error, clearError } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError('Заполните все обязательные поля');
            return;
        }

        if (mode === 'register') {
            if (!name) {
                setLocalError('Введите имя');
                return;
            }
            if (password !== confirmPassword) {
                setLocalError('Пароли не совпадают');
                return;
            }
            if (password.length < 6) {
                setLocalError('Пароль должен быть не менее 6 символов');
                return;
            }
            await register({ email, password, name });
        } else {
            await login({ email, password });
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setLocalError(null);
        clearError();
    };

    const displayError = localError || error;

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
                        {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
                    </p>
                </div>

                {/* Форма */}
                <div className="bg-white/10 backdrop-blur-[16px] rounded-xl p-6 border border-white/10 shadow-xl">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {/* Имя (только для регистрации) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Имя</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="Ваше имя"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                placeholder="your@email.com"
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
                            />
                        </div>

                        {/* Подтверждение пароля */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Подтвердите пароль</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full h-11 px-4 text-base rounded-lg border border-white/10 bg-white/5 text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {/* Ошибка */}
                        {displayError && (
                            <div className="p-4 rounded-lg text-sm text-center bg-red-500/10 border border-red-500 text-red-500">
                                {displayError}
                            </div>
                        )}

                        {/* Кнопка */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-lg border-none cursor-pointer transition-colors outline-none w-full
                                bg-primary text-white shadow-glow hover:bg-primary-hover
                                ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
                            `}
                        >
                            {isLoading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                        </button>
                    </form>

                    {/* Переключатель режима */}
                    <div className="mt-6 text-center text-slate-400 text-sm">
                        {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                        <button
                            onClick={toggleMode}
                            className="ml-2 bg-transparent border-none cursor-pointer text-primary-light font-medium hover:text-white transition-colors"
                        >
                            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                        </button>
                    </div>
                </div>

                {/* Подсказка */}
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-500 text-sm text-center">
                    🛠️ Режим разработки: любые данные будут приняты
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
