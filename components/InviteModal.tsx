// components/InviteModal.tsx
// Модальное окно для приглашения сотрудника

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ROLE_LABELS, getAssignableRoles } from '../types/auth';
import { authFetch } from '../apiConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    const assignableRoles = user ? getAssignableRoles(user.role) : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInviteLink('');

        if (!email || !name || !role) {
            setError('Заполните все поля');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authFetch(`${API_BASE_URL}/api/auth/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Ошибка создания приглашения');
                return;
            }

            setInviteLink(data.inviteLink);
        } catch (err) {
            setError('Ошибка сети');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setEmail('');
        setName('');
        setRole('');
        setError('');
        setInviteLink('');
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                    <h2 className="text-xl font-bold text-white">Пригласить сотрудника</h2>
                    <p className="text-white/70 text-sm mt-1">Ссылка действует 3 дня</p>
                </div>

                <div className="p-6">
                    {!inviteLink ? (
                        /* Форма */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Иван Петров"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ivan@example.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                    required
                                >
                                    <option value="">Выберите роль</option>
                                    {assignableRoles.map((r) => (
                                        <option key={r} value={r}>
                                            {ROLE_LABELS[r]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Создание...' : 'Отправить'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Результат — ссылка */
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800 font-medium mb-1">✅ Приглашение создано!</p>
                                <p className="text-green-600 text-sm">
                                    {name} ({ROLE_LABELS[role as UserRole]})
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ссылка для регистрации:
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inviteLink}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 font-mono"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied
                                                ? 'bg-green-500 text-white'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                    >
                                        {copied ? '✓' : 'Копировать'}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                Отправьте эту ссылку сотруднику. При переходе по ней он сможет создать
                                пароль и войти в систему. Ссылка действует 3 дня.
                            </p>

                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Закрыть
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
