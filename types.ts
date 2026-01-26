// types.ts

export enum TaxSystem {
  OSNO = 'ОСНО',
  USN_DOHODY = 'УСН "Доходы"',
  USN_DOHODY_RASHODY = 'УСН "Доходы минус расходы"',
  PATENT = 'Патент',
}

export enum LegalForm {
  OOO = 'ООО',
  IP = 'ИП',
  AO = 'АО',
  PAO = 'ПАО',
  ZAO = 'ЗАО',
}

export interface Credential {
  id: string;
  service: string;
  login: string;
  password?: string;
}

export interface Patent {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  autoRenew: boolean;
}

export interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

// Контакт клиента (до 4 на клиента)
export interface ClientContact {
  id: string;
  role: string;       // Директор, Бухгалтер, Менеджер...
  name: string;
  phone?: string;
  email?: string;
}

export interface LegalEntity {
  id: string;
  legalForm: LegalForm;
  name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  ogrnDate?: Date;
  createdAt?: Date | string;
  legalAddress: string;
  actualAddress: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxSystem: TaxSystem;
  isNdsPayer: boolean;
  ndsValue?: string;
  hasEmployees: boolean;
  employeeCount?: number;
  notes?: Note[];
  credentials: Credential[];
  patents: Patent[];
  isArchived?: boolean;

  // === НОВЫЕ ПОЛЯ ===

  // Назначенный бухгалтер
  accountantId?: string;
  accountantName?: string;

  // Статус клиента
  clientStatus?: 'permanent' | 'onetime';

  // Тариф
  tariffName?: string;
  tariffPrice?: number;

  // Банковские реквизиты
  bankName?: string;
  bankAccount?: string;
  bik?: string;
  corrAccount?: string;

  // Расширенные контакты (до 4)
  contacts?: ClientContact[];

  // Путь к папке с документами (для файлового хранения)
  folderPath?: string;
}

export enum TaskStatus {
  Upcoming = 'Предстоящая',
  DueSoon = 'Скоро срок',
  DueToday = 'Срок сегодня',
  Overdue = 'Просрочена',
  Completed = 'Выполнена',
  Locked = 'Будущий период',
}

export enum TaskDueDateRule {
  NextBusinessDay = 'next',
  PreviousBusinessDay = 'previous',
  NoTransfer = 'none',
}

export enum RepeatFrequency {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum ReminderSetting {
  OneHour = '1h',
  OneDay = '1d',
  ThreeDays = '3d',
  OneWeek = '1w',
}

export interface Task {
  id: string;
  legalEntityId: string;
  title: string;
  description?: string;
  dueDate: Date;              // Итоговая дата (после переноса с выходных)
  originalDueDate?: Date;     // Оригинальная дата по правилу (до переноса)
  dueTime?: string;
  dueDateRule: TaskDueDateRule;
  repeat: RepeatFrequency;
  reminder: ReminderSetting;
  status: TaskStatus;
  isAutomatic: boolean;
  seriesId?: string;
  isPeriodLocked?: boolean;

  // === НОВЫЕ ПОЛЯ ДЛЯ TasksView ===

  // Привязка к сотруднику: ID сотрудника, 'shared' (общая), null (не распределена)
  assignedTo?: string | 'shared' | null;

  // Флаги статуса
  isUrgent?: boolean;      // 🔥 Срочная
  isBlocked?: boolean;     // ⏸️ Ожидает (заблокирована)
  blockedReason?: string;  // Причина блокировки
}


export interface ProgressInfo {
  percent: number;
}


export interface UpdateMessage {
  status: 'checking' | 'available' | 'info' | 'error' | 'downloaded';
  text: string;
}

// === STAFF TYPES ===

export type EmploymentType = 'staff' | 'selfemployed' | 'ip';
export type WorkType = 'office' | 'remote';
export type EmployeeRole = 'admin' | 'accountant' | 'assistant';

export interface UploadedDocument {
  id: string;
  name: string;
  uploadDate: Date;
  size: number;
  type: string;
}

export interface Employee {
  id: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  workType?: WorkType;
  hireDate: string;

  // Documents
  passport?: string;
  inn?: string;
  snils?: string;
  ogrnip?: string;

  // Finance
  bankName?: string;
  bankAccount?: string;
  cardNumber?: string;
  bik?: string;
  corrAccount?: string;
  salary?: string;
  percent?: string;

  // System
  role: EmployeeRole;
  isActive: boolean;
  isBlocked: boolean;
  documents: UploadedDocument[];
}