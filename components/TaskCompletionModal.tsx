// components/TaskCompletionModal.tsx
// Модальное окно для выбора клиентов при выполнении групповой задачи

import React, { useState, useEffect, useMemo } from 'react';

interface ClientItem {
    id: string;
    name: string;
}

interface TaskCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedClientIds: string[]) => void;
    clients: ClientItem[];
    taskTitle: string;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    clients,
    taskTitle
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Сбрасываем выбор при открытии
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedIds(new Set(clients.map(c => c.id)));
    };

    const handleDeselectAll = () => {
        setSelectedIds(new Set());
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds));
        onClose();
    };

    const noneSelected = selectedIds.size === 0;
    const allSelected = selectedIds.size === clients.length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">Выполнить задачу</h3>
                    <p className="text-sm text-slate-500 mt-1 truncate">{taskTitle}</p>
                </div>

                {/* Строка: "Выберите клиентов" + кнопки */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Выберите клиентов:</span>
                    <div className="flex gap-1">
                        <button
                            onClick={handleSelectAll}
                            disabled={allSelected}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${allSelected
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                                }`}
                        >
                            Выбрать все
                        </button>
                        <button
                            onClick={handleDeselectAll}
                            disabled={noneSelected}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${noneSelected
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                        >
                            Снять все
                        </button>
                    </div>
                </div>

                {/* Список клиентов с прокруткой */}
                <div className="px-5 py-3">
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                        <div className="p-2 space-y-1">
                            {clients.map(client => (
                                <label
                                    key={client.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedIds.has(client.id)
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(client.id)}
                                        onChange={() => handleToggle(client.id)}
                                        className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-slate-700 flex-1 truncate">{client.name}</span>
                                    {selectedIds.has(client.id) && (
                                        <span className="text-green-600">✓</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <span>✓</span>
                        Выполнить {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskCompletionModal;
