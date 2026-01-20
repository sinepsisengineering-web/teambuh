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