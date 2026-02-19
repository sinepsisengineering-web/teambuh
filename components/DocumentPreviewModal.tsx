// components/DocumentPreviewModal.tsx
// Универсальное окно просмотра документов (полноэкранное)

import React, { useState, useEffect, useCallback } from 'react';

import { API_BASE_URL } from '../apiConfig';
const SERVER_URL = API_BASE_URL;
const DEFAULT_TENANT = 'org_default';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: {
        filename: string;
        name: string;
        type?: string;
        size?: number;
    } | null;
    entityType: 'clients' | 'employees';
    entityId: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen,
    onClose,
    document,
    entityType,
    entityId
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    // ESC для закрытия (ДОЛЖЕН быть до return)
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Загрузка файла через fetch
    useEffect(() => {
        if (!isOpen || !document) {
            setBlobUrl(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const loadFile = async () => {
            try {
                const url = `${SERVER_URL}/api/${DEFAULT_TENANT}/${entityType}/${entityId}/documents/${encodeURIComponent(document.filename)}/view`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to load document:', err);
                setError('Не удалось загрузить файл');
                setIsLoading(false);
            }
        };

        loadFile();

        return () => {
            // Cleanup будет в отдельном effect
        };
    }, [isOpen, document, entityType, entityId]);

    // Cleanup blob URL
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    // Теперь можно делать ранний return
    if (!isOpen || !document) return null;

    const isPdf = document.type?.includes('pdf') || document.name.toLowerCase().endsWith('.pdf');
    const isImage = document.type?.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(document.name);

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleDownload = () => {
        // Используем серверный endpoint для скачивания с правильным именем файла
        const url = `${SERVER_URL}/api/${DEFAULT_TENANT}/${entityType}/${entityId}/documents/${encodeURIComponent(document.filename)}/download`;

        // Создаём скрытую ссылку и кликаем
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name; // Подсказка браузеру имя файла
        a.style.display = 'none';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-[var(--color-bg-overlay)] flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-[var(--color-card-bg)] rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col">
                {/* Заголовок */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            {isPdf ? (
                                <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                                </svg>
                            ) : isImage ? (
                                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{document.name}</h3>
                            {document.size && (
                                <p className="text-sm text-[var(--color-text-secondary)]">{formatSize(document.size)}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Скачать
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] rounded-lg transition-colors"
                            title="Закрыть (Esc)"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Контент */}
                <div className="flex-1 overflow-hidden bg-[var(--color-content-bg)] relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-bg)]">
                            <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
                                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span>Загрузка документа...</span>
                            </div>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-bg)]">
                            <div className="text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-lg text-[var(--color-text-secondary)] mb-4">{error}</p>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                                >
                                    Попробовать скачать
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && blobUrl && (
                        <>
                            {isPdf ? (
                                <iframe
                                    src={blobUrl}
                                    className="w-full h-full border-0"
                                    title={document.name}
                                />
                            ) : isImage ? (
                                <div className="w-full h-full flex items-center justify-center p-4">
                                    <img
                                        src={blobUrl}
                                        alt={document.name}
                                        className="max-w-full max-h-full object-contain rounded shadow-lg"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <svg className="w-20 h-20 mx-auto mb-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-lg text-[var(--color-text-secondary)] mb-4">Предпросмотр недоступен</p>
                                        <button
                                            onClick={handleDownload}
                                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                                        >
                                            Скачать файл
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentPreviewModal;
