// components/ServerDocumentUpload.tsx
// Компонент загрузки документов через сервер API

import React, { useState, useEffect } from 'react';
import { UploadedDocument } from '../types';
import { DocumentPreviewModal } from './DocumentPreviewModal';

import { API_BASE_URL } from '../apiConfig';
const SERVER_URL = API_BASE_URL;
const DEFAULT_TENANT = 'org_default';

interface ServerDocumentUploadProps {
    entityType: 'clients' | 'employees';
    entityId: string;
    label?: string;
    accept?: string;
    onDocumentsChange?: (docs: UploadedDocument[]) => void;
}

export const ServerDocumentUpload: React.FC<ServerDocumentUploadProps> = ({
    entityType,
    entityId,
    label = 'Загрузить документ',
    accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
    onDocumentsChange
}) => {
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ filename: string; name: string } | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ filename: string; name: string; type?: string; size?: number } | null>(null);

    // Базовый URL для API
    const getApiUrl = (path: string = '') =>
        `${SERVER_URL}/api/${DEFAULT_TENANT}/${entityType}/${entityId}/documents${path}`;

    // Загрузка списка документов при монтировании
    useEffect(() => {
        if (entityId) {
            loadDocuments();
        }
    }, [entityId, entityType]);

    const loadDocuments = async () => {
        try {
            const response = await fetch(getApiUrl());
            if (!response.ok) throw new Error('Failed to load documents');
            const docs = await response.json();
            setDocuments(docs);
            onDocumentsChange?.(docs);
        } catch (err) {
            console.error('Failed to load documents:', err);
        }
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            // Отправляем оригинальное имя отдельным полем для корректной кодировки
            formData.append('originalName', file.name);

            const response = await fetch(getApiUrl(), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const uploadedDoc = await response.json();
            const newDocs = [...documents, uploadedDoc];
            setDocuments(newDocs);
            onDocumentsChange?.(newDocs);
        } catch (err) {
            setError('Ошибка загрузки файла');
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const deleteDocument = async (filename: string) => {
        try {
            const response = await fetch(getApiUrl(`/${encodeURIComponent(filename)}`), {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Delete failed');

            const newDocs = documents.filter(d => d.id !== filename && (d as any).filename !== filename);
            setDocuments(newDocs);
            onDocumentsChange?.(newDocs);
            setDeleteConfirm(null);
        } catch (err) {
            setError('Ошибка удаления файла');
            console.error('Delete error:', err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        e.target.value = ''; // Reset input
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('ru-RU');
    };

    return (
        <div className="space-y-2">
            {/* Зона загрузки */}
            <label
                className={`
                    block w-full p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center
                    ${isUploading ? 'opacity-50 cursor-wait' : ''}
                    ${dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-[var(--color-border-light,#cbd5e1)] hover:border-primary/50 hover:bg-[var(--color-bg-muted)]'
                    }
                `}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    {isUploading ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            <span>Загрузка...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>{label}</span>
                        </>
                    )}
                </div>
            </label>

            {/* Ошибка */}
            {error && (
                <div className="text-xs text-[var(--color-error)] text-center">{error}</div>
            )}

            {/* Список документов */}
            {documents.length > 0 && (
                <div className="space-y-1">
                    {documents.map(doc => (
                        <div
                            key={doc.id || (doc as any).filename}
                            className="flex items-center gap-2 p-2 bg-[var(--color-bg-muted)] rounded border border-[var(--color-border)] text-[10px]"
                        >
                            {/* Иконка типа файла */}
                            <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>

                            {/* Название и мета (кликабельно) */}
                            <div
                                className="flex-1 min-w-0 cursor-pointer hover:bg-[var(--color-content-bg)] rounded px-1 -mx-1 transition-colors"
                                onClick={() => setPreviewDoc({
                                    filename: (doc as any).filename || doc.id,
                                    name: doc.name,
                                    type: doc.type,
                                    size: doc.size
                                })}
                            >
                                <div className="font-medium text-[var(--color-text-primary)] truncate hover:text-primary">{doc.name}</div>
                                <div className="text-[var(--color-text-muted)]">{formatSize(doc.size)} • {formatDate(doc.uploadDate)}</div>
                            </div>

                            {/* Кнопка удаления */}
                            <div className="flex gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setDeleteConfirm({ filename: (doc as any).filename || doc.id, name: doc.name })}
                                    className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded transition-colors"
                                    title="Удалить"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Модалка подтверждения удаления */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-[var(--color-bg-modal-overlay)] flex items-center justify-center z-50">
                    <div className="bg-[var(--color-card-bg)] rounded-lg p-4 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Удалить документ?</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                            Вы уверены, что хотите удалить «{deleteConfirm.name}»?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] rounded transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => deleteDocument(deleteConfirm.filename)}
                                className="px-3 py-1.5 text-xs text-white bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] rounded transition-colors"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка просмотра документа */}
            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                document={previewDoc}
                entityType={entityType}
                entityId={entityId}
            />
        </div>
    );
};

export default ServerDocumentUpload;

