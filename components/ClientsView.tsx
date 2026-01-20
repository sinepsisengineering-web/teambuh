// components/ClientsView.tsx
// Новый компонент списка и детализации клиентов

import React, { useState, useMemo } from 'react';
import { DocumentUpload, UploadedDocument } from './DocumentUpload';
import { MiniCalendar } from './MiniCalendar';
import { LegalEntity, TaxSystem as GlobalTaxSystem, LegalForm as GlobalLegalForm } from '../types';

// Props от родительского компонента App.tsx
interface ClientsViewProps {
    legalEntities: LegalEntity[];
    onSave: (entity: LegalEntity) => void;
    onDelete: (entity: LegalEntity) => void;
    onArchive: (entity: LegalEntity) => void;
}

// ============================================
// ТИПЫ
// ============================================

type ClientTab = 'list' | 'details' | 'manage';
type TaxSystem = 'osn' | 'usn6' | 'usn15' | 'eshn';
type LegalForm = 'ooo' | 'ip' | 'ao' | 'zao';
type ClientStatus = 'permanent' | 'onetime';

interface Patent {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    duration: number; // в месяцах
}

interface ServiceCredential {
    id: string;
    serviceName: string;
    login: string;
    password: string;
}

interface Contact {
    id: string;
    role: string; // Директор, Бухгалтер, Менеджер...
    name: string;
    phone?: string;
    email?: string;
}

interface Tariff {
    name: string;
    price: number;
    description?: string;
}

interface Client {
    id: string;
    name: string;
    legalForm: LegalForm;
    inn: string;
    kpp?: string;
    ogrn?: string;
    taxSystem: TaxSystem;
    isNdsPayer: boolean;
    ndsPercent?: number;
    hasEmployees: boolean;
    employeeCount?: number;
    status: ClientStatus;
    tariff: Tariff;
    managerId: string;
    managerName: string;
    contractDocId?: string;
    createdAt: string;
    // Банковские реквизиты
    bankName?: string;
    bankAccount?: string;
    bik?: string;
    corrAccount?: string;
    // Адреса
    legalAddress?: string;  // Юридический адрес
    actualAddress?: string; // Фактический адрес
    // Контакты (динамические, добавляются при создании)
    contacts?: Contact[];
    // Патенты (только для ИП)
    patents?: Patent[];
    // Доступы к сервисам
    credentials?: ServiceCredential[];
}

interface Comment {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    createdAt: string;
}

// ============================================
// МОК ДАННЫЕ
// ============================================

const mockClients: Client[] = [
    {
        id: 'cli_001',
        name: 'ООО Ромашка',
        legalForm: 'ooo',
        inn: '7712345678',
        kpp: '771201001',
        ogrn: '1027700000001',
        taxSystem: 'usn6',
        isNdsPayer: false,
        hasEmployees: true,
        employeeCount: 5,
        status: 'permanent',
        tariff: { name: 'Стандарт', price: 15000, description: 'Ведение бухгалтерии, сдача отчётности' },
        managerId: 'emp_001',
        managerName: 'Иванова М.',
        createdAt: '2024-01-20',
        bankName: 'Сбербанк',
        bankAccount: '40702810099910001234',
        bik: '044525225',
        corrAccount: '30101810400000000225',
        legalAddress: 'г. Москва, ул. Цветочная, д. 1, офис 5',
        actualAddress: 'г. Москва, ул. Цветочная, д. 1, офис 5',
        contacts: [
            { id: 'cnt1', role: 'Директор', name: 'Петров Иван Сергеевич', phone: '+7 (495) 123-45-67', email: 'director@romashka.ru' },
            { id: 'cnt2', role: 'Бухгалтер', name: 'Смирнова Елена Викторовна', phone: '+7 (495) 123-45-68', email: 'buh@romashka.ru' },
        ],
        credentials: [
            { id: 'cred1', serviceName: 'СБИС', login: 'romashka_ooo', password: 'SecurePass123!' },
            { id: 'cred2', serviceName: 'Банк-клиент', login: '7712345678', password: 'BankPass456@' },
        ],
    },
    {
        id: 'cli_002',
        name: 'ИП Сидоров А.В.',
        legalForm: 'ip',
        inn: '771234567890',
        taxSystem: 'usn6',
        isNdsPayer: false,
        hasEmployees: false,
        status: 'permanent',
        tariff: { name: 'Базовый', price: 5000, description: 'Базовое обслуживание ИП' },
        managerId: 'emp_002',
        managerName: 'Петров А.',
        createdAt: '2024-02-10',
        bankName: 'Тинькофф',
        bankAccount: '40802810200000012345',
        bik: '044525974',
        corrAccount: '30101810145250000974',
        legalAddress: 'г. Москва, ул. Ленина, д. 25, кв. 12',
        actualAddress: 'г. Москва, ул. Мира, д. 10, офис 3',
        contacts: [
            { id: 'cnt3', role: 'ИП', name: 'Сидоров Алексей Владимирович', phone: '+7 (495) 987-65-43', email: 'sidorov@mail.ru' },
        ],
        patents: [
            { id: 'pat1', name: 'Розничная торговля', type: 'Торговля', startDate: '2024-01-01', endDate: '2024-12-31', duration: 12 },
        ],
        credentials: [
            { id: 'cred3', serviceName: 'ЛК ФНС', login: '771234567890', password: 'FnsPass789#' },
        ],
    },
    {
        id: 'cli_003',
        name: 'ООО ТехноПром',
        legalForm: 'ooo',
        inn: '7799887766',
        kpp: '779901001',
        ogrn: '1157700000123',
        taxSystem: 'osn',
        isNdsPayer: true,
        ndsPercent: 20,
        hasEmployees: true,
        employeeCount: 12,
        status: 'permanent',
        tariff: { name: 'Премиум', price: 35000, description: 'Полное обслуживание с НДС' },
        managerId: 'emp_001',
        managerName: 'Иванова М.',
        createdAt: '2024-03-05',
        bankName: 'Альфа-Банк',
        bankAccount: '40702810099910009999',
        bik: '044525593',
        corrAccount: '30101810200000000593',
        legalAddress: 'г. Москва, ул. Промышленная, д. 15, стр. 2',
        actualAddress: 'г. Москва, ул. Промышленная, д. 15, стр. 2',
        contacts: [
            { id: 'cnt4', role: 'Генеральный директор', name: 'Кузнецова Мария Ивановна', phone: '+7 (495) 555-44-33', email: 'ceo@technoprom.ru' },
            { id: 'cnt5', role: 'Гл. бухгалтер', name: 'Волкова Ирина Петровна', phone: '+7 (495) 555-44-34', email: 'buh@technoprom.ru' },
        ],
        credentials: [
            { id: 'cred4', serviceName: 'СБИС', login: 'technoprom', password: 'TechPass111!' },
            { id: 'cred5', serviceName: 'Контур.Экстерн', login: 'tech@kontur', password: 'KonturPass222@' },
        ],
    },
    {
        id: 'cli_004',
        name: 'ООО СтройМастер',
        legalForm: 'ooo',
        inn: '7711223344',
        kpp: '771101001',
        taxSystem: 'usn15',
        isNdsPayer: false,
        hasEmployees: true,
        employeeCount: 3,
        status: 'onetime',
        tariff: { name: 'Разовый', price: 8000 },
        managerId: 'emp_003',
        managerName: 'Сидорова Е.',
        createdAt: '2024-04-01',
        legalAddress: 'г. Москва, ул. Строителей, д. 5',
        actualAddress: 'г. Москва, ул. Строителей, д. 5',
    },
];

