// components/ArchiveConfirmModal.tsx
// Универсальная модалка предупреждения о перемещении в архив

import React from 'react';

// ============================================
// ТИПЫ
// ============================================

export interface ArchiveConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    /** Название типа объекта: "правило", "клиент", "сотрудник" и т.д. */
    entityType: string;
    /** Название конкретного объекта для отображения */
    entityName: string;
    /** Показывать индикатор загрузки */
    isLoading?: boolean;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    entityType,
    entityName,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
            onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок с иконкой */}
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">📦</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-amber-900">
                            Перемещение в архив
                        </h3>
                        <p className="text-sm text-amber-700">
                            {entityType}
                        </p>
                    </div>
                </div>

                {/* Содержимое */}
                <div className="px-6 py-5 space-y-4">
                    {/* Название объекта */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">Объект</div>
                        <div className="font-medium text-slate-900 break-words">
                            {entityName}
                        </div>
                    </div>

                    {/* Предупреждение */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 text-slate-700">
                            <span className="text-amber-500 mt-0.5">⚠️</span>
                            <p className="text-sm">
                                Это действие переместит {entityType.toLowerCase()} в <strong>архив</strong>.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 text-slate-600">
                            <span className="text-blue-500 mt-0.5">ℹ️</span>
                            <p className="text-sm">
                                Для восстановления нужно будет зайти в раздел <strong>«Архив»</strong> и нажать кнопку <strong>«Восстановить»</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Кнопки */}
                <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Архивация...
                            </>
                        ) : (
                            <>
                                📦 В архив
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchiveConfirmModal;
