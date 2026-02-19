// services/storageService.ts
// Сервис хранения данных — использует сервер API

import { LegalEntity, Employee, UploadedDocument } from '../types';
import { API_BASE_URL, authFetch } from '../apiConfig';

// Конфигурация сервера
const SERVER_URL = API_BASE_URL;
const DEFAULT_TENANT = 'org_default';

// =============================================
// ИНТЕРФЕЙС ПРОВАЙДЕРА ХРАНЕНИЯ
// =============================================

export interface StorageProvider {
    // Клиенты
    saveClient(client: LegalEntity): Promise<LegalEntity>;
    loadClient(id: string): Promise<LegalEntity | null>;
    loadAllClients(): Promise<LegalEntity[]>;
    deleteClient(id: string): Promise<void>;

    // Сотрудники
    saveEmployee(employee: Employee): Promise<Employee>;
    loadEmployee(id: string): Promise<Employee | null>;
    loadAllEmployees(): Promise<Employee[]>;
    deleteEmployee(id: string): Promise<void>;

    // Документы
    saveDocument(entityType: 'clients' | 'employees', entityId: string, file: File): Promise<UploadedDocument>;
    loadDocuments(entityType: 'clients' | 'employees', entityId: string): Promise<UploadedDocument[]>;
    deleteDocument(entityType: 'clients' | 'employees', entityId: string, filename: string): Promise<void>;
}

// =============================================
// РЕАЛИЗАЦИЯ: Server API
// =============================================

export class ServerStorageProvider implements StorageProvider {
    private baseUrl: string;
    private tenantId: string;

    constructor(baseUrl: string = SERVER_URL, tenantId: string = DEFAULT_TENANT) {
        this.baseUrl = baseUrl;
        this.tenantId = tenantId;
    }

    private getUrl(path: string): string {
        return `${this.baseUrl}/api/${this.tenantId}${path}`;
    }

    // --- Клиенты ---

    async saveClient(client: LegalEntity): Promise<LegalEntity> {
        const response = await authFetch(this.getUrl('/clients'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client),
        });
        if (!response.ok) throw new Error('Failed to save client');
        return response.json();
    }

    async loadClient(id: string): Promise<LegalEntity | null> {
        const response = await authFetch(this.getUrl(`/clients/${id}`));
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to load client');
        return response.json();
    }

    async loadAllClients(): Promise<LegalEntity[]> {
        const response = await authFetch(this.getUrl('/clients'));
        if (!response.ok) throw new Error('Failed to load clients');
        return response.json();
    }

    async deleteClient(id: string): Promise<void> {
        const response = await authFetch(this.getUrl(`/clients/${id}`), {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete client');
    }

    // --- Сотрудники ---

    async saveEmployee(employee: Employee): Promise<Employee> {
        const response = await authFetch(this.getUrl('/employees'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employee),
        });
        if (!response.ok) throw new Error('Failed to save employee');
        return response.json();
    }

    async loadEmployee(id: string): Promise<Employee | null> {
        const response = await authFetch(this.getUrl(`/employees/${id}`));
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to load employee');
        return response.json();
    }

    async loadAllEmployees(): Promise<Employee[]> {
        const response = await authFetch(this.getUrl('/employees'));
        if (!response.ok) throw new Error('Failed to load employees');
        return response.json();
    }

    async deleteEmployee(id: string): Promise<void> {
        const response = await authFetch(this.getUrl(`/employees/${id}`), {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete employee');
    }

    // --- Документы ---
    // TODO: 🔒 Добавить шифрование при переходе на production

    async saveDocument(entityType: 'clients' | 'employees', entityId: string, file: File): Promise<UploadedDocument> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await authFetch(this.getUrl(`/${entityType}/${entityId}/documents`), {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload document');
        return response.json();
    }

    async loadDocuments(entityType: 'clients' | 'employees', entityId: string): Promise<UploadedDocument[]> {
        const response = await authFetch(this.getUrl(`/${entityType}/${entityId}/documents`));
        if (!response.ok) throw new Error('Failed to load documents');
        return response.json();
    }

    async deleteDocument(entityType: 'clients' | 'employees', entityId: string, filename: string): Promise<void> {
        const response = await authFetch(this.getUrl(`/${entityType}/${entityId}/documents/${filename}`), {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete document');
    }
}

// =============================================
// ЭКСПОРТ: Singleton
// =============================================

export const storage = new ServerStorageProvider();

// =============================================
// ФУНКЦИИ АРХИВАЦИИ
// =============================================

export type ArchiveType = 'clients' | 'employees' | 'rules';

export const archiveItem = async (type: ArchiveType, item: any, tenantId: string = DEFAULT_TENANT): Promise<void> => {
    const response = await authFetch(`${SERVER_URL}/api/${tenantId}/archive/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to archive item');
};

export const restoreItem = async (type: ArchiveType, itemId: string, tenantId: string = DEFAULT_TENANT): Promise<any> => {
    const response = await authFetch(`${SERVER_URL}/api/${tenantId}/archive/${type}/${itemId}/restore`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to restore item');
    return response.json();
};

export const deleteItemForever = async (type: ArchiveType, itemId: string, tenantId: string = DEFAULT_TENANT): Promise<void> => {
    const response = await authFetch(`${SERVER_URL}/api/${tenantId}/archive/${type}/${itemId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete item');
};

export const loadArchive = async (type: ArchiveType, tenantId: string = DEFAULT_TENANT): Promise<any[]> => {
    const response = await authFetch(`${SERVER_URL}/api/${tenantId}/archive/${type}`);
    if (!response.ok) throw new Error('Failed to load archive');
    return response.json();
};