const mockComments: Comment[] = [
    { id: 'c1', text: 'Клиент просит отложить сдачу отчётности на неделю', authorId: 'emp_001', authorName: 'Иванова М.', createdAt: '2024-06-15T10:30:00Z' },
    { id: 'c2', text: 'Документы получены, всё в порядке', authorId: 'emp_001', authorName: 'Иванова М.', createdAt: '2024-06-10T14:00:00Z' },
];

// ============================================
// АДАПТЕР: LegalEntity → Client
// ============================================

const adaptLegalEntityToClient = (le: LegalEntity): Client => {
    // Конвертация TaxSystem
    const taxSystemMap: Record<string, TaxSystem> = {
        'ОСНО': 'osn',
        'УСН "Доходы"': 'usn6',
        'УСН "Доходы минус расходы"': 'usn15',
        'Патент': 'usn6', // Патент показываем как УСН для упрощения
    };

    // Конвертация LegalForm
    const legalFormMap: Record<string, LegalForm> = {
        'ООО': 'ooo',
        'ИП': 'ip',
        'АО': 'ao',
        'ПАО': 'ao',
        'ЗАО': 'zao',
    };

    return {
        id: le.id,
        name: le.name,
        legalForm: legalFormMap[le.legalForm] || 'ooo',
        inn: le.inn,
        kpp: le.kpp,
        ogrn: le.ogrn,
        taxSystem: taxSystemMap[le.taxSystem] || 'usn6',
        isNdsPayer: le.isNdsPayer,
        ndsPercent: le.ndsValue ? parseInt(le.ndsValue) : undefined,
        hasEmployees: le.hasEmployees,
        employeeCount: le.hasEmployees ? 1 : 0, // По умолчанию 1 сотрудник если hasEmployees=true
        status: 'permanent', // По умолчанию постоянный
        tariff: { name: 'Стандарт', price: 15000 }, // Заглушка
        managerId: '',
        managerName: '-',
        createdAt: le.createdAt instanceof Date ? le.createdAt.toISOString() : String(le.createdAt || ''),
        legalAddress: le.legalAddress,
        actualAddress: le.actualAddress,
        contacts: [{
            id: 'main',
            role: 'Контактное лицо',
            name: le.contactPerson,
            phone: le.phone,
            email: le.email
        }],
        patents: le.patents?.map(p => ({
            id: p.id,
            name: p.name,
            type: 'Патент',
            startDate: p.startDate instanceof Date ? p.startDate.toISOString().split('T')[0] : String(p.startDate),
            endDate: p.endDate instanceof Date ? p.endDate.toISOString().split('T')[0] : String(p.endDate),
            duration: 12,
        })),
        credentials: le.credentials?.map(c => ({
            id: c.id,
            serviceName: c.service,
            login: c.login,
            password: c.password || '',
        })),
    };
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

const getTaxSystemLabel = (ts: TaxSystem): string => {
    switch (ts) {
        case 'osn': return 'ОСНО';
        case 'usn6': return 'УСН 6%';
        case 'usn15': return 'УСН 15%';
        case 'eshn': return 'ЕСХН';
    }
};

const getLegalFormLabel = (lf: LegalForm): string => {
    switch (lf) {
        case 'ooo': return 'ООО';
        case 'ip': return 'ИП';
        case 'ao': return 'АО';
        case 'zao': return 'ЗАО';
    }
};

// Используем глобальный MiniCalendar из ./MiniCalendar.tsx

// ============================================
// КОМПОНЕНТ ДОСТУПОВ К СЕРВИСАМ
// ============================================

const CredentialsSection: React.FC<{ credentials: ServiceCredential[] }> = ({ credentials }) => {
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const togglePassword = (id: string) => {
        const newSet = new Set(visiblePasswords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setVisiblePasswords(newSet);
    };

    if (credentials.length === 0) {
        return (
            <div>
                <div className="text-[10px] text-slate-400 mb-2">Нет добавленных сервисов</div>
                <button className="text-[10px] text-primary hover:underline">+ Добавить сервис</button>
            </div>
        );
    }

    return (
        <div>
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="text-left py-1 px-2 text-[10px] text-slate-500 font-medium">Сервис</th>
                        <th className="text-left py-1 px-2 text-[10px] text-slate-500 font-medium">Логин</th>
                        <th className="text-left py-1 px-2 text-[10px] text-slate-500 font-medium">Пароль</th>
                        <th className="w-16"></th>
                    </tr>
                </thead>
                <tbody>
                    {credentials.map(cred => (
                        <tr key={cred.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-medium text-slate-700">{cred.serviceName}</td>
                            <td className="py-1.5 px-2 text-slate-600">{cred.login}</td>
                            <td className="py-1.5 px-2 font-mono text-slate-600">
                                {visiblePasswords.has(cred.id) ? cred.password : '••••••••'}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                                <button
                                    onClick={() => togglePassword(cred.id)}
                                    className="text-[10px] text-primary hover:underline"
                                >
                                    {visiblePasswords.has(cred.id) ? 'Скрыть' : 'Показать'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="text-[10px] text-primary hover:underline mt-2">+ Добавить сервис</button>
        </div>
    );
};

// ============================================
// КОМПОНЕНТ ПАТЕНТОВ (только для ИП)
// ============================================

const PatentsSection: React.FC<{ patents: Patent[]; isIP: boolean }> = ({ patents, isIP }) => {
    if (!isIP) return null;

    return (
        <div className="space-y-2">
            {patents.length > 0 ? (
                patents.map(patent => (
                    <div key={patent.id} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-medium text-slate-700">{patent.name}</div>
                                <div className="text-[10px] text-slate-500">Вид: {patent.type}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500">Срок: {patent.duration} мес.</div>
                                <div className="text-[10px] text-slate-400">
                                    {new Date(patent.startDate).toLocaleDateString()} — {new Date(patent.endDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-[10px] text-slate-400">Патенты не добавлены</div>
            )}
            <button className="text-[10px] text-primary hover:underline">+ Добавить патент</button>
        </div>
    );
};

// ============================================
// ВКЛАДКА СПИСОК
// ============================================

const ClientListTab: React.FC<{ clients: Client[], onSelectClient: (id: string) => void }> = ({ clients, onSelectClient }) => {
    return (
        <div className="space-y-2">
            {clients.map(client => (
                <div
                    key={client.id}
                    onClick={() => onSelectClient(client.id)}
                    className="bg-white rounded-lg border border-slate-200 p-3 hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-[200px] flex-shrink-0">
                            <div className="text-sm font-semibold text-slate-800">{client.name}</div>
                            <div className="text-[10px] text-slate-400">ИНН: {client.inn}</div>
                        </div>

                        <div className="w-[60px] text-center">
                            <div className="text-[10px] text-slate-500">Тип</div>
                            <div className="text-xs font-medium">{getLegalFormLabel(client.legalForm)}</div>
                        </div>

                        <div className="w-[80px] text-center">
                            <div className="text-[10px] text-slate-500">Налоги</div>
                            <div className="text-xs font-medium">{getTaxSystemLabel(client.taxSystem)}</div>
                        </div>

                        <div className="w-[60px] text-center">
                            <div className="text-[10px] text-slate-500">НДС</div>
                            <div className={`text-xs font-medium ${client.isNdsPayer ? 'text-orange-600' : 'text-slate-400'}`}>
                                {client.isNdsPayer ? `${client.ndsPercent || 20}%` : '—'}
                            </div>
                        </div>

                        <div className="w-[80px] text-center">
                            <div className="text-[10px] text-slate-500">Сотрудники</div>
                            <div className={`text-xs font-medium ${client.hasEmployees ? 'text-blue-600' : 'text-slate-400'}`}>
                                {client.hasEmployees ? `${client.employeeCount} чел.` : '—'}
                            </div>
                        </div>

                        <div className="w-[80px] text-center">
                            <div className="text-[10px] text-slate-500">Статус</div>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${client.status === 'permanent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {client.status === 'permanent' ? 'Постоянный' : 'Разовый'}
                            </div>
                        </div>

                        {/* Тариф: название + сумма */}
                        <div className="w-[120px] text-center">
                            <div className="text-[10px] text-slate-500">Тариф</div>
                            <div className="text-xs font-medium text-slate-700">{client.tariff.name}</div>
                            <div className="text-[10px] text-primary font-semibold">{client.tariff.price.toLocaleString()} ₽</div>
                        </div>

                        <div className="w-[80px] text-center">
                            <div className="text-[10px] text-slate-500">Договор</div>
                            <button className="text-[10px] text-primary hover:underline">📄 Открыть</button>
                        </div>

                        <div className="flex-1 text-right">
                            <div className="text-[10px] text-slate-500">Бухгалтер</div>
                            <div className="text-xs font-medium text-slate-700">{client.managerName}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============================================
// ВКЛАДКА ДЕТАЛИЗАЦИЯ
// ============================================

const ClientDetailsTab: React.FC<{ clients: Client[], clientId: string | null }> = ({ clients, clientId }) => {
    const [selectedClientId, setSelectedClientId] = useState(clientId || (clients[0]?.id || ''));
    const [newComment, setNewComment] = useState('');
    const client = clients.find(c => c.id === selectedClientId) || clients[0];

    const labelClass = "block text-[10px] text-slate-500 mb-0.5";
    const valueClass = "text-xs font-medium text-slate-800";
    const inputClass = "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30";

    const mockDocs: UploadedDocument[] = [
        { id: 'doc1', name: 'Договор на обслуживание.pdf', size: 245000, uploadDate: new Date('2024-01-20'), type: 'application/pdf' },
        { id: 'doc2', name: 'Учредительные документы.pdf', size: 1200000, uploadDate: new Date('2024-01-20'), type: 'application/pdf' },
    ];

    if (!client) {
        return <div className="text-center text-slate-500 py-8">Нет клиентов для отображения</div>;
    }

    return (
        <div className="h-full flex gap-4">
            {/* Левая часть (70%) */}
            <div className="w-[70%] h-full overflow-y-auto space-y-3">
                {/* Выбор клиента */}
                <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} — {getLegalFormLabel(c.legalForm)}</option>
                        ))}
                    </select>
                </div>

                {/* Основная информация (всё в одном блоке) */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Основная информация</h3>
                    {/* 1. Основные реквизиты */}
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <div><span className={labelClass}>Название</span><div className={valueClass}>{client.name}</div></div>
                        <div><span className={labelClass}>Тип</span><div className={valueClass}>{getLegalFormLabel(client.legalForm)}</div></div>
                        <div><span className={labelClass}>ИНН</span><div className={valueClass}>{client.inn}</div></div>
                        {client.kpp && <div><span className={labelClass}>КПП</span><div className={valueClass}>{client.kpp}</div></div>}
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        {client.ogrn && <div><span className={labelClass}>ОГРН</span><div className={valueClass}>{client.ogrn}</div></div>}
                        <div><span className={labelClass}>Система налогообложения</span><div className={valueClass}>{getTaxSystemLabel(client.taxSystem)}</div></div>
                        <div><span className={labelClass}>НДС</span><div className={`${valueClass} ${client.isNdsPayer ? 'text-orange-600' : ''}`}>{client.isNdsPayer ? `Да, ${client.ndsPercent || 20}%` : 'Нет'}</div></div>
                        <div><span className={labelClass}>Сотрудники</span><div className={valueClass}>{client.hasEmployees ? `Да, ${client.employeeCount} чел.` : 'Нет'}</div></div>
                    </div>
                    {/* 2. Банковские реквизиты */}
                    {(client.bankName || client.bankAccount) && (
                        <div className="grid grid-cols-4 gap-3 mb-3 pt-2 border-t border-slate-100">
                            {client.bankName && <div><span className={labelClass}>Банк</span><div className={valueClass}>{client.bankName}</div></div>}
                            {client.bankAccount && <div><span className={labelClass}>Расчётный счёт</span><div className={valueClass}>{client.bankAccount}</div></div>}
                            {client.bik && <div><span className={labelClass}>БИК</span><div className={valueClass}>{client.bik}</div></div>}
                            {client.corrAccount && <div><span className={labelClass}>Корр. счёт</span><div className={valueClass}>{client.corrAccount}</div></div>}
                        </div>
                    )}
                    {/* 3. Адреса */}
                    {(client.legalAddress || client.actualAddress) && (
                        <div className="grid grid-cols-2 gap-3 mb-3 pt-2 border-t border-slate-100">
                            {client.legalAddress && (
                                <div>
                                    <span className={labelClass}>Юридический адрес</span>
                                    <div className={valueClass}>{client.legalAddress}</div>
                                </div>
                            )}
                            {client.actualAddress && (
                                <div>
                                    <span className={labelClass}>Фактический адрес</span>
                                    <div className={valueClass}>{client.actualAddress}</div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* 4. Контакты */}
                    {client.contacts && client.contacts.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            {client.contacts.map(contact => (
                                <div key={contact.id} className="p-2 bg-slate-50 rounded border border-slate-100">
                                    <div className={labelClass}>{contact.role}</div>
                                    <div className="text-sm font-semibold text-slate-800">{contact.name}</div>
                                    <div className="mt-1 space-y-0.5">
                                        {contact.phone && (
                                            <div className="text-xs font-medium text-slate-700">
                                                📞 {contact.phone}
                                            </div>
                                        )}
                                        {contact.email && (
                                            <div className="text-xs font-medium text-slate-600">
                                                ✉ {contact.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>



                {/* Патенты (только для ИП) */}
                {client.legalForm === 'ip' && (
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Патенты</h3>
                        <PatentsSection patents={client.patents || []} isIP={client.legalForm === 'ip'} />
                    </div>
                )}

                {/* Обслуживание */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Обслуживание</h3>
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <span className={labelClass}>Статус клиента</span>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${client.status === 'permanent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {client.status === 'permanent' ? 'Постоянный' : 'Разовый'}
                            </div>
                        </div>
                        <div><span className={labelClass}>Тариф</span><div className="text-sm font-bold text-primary">{client.tariff.name}</div></div>
                        <div><span className={labelClass}>Бухгалтер</span><div className={valueClass}>{client.managerName}</div></div>
                        {client.tariff.description && (
                            <div className="col-span-1">
                                <span className={labelClass}>Описание услуг</span>
                                <div className="text-[10px] text-slate-600">{client.tariff.description}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Доступы к сервисам */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">🔐 Доступы к сервисам</h3>
                    <CredentialsSection credentials={client.credentials || []} />
                </div>

                {/* Документы */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Документы</h3>
                    <DocumentUpload
                        documents={mockDocs}
                        onUpload={(f) => console.log('Upload:', f.name)}
                        onDelete={(id) => console.log('Delete:', id)}
                        onView={(doc) => console.log('View:', doc)}
                        label="Загрузить документ"
                    />
                </div>

                {/* Кнопка счёт */}
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-primary text-white text-xs rounded-lg hover:bg-primary-hover">
                        📑 Сформировать счёт на оплату
                    </button>
                </div>

                {/* Комментарии */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Комментарии</h3>
                    <div className="space-y-2 mb-3">
                        {mockComments.map(c => (
                            <div key={c.id} className="bg-slate-50 rounded p-2">
                                <div className="text-[10px] text-slate-500">{c.authorName} — {new Date(c.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-slate-700">{c.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Добавить комментарий..."
                            className={inputClass + " flex-1"}
                        />
                        <button className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-hover">Добавить</button>
                    </div>
                </div>
            </div>

            {/* Правая часть (30%) */}
            <div className="w-[30%] flex flex-col gap-3">
                {/* Мини-календарь (без дополнительной обёртки) */}
                <MiniCalendar tasks={[]} />

                {/* Список задач */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 overflow-y-auto">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Задачи клиента</h3>
                    <div className="space-y-1">
                        {['6-НДФЛ за Q1', 'УСН аванс Q1', 'Страховые взносы за март'].map((t, i) => (
                            <div key={i} className="text-[10px] p-1.5 bg-slate-50 rounded border border-slate-100">
                                <div className="font-medium text-slate-700">{t}</div>
                                <div className="text-slate-400">Срок: {new Date().toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Статистика */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Статистика</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-slate-500">Основные задачи:</span> <span className="font-medium">12</span></div>
                        <div><span className="text-slate-500">Доп. задачи:</span> <span className="font-medium">3</span></div>
                        <div><span className="text-slate-500">Обслуживание:</span> <span className="font-medium text-primary">{client.tariff.price.toLocaleString()} ₽</span></div>
                        <div>
                            <span className="text-slate-500">Задолженность:</span>
                            <span className="font-medium text-green-600"> Нет</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// ВКЛАДКА УПРАВЛЕНИЕ
// ============================================

const ClientManageTab: React.FC<{
    clients: Client[],
    legalEntities: LegalEntity[],
    onSave: (entity: LegalEntity) => void
}> = ({ clients, legalEntities, onSave }) => {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [legalForm, setLegalForm] = useState<LegalForm>('ooo');

    // Контакты и доступы для редактирования
    const [editContacts, setEditContacts] = useState<Contact[]>([]);
    const [editCredentials, setEditCredentials] = useState<ServiceCredential[]>([]);

    // Полное состояние формы
    const [formData, setFormData] = useState({
        name: '',
        inn: '',
        kpp: '',
        ogrn: '',
        taxSystem: '',
        status: '',
        tariff: '',
        accountant: '',
        legalAddress: '',
        actualAddress: '',
        bankName: '',
        bankAccount: '',
        bik: '',
        corrAccount: '',
    });
    const [isNdsPayer, setIsNdsPayer] = useState(false);
    const [ndsPercent, setNdsPercent] = useState('20');
    const [hasEmployees, setHasEmployees] = useState(false);
    const [employeesCount, setEmployeesCount] = useState('');

    // Модальное окно и состояние сохранения
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalType, setSaveModalType] = useState<'confirm' | 'error' | 'success'>('confirm');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Состояние видимости паролей
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Получаем данные выбранного клиента
    const currentClient = clients.find(c => c.id === selectedClientId);
    const isExisting = !isAddingNew && currentClient;

    // Валидация формы - возвращает объект с ошибками по полям
    const validateForm = (): { errors: string[], invalidFields: Set<string> } => {
        const errors: string[] = [];
        const invalidFields = new Set<string>();

        // Обязательные поля
        if (!formData.name.trim()) {
            errors.push('Название организации');
            invalidFields.add('name');
        }

        // Валидация ИНН
        const innLength = legalForm === 'ip' ? 12 : 10;
        if (!formData.inn) {
            errors.push('ИНН');
            invalidFields.add('inn');
        } else if (formData.inn.length !== innLength) {
            errors.push(`ИНН (должен содержать ${innLength} цифр)`);
            invalidFields.add('inn');
        }

        // ОГРН/ОГРНИП - обязательное
        const ogrnLength = legalForm === 'ip' ? 15 : 13; // ОГРНИП = 15, ОГРН = 13
        if (!formData.ogrn) {
            errors.push(legalForm === 'ip' ? 'ОГРНИП' : 'ОГРН');
            invalidFields.add('ogrn');
        } else if (formData.ogrn.length !== ogrnLength) {
            errors.push(legalForm === 'ip' ? `ОГРНИП (${ogrnLength} цифр)` : `ОГРН (${ogrnLength} цифр)`);
            invalidFields.add('ogrn');
        }

        // КПП для организаций (необязательное, но валидируем если заполнено)
        if (legalForm !== 'ip' && formData.kpp && formData.kpp.length !== 9) {
            errors.push('КПП (9 цифр)');
            invalidFields.add('kpp');
        }

        // Система налогообложения - обязательное
        if (!formData.taxSystem) {
            errors.push('Система налогообложения');
            invalidFields.add('taxSystem');
        }

        // Статус клиента - обязательное
        if (!formData.status) {
            errors.push('Статус клиента');
            invalidFields.add('status');
        }

        // Тариф - обязательное
        if (!formData.tariff) {
            errors.push('Тариф');
            invalidFields.add('tariff');
        }

        // БИК - обязательное
        if (!formData.bik || formData.bik.length !== 9) {
            errors.push('БИК');
            invalidFields.add('bik');
        }

        // Расчётный счёт - обязательное
        if (!formData.bankAccount || formData.bankAccount.length !== 20) {
            errors.push('Расчётный счёт');
            invalidFields.add('bankAccount');
        }

        // Корр. счёт - обязательное
        if (!formData.corrAccount || formData.corrAccount.length !== 20) {
            errors.push('Корр. счёт');
            invalidFields.add('corrAccount');
        }

        // Название банка - обязательное
        if (!formData.bankName.trim()) {
            errors.push('Название банка');
            invalidFields.add('bankName');
        }

        // Юр. адрес - обязательное
        if (!formData.legalAddress.trim()) {
            errors.push('Юридический адрес');
            invalidFields.add('legalAddress');
        }

        return { errors, invalidFields };
    };

    // Состояние невалидных полей для подсветки
    const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

    // Обработчик нажатия на кнопку "Сохранить"
    const handleSaveClick = () => {
        const { errors, invalidFields: fields } = validateForm();
        setInvalidFields(fields);
        if (errors.length > 0) {
            setValidationErrors(errors);
            setSaveModalType('error');
            setShowSaveModal(true);
        } else {
            setSaveModalType('confirm');
            setShowSaveModal(true);
        }
    };

    // Подтверждение сохранения
    const handleConfirmSave = async () => {
        setIsSaving(true);

        try {
            // 1. Преобразуем TaxSystem из string в enum
            const taxSystemMapReverse: Record<string, GlobalTaxSystem> = {
                'osn': GlobalTaxSystem.OSNO,
                'usn6': GlobalTaxSystem.USN_DOHODY,
                'usn15': GlobalTaxSystem.USN_DOHODY_RASHODY,
                'eshn': GlobalTaxSystem.PATENT, // Временный маппинг, т.к. ESHN нет в enum
            };

            // 2. Преобразуем LegalForm из string в enum
            const legalFormMapReverse: Record<string, GlobalLegalForm> = {
                'ooo': GlobalLegalForm.OOO,
                'ip': GlobalLegalForm.IP,
                'ao': GlobalLegalForm.AO,
                'zao': GlobalLegalForm.ZAO,
            };

            // 3. Собираем объект LegalEntity для App.tsx
            const entityToSave: LegalEntity = {
                id: currentClient?.id || '', // App.tsx сам сгенерирует ID если пустой
                legalForm: legalFormMapReverse[legalForm] || GlobalLegalForm.OOO,
                name: formData.name,
                inn: formData.inn,
                kpp: legalForm !== 'ip' ? formData.kpp : undefined,
                ogrn: formData.ogrn,
                // created/updated обрабатывает App.tsx или ставим текущее
                createdAt: currentClient?.createdAt || new Date(),

                legalAddress: formData.legalAddress,
                actualAddress: formData.actualAddress || formData.legalAddress,

                // Контакты: берем первый или собираем из полей
                contactPerson: editContacts[0]?.name || 'Основной контакт',
                phone: editContacts[0]?.phone || '',
                email: editContacts[0]?.email || '',

                taxSystem: taxSystemMapReverse[formData.taxSystem] || GlobalTaxSystem.USN_DOHODY,
                isNdsPayer: isNdsPayer,
                ndsValue: isNdsPayer ? ndsPercent : undefined,
                hasEmployees: hasEmployees,

                // Массивы данных
                notes: [], // Пока пустой, так как в форме нет поля заметок для LegalEntity
                credentials: editCredentials.map(c => ({
                    id: c.id,
                    service: c.serviceName,
                    login: c.login,
                    password: c.password
                })),
                patents: currentClient?.patents?.map(p => ({
                    id: p.id,
                    name: p.name,
                    startDate: p.startDate,
                    endDate: p.endDate,
                    autoRenew: false
                })) || [],

                isArchived: false
            };

            // 4. Вызываем реальный метод сохранения из App.tsx
            // Важно: App.tsx ждет синхронного обновления или сам обновляет стейт
            onSave(entityToSave);

            console.log('Клиент успешно сохранен:', entityToSave);

            setSaveModalType('success');

            // Закрываем модалку через таймаут
            setTimeout(() => {
                setShowSaveModal(false);
                setIsAddingNew(false); // Выходим из режима добавления
            }, 1000);

        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            // Можно добавить обработку ошибки в UI, если нужно
        } finally {
            setIsSaving(false);
        }
    };

    // Форматирование телефона +7 (xxx) xxx-xx-xx
    const formatPhone = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        // Если начинается с 7 или 8, убираем
        const cleanDigits = digits.startsWith('7') || digits.startsWith('8')
            ? digits.slice(1).slice(0, 10)
            : digits.slice(0, 10);
        if (cleanDigits.length === 0) return '';
        if (cleanDigits.length <= 3) return `+7 (${cleanDigits}`;
        if (cleanDigits.length <= 6) return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3)}`;
        if (cleanDigits.length <= 8) return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
        return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6, 8)}-${cleanDigits.slice(8, 10)}`;
    };

    // Только цифры с ограничением длины
    const onlyDigits = (value: string, maxLength: number): string => {
        return value.replace(/\D/g, '').slice(0, maxLength);
    };

    // Обновление поля формы
    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // При смене клиента обновляем данные
    React.useEffect(() => {
        if (currentClient && !isAddingNew) {
            setEditContacts(currentClient.contacts || []);
            setEditCredentials(currentClient.credentials || []);
            setLegalForm(currentClient.legalForm);
            setIsNdsPayer(currentClient.isNdsPayer || false);
            setNdsPercent(String(currentClient.ndsPercent || 20));
            setHasEmployees(currentClient.hasEmployees || false);
            setEmployeesCount(String(currentClient.employeeCount || ''));
            setFormData({
                name: currentClient.name || '',
                inn: currentClient.inn || '',
                kpp: currentClient.kpp || '',
                ogrn: currentClient.ogrn || '',
                taxSystem: currentClient.taxSystem || 'usn6',
                status: currentClient.status || 'permanent',
                tariff: currentClient.tariff?.name || 'Стандарт',
                accountant: currentClient.managerName || '',
                legalAddress: currentClient.legalAddress || '',
                actualAddress: currentClient.actualAddress || '',
                bankName: currentClient.bankName || '',
                bankAccount: currentClient.bankAccount || '',
                bik: currentClient.bik || '',
                corrAccount: currentClient.corrAccount || '',
            });
        } else if (isAddingNew) {
            setEditContacts([]);
            setEditCredentials([]);
            setIsNdsPayer(false);
            setNdsPercent('20');
            setHasEmployees(false);
            setEmployeesCount('');
            setFormData({
                name: '',
                inn: '',
                kpp: '',
                ogrn: '',
                taxSystem: '',
                status: '',
                tariff: '',
                accountant: '',
                legalAddress: '',
                actualAddress: '',
                bankName: '',
                bankAccount: '',
                bik: '',
                corrAccount: '',
            });
        }
    }, [selectedClientId, isAddingNew, currentClient]);

    const handleSelectClient = (id: string) => {
        setSelectedClientId(id);
        setIsAddingNew(false);
    };

    const handleAddNew = () => {
        setIsAddingNew(true);
        setSelectedClientId(null);
        setLegalForm('ooo');
        setEditContacts([]);
        setEditCredentials([]);
        setIsNdsPayer(false);
        setNdsPercent('20');
        setHasEmployees(false);
        setEmployeesCount('');
    };

    const handleAddContact = () => {
        setEditContacts([...editContacts, { id: `cnt_new_${Date.now()}`, role: '', name: '', phone: '', email: '' }]);
    };

    const handleRemoveContact = (id: string) => {
        setEditContacts(editContacts.filter(c => c.id !== id));
    };

    const handleUpdateContact = (id: string, field: keyof Contact, value: string) => {
        setEditContacts(editContacts.map(c => c.id === id ? { ...c, [field]: field === 'phone' ? formatPhone(value) : value } : c));
    };

    const handleAddCredential = () => {
        setEditCredentials([...editCredentials, { id: `cred_new_${Date.now()}`, serviceName: '', login: '', password: '' }]);
    };

    const handleUpdateCredential = (id: string, field: keyof ServiceCredential, value: string) => {
        setEditCredentials(editCredentials.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleRemoveCredential = (id: string) => {
        setEditCredentials(editCredentials.filter(c => c.id !== id));
    };

    // Получение русского названия формы собственности
    const getLegalFormLabel = (form: LegalForm): string => {
        const labels: Record<LegalForm, string> = {
            ooo: 'ООО',
            ip: 'ИП',
            ao: 'АО',
            zao: 'ЗАО',
        };
        return labels[form] || form;
    };

    const inputClass = "w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30";
    const deleteBtnClass = "px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 transition-colors text-xs";
    const inputErrorClass = "w-full px-2 py-1.5 text-xs border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-300 bg-red-50";

    // Helper to get input class based on validation
    const getFieldClass = (fieldName: string) => {
        return invalidFields.has(fieldName) ? inputErrorClass : inputClass;
    };

    const labelClass = "block text-[10px] text-slate-500 mb-0.5";
    const sectionClass = "bg-slate-50 rounded-lg p-3 space-y-3";

    return (
        <div className="h-full flex gap-4">
            {/* Левая колонка — Форма (70%) */}
            <div className="w-[70%] h-full overflow-y-auto">
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                        {isAddingNew ? '➕ Новый клиент' : `✏️ Редактирование: ${currentClient?.name || ''}`}
                    </h2>

                    {/* ТИП ЮР. ЛИЦА */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Тип юридического лица</div>
                        <div className="flex gap-2">
                            {(['ooo', 'ip', 'ao', 'zao'] as LegalForm[]).map(lf => (
                                <button
                                    key={lf}
                                    onClick={() => setLegalForm(lf)}
                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${legalForm === lf
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                                        }`}
                                >
                                    {getLegalFormLabel(lf)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ОСНОВНЫЕ ДАННЫЕ */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Основные данные</div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <label className={labelClass}>{legalForm === 'ip' ? 'ФИО предпринимателя' : 'Название организации'} *</label>
                                <input type="text" className={getFieldClass('name')} value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder={legalForm === 'ip' ? 'Иванов Иван Иванович' : 'Название без ООО/ЗАО'} />
                            </div>
                            <div>
                                <label className={labelClass}>ИНН *</label>
                                <input type="text" className={getFieldClass('inn')} value={formData.inn} onChange={(e) => updateField('inn', onlyDigits(e.target.value, legalForm === 'ip' ? 12 : 10))} placeholder={legalForm === 'ip' ? '123456789012' : '1234567890'} />
                            </div>
                            {legalForm !== 'ip' && (
                                <div>
                                    <label className={labelClass}>КПП</label>
                                    <input type="text" className={getFieldClass('kpp')} value={formData.kpp} onChange={(e) => updateField('kpp', onlyDigits(e.target.value, 9))} placeholder="123456789" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {legalForm !== 'ip' && (
                                <div>
                                    <label className={labelClass}>ОГРН *</label>
                                    <input type="text" className={getFieldClass('ogrn')} value={formData.ogrn} onChange={(e) => updateField('ogrn', onlyDigits(e.target.value, 13))} placeholder="1234567890123" />
                                </div>
                            )}
                            {legalForm === 'ip' && (
                                <div>
                                    <label className={labelClass}>ОГРНИП *</label>
                                    <input type="text" className={getFieldClass('ogrn')} value={formData.ogrn} onChange={(e) => updateField('ogrn', onlyDigits(e.target.value, 15))} placeholder="323456789012345" />
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Система налогообложения *</label>
                                <select className={getFieldClass('taxSystem')} value={formData.taxSystem} onChange={(e) => updateField('taxSystem', e.target.value)}>
                                    <option value="">Выберите...</option>
                                    <option value="osn">ОСНО</option>
                                    <option value="usn6">УСН 6%</option>
                                    <option value="usn15">УСН 15%</option>
                                    <option value="eshn">ЕСХН</option>
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={isNdsPayer}
                                        onChange={(e) => setIsNdsPayer(e.target.checked)}
                                    />
                                    Плательщик НДС
                                </label>
                                {isNdsPayer && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            className="w-14 px-2 py-1.5 text-xs border border-slate-200 rounded text-center"
                                            value={ndsPercent}
                                            onChange={(e) => setNdsPercent(onlyDigits(e.target.value, 2))}
                                            placeholder="20"
                                        />
                                        <span className="text-xs text-slate-500">%</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={hasEmployees}
                                        onChange={(e) => setHasEmployees(e.target.checked)}
                                    />
                                    Есть сотрудники
                                </label>
                                {hasEmployees && (
                                    <input
                                        type="text"
                                        className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded text-center"
                                        value={employeesCount}
                                        onChange={(e) => setEmployeesCount(onlyDigits(e.target.value, 5))}
                                        placeholder="кол-во"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className={labelClass}>Статус клиента *</label>
                                <select className={getFieldClass('status')} value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                                    <option value="">Выберите...</option>
                                    <option value="permanent">Постоянный</option>
                                    <option value="onetime">Разовый</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Тариф *</label>
                                <select className={getFieldClass('tariff')} value={formData.tariff} onChange={(e) => updateField('tariff', e.target.value)}>
                                    <option value="">Выберите...</option>
                                    <option value="Базовый">Базовый — 5 000 ₽</option>
                                    <option value="Стандарт">Стандарт — 15 000 ₽</option>
                                    <option value="Премиум">Премиум — 35 000 ₽</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Бухгалтер</label>
                                <select className={inputClass} value={formData.accountant} onChange={(e) => updateField('accountant', e.target.value)}>
                                    <option value="">Выберите...</option>
                                    <option value="Иванова М.">Иванова М.</option>
                                    <option value="Петров А.">Петров А.</option>
                                    <option value="Сидорова Е.">Сидорова Е.</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* АДРЕСА */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Адреса</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Юридический адрес *</label>
                                <input type="text" className={getFieldClass('legalAddress')} value={formData.legalAddress} onChange={(e) => updateField('legalAddress', e.target.value)} placeholder="г. Москва, ул. ..." />
                            </div>
                            <div>
                                <label className={labelClass}>Фактический адрес</label>
                                <input type="text" className={inputClass} value={formData.actualAddress} onChange={(e) => updateField('actualAddress', e.target.value)} placeholder="г. Москва, ул. ..." />
                            </div>
                        </div>
                    </div>

                    {/* БАНКОВСКИЕ РЕКВИЗИТЫ */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Банковские реквизиты</div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className={labelClass}>Название банка *</label>
                                <input type="text" className={getFieldClass('bankName')} value={formData.bankName} onChange={(e) => updateField('bankName', e.target.value)} placeholder="Сбербанк" />
                            </div>
                            <div>
                                <label className={labelClass}>Расчётный счёт *</label>
                                <input type="text" className={getFieldClass('bankAccount')} value={formData.bankAccount} onChange={(e) => updateField('bankAccount', onlyDigits(e.target.value, 20))} placeholder="40702810..." />
                            </div>
                            <div>
                                <label className={labelClass}>БИК *</label>
                                <input type="text" className={getFieldClass('bik')} value={formData.bik} onChange={(e) => updateField('bik', onlyDigits(e.target.value, 9))} placeholder="044525225" />
                            </div>
                            <div>
                                <label className={labelClass}>Корр. счёт *</label>
                                <input type="text" className={getFieldClass('corrAccount')} value={formData.corrAccount} onChange={(e) => updateField('corrAccount', onlyDigits(e.target.value, 20))} placeholder="30101810..." />
                            </div>
                        </div>
                    </div>

                    {/* КОНТАКТЫ */}
                    <div className={sectionClass}>
                        <div className="flex justify-between items-center">
                            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Контакты</div>
                            <button onClick={handleAddContact} className="text-[10px] text-primary hover:underline">+ Добавить контакт</button>
                        </div>
                        {editContacts.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-2">Контакты не добавлены</div>
                        ) : (
                            <div className="space-y-2">
                                {editContacts.map((contact) => (
                                    <div key={contact.id} className="grid grid-cols-5 gap-2 items-end bg-white p-2 rounded border border-slate-100">
                                        <div>
                                            <label className={labelClass}>Роль</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={contact.role}
                                                onChange={(e) => handleUpdateContact(contact.id, 'role', e.target.value)}
                                                placeholder="Директор, Бухгалтер..."
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>ФИО</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={contact.name}
                                                onChange={(e) => handleUpdateContact(contact.id, 'name', e.target.value)}
                                                placeholder="Иванов Иван Иванович"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Телефон</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={contact.phone || ''}
                                                onChange={(e) => handleUpdateContact(contact.id, 'phone', e.target.value)}
                                                placeholder="+7 (___) ___-__-__"
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Email</label>
                                            <input
                                                type="email"
                                                className={inputClass}
                                                value={contact.email || ''}
                                                onChange={(e) => handleUpdateContact(contact.id, 'email', e.target.value)}
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveContact(contact.id)} className={deleteBtnClass}>✕ Удалить</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ДОСТУПЫ К СЕРВИСАМ */}
                    <div className={sectionClass}>
                        <div className="flex justify-between items-center">
                            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">🔐 Доступы к сервисам</div>
                            <button type="button" onClick={handleAddCredential} className="text-[10px] text-primary hover:underline">+ Добавить доступ</button>
                        </div>
                        {editCredentials.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-2">Доступы не добавлены</div>
                        ) : (
                            <div className="space-y-2">
                                {editCredentials.map((cred) => (
                                    <div key={cred.id} className="grid grid-cols-4 gap-2 items-end bg-white p-2 rounded border border-slate-100">
                                        <div>
                                            <label className={labelClass}>Сервис</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={cred.serviceName}
                                                onChange={(e) => handleUpdateCredential(cred.id, 'serviceName', e.target.value)}
                                                placeholder="СБИС, Банк-клиент..."
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Логин</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={cred.login}
                                                onChange={(e) => handleUpdateCredential(cred.id, 'login', e.target.value)}
                                                placeholder="login"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className={labelClass}>Пароль</label>
                                            <input
                                                type={visiblePasswords.has(cred.id) ? "text" : "password"}
                                                className={`${inputClass} pr-6`}
                                                value={cred.password}
                                                onChange={(e) => handleUpdateCredential(cred.id, 'password', e.target.value)}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility(cred.id)}
                                                className="absolute right-1.5 bottom-1.5 text-slate-400 hover:text-slate-600"
                                            >
                                                {visiblePasswords.has(cred.id) ? (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveCredential(cred.id); }}
                                            className={deleteBtnClass}
                                        >
                                            ✕ Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ПАТЕНТЫ (только для ИП) */}
                    {legalForm === 'ip' && (
                        <div className={sectionClass}>
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">📜 Патенты</div>
                                <button className="text-[10px] text-primary hover:underline">+ Добавить патент</button>
                            </div>
                            {isExisting && currentClient.patents && currentClient.patents.length > 0 ? (
                                <div className="space-y-2">
                                    {currentClient.patents.map(p => (
                                        <div key={p.id} className="bg-yellow-50 p-2 rounded border border-yellow-200 flex justify-between items-center">
                                            <div>
                                                <div className="text-xs font-medium text-slate-700">{p.name}</div>
                                                <div className="text-[10px] text-slate-500">{p.type} • {p.duration} мес.</div>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 text-center py-2">Патенты не добавлены</div>
                            )}
                        </div>
                    )}

                    {/* ДОКУМЕНТЫ */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">📎 Документы</div>
                        <DocumentUpload
                            documents={[]}
                            onUpload={() => { }}
                            onDelete={() => { }}
                            onView={() => { }}
                        />
                    </div>

                    {/* КНОПКИ */}
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                        <button
                            onClick={handleSaveClick}
                            className="px-4 py-2 bg-primary text-white text-xs rounded-lg hover:bg-primary-hover transition-colors"
                        >
                            💾 {isAddingNew ? 'Создать клиента' : 'Сохранить изменения'}
                        </button>
                        {isExisting && (
                            <button
                                onClick={() => {
                                    const entityToDelete = legalEntities.find(le => le.id === selectedClientId);
                                    if (entityToDelete) {
                                        onDelete(entityToDelete);
                                    }
                                }}
                                className="px-4 py-2 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 border border-red-200"
                            >
                                🗑️ Удалить клиента
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Правая колонка — Список (30%) */}
            <div className="w-[30%] flex flex-col gap-3">
                {/* Кнопка добавления */}
                <button
                    onClick={handleAddNew}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить клиента
                </button>

                {/* Список клиентов */}
                <div className="bg-white rounded-lg border border-slate-200 flex-1 overflow-y-auto">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            type="text"
                            placeholder="🔍 Поиск клиента..."
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                    </div>
                    <div className="divide-y divide-slate-100">
                        {clients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => handleSelectClient(client.id)}
                                className={`p-2 cursor-pointer transition-colors ${selectedClientId === client.id && !isAddingNew
                                    ? 'bg-primary/10 border-l-2 border-primary'
                                    : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className="text-xs font-medium text-slate-800">{client.name}</div>
                                <div className="text-[10px] text-slate-500 flex gap-2">
                                    <span>{getLegalFormLabel(client.legalForm)}</span>
                                    <span>•</span>
                                    <span>{client.tariff.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО СОХРАНЕНИЯ */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Заголовок */}
                        <div className={`px-5 py-4 ${saveModalType === 'error' ? 'bg-red-50' :
                            saveModalType === 'success' ? 'bg-green-50' :
                                'bg-primary/5'
                            }`}>
                            <div className="flex items-center gap-3">
                                {saveModalType === 'error' && (
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                        <span className="text-xl">⚠️</span>
                                    </div>
                                )}
                                {saveModalType === 'confirm' && (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xl">💾</span>
                                    </div>
                                )}
                                {saveModalType === 'success' && (
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <span className="text-xl">✅</span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-slate-800">
                                        {saveModalType === 'error' && 'Внимание!'}
                                        {saveModalType === 'confirm' && 'Подтверждение сохранения'}
                                        {saveModalType === 'success' && 'Успешно сохранено'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {saveModalType === 'error' && 'Заполните обязательные поля'}
                                        {saveModalType === 'confirm' && (isAddingNew ? 'Создание нового клиента' : 'Обновление данных клиента')}
                                        {saveModalType === 'success' && 'Данные клиента сохранены'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Контент */}
                        <div className="px-5 py-4">
                            {saveModalType === 'error' && (
                                <div className="text-sm text-red-600">
                                    <p>Пожалуйста, заполните все обязательные поля (выделены красным).</p>
                                </div>
                            )}
                            {saveModalType === 'confirm' && (
                                <div className="text-sm text-slate-600">
                                    <p className="mb-3">Вы уверены, что хотите сохранить карточку клиента?</p>
                                    <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Название:</span>
                                            <span className="font-medium">{formData.name || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">ИНН:</span>
                                            <span className="font-medium">{formData.inn || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Форма:</span>
                                            <span className="font-medium">{getLegalFormLabel(legalForm)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {saveModalType === 'success' && (
                                <div className="text-center py-2">
                                    <div className="text-4xl mb-2">🎉</div>
                                    <p className="text-sm text-slate-600">Карточка клиента успешно сохранена</p>
                                </div>
                            )}
                        </div>

                        {/* Кнопки */}
                        {saveModalType !== 'success' && (
                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                                {saveModalType === 'confirm' && (
                                    <button
                                        onClick={() => setShowSaveModal(false)}
                                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                )}
                                {saveModalType === 'confirm' && (
                                    <button
                                        onClick={handleConfirmSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? '⏳ Сохранение...' : '💾 Сохранить'}
                                    </button>
                                )}
                                {saveModalType === 'error' && (
                                    <button
                                        onClick={() => setShowSaveModal(false)}
                                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
                                    >
                                        Понятно
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

export const ClientsView: React.FC<ClientsViewProps> = ({ legalEntities, onSave, onDelete, onArchive }) => {
    const [activeTab, setActiveTab] = useState<ClientTab>('list');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Конвертируем LegalEntity в Client для отображения в UI
    const clients = useMemo(() => {
        return legalEntities.map(adaptLegalEntityToClient);
    }, [legalEntities]);

    const handleSelectClient = (id: string) => {
        setSelectedClientId(id);
        setActiveTab('details');
    };

    const tabs = [
        { id: 'list' as const, label: 'Список' },
        { id: 'details' as const, label: 'Детализация' },
        { id: 'manage' as const, label: 'Управление' },
    ];

    return (
        <div className="h-full flex flex-col -m-8">
            <div className="bg-[linear-gradient(135deg,#1E1E3F_0%,#312e81_50%,#1E1E3F_100%)] px-6 py-3">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-white/20 text-white'
                                : 'text-white/50 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 min-h-0 p-4 bg-slate-50">
                {activeTab === 'list' && <ClientListTab clients={clients} onSelectClient={handleSelectClient} />}
                {activeTab === 'details' && <ClientDetailsTab clients={clients} clientId={selectedClientId} />}
                {activeTab === 'manage' && <ClientManageTab clients={clients} legalEntities={legalEntities} onSave={onSave} />}
            </div>
        </div>
    );
};

export default ClientsView;
