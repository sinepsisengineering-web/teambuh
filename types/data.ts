// types/data.ts
// Основные типы данных согласно архитектуре v4

// ============================================
// ГЕНЕРАЦИЯ ID
// ============================================

export type EntityPrefix = 'org' | 'emp' | 'cli' | 'task' | 'doc' | 'payroll' | 'role' | 'perm';

/**
 * Генерирует уникальный ID в формате: prefix_timestamp_random
 * @example generateId('emp') → "emp_1705680000_x7k2"
 */
export function generateId(prefix: EntityPrefix): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}_${timestamp}_${random}`;
}

// ============================================
// ТИПЫ ЗАНЯТОСТИ
// ============================================

export type EmploymentType = 'staff' | 'selfemployed' | 'ip';
export type WorkType = 'office' | 'remote';

// ============================================
// РОЛИ И ПРАВА
// ============================================

export type RoleType = 'admin' | 'accountant' | 'assistant';
export type UserStatus = 'active' | 'blocked';

export interface Role {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    createdAt: string;
}

export interface Permission {
    id: string;
    code: string;           // "employees.view"
    name: string;           // "Просмотр сотрудников"
    category: string;       // "employees"
    description?: string;
}

export interface UserRole {
    userId: string;
    roleId: string;
    assignedAt: string;
    assignedBy?: string;
    expiresAt?: string;     // null = бессрочно
    isActive: boolean;
}

export interface UserPermission {
    id: string;
    userId: string;
    permissionId: string;
    granted: boolean;       // true = разрешено, false = запрещено
    grantedAt: string;
    grantedBy?: string;
    expiresAt?: string;
    reason?: string;
}

// ============================================
// СОТРУДНИК (Employee)
// ============================================

export interface EmployeePersonal {
    lastName: string;
    firstName: string;
    middleName?: string;
    email: string;
    phone: string;
    photoFile?: string;     // Имя файла фото
}

export interface EmployeeEmployment {
    type: EmploymentType;
    workType?: WorkType;    // Только для staff
    hireDate: string;       // ISO date
    dismissDate?: string;
}

export interface EmployeeDocuments {
    passport?: string;      // Серия номер
    inn: string;
    snils?: string;         // Только для staff
    ogrnip?: string;        // Только для ip
}

export interface EmployeeFinance {
    bankName?: string;
    bankAccount?: string;
    cardNumber?: string;
    bik?: string;           // Только для ip
    corrAccount?: string;   // Только для ip
    salary?: number;        // Только для staff
    percent: number;
}

export interface EmployeeProfile {
    id: string;
    createdAt: string;
    updatedAt: string;
    personal: EmployeePersonal;
    employment: EmployeeEmployment;
    documents: EmployeeDocuments;
    finance: EmployeeFinance;
}

// ============================================
// КЛИЕНТ (Client)
// ============================================

export type CompanyType = 'ooo' | 'ip' | 'ao' | 'zao' | 'other';
export type TaxSystem = 'osn' | 'usn6' | 'usn15' | 'patent' | 'eshn';

export interface ClientCompany {
    name: string;
    type: CompanyType;
    inn: string;
    kpp?: string;           // Для юрлиц
    ogrn?: string;
}

export interface ClientContact {
    person?: string;
    phone?: string;
    email?: string;
    address?: string;
    role?: string; // Role for additional contacts
}

export interface ClientAccounting {
    taxSystem: TaxSystem;
    accountingPeriod: 'monthly' | 'quarterly';
    monthlyFee?: number;
}

export interface ClientProfile {
    id: string;
    createdAt: string;
    updatedAt: string;
    company: ClientCompany;
    contact: ClientContact;
    contacts?: ClientContact[]; // Дополнительные контакты
    accounting: ClientAccounting;
    patents?: any[];            // Патенты (упрощенно any, или можно описать тип)
    credentials?: any[];        // Доступы
    status?: 'permanent' | 'onetime';
    managerId?: string;
    managerName?: string;
}

// ============================================
// ДОКУМЕНТЫ (Vault)
// ============================================

export type DocumentType = 'passport' | 'contract' | 'snils' | 'inn' | 'ogrnip' | 'other';
export type OwnerType = 'employee' | 'client';

export interface DocumentMetadata {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    ownerType: OwnerType;
    ownerId: string;
    docType?: DocumentType;
    description?: string;
    encryptionAlgorithm: string;
    vaultPath: string;
    uploadedBy: string;
    uploadedAt: string;
    deletedAt?: string;     // Soft delete
}

// ============================================
// ЗАДАЧИ (Tasks)
// ============================================

export type TaskCategory = 'reporting' | 'payment' | 'consultation' | 'documents' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskRecurring {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    category: TaskCategory;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    completedAt?: string;
    clientId?: string;
    clientName?: string;            // Кэш
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;  // Кэш
    createdByEmployeeId: string;
    isRecurring: boolean;
    recurringRule?: TaskRecurring;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// ЗАРПЛАТА (Payroll)
// ============================================

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid';
export type PaymentStatus = 'pending' | 'paid';

export interface PayrollPeriod {
    id: string;
    period: string;         // "2026-01"
    status: PayrollStatus;
    totalGross: number;
    totalNet: number;
    createdAt: string;
    updatedAt: string;
}

export interface PayrollEntry {
    id: string;
    periodId: string;
    employeeId: string;
    employeeName?: string;  // Кэш
    baseSalary: number;
    percentEarnings: number;
    bonuses: number;
    totalGross: number;
    ndfl: number;
    otherDeductions: number;
    totalDeductions: number;
    totalNet: number;
    paymentStatus: PaymentStatus;
    paymentDate?: string;
    paymentDocumentId?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// СВЯЗИ
// ============================================

export interface EmployeeClient {
    employeeId: string;
    clientId: string;
    assignedAt: string;
    isPrimary: boolean;
}

export interface ClientRevenue {
    id: string;
    clientId: string;
    period: string;         // "2026-01"
    amount: number;
    description?: string;
    createdAt: string;
}

// ============================================
// АУДИТ
// ============================================

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'employee' | 'client' | 'task' | 'payroll' | 'document';

export interface AuditLogEntry {
    id: number;
    timestamp: string;
    userId?: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    changes?: Record<string, any>;
    ipAddress?: string;
}

// ============================================
// ОРГАНИЗАЦИЯ (Tenant)
// ============================================

export interface TenantOwner {
    employeeId: string;
    name: string;
    email: string;
}

export interface TenantSettings {
    timezone: string;
    language: string;
    currency: string;
}

export interface TenantSubscription {
    plan: 'basic' | 'professional' | 'enterprise';
    expiresAt: string;
}

export interface TenantMeta {
    id: string;
    name: string;
    inn?: string;
    createdAt: string;
    owner: TenantOwner;
    settings: TenantSettings;
    subscription: TenantSubscription;
}

// ============================================
// АУТЕНТИФИКАЦИЯ
// ============================================

export interface AuthRecord {
    userId: string;
    passwordHash: string;
    lastLogin?: string;
    failedAttempts: number;
    lockedUntil?: string;
    createdAt: string;
    updatedAt: string;
}
