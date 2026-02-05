// components/TaskInfoModal.tsx
// Модальное окно с информацией о задаче

import React from 'react';
import { getStatusIconByType, getStatusConfig, computeTaskStatus } from '../services/taskLifecycle';

export interface TaskInfoData {
    id: string;
    title: string;
    description?: string;
    fullDescription?: string;  // Полное описание из правила
    legalBasis?: string;       // Основание (ссылка на закон)
    clientName?: string;       // Имя клиента
    dueDate: Date | string;
    status?: string;
    cyclePattern?: string;
    isUrgent?: boolean;
}

interface TaskInfoModalProps {
    isOpen: boolean;
    task: TaskInfoData | null;
    onClose: () => void;
}

export const TaskInfoModal: React.FC<TaskInfoModalProps> = ({ isOpen, task, onClose }) => {
    if (!isOpen || !task) return null;

    const computedStatus = computeTaskStatus({
        id: task.id,
        dueDate: task.dueDate,
        status: task.status,
        cyclePattern: task.cyclePattern,
        isUrgent: task.isUrgent,
    });

    const statusConfig = getStatusConfig(computedStatus);
    const statusIcon = getStatusIconByType(computedStatus);

    const dueDate = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
    const formattedDate = dueDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal — широкое */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 ${statusConfig.bgColorClass} border-b flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{statusIcon}</span>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">{task.title}</h2>
                            <span className={`text-sm ${statusConfig.colorClass}`}>{statusConfig.label}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4">
                    {/* Клиент */}
                    {task.clientName && (
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">{task.clientName}</span>
                        </div>
                    )}

                    {/* Описание (объединённое с основанием) */}
                    {(task.fullDescription || task.description || task.legalBasis) && (
                        <div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                Описание
                            </h3>
                            <div className="text-sm text-slate-700 leading-relaxed space-y-1">
                                {task.fullDescription ? (
                                    <p className="whitespace-pre-wrap">{task.fullDescription}</p>
                                ) : task.description ? (
                                    <p>{task.description}</p>
                                ) : null}
                                {task.legalBasis && (
                                    <p className="text-slate-500">{task.legalBasis}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Срок */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-600">
                            <span className="text-slate-400">Срок:</span> {formattedDate}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};
