// dummy-data.ts

import { Client, LegalForm, TaxSystem } from './types';

export const DUMMY_CLIENTS: Client[] = [
    {
        id: 'client-group-1',
        name: 'Группа компаний "Партнер"',
        isArchived: false,
        legalEntities: [
            {
              id: 'legal-entity-1',
              legalForm: LegalForm.OOO,
              name: 'Ромашка',
              inn: '7701234567',
              kpp: '770101001',
              ogrn: '1027700123456',
              ogrnDate: new Date('2002-08-15'),
              legalAddress: 'г. Москва, ул. Цветочная, д. 1',
              actualAddress: 'г. Москва, ул. Цветочная, д. 1',
              contactPerson: 'Иванов Иван Иванович',
              phone: '+7 (495) 123-45-67',
              email: 'info@romashka.ru',
              taxSystem: TaxSystem.USN_DOHODY_RASHODY,
              isNdsPayer: false,
              ndsValue: '',
              hasEmployees: true,
              credentials: [ { id: 'cred-1-1', service: 'ФНС', login: '7701234567', password: 'password1' } ],
              patents: [],
              notes: 'Основное юрлицо группы.',
            },
            {
              id: 'legal-entity-3',
              legalForm: LegalForm.OOO,
              name: 'ТехноСтрой',
              inn: '7703456789',
              kpp: '770301001',
              ogrn: '1157746012345',
              ogrnDate: new Date('2015-01-25'),
              legalAddress: 'г. Москва, Проспект Мира, д. 101',
              actualAddress: 'г. Москва, Проспект Мира, д. 101',
              contactPerson: 'Петров Петр Петрович',
              phone: '+7 (495) 987-65-43',
              email: 'info@technostroy.com',
              taxSystem: TaxSystem.OSNO,
              isNdsPayer: true,
              ndsValue: '',
              hasEmployees: true,
              credentials: [ { id: 'cred-3-1', service: 'ФНС', login: '7703456789', password: 'password3' } ],
              patents: [],
              notes: '',
            }
        ]
    },
    {
        id: 'client-individual-2',
        name: 'ИП Сидоров С.С.',
        isArchived: false,
        legalEntities: [{
            id: 'legal-entity-2',
            legalForm: LegalForm.IP,
            name: 'Сидоров Сидор Сидорович',
            inn: '7702345678',
            kpp: undefined,
            ogrn: '304770001234567',
            ogrnDate: new Date('2004-05-20'),
            legalAddress: 'г. Москва, ул. Строителей, д. 15, кв. 5',
            actualAddress: 'г. Москва, ул. Строителей, д. 15, кв. 5',
            contactPerson: 'Сидоров Сидор Сидорович',
            phone: '+7 (916) 123-45-67',
            email: 'sidorov@mail.ru',
            taxSystem: TaxSystem.USN_DOHODY,
            isNdsPayer: false,
            ndsValue: '',
            hasEmployees: false,
            credentials: [],
            patents: [
              { id: 'patent-1-24', name: 'Разработка ПО', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), autoRenew: true },
              { id: 'patent-2-24', name: 'Розничная торговля', startDate: new Date('2024-07-01'), endDate: new Date('2024-09-30'), autoRenew: false }
            ],
            notes: 'Только патенты, следить за сроками.',
        }]
    }
];