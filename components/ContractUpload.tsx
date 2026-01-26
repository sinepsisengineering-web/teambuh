// components/ContractUpload.tsx
// Компонент загрузки договора клиента

import React, { useState, useEffect } from 'react';
import { DocumentPreviewModal } from './DocumentPreviewModal';

const SERVER_URL = 'http://localhost:3001';
const DEFAULT_TENANT = 'org_default';

interface ContractMeta {
    filename: string;
    name: string;
    size: number;
    type: string;
    uploadDate: string;
}

interface ContractUploadProps {
    clientId: string;
    onContractChange?: (hasContract: boolean) => void;
}

export const ContractUpload: React.FC<ContractUploadProps> = ({
    clientId,
    onContractChange
}) => {
    const [contract, setContract] = useState<ContractMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const apiUrl = `${SERVER_URL}/api/${DEFAULT_TENANT}/clients/${clientId}/contract`;

    // Загрузка информации о договоре
    useEffect(() => {
        if (!clientId) return;

        const loadContract = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    setContract(data);
                    onContractChange?.(true);
                } else {
                    setContract(null);
                    onContractChange?.(false);
                }
            } catch (err) {
                setContract(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadContract();
    }, [clientId]);

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('originalName', file.name);

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setContract(data);
            onContractChange?.(true);
        } catch (err) {
            setError('Ошибка загрузки договора');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(apiUrl, { method: 'DELETE' });
            if (response.ok) {
                setContract(null);
                onContractChange?.(false);
            }
        } catch (err) {
            setError('Ошибка удаления договора');
        }
        setShowDeleteConfirm(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = '';
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('ru-RU');
    };

    if (isLoading) {
        return (
            <div className="text-xs text-[var(--color-text-muted)] text-center py-2">
                Загрузка...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Если договор загружен */}
            {contract ? (
                <div className="flex items-center gap-3 p-3 bg-[var(--color-contract-bg)] border border-[var(--color-contract-border)] rounded-lg">
                    <div className="w-10 h-10 bg-[var(--color-contract-border)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[var(--color-contract)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div
                            className="text-sm font-medium text-[var(--color-contract-text)] truncate cursor-pointer hover:underline"
                            onClick={() => setShowPreview(true)}
                        >
                            📄 {contract.name}
                        </div>
                        <div className="text-[10px] text-[var(--color-contract)]">
                            {formatSize(contract.size)} • Загружен {formatDate(contract.uploadDate)}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-1.5 text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded transition-colors"
                            title="Удалить"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                /* Если договора нет — показать загрузку */
                <label className={`
                    block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center
                    ${isUploading ? 'opacity-50 cursor-wait' : ''}
                    border-[var(--color-doc-empty-border)] bg-[var(--color-doc-empty-bg)] hover:border-[var(--color-doc-empty)]
                `}>
                    <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-[var(--color-doc-empty)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-sm font-medium text-[var(--color-doc-empty-text)]">
                            {isUploading ? 'Загрузка...' : '📄 Загрузить договор'}
                        </div>
                        <div className="text-[10px] text-[var(--color-doc-empty)]">
                            PDF, DOC или DOCX
                        </div>
                    </div>
                </label>
            )}

            {/* Ошибка */}
            {error && (
                <div className="text-xs text-[var(--color-error)] text-center">{error}</div>
            )}

            {/* Модалка удаления */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-[var(--color-bg-modal-overlay)] flex items-center justify-center z-50">
                    <div className="bg-[var(--color-card-bg)] rounded-lg p-4 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Удалить договор?</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                            Вы уверены, что хотите удалить договор «{contract?.name}»?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] rounded transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 text-xs text-white bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] rounded transition-colors"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка просмотра - используем специальный вариант для договора */}
            {showPreview && contract && (
                <ContractPreviewModal
                    clientId={clientId}
                    contract={contract}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};

// Специальная модалка для просмотра договора
const ContractPreviewModal: React.FC<{
    clientId: string;
    contract: ContractMeta;
    onClose: () => void;
}> = ({ clientId, contract, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    const viewUrl = `${SERVER_URL}/api/${DEFAULT_TENANT}/clients/${clientId}/contract/view`;

    useEffect(() => {
        const loadFile = async () => {
            try {
                const response = await fetch(viewUrl);
                if (!response.ok) throw new Error('Failed to load');

                const blob = await response.blob();
                setBlobUrl(URL.createObjectURL(blob));
                setIsLoading(false);
            } catch (err) {
                setError('Не удалось загрузить договор');
                setIsLoading(false);
            }
        };

        loadFile();

        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const isPdf = contract.type?.includes('pdf') || contract.name.toLowerCase().endsWith('.pdf');

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div
            className="fixed inset-0 bg-[var(--color-bg-overlay)] flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[var(--color-card-bg)] rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col">
                {/* Заголовок */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-contract-bg)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[var(--color-contract-border)] rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-[var(--color-contract)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-[10px] text-[var(--color-contract)] font-semibold uppercase tracking-wide">Договор</div>
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{contract.name}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">{formatSize(contract.size)}</p>
                        </div>
                    </div>
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

                {/* Контент */}
                <div className="flex-1 overflow-hidden bg-[var(--color-content-bg)] relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-bg)]">
                            <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
                                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span>Загрузка договора...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-card-bg)]">
                            <div className="text-center text-[var(--color-error)]">
                                <p className="text-lg">{error}</p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && blobUrl && isPdf && (
                        <iframe
                            src={blobUrl}
                            className="w-full h-full border-0"
                            title={contract.name}
                        />
                    )}

                    {!isLoading && !error && blobUrl && !isPdf && (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center text-[var(--color-text-secondary)]">
                                <p className="text-lg mb-4">Предпросмотр недоступен для этого формата</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractUpload;
