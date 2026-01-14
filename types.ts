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
  notes?: Note[]; 
  credentials: Credential[];
  patents: Patent[];
  isArchived?: boolean;
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
  dueDate: Date;
  dueTime?: string;
  dueDateRule: TaskDueDateRule;
  repeat: RepeatFrequency;
  reminder: ReminderSetting;
  status: TaskStatus;
  isAutomatic: boolean;
  seriesId?: string; 
  isPeriodLocked?: boolean;
}


export interface ProgressInfo {
  percent: number;
}


export interface UpdateMessage {
  status: 'checking' | 'available' | 'info' | 'error' | 'downloaded';
  text: string;
}