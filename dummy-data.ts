// dummy-data.ts
// Тестовые данные: 2 клиента (ООО и ИП)

import { LegalEntity, LegalForm, TaxSystem } from './types';

// Простая структура: массив юр.лиц (без вложенных групп)
export const DUMMY_LEGAL_ENTITIES: LegalEntity[] = [
  {
    id: 'le_test_ooo_001',
    legalForm: LegalForm.OOO,
    name: 'Тестовая Компания',
    inn: '7701234567',
    kpp: '770101001',
    ogrn: '1027700123456',
    ogrnDate: new Date('2023-01-15'),
    createdAt: new Date('2023-01-15'),
    legalAddress: 'г. Москва, ул. Пример, д. 1',
    actualAddress: 'г. Москва, ул. Пример, д. 1',
    contactPerson: 'Иванов Иван Иванович',
    phone: '+7 (495) 123-45-67',
    email: 'test@testcompany.ru',
    taxSystem: TaxSystem.USN_DOHODY,
    isNdsPayer: false,
    hasEmployees: true,
    credentials: [],
    patents: [],
    isArchived: false,
  },
  {
    id: 'le_test_ip_002',
    legalForm: LegalForm.IP,
    name: 'Петров Пётр Петрович',
    inn: '771234567890',
    ogrn: '304770001234567',
    ogrnDate: new Date('2023-06-01'),
    createdAt: new Date('2023-06-01'),
    legalAddress: 'г. Москва, ул. Примерная, д. 10, кв. 5',
    actualAddress: 'г. Москва, ул. Примерная, д. 10, кв. 5',
    contactPerson: 'Петров Пётр Петрович',
    phone: '+7 (916) 987-65-43',
    email: 'petrov@mail.ru',
    taxSystem: TaxSystem.PATENT,
    isNdsPayer: false,
    hasEmployees: false,
    credentials: [
      { id: 'cred_001', service: 'СБИС', login: 'petrov_ip', password: 'test123' }
    ],
    patents: [
      {
        id: 'patent_001',
        name: 'Розничная торговля',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        autoRenew: true
      }
    ],
    isArchived: false,
  }
];

// Обратная совместимость со старым форматом (для постепенного перехода)
export interface Client {
  id: string;
  name: string;
  isArchived: boolean;
  legalEntities: LegalEntity[];
}

export const DUMMY_CLIENTS: Client[] = [
  {
    id: 'client_group_001',
    name: 'Тестовые клиенты',
    isArchived: false,
    legalEntities: DUMMY_LEGAL_ENTITIES
  }
];

import { Employee, EmploymentType, UploadedDocument } from './types';

export const DUMMY_EMPLOYEES: Employee[] = [
  {
    id: '1', lastName: 'Иванова', firstName: 'Мария', middleName: 'Петровна',
    email: 'maria@teambuh.ru', phone: '+7 (999) 123-45-67',
    employmentType: 'staff', workType: 'office',
    hireDate: '2023-01-15', passport: '1234 567890', inn: '123456789012', snils: '123-456-789 00',
    bankName: 'Сбербанк', bankAccount: '40817810099910004567', cardNumber: '4276 **** 1234',
    salary: '50000', percent: '30', isActive: true, isBlocked: false,
    role: 'accountant',
    documents: [
      { id: 'd1', name: 'Паспорт.pdf', uploadDate: new Date('2023-01-15'), size: 1245000, type: 'pdf' },
      { id: 'd2', name: 'Трудовой договор.pdf', uploadDate: new Date('2023-01-15'), size: 890000, type: 'pdf' },
    ]
  },
  {
    id: '2', lastName: 'Петров', firstName: 'Алексей', middleName: 'Иванович',
    email: 'alex@teambuh.ru', phone: '+7 (999) 987-65-43',
    employmentType: 'selfemployed', hireDate: '2023-06-01',
    inn: '987654321098', bankName: 'Тинькофф', bankAccount: '40817810099910001234', cardNumber: '5536 **** 5678',
    percent: '35', isActive: true, isBlocked: false,
    role: 'accountant',
    documents: [{ id: 'd3', name: 'Договор ГПХ.pdf', uploadDate: new Date('2023-06-01'), size: 567000, type: 'pdf' }]
  },
  {
    id: '3', lastName: 'Сидорова', firstName: 'Елена', middleName: 'Викторовна',
    email: 'elena@teambuh.ru', phone: '+7 (999) 555-44-33',
    employmentType: 'ip', hireDate: '2022-03-10',
    inn: '111222333444', ogrnip: '315774600012345',
    bankName: 'Альфа-Банк', bankAccount: '40802810099910009999', bik: '044525593', corrAccount: '30101810200000000593',
    percent: '40', isActive: true, isBlocked: false,
    role: 'accountant',
    documents: [
      { id: 'd4', name: 'Договор с ИП.pdf', uploadDate: new Date('2022-03-10'), size: 1123000, type: 'pdf' },
      { id: 'd5', name: 'Выписка ЕГРИП.pdf', uploadDate: new Date('2022-03-10'), size: 445000, type: 'pdf' },
    ]
  },
  {
    id: '4', lastName: 'Козлов', firstName: 'Дмитрий', middleName: 'Сергеевич',
    email: 'dmitry@teambuh.ru', phone: '+7 (999) 111-22-33',
    employmentType: 'staff', workType: 'remote',
    hireDate: '2024-01-01', passport: '9876 543210', inn: '555666777888', snils: '987-654-321 00',
    bankName: 'ВТБ', bankAccount: '40817810099910005555', cardNumber: '4272 **** 9999',
    salary: '45000', percent: '25', isActive: true, isBlocked: false,
    role: 'assistant',
    documents: []
  }
];