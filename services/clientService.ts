// services/clientService.ts
// Сервис работы с клиентами (JSON профили)
// TODO: Переделать под новую структуру

import { ClientProfile, ClientCompany, ClientContact, ClientAccounting } from '../types/data';
import { generateId } from './idService';

// ============================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ (заглушка)
// ============================================

let clientsCache: Map<string, ClientProfile> = new Map();

// Инициализация мок-данными
const initMockData = () => {
    const mockClients: ClientProfile[] = [
        {
            id: 'cli_1705680000_a1b2',
            createdAt: '2024-01-20T10:00:00Z',
            updatedAt: '2024-06-15T11:00:00Z',
            company: {
                name: 'ООО Ромашка',
                type: 'ooo',
                inn: '7712345678',
                kpp: '771201001',
                ogrn: '1027700000001',
            },
            contact: {
                person: 'Петров Иван Сергеевич',
                phone: '+7 (495) 123-45-67',
                email: 'info@romashka.ru',
                address: 'г. Москва, ул. Цветочная, д. 1',
            },
            accounting: {
                taxSystem: 'usn6',
                accountingPeriod: 'quarterly',
                monthlyFee: 15000,
            },
        },
        {
            id: 'cli_1705680001_c3d4',
            createdAt: '2024-02-10T10:00:00Z',
            updatedAt: '2024-06-15T11:00:00Z',
            company: {
                name: 'ИП Сидоров А.В.',
                type: 'ip',
                inn: '771234567890',
            },
            contact: {
                person: 'Сидоров Андрей Викторович',
                phone: '+7 (495) 987-65-43',
                email: 'sidorov@mail.ru',
            },
            accounting: {
                taxSystem: 'patent',
                accountingPeriod: 'monthly',
                monthlyFee: 5000,
            },
        },
        {
            id: 'cli_1705680002_e5f6',
            createdAt: '2024-03-05T10:00:00Z',
            updatedAt: '2024-06-15T11:00:00Z',
            company: {
                name: 'ООО ТехноПром',
                type: 'ooo',
                inn: '7799887766',
                kpp: '779901001',
                ogrn: '1157700000123',
            },
            contact: {
                person: 'Кузнецова Мария Ивановна',
                phone: '+7 (495) 555-44-33',
                email: 'office@technoprom.ru',
                address: 'г. Москва, ул. Промышленная, д. 15',
            },
            accounting: {
                taxSystem: 'osn',
                accountingPeriod: 'monthly',
                monthlyFee: 30000,
            },
        },
        {
            id: 'cli_1705680003_g7h8',
            createdAt: '2024-04-01T10:00:00Z',
            updatedAt: '2024-06-15T11:00:00Z',
            company: {
                name: 'ООО СтройМастер',
                type: 'ooo',
                inn: '7711223344',
                kpp: '771101001',
            },
            contact: {
                person: 'Николаев Пётр Алексеевич',
                phone: '+7 (495) 111-22-33',
                email: 'stroymaster@yandex.ru',
            },
            accounting: {
                taxSystem: 'usn15',
                accountingPeriod: 'quarterly',
                monthlyFee: 20000,
            },
        },
    ];

    mockClients.forEach(cli => clientsCache.set(cli.id, cli));
};

// Инициализируем при загрузке
initMockData();

// ============================================
// CRUD ОПЕРАЦИИ
// ============================================

/**
 * Получить всех клиентов
 */
export async function getAllClients(): Promise<ClientProfile[]> {
    return Array.from(clientsCache.values());
}

/**
 * Получить клиента по ID
 */
export async function getClientById(id: string): Promise<ClientProfile | null> {
    return clientsCache.get(id) || null;
}

/**
 * Создать нового клиента
 */
export async function createClient(data: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientProfile> {
    const now = new Date().toISOString();
    const client: ClientProfile = {
        id: generateId('cli'),
        createdAt: now,
        updatedAt: now,
        ...data,
    };

    clientsCache.set(client.id, client);

    // TODO: Сохранить в JSON файл на сервере

    return client;
}

/**
 * Обновить клиента
 */
export async function updateClient(
    id: string,
    data: Partial<Omit<ClientProfile, 'id' | 'createdAt'>>
): Promise<ClientProfile | null> {
    const existing = clientsCache.get(id);
    if (!existing) return null;

    const updated: ClientProfile = {
        ...existing,
        ...data,
        company: { ...existing.company, ...data.company },
        contact: { ...existing.contact, ...data.contact },
        accounting: { ...existing.accounting, ...data.accounting },
        updatedAt: new Date().toISOString(),
    };

    clientsCache.set(id, updated);

    return updated;
}

/**
 * Удалить клиента
 */
export async function deleteClient(id: string): Promise<boolean> {
    return clientsCache.delete(id);
}

/**
 * Поиск клиентов
 */
export async function searchClients(query: string): Promise<ClientProfile[]> {
    const all = await getAllClients();
    const lowerQuery = query.toLowerCase();

    return all.filter(cli =>
        cli.company.name.toLowerCase().includes(lowerQuery) ||
        cli.company.inn.includes(query) ||
        (cli.contact.person?.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Получить клиентов по системе налогообложения
 */
export async function getClientsByTaxSystem(taxSystem: string): Promise<ClientProfile[]> {
    const all = await getAllClients();
    return all.filter(cli => cli.accounting.taxSystem === taxSystem);
}
