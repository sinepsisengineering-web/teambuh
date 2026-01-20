// services/index.ts
// Центральный экспорт всех сервисов

// ID генерация
export * from './idService';

// Организации (мультитенант)
export * from './tenantService';

// Сотрудники
export * from './employeeService';

// Клиенты
export * from './clientService';

// Документы (vault)
export * from './documentService';

// Права доступа
export * from './permissionService';

// Re-export types for convenience
export type {
    EntityPrefix,
    EmploymentType,
    WorkType,
    RoleType,
    UserStatus,
    Role,
    Permission,
    UserRole,
    UserPermission,
    EmployeeProfile,
    EmployeePersonal,
    EmployeeEmployment,
    EmployeeDocuments,
    EmployeeFinance,
    ClientProfile,
    ClientCompany,
    ClientContact,
    ClientAccounting,
    DocumentMetadata,
    DocumentType,
    OwnerType,
    Task,
    TaskCategory,
    TaskPriority,
    TaskStatus,
    PayrollPeriod,
    PayrollEntry,
    TenantMeta,
} from '../types/data';
