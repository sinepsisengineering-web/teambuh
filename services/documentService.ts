// services/documentService.ts
// Сервис работы с документами (vault)

import { DocumentMetadata, DocumentType, OwnerType } from '../types/data';
import { generateId } from './idService';

// ============================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ (заглушка vault)
// ============================================

let documentsCache: Map<string, DocumentMetadata> = new Map();

// Инициализация мок-данными
const initMockData = () => {
    const mockDocs: DocumentMetadata[] = [
        {
            id: 'doc_1705680000_a1b2',
            originalName: 'Паспорт Иванова.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1245000,
            ownerType: 'employee',
            ownerId: 'emp_1705680000_a1b2',
            docType: 'passport',
            encryptionAlgorithm: 'AES-256-GCM',
            vaultPath: 'doc_1705680000_a1b2.enc',
            uploadedBy: 'emp_1705680000_a1b2',
            uploadedAt: '2023-01-15T10:00:00Z',
        },
        {
            id: 'doc_1705680001_c3d4',
            originalName: 'Трудовой договор Иванова.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 890000,
            ownerType: 'employee',
            ownerId: 'emp_1705680000_a1b2',
            docType: 'contract',
            encryptionAlgorithm: 'AES-256-GCM',
            vaultPath: 'doc_1705680001_c3d4.enc',
            uploadedBy: 'emp_1705680000_a1b2',
            uploadedAt: '2023-01-15T10:00:00Z',
        },
        {
            id: 'doc_1705680002_e5f6',
            originalName: 'Договор ООО Ромашка.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 567000,
            ownerType: 'client',
            ownerId: 'cli_1705680000_a1b2',
            docType: 'contract',
            encryptionAlgorithm: 'AES-256-GCM',
            vaultPath: 'doc_1705680002_e5f6.enc',
            uploadedBy: 'emp_1705680000_a1b2',
            uploadedAt: '2024-01-20T10:00:00Z',
        },
    ];

    mockDocs.forEach(doc => documentsCache.set(doc.id, doc));
};

initMockData();

// ============================================
// CRUD ОПЕРАЦИИ
// ============================================

/**
 * Получить все документы
 */
export async function getAllDocuments(): Promise<DocumentMetadata[]> {
    return Array.from(documentsCache.values()).filter(d => !d.deletedAt);
}

/**
 * Получить документ по ID
 */
export async function getDocumentById(id: string): Promise<DocumentMetadata | null> {
    const doc = documentsCache.get(id);
    return doc && !doc.deletedAt ? doc : null;
}

/**
 * Получить документы владельца
 */
export async function getDocumentsByOwner(ownerType: OwnerType, ownerId: string): Promise<DocumentMetadata[]> {
    const all = await getAllDocuments();
    return all.filter(d => d.ownerType === ownerType && d.ownerId === ownerId);
}

/**
 * Загрузить документ
 * @param file - Файл (в реальности это будет File или Buffer)
 * @param ownerType - Тип владельца
 * @param ownerId - ID владельца
 * @param uploadedBy - Кто загрузил
 * @param docType - Тип документа
 */
export async function uploadDocument(
    file: { name: string; type: string; size: number },
    ownerType: OwnerType,
    ownerId: string,
    uploadedBy: string,
    docType?: DocumentType
): Promise<DocumentMetadata> {
    const docId = generateId('doc');

    const doc: DocumentMetadata = {
        id: docId,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        ownerType,
        ownerId,
        docType,
        encryptionAlgorithm: 'AES-256-GCM',
        vaultPath: `${docId}.enc`,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
    };

    // TODO: Реальное шифрование и сохранение файла
    // const encrypted = await encryptFile(file.data, encryptionKey);
    // await saveToVault(doc.vaultPath, encrypted);

    documentsCache.set(doc.id, doc);

    return doc;
}

/**
 * Удалить документ (soft delete)
 */
export async function deleteDocument(id: string): Promise<boolean> {
    const doc = documentsCache.get(id);
    if (!doc) return false;

    doc.deletedAt = new Date().toISOString();
    documentsCache.set(id, doc);

    return true;
}

/**
 * Получить содержимое документа (расшифровать)
 * @returns URL или base64 данные (заглушка)
 */
export async function getDocumentContent(id: string): Promise<string | null> {
    const doc = await getDocumentById(id);
    if (!doc) return null;

    // TODO: Реальное расшифрование
    // const encrypted = await readFromVault(doc.vaultPath);
    // const decrypted = await decryptFile(encrypted, encryptionKey);
    // return decrypted;

    // Заглушка - возвращаем placeholder URL
    return `#document-preview/${id}`;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Форматировать размер файла
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/**
 * Получить иконку по типу файла
 */
export function getDocumentIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
}

/**
 * Получить название типа документа
 */
export function getDocumentTypeName(docType?: DocumentType): string {
    switch (docType) {
        case 'passport': return 'Паспорт';
        case 'contract': return 'Договор';
        case 'snils': return 'СНИЛС';
        case 'inn': return 'ИНН';
        case 'ogrnip': return 'ОГРНИП';
        default: return 'Документ';
    }
}
