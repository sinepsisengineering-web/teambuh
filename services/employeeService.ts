// services/employeeService.ts
// Сервис работы с сотрудниками (JSON профили)

import { EmployeeProfile, EmployeePersonal, EmployeeEmployment, EmployeeDocuments, EmployeeFinance } from '../types/data';
import { generateId } from './idService';

// ============================================
// ВРЕМЕННОЕ ХРАНИЛИЩЕ (пока нет backend)
// ============================================

let employeesCache: Map<string, EmployeeProfile> = new Map();

// Инициализация мок-данными
const initMockData = () => {
    const mockEmployees: EmployeeProfile[] = [
        {
            id: 'emp_1705680000_a1b2',
            createdAt: '2023-01-15T10:00:00Z',
            updatedAt: '2024-06-20T14:30:00Z',
            personal: {
                lastName: 'Иванова',
                firstName: 'Мария',
                middleName: 'Петровна',
                email: 'maria@teambuh.ru',
                phone: '+7 (999) 123-45-67',
            },
            employment: {
                type: 'staff',
                workType: 'office',
                hireDate: '2023-01-15',
            },
            documents: {
                passport: '1234 567890',
                inn: '123456789012',
                snils: '123-456-789 00',
            },
            finance: {
                bankName: 'Сбербанк',
                bankAccount: '40817810099910004567',
                cardNumber: '4276 **** 1234',
                salary: 50000,
                percent: 30,
            },
        },
        {
            id: 'emp_1705680001_c3d4',
            createdAt: '2023-06-01T10:00:00Z',
            updatedAt: '2024-06-20T14:30:00Z',
            personal: {
                lastName: 'Петров',
                firstName: 'Алексей',
                middleName: 'Иванович',
                email: 'alex@teambuh.ru',
                phone: '+7 (999) 987-65-43',
            },
            employment: {
                type: 'selfemployed',
                hireDate: '2023-06-01',
            },
            documents: {
                inn: '987654321098',
            },
            finance: {
                bankName: 'Тинькофф',
                bankAccount: '40817810099910001234',
                cardNumber: '5536 **** 5678',
                percent: 35,
            },
        },
        {
            id: 'emp_1705680002_e5f6',
            createdAt: '2022-03-10T10:00:00Z',
            updatedAt: '2024-06-20T14:30:00Z',
            personal: {
                lastName: 'Сидорова',
                firstName: 'Елена',
                middleName: 'Викторовна',
                email: 'elena@teambuh.ru',
                phone: '+7 (999) 555-44-33',
            },
            employment: {
                type: 'ip',
                hireDate: '2022-03-10',
            },
            documents: {
                inn: '111222333444',
                ogrnip: '315774600012345',
            },
            finance: {
                bankName: 'Альфа-Банк',
                bankAccount: '40802810099910009999',
                bik: '044525593',
                corrAccount: '30101810200000000593',
                percent: 40,
            },
        },
        {
            id: 'emp_1705680003_g7h8',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-06-20T14:30:00Z',
            personal: {
                lastName: 'Козлов',
                firstName: 'Дмитрий',
                middleName: 'Сергеевич',
                email: 'dmitry@teambuh.ru',
                phone: '+7 (999) 111-22-33',
            },
            employment: {
                type: 'staff',
                workType: 'remote',
                hireDate: '2024-01-01',
            },
            documents: {
                passport: '9876 543210',
                inn: '555666777888',
                snils: '987-654-321 00',
            },
            finance: {
                bankName: 'ВТБ',
                bankAccount: '40817810099910005555',
                cardNumber: '4272 **** 9999',
                salary: 45000,
                percent: 25,
            },
        },
    ];

    mockEmployees.forEach(emp => employeesCache.set(emp.id, emp));
};

// Инициализируем при загрузке
initMockData();

// ============================================
// CRUD ОПЕРАЦИИ
// ============================================

/**
 * Получить всех сотрудников
 */
export async function getAllEmployees(): Promise<EmployeeProfile[]> {
    return Array.from(employeesCache.values());
}

/**
 * Получить сотрудника по ID
 */
export async function getEmployeeById(id: string): Promise<EmployeeProfile | null> {
    return employeesCache.get(id) || null;
}

/**
 * Создать нового сотрудника
 */
export async function createEmployee(data: {
    personal: EmployeePersonal;
    employment: EmployeeEmployment;
    documents: EmployeeDocuments;
    finance: EmployeeFinance;
}): Promise<EmployeeProfile> {
    const now = new Date().toISOString();
    const employee: EmployeeProfile = {
        id: generateId('emp'),
        createdAt: now,
        updatedAt: now,
        ...data,
    };

    employeesCache.set(employee.id, employee);

    // TODO: Сохранить в JSON файл на сервере
    // await saveEmployeeToFile(tenantId, employee);

    return employee;
}

/**
 * Обновить сотрудника
 */
export async function updateEmployee(
    id: string,
    data: Partial<Omit<EmployeeProfile, 'id' | 'createdAt'>>
): Promise<EmployeeProfile | null> {
    const existing = employeesCache.get(id);
    if (!existing) return null;

    const updated: EmployeeProfile = {
        ...existing,
        ...data,
        personal: { ...existing.personal, ...data.personal },
        employment: { ...existing.employment, ...data.employment },
        documents: { ...existing.documents, ...data.documents },
        finance: { ...existing.finance, ...data.finance },
        updatedAt: new Date().toISOString(),
    };

    employeesCache.set(id, updated);

    // TODO: Сохранить в JSON файл на сервере

    return updated;
}

/**
 * Удалить (уволить) сотрудника
 */
export async function dismissEmployee(id: string, dismissDate: string): Promise<boolean> {
    const existing = employeesCache.get(id);
    if (!existing) return false;

    const updated: EmployeeProfile = {
        ...existing,
        employment: {
            ...existing.employment,
            dismissDate,
        },
        updatedAt: new Date().toISOString(),
    };

    employeesCache.set(id, updated);

    return true;
}

/**
 * Получить активных сотрудников (не уволенных)
 */
export async function getActiveEmployees(): Promise<EmployeeProfile[]> {
    const all = await getAllEmployees();
    return all.filter(emp => !emp.employment.dismissDate);
}

/**
 * Поиск сотрудников
 */
export async function searchEmployees(query: string): Promise<EmployeeProfile[]> {
    const all = await getAllEmployees();
    const lowerQuery = query.toLowerCase();

    return all.filter(emp =>
        emp.personal.lastName.toLowerCase().includes(lowerQuery) ||
        emp.personal.firstName.toLowerCase().includes(lowerQuery) ||
        emp.personal.email.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Получить полное имя сотрудника
 */
export function getEmployeeFullName(employee: EmployeeProfile): string {
    const { lastName, firstName, middleName } = employee.personal;
    return middleName
        ? `${lastName} ${firstName} ${middleName}`
        : `${lastName} ${firstName}`;
}

/**
 * Получить краткое имя сотрудника
 */
export function getEmployeeShortName(employee: EmployeeProfile): string {
    const { lastName, firstName } = employee.personal;
    return `${lastName} ${firstName.charAt(0)}.`;
}
