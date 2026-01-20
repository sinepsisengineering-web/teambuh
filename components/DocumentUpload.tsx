// components/DocumentUpload.tsx
// Универсальный компонент для загрузки документов

import React, { useState } from 'react';

export interface UploadedDocument {
    id: string;
    name: string;
    uploadDate: Date;
    size: number;
    type: string;
}

interface DocumentUploadProps {
    documents: UploadedDocument[];
    onUpload: (file: File) => void;
    onDelete?: (docId: string) => void;
    onView?: (doc: UploadedDocument) => void;
    label?: string;
    accept?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
    documents,
    onUpload,
    onDelete,
    onView,
    label = 'Загрузить документ',
    accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
}) => {
    const [dragOver, setDragOver] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ru-RU');
    };

    return (
        <div className="space-y-2">
            {/* Зона загрузки */}
            <label
                className={`
                    block w-full p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center
                    ${dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
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
                />
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{label}</span>
                </div>
            </label>

            {/* Список документов */}
            {documents.length > 0 && (
                <div className="space-y-1">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-[10px]"
                        >
                            {/* Иконка типа файла */}
                            <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>

                            {/* Название и мета */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-700 truncate">{doc.name}</div>
                                <div className="text-slate-400">{formatSize(doc.size)} • {formatDate(doc.uploadDate)}</div>
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-1 flex-shrink-0">
                                {onView && (
                                    <button
                                        onClick={() => onView(doc)}
                                        className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                        title="Открыть"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(doc.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Удалить"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentUpload;
