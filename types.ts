// types.ts

// Импортируем справочник для получения label (отображение) при необходимости
// ID хранятся в данных, label используется для отображения в UI
// См. constants/dictionaries.ts для полного справочника

// Системы налогообложения — ID совпадают со справочником
export enum TaxSystem {
  OSNO = 'OSNO',
  USN_DOHODY = 'USN6',
  USN_DOHODY_RASHODY = 'USN15',
  PATENT = 'PATENT',
  ESHN = 'ESHN',
}

// Юридические формы — ID совпадают со справочником
export enum LegalForm {
  OOO = 'OOO',
  IP = 'IP',
  AO = 'AO',
  PAO = 'PAO',
  ZAO = 'ZAO',
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
  // Периодичность авансов по налогу на прибыль (только для ООО/АО на ОСНО)
  profitAdvancePeriodicity?: 'monthly' | 'quarterly';

  // === ВЫЧИСЛЯЕМЫЕ ПОЛЯ ДЛЯ ПРАВИЛ ГЕНЕРАЦИИ ЗАДАЧ ===
  // (авто-расчёт при сохранении клиента)

  hasPatents?: boolean;               // = patents.length > 0
  paysNdflSelf?: boolean;             // = ИП + ОСНО
  isNdflAgent?: boolean;              // = hasEmployees
  isEshn?: boolean;                   // = taxSystem === 'ESHN'

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
  NextBusinessDay = 'next_business_day',
  PreviousBusinessDay = 'previous_business_day',
  NoTransfer = 'no_transfer',
}

export enum RepeatFrequency {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly',
  Biweekly = 'biweekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
  OneTime = 'oneTime',
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

  // === ПОЛЯ ИЗ СПРАВОЧНИКА ПРАВИЛ ===
  fullDescription?: string;  // Полное описание из правила
  legalBasis?: string;       // Основание (ссылка на закон)
  ruleId?: string;           // ID правила (для связи со справочником)

  // === ДОПУСК К ВЫПОЛНЕНИЮ ===
  completionLeadDays?: number;  // За сколько дней до срока можно выполнить (0=в день, 3=за 3 дня, дефолт 3)
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

// ============================================
// ТИПЫ ДЛЯ ПРАВИЛ (перенесено из taskRules.ts)
// ============================================

export type TaskType = 'Отчет' | 'Уплата' | 'Уведомление' | 'Задача' | 'прочее';
export type RuleCategory = 'налоговые' | 'финансовые' | 'организационные' | 'шаблоны';
export type RuleType = 'global' | 'local' | 'custom';

// Конфигурация расчёта даты
export interface DateCalculationConfig {
  type?: 'fixed_day' | 'day_of_month' | 'end_of_month' | 'relative';
  day?: number;              // День месяца (1-31)
  month?: number;            // Месяц (0-11) для ежегодных правил
  monthOffset?: number;      // Смещение месяца (0 = текущий, 1 = следующий)
  quarterMonthOffset?: number; // Смещение месяца в квартале (0, 1, 2)
  quarter?: 'current' | 'next';
}

// Правило (запись из БД)
export interface TaskRule {
  id: string;
  titleTemplate: string;
  shortTitle?: string;
  shortDescription?: string;
  description?: string;
  lawReference?: string;

  taskType: TaskType;
  periodicity: RepeatFrequency;
  category: RuleCategory;
  ruleType: RuleType;

  // Применимость (декларативно)
  applicabilityConfig?: {
    allClients?: boolean;
    clientIds?: string[];
    legalForms?: string[];
    taxSystems?: string[];
    requiresEmployees?: boolean;
    requiresNds?: boolean;
    profitAdvancePeriodicity?: 'monthly' | 'quarterly';
  };

  // Для старой совместимости — функция (deprecated)
  appliesTo?: (entity: LegalEntity) => boolean;

  // Сроки
  dateConfig: DateCalculationConfig;
  dueDateRule: TaskDueDateRule;
  excludeMonths?: number[];

  // Допуск к выполнению
  completionLeadDays?: number;  // За сколько дней до срока можно выполнить (дефолт 3)

  // Мета
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}