// components/ClientsView.tsx
// Новый компонент списка и детализации клиентов

import React, { useState, useMemo, useEffect } from 'react';
import { ServerDocumentUpload } from './ServerDocumentUpload';
import { ContractUpload } from './ContractUpload';
import { MiniCalendar } from './MiniCalendar';
import { EmployeeAvatar } from './EmployeeAvatar';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { LegalEntity, TaxSystem as GlobalTaxSystem, LegalForm as GlobalLegalForm, Employee, UploadedDocument } from '../types';
import * as taskStorage from '../services/taskStorageService';
import { archiveItem, storage } from '../services/storageService';
import { getStatusIcon as getStatusIconFn } from '../services/taskIndicators';
import { useTaskModal } from '../contexts/TaskModalContext';

// Импорт справочника типов
import {
    LEGAL_FORMS, TAX_SYSTEMS, MONTHS,
    getLegalFormLabel, getTaxSystemLabel,
    LegalFormId, TaxSystemId,
    LEGAL_FORM_OPTIONS, TAX_SYSTEM_OPTIONS,
    PROFIT_ADVANCE_PERIODICITY_OPTIONS,
    CLIENT_STATUS_OPTIONS,
    normalizeLegalForm, normalizeTaxSystem,
} from '../constants/dictionaries';

// ============================================
// ТИПЫ
// ============================================

type ClientTab = 'list' | 'details' | 'manage';
// Используем ID из справочника (constants/dictionaries.ts)
type TaxSystem = TaxSystemId;
type LegalForm = LegalFormId;
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
    // Периодичность авансов по прибыли (только для ОСНО, ООО/АО)
    profitAdvancePeriodicity?: 'monthly' | 'quarterly';
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
        legalForm: 'OOO',
        inn: '7712345678',
        kpp: '771201001',
        ogrn: '1027700000001',
        taxSystem: 'USN6',
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
        legalForm: 'IP',
        inn: '771234567890',
        taxSystem: 'USN6',
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
        legalForm: 'OOO',
        inn: '7799887766',
        kpp: '779901001',
        ogrn: '1157700000123',
        taxSystem: 'OSNO',
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
        legalForm: 'OOO',
        inn: '7711223344',
        kpp: '771101001',
        taxSystem: 'USN15',
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
    // Нормализация ID через справочник (поддерживает старые и новые форматы)
    const normalizedTaxSystem = normalizeTaxSystem(le.taxSystem);
    const normalizedLegalForm = normalizeLegalForm(le.legalForm);

    return {
        id: le.id,
        name: le.name,
        legalForm: normalizedLegalForm,
        inn: le.inn,
        kpp: le.kpp,
        ogrn: le.ogrn,
        taxSystem: normalizedTaxSystem,
        isNdsPayer: le.isNdsPayer,
        ndsPercent: le.ndsValue ? parseInt(le.ndsValue) : undefined,
        hasEmployees: le.hasEmployees,
        employeeCount: le.employeeCount || (le.hasEmployees ? 1 : 0),
        status: le.clientStatus || 'permanent',
        tariff: {
            name: le.tariffName || 'Стандарт',
            price: le.tariffPrice || 15000
        },
        managerId: le.accountantId || '',
        managerName: le.accountantName || '',
        createdAt: le.createdAt instanceof Date ? le.createdAt.toISOString() : String(le.createdAt || ''),
        legalAddress: le.legalAddress,
        actualAddress: le.actualAddress,
        // Банковские реквизиты
        bankName: le.bankName,
        bankAccount: le.bankAccount,
        bik: le.bik,
        corrAccount: le.corrAccount,
        // Контакты: используем сохранённые или fallback на основной
        contacts: le.contacts && le.contacts.length > 0
            ? le.contacts.map(c => ({
                id: c.id,
                role: c.role,
                name: c.name,
                phone: c.phone,
                email: c.email
            }))
            : [{
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
        // Периодичность авансов по прибыли (для ОСНО)
        profitAdvancePeriodicity: le.profitAdvancePeriodicity,
    };
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

// Используем импортированную getTaxSystemLabel из справочника
// Оставляем локальную обёртку для совместимости с текущим кодом
const getTaxSystemLabelLocal = (ts: TaxSystem | string): string => {
    // Поддержка старых ID (osn, usn6) через нормализацию
    const normalizedId = normalizeTaxSystem(ts);
    return getTaxSystemLabel(normalizedId);
};

// Используем импортированную getLegalFormLabel из справочника
// Оставляем локальную обёртку для совместимости с текущим кодом
const getLegalFormLabelLocal = (lf: LegalForm | string): string => {
    // Поддержка старых ID (ooo, ip) через нормализацию
    const normalizedId = normalizeLegalForm(lf);
    return getLegalFormLabel(normalizedId);
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

const ClientListTab: React.FC<{
    clients: Client[],
    onSelectClient: (id: string) => void,
    onViewContract?: (clientId: string, clientName: string) => void,
    onDeleteClient?: (clientId: string) => void
}> = ({ clients, onSelectClient, onViewContract, onDeleteClient }) => {
    // Модальное окно удаления
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
    const [deleteClientName, setDeleteClientName] = useState<string>('');

    const handleDeleteClick = (e: React.MouseEvent, clientId: string, clientName: string) => {
        e.stopPropagation();
        setDeleteClientId(clientId);
        setDeleteClientName(clientName);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        if (deleteClientId && onDeleteClient) {
            onDeleteClient(deleteClientId);
        }
        setShowDeleteModal(false);
        setDeleteClientId(null);
    };
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
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewContract?.(client.id, client.name);
                                }}
                                className="text-[10px] text-green-600 hover:text-green-800 hover:underline font-medium"
                            >
                                📄 Открыть
                            </button>
                        </div>

                        <div className="flex-1 text-right flex items-center justify-end gap-2">
                            <EmployeeAvatar
                                employeeId={client.managerId}
                                name={client.managerName}
                                size="xs"
                            />
                            <div>
                                <div className="text-[10px] text-slate-500">Бухгалтер</div>
                                <div className="text-xs font-medium text-slate-700">{client.managerName}</div>
                            </div>
                        </div>

                        {/* Кнопка удаления */}
                        <button
                            onClick={(e) => handleDeleteClick(e, client.id, client.name)}
                            className="ml-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Удалить клиента"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}

            {/* Модальное окно удаления */}
            <ArchiveConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                entityType="Клиент"
                entityName={deleteClientName}
            />
        </div>
    );
};

// ============================================
// ВКЛАДКА ДЕТАЛИЗАЦИЯ
// ============================================

const ClientDetailsTab: React.FC<{
    clients: Client[],
    clientId: string | null,
    onNavigateToTasks?: (clientId: string, month: Date) => void,
    onDeleteClient?: (clientId: string) => void
}> = ({ clients, clientId, onNavigateToTasks, onDeleteClient }) => {
    const [selectedClientId, setSelectedClientId] = useState(clientId || (clients[0]?.id || ''));
    const [newComment, setNewComment] = useState('');
    const client = clients.find(c => c.id === selectedClientId) || clients[0];
    const { openTaskModal, subscribeAfterComplete } = useTaskModal();

    // Модальное окно удаления
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const handleDeleteClick = () => setShowDeleteModal(true);
    const handleConfirmDelete = () => {
        if (selectedClientId && onDeleteClient) {
            onDeleteClient(selectedClientId);
        }
        setShowDeleteModal(false);
    };

    // === Загрузка задач клиента ===
    const [clientTasks, setClientTasks] = useState<taskStorage.StoredTask[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    useEffect(() => {
        if (selectedClientId) {
            taskStorage.getAllTasks({ clientId: selectedClientId }).then(tasks => {
                setClientTasks(tasks);
            });
        }
    }, [selectedClientId]);

    // Мгновенное обновление после выполнения задачи через модалку
    useEffect(() => {
        const unsubscribe = subscribeAfterComplete((taskId: string) => {
            // Обновляем локально: переключаем статус
            setClientTasks(prev => prev.map(t =>
                t.id === taskId
                    ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
                    : t
            ));
        });
        return unsubscribe;
    }, [subscribeAfterComplete]);

    // Преобразуем задачи для MiniCalendar
    const calendarTasks = clientTasks.map(t => ({
        id: t.id,
        dueDate: t.currentDueDate,
        status: t.status,
        isUrgent: false
    }));

    // Фильтруем задачи по выбранной дате или месяцу
    const filteredTasks = selectedDate
        ? clientTasks.filter(t => {
            const taskDate = new Date(t.currentDueDate);
            return taskDate.toDateString() === selectedDate.toDateString();
        })
        : clientTasks.filter(t => {
            const taskDate = new Date(t.currentDueDate);
            return taskDate.getMonth() === currentMonth.getMonth()
                && taskDate.getFullYear() === currentMonth.getFullYear();
        });

    // Иконки статусов
    const renderStatusIcon = (task: taskStorage.StoredTask) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.currentDueDate);
        dueDate.setHours(0, 0, 0, 0);
        const icon = getStatusIconFn({
            status: task.status,
            dueDate: task.currentDueDate,
            isBlocked: false
        }, 'sm');
        return <span className="text-[9px]">{icon}</span>;
    };

    const labelClass = "block text-[10px] text-slate-500 mb-0.5";
    const valueClass = "text-xs font-medium text-slate-800";
    const inputClass = "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30";

    const mockDocs: UploadedDocument[] = [
        { id: 'doc1', name: 'Договор на обслуживание.pdf', size: 245000, uploadDate: new Date('2024-01-20'), type: 'application/pdf' },
        { id: 'doc2', name: 'Учредительные документы.pdf', size: 1200000, uploadDate: new Date('2024-01-20'), type: 'application/pdf' },
    ];

    // Показываем полный layout даже без клиентов (календарь и статистика всегда видны)
    const hasClient = !!client;

    return (
        <div className="h-full flex gap-4">
            {/* Левая часть (70%) */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto space-y-3">
                {!hasClient ? (
                    // Пустое состояние — нет клиентов
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-slate-400 text-lg mb-2">📋</div>
                            <div className="text-slate-500">Нет клиентов для отображения</div>
                            <div className="text-slate-400 text-sm mt-1">Создайте первого клиента во вкладке "Управление"</div>
                        </div>
                    </div>
                ) : (
                    <>
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
                                {/* Периодичность авансов по прибыли — только для ОСНО (ООО/АО) */}
                                {client.taxSystem === 'OSNO' && client.legalForm !== 'IP' && (
                                    <div>
                                        <span className={labelClass}>Авансы по прибыли</span>
                                        <div className={valueClass}>
                                            {client.profitAdvancePeriodicity === 'monthly' ? 'Ежемесячно' :
                                                client.profitAdvancePeriodicity === 'quarterly' ? 'Ежеквартально' :
                                                    'Не указано'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* 2. Патенты (только для ИП) */}
                            {client.legalForm === 'IP' && client.patents && client.patents.length > 0 && (
                                <div className="mb-3 pt-2 border-t border-slate-100">
                                    <span className={labelClass}>📜 Патенты</span>
                                    <div className="space-y-2 mt-1">
                                        {client.patents.map(p => (
                                            <div key={p.id} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                                <div className={valueClass}>{p.name || 'Без названия'}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                                                    {p.duration && ` (${p.duration} мес.)`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* 3. Банковские реквизиты */}
                            {(client.bankName || client.bankAccount) && (
                                <div className="mb-3 pt-2 border-t border-slate-100">
                                    {/* Строка 1: Банк + Расчётный счёт */}
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        {client.bankName && <div><span className={labelClass}>Банк</span><div className={valueClass}>{client.bankName}</div></div>}
                                        {client.bankAccount && <div><span className={labelClass}>Расчётный счёт</span><div className={valueClass}>{client.bankAccount}</div></div>}
                                    </div>
                                    {/* Строка 2: БИК + Корр. счёт */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {client.bik && <div><span className={labelClass}>БИК</span><div className={valueClass}>{client.bik}</div></div>}
                                        {client.corrAccount && <div><span className={labelClass}>Корр. счёт</span><div className={valueClass}>{client.corrAccount}</div></div>}
                                    </div>
                                </div>
                            )}
                            {/* 4. Адреса */}
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
                            {/* 5. Контакты */}
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
                        {client.legalForm === 'IP' && (
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Патенты</h3>
                                <PatentsSection patents={client.patents || []} isIP={client.legalForm === 'IP'} />
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
                                <div>
                                    <span className={labelClass}>Бухгалтер</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <EmployeeAvatar
                                            employeeId={client.managerId}
                                            name={client.managerName}
                                            size="xs"
                                        />
                                        <span className={valueClass}>{client.managerName}</span>
                                    </div>
                                </div>
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

                        {/* Договор */}
                        <div className="bg-white rounded-lg border border-green-200 p-3">
                            <h3 className="text-[10px] font-semibold text-green-700 mb-2 pb-1 border-b border-green-100">📝 Договор</h3>
                            <ContractUpload clientId={selectedClientId} />
                        </div>

                        {/* Документы */}
                        <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">📎 Документы</h3>
                            <ServerDocumentUpload
                                entityType="clients"
                                entityId={selectedClientId}
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
                    </>
                )}
            </div>

            {/* Правая часть (фиксированная ширина) */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                {/* Мини-календарь с задачами */}
                <MiniCalendar
                    tasks={calendarTasks}
                    selectedDate={selectedDate}
                    onDayClick={(date, tasks) => {
                        setSelectedDate(date);
                    }}
                    onDateChange={(date) => setCurrentMonth(date)}
                    showFullMonthButton={!!selectedDate}
                    onShowFullMonth={() => setSelectedDate(null)}
                />

                {/* Список задач */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                        <h3
                            className="text-[10px] font-semibold text-slate-700 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onNavigateToTasks?.(selectedClientId, currentMonth)}
                            title="Перейти в задачи"
                        >
                            Задачи → {selectedDate ? (
                                <span className="text-slate-400 font-normal ml-1">
                                    ({selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})
                                </span>
                            ) : (
                                <span className="text-slate-400 font-normal ml-1">
                                    ({currentMonth.toLocaleDateString('ru-RU', { month: 'long' })})
                                </span>
                            )}
                        </h3>
                        <button
                            className="w-5 h-5 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-bold"
                            title="Добавить задачу"
                            onClick={(e) => { e.stopPropagation(); /* TODO: открыть модалку создания задачи */ }}
                        >
                            +
                        </button>
                    </div>
                    {filteredTasks.length === 0 ? (
                        <div className="text-[10px] text-slate-400 text-center py-4">
                            {selectedDate ? 'Нет задач на эту дату' : 'Нет задач в этом месяце'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTasks.slice(0, 10).map(task => {
                                const dueDate = new Date(task.currentDueDate);
                                const isOverdue = dueDate < new Date() && task.status !== 'completed';
                                return (
                                    <div
                                        key={task.id}
                                        className="p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                        onClick={() => openTaskModal({
                                            id: task.id,
                                            title: task.title,
                                            description: task.description ?? undefined,
                                            fullDescription: task.fullDescription ?? undefined,
                                            legalBasis: task.legalBasis ?? undefined,
                                            clientName: task.clientName ?? undefined,
                                            dueDate: task.currentDueDate,
                                            status: task.status,
                                            isFloating: task.isFloating,
                                        })}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {renderStatusIcon(task)}
                                            <span className="flex-1 text-[10px] font-medium text-slate-700 truncate hover:text-primary">{task.title}</span>
                                            <span className="text-[9px] text-slate-400">
                                                {dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <div className="text-[9px] text-slate-400 ml-4 truncate">({task.description})</div>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredTasks.length > 10 && (
                                <div className="text-[10px] text-primary text-center pt-1">
                                    ещё {filteredTasks.length - 10} задач...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Статистика */}
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-[10px] font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Статистика</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-slate-500">Основные задачи:</span> <span className="font-medium">—</span></div>
                        <div><span className="text-slate-500">Доп. задачи:</span> <span className="font-medium">—</span></div>
                        <div><span className="text-slate-500">Обслуживание:</span> <span className="font-medium text-primary">{(client?.tariff?.price || 0).toLocaleString()} ₽</span></div>
                        <div>
                            <span className="text-slate-500">Задолженность:</span>
                            <span className="font-medium text-slate-400"> —</span>
                        </div>
                    </div>
                </div>

                {/* Кнопка удаления */}
                {onDeleteClient && (
                    <button
                        onClick={handleDeleteClick}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 border border-red-200"
                    >
                        🗑️ Удалить клиента
                    </button>
                )}
            </div>

            {/* Модальное окно удаления */}
            <ArchiveConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                entityType="Клиент"
                entityName={client?.name || ''}
            />
        </div>
    );
};

// ============================================
// ВКЛАДКА УПРАВЛЕНИЕ
// ============================================

const ClientManageTab: React.FC<{
    clients: Client[],
    legalEntities: LegalEntity[],
    onSave: (entity: LegalEntity) => void,
    onDelete: (entity: LegalEntity) => void,
    onArchive?: (entity: LegalEntity) => void,
    employees?: Employee[],
    initialClientId?: string | null
}> = ({ clients, legalEntities, onSave, onDelete, onArchive, employees = [], initialClientId }) => {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || clients[0]?.id || null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [legalForm, setLegalForm] = useState<LegalForm>('OOO');

    // Синхронизация с родительским компонентом при смене initialClientId
    React.useEffect(() => {
        if (initialClientId && initialClientId !== selectedClientId) {
            setSelectedClientId(initialClientId);
            setIsAddingNew(false);
        }
    }, [initialClientId]);

    // Автосброс на первого клиента если текущий удалён
    React.useEffect(() => {
        if (selectedClientId && !clients.find(c => c.id === selectedClientId)) {
            // Текущий клиент удалён — переключаемся на первого в списке или режим добавления
            if (clients.length > 0) {
                setSelectedClientId(clients[0].id);
            } else {
                setSelectedClientId(null);
                setIsAddingNew(true);
            }
        }
    }, [clients, selectedClientId]);

    // Контакты, доступы и патенты для редактирования
    const [editContacts, setEditContacts] = useState<Contact[]>([]);
    const [editCredentials, setEditCredentials] = useState<ServiceCredential[]>([]);
    const [editPatents, setEditPatents] = useState<Patent[]>([]);

    // Чекбокс "Фактический адрес совпадает с юридическим"
    const [sameAddress, setSameAddress] = useState(false);

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
    // Периодичность авансов по налогу на прибыль (только для ООО/АО на ОСНО)
    const [profitAdvancePeriodicity, setProfitAdvancePeriodicity] = useState<'monthly' | 'quarterly'>('quarterly');

    // Модальное окно и состояние сохранения
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalType, setSaveModalType] = useState<'confirm' | 'error' | 'success'>('confirm');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Состояние видимости паролей
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    // Модальное окно удаления/архивации клиента
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        const innLength = legalForm === 'IP' ? 12 : 10;
        if (!formData.inn) {
            errors.push('ИНН');
            invalidFields.add('inn');
        } else if (formData.inn.length !== innLength) {
            errors.push(`ИНН (должен содержать ${innLength} цифр)`);
            invalidFields.add('inn');
        }

        // ОГРН/ОГРНИП - обязательное
        const ogrnLength = legalForm === 'IP' ? 15 : 13; // ОГРНИП = 15, ОГРН = 13
        if (!formData.ogrn) {
            errors.push(legalForm === 'IP' ? 'ОГРНИП' : 'ОГРН');
            invalidFields.add('ogrn');
        } else if (formData.ogrn.length !== ogrnLength) {
            errors.push(legalForm === 'IP' ? `ОГРНИП (${ogrnLength} цифр)` : `ОГРН (${ogrnLength} цифр)`);
            invalidFields.add('ogrn');
        }

        // КПП для организаций (необязательное, но валидируем если заполнено)
        if (legalForm !== 'IP' && formData.kpp && formData.kpp.length !== 9) {
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
            // Поддержка как новых ID (OSNO), так и старых (osn) через нормализацию
            const taxSystemMapReverse: Record<string, GlobalTaxSystem> = {
                'OSNO': GlobalTaxSystem.OSNO,
                'USN6': GlobalTaxSystem.USN_DOHODY,
                'USN15': GlobalTaxSystem.USN_DOHODY_RASHODY,
                'ESHN': GlobalTaxSystem.ESHN,
                'PATENT': GlobalTaxSystem.PATENT,
                // Обратная совместимость со старыми ID
                'osn': GlobalTaxSystem.OSNO,
                'usn6': GlobalTaxSystem.USN_DOHODY,
                'usn15': GlobalTaxSystem.USN_DOHODY_RASHODY,
                'eshn': GlobalTaxSystem.ESHN,
            };

            // 2. Преобразуем LegalForm из string в enum
            const legalFormMapReverse: Record<string, GlobalLegalForm> = {
                'OOO': GlobalLegalForm.OOO,
                'IP': GlobalLegalForm.IP,
                'AO': GlobalLegalForm.AO,
                'ZAO': GlobalLegalForm.ZAO,
                // Обратная совместимость со старыми ID
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
                kpp: legalForm !== 'IP' ? formData.kpp : undefined,
                ogrn: formData.ogrn,
                createdAt: currentClient?.createdAt ? new Date(currentClient.createdAt) : new Date(),

                legalAddress: formData.legalAddress,
                actualAddress: formData.actualAddress || formData.legalAddress,

                // Основной контакт (для обратной совместимости)
                contactPerson: editContacts[0]?.name || 'Основной контакт',
                phone: editContacts[0]?.phone || '',
                email: editContacts[0]?.email || '',

                taxSystem: taxSystemMapReverse[formData.taxSystem] || GlobalTaxSystem.USN_DOHODY,
                isNdsPayer: isNdsPayer,
                ndsValue: isNdsPayer ? ndsPercent : undefined,
                hasEmployees: hasEmployees,
                employeeCount: hasEmployees ? parseInt(employeesCount) || 0 : undefined,
                // Периодичность авансов по прибыли (только для ООО/АО на ОСНО)
                // Используем нормализованные ID из справочника
                // Периодичность
                profitAdvancePeriodicity: (legalForm === 'OOO' || legalForm === 'AO') && formData.taxSystem === 'OSNO'
                    ? profitAdvancePeriodicity
                    : undefined,

                // Массивы данных
                notes: [],
                credentials: editCredentials.map(c => ({
                    id: c.id,
                    service: c.serviceName,
                    login: c.login,
                    password: c.password
                })),
                patents: editPatents.map(p => ({
                    id: p.id,
                    name: p.name,
                    startDate: p.startDate,
                    endDate: p.endDate,
                    autoRenew: false
                })),

                isArchived: false,

                // === НОВЫЕ ПОЛЯ ===

                // Назначенный бухгалтер (сохраняем ID и имя)
                accountantId: formData.accountant || undefined,
                accountantName: (() => {
                    const emp = employees.find(e => e.id === formData.accountant);
                    return emp ? `${emp.lastName} ${emp.firstName}` : undefined;
                })(),

                // Статус клиента
                clientStatus: (formData.status as 'permanent' | 'onetime') || 'permanent',

                // Тариф
                tariffName: formData.tariff || 'Стандарт',
                tariffPrice: formData.tariff === 'Базовый' ? 5000 : formData.tariff === 'Премиум' ? 35000 : 15000,

                // Банковские реквизиты
                bankName: formData.bankName || undefined,
                bankAccount: formData.bankAccount || undefined,
                bik: formData.bik || undefined,
                corrAccount: formData.corrAccount || undefined,

                // Расширенные контакты (до 4)
                contacts: editContacts.slice(0, 4).map(c => ({
                    id: c.id,
                    role: c.role,
                    name: c.name,
                    phone: c.phone,
                    email: c.email
                })),
            };

            // DEBUG: полная отладка объекта перед сохранением
            console.log('[SAVE DEBUG FULL] entityToSave:', JSON.stringify(entityToSave, null, 2));
            console.log('[SAVE DEBUG] Saving client:', entityToSave.id, entityToSave.name, 'profitAdvancePeriodicity:', entityToSave.profitAdvancePeriodicity);

            // 4. Вызываем реальный метод сохранения из App.tsx
            onSave(entityToSave);

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

        // Автоматически включаем НДС для ОСНО (OSNO)
        if (field === 'taxSystem' && value === 'OSNO') {
            setIsNdsPayer(true);
        }
    };

    // При смене клиента обновляем данные
    React.useEffect(() => {
        if (currentClient && !isAddingNew) {
            setEditContacts(currentClient.contacts || []);
            setEditCredentials(currentClient.credentials || []);
            setEditPatents(currentClient.patents || []);
            setLegalForm(currentClient.legalForm);
            setIsNdsPayer(currentClient.isNdsPayer || false);
            setNdsPercent(String(currentClient.ndsPercent || 20));
            setHasEmployees(currentClient.hasEmployees || false);
            setEmployeesCount(String(currentClient.employeeCount || ''));
            setProfitAdvancePeriodicity(currentClient.profitAdvancePeriodicity || 'quarterly');
            // Проверяем совпадают ли адреса
            setSameAddress(currentClient.legalAddress === currentClient.actualAddress);
            setFormData({
                name: currentClient.name || '',
                inn: currentClient.inn || '',
                kpp: currentClient.kpp || '',
                ogrn: currentClient.ogrn || '',
                taxSystem: currentClient.taxSystem || 'USN6',
                status: currentClient.status || 'permanent',
                tariff: currentClient.tariff?.name || 'Стандарт',
                accountant: currentClient.managerId || '',
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
            setEditPatents([]);
            setSameAddress(false);
            setIsNdsPayer(false);
            setNdsPercent('20');
            setHasEmployees(false);
            setEmployeesCount('');
            setProfitAdvancePeriodicity('quarterly');
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
        setLegalForm('OOO');
        setEditContacts([]);
        setEditCredentials([]);
        setIsNdsPayer(false);
        setNdsPercent('20');
        setHasEmployees(false);
        setEmployeesCount('');
        setProfitAdvancePeriodicity('quarterly');
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

    // --- Патенты ---
    const handleAddPatent = () => {
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        setEditPatents([...editPatents, {
            id: `pat_new_${Date.now()}`,
            name: '',
            type: '',
            startDate: today,
            endDate: endDate.toISOString().split('T')[0],
            duration: 12
        }]);
    };

    const handleUpdatePatent = (id: string, field: keyof Patent, value: string | number) => {
        setEditPatents(editPatents.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleRemovePatent = (id: string) => {
        setEditPatents(editPatents.filter(p => p.id !== id));
    };

    // Получение русского названия формы собственности
    const getLegalFormLabel = (form: LegalForm): string => {
        const labels: Record<LegalForm, string> = {
            OOO: 'ООО',
            IP: 'ИП',
            AO: 'АО',
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
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Тип юридического лица</div>
                            {!isAddingNew && (
                                <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                    🔒 Нельзя изменить
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {(['OOO', 'IP', 'AO'] as LegalForm[]).map(lf => (
                                <button
                                    key={lf}
                                    onClick={() => setLegalForm(lf)}
                                    disabled={!isAddingNew}
                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${legalForm === lf
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                                        } ${!isAddingNew ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                                <label className={labelClass}>{legalForm === 'IP' ? 'ФИО предпринимателя' : 'Название организации'} *</label>
                                <input type="text" className={getFieldClass('name')} value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder={legalForm === 'IP' ? 'Иванов Иван Иванович' : 'Название без ООО/АО'} />
                            </div>
                            <div>
                                <label className={labelClass}>ИНН *</label>
                                <input type="text" className={getFieldClass('inn')} value={formData.inn} onChange={(e) => updateField('inn', onlyDigits(e.target.value, legalForm === 'IP' ? 12 : 10))} placeholder={legalForm === 'IP' ? '123456789012' : '1234567890'} />
                            </div>
                            {legalForm !== 'IP' && (
                                <div>
                                    <label className={labelClass}>КПП</label>
                                    <input type="text" className={getFieldClass('kpp')} value={formData.kpp} onChange={(e) => updateField('kpp', onlyDigits(e.target.value, 9))} placeholder="123456789" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {legalForm !== 'IP' && (
                                <div>
                                    <label className={labelClass}>ОГРН *</label>
                                    <input type="text" className={getFieldClass('ogrn')} value={formData.ogrn} onChange={(e) => updateField('ogrn', onlyDigits(e.target.value, 13))} placeholder="1234567890123" />
                                </div>
                            )}
                            {legalForm === 'IP' && (
                                <div>
                                    <label className={labelClass}>ОГРНИП *</label>
                                    <input type="text" className={getFieldClass('ogrn')} value={formData.ogrn} onChange={(e) => updateField('ogrn', onlyDigits(e.target.value, 15))} placeholder="323456789012345" />
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Система налогообложения *</label>
                                <select className={getFieldClass('taxSystem')} value={formData.taxSystem} onChange={(e) => updateField('taxSystem', e.target.value)}>
                                    <option value="">Выберите...</option>
                                    <option value="OSNO">ОСНО</option>
                                    <option value="USN6">УСН 6%</option>
                                    <option value="USN15">УСН 15%</option>
                                    <option value="ESHN">ЕСХН</option>
                                    <option value="PATENT">Патент</option>
                                </select>
                            </div>
                        </div>
                        {/* Чекбоксы в отдельной строке для лучшего выравнивания */}
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    className="rounded w-4 h-4"
                                    checked={isNdsPayer}
                                    onChange={(e) => setIsNdsPayer(e.target.checked)}
                                />
                                Плательщик НДС
                                {isNdsPayer && (
                                    <div className="flex items-center gap-1 ml-1">
                                        <input
                                            type="text"
                                            className="w-10 px-1 py-0.5 text-xs border border-slate-200 rounded text-center"
                                            value={ndsPercent}
                                            onChange={(e) => setNdsPercent(onlyDigits(e.target.value, 2))}
                                            placeholder="20"
                                        />
                                        <span className="text-slate-500">%</span>
                                    </div>
                                )}
                            </label>
                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    className="rounded w-4 h-4"
                                    checked={hasEmployees}
                                    onChange={(e) => setHasEmployees(e.target.checked)}
                                />
                                Есть сотрудники
                                {hasEmployees && (
                                    <input
                                        type="text"
                                        className="w-12 px-1 py-0.5 text-xs border border-slate-200 rounded text-center ml-1"
                                        value={employeesCount}
                                        onChange={(e) => setEmployeesCount(onlyDigits(e.target.value, 5))}
                                        placeholder="кол-во"
                                    />
                                )}
                            </label>
                            {/* Периодичность авансов по налогу на прибыль — только для ООО/АО на ОСНО */}
                            {(legalForm === 'OOO' || legalForm === 'AO') && formData.taxSystem === 'OSNO' && (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-600">Авансы по прибыли:</span>
                                    <select
                                        className="px-2 py-0.5 text-xs border border-slate-200 rounded"
                                        value={profitAdvancePeriodicity}
                                        onChange={(e) => setProfitAdvancePeriodicity(e.target.value as 'monthly' | 'quarterly')}
                                    >
                                        <option value="quarterly">Ежеквартально</option>
                                        <option value="monthly">Ежемесячно</option>
                                    </select>
                                </div>
                            )}
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
                                <label className="block text-[10px] text-slate-500 mb-1">Бухгалтер</label>
                                <select
                                    className={inputClass}
                                    value={formData.accountant}
                                    onChange={(e) => setFormData(prev => ({ ...prev, accountant: e.target.value }))}
                                >
                                    <option value="">Не назначен</option>
                                    {employees
                                        .filter(e => e.role === 'accountant' || e.role === 'admin')
                                        .map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.lastName} {e.firstName}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ПАТЕНТЫ (только для ИП) */}
                    {legalForm === 'IP' && (
                        <div className={sectionClass}>
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">📜 Патенты</div>
                                <button
                                    type="button"
                                    onClick={handleAddPatent}
                                    className="text-[10px] text-primary hover:underline"
                                >
                                    + Добавить патент
                                </button>
                            </div>
                            {editPatents.length > 0 ? (
                                <div className="space-y-3">
                                    {editPatents.map(p => (
                                        <div key={p.id} className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <input
                                                    type="text"
                                                    value={p.name}
                                                    onChange={(e) => handleUpdatePatent(p.id, 'name', e.target.value)}
                                                    placeholder="Название патента"
                                                    className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePatent(p.id)}
                                                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <div className="text-[9px] text-slate-500 mb-1">Дата начала</div>
                                                    <input
                                                        type="date"
                                                        value={p.startDate}
                                                        onChange={(e) => handleUpdatePatent(p.id, 'startDate', e.target.value)}
                                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-500 mb-1">Дата окончания</div>
                                                    <input
                                                        type="date"
                                                        value={p.endDate}
                                                        onChange={(e) => handleUpdatePatent(p.id, 'endDate', e.target.value)}
                                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-500 mb-1">Срок (мес.)</div>
                                                    <input
                                                        type="number"
                                                        value={p.duration}
                                                        onChange={(e) => handleUpdatePatent(p.id, 'duration', parseInt(e.target.value) || 0)}
                                                        min="1"
                                                        max="12"
                                                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 text-center py-2">Патенты не добавлены</div>
                            )}
                        </div>
                    )}

                    {/* АДРЕСА */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Адреса</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Юридический адрес *</label>
                                <input type="text" className={getFieldClass('legalAddress')} value={formData.legalAddress} onChange={(e) => updateField('legalAddress', e.target.value)} placeholder="г. Москва, ул. ..." />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <input
                                        type="checkbox"
                                        id="sameAddress"
                                        checked={sameAddress}
                                        onChange={(e) => {
                                            setSameAddress(e.target.checked);
                                            if (e.target.checked) {
                                                updateField('actualAddress', formData.legalAddress);
                                            }
                                        }}
                                        className="w-3 h-3"
                                    />
                                    <label htmlFor="sameAddress" className="text-[10px] text-slate-500 cursor-pointer">Совпадает с юридическим</label>
                                </div>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={sameAddress ? formData.legalAddress : formData.actualAddress}
                                    onChange={(e) => updateField('actualAddress', e.target.value)}
                                    placeholder="г. Москва, ул. ..."
                                    disabled={sameAddress}
                                />
                            </div>
                        </div>
                    </div>

                    {/* БАНКОВСКИЕ РЕКВИЗИТЫ */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Банковские реквизиты</div>
                        {/* Строка 1: Банк + Расчётный счёт */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className={labelClass}>Название банка *</label>
                                <input type="text" className={getFieldClass('bankName')} value={formData.bankName} onChange={(e) => updateField('bankName', e.target.value)} placeholder="Сбербанк" />
                            </div>
                            <div>
                                <label className={labelClass}>Расчётный счёт *</label>
                                <input type="text" className={getFieldClass('bankAccount')} value={formData.bankAccount} onChange={(e) => updateField('bankAccount', onlyDigits(e.target.value, 20))} placeholder="40702810..." />
                            </div>
                        </div>
                        {/* Строка 2: БИК + Корр. счёт */}
                        <div className="grid grid-cols-2 gap-3">
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

                    {/* ДОГОВОР */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">📝 Договор</div>
                        {selectedClientId ? (
                            <ContractUpload clientId={selectedClientId} />
                        ) : (
                            <div className="text-xs text-slate-400 text-center py-2">Сохраните клиента для загрузки договора</div>
                        )}
                    </div>

                    {/* ДОКУМЕНТЫ */}
                    <div className={sectionClass}>
                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">📎 Документы</div>
                        {selectedClientId ? (
                            <ServerDocumentUpload
                                entityType="clients"
                                entityId={selectedClientId}
                            />
                        ) : (
                            <div className="text-xs text-slate-400 text-center py-2">Сохраните клиента для загрузки документов</div>
                        )}
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
                                onClick={() => setShowDeleteModal(true)}
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
            {
                showSaveModal && (
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
                )
            }

            {/* Модальное окно удаления/архивации клиента */}
            {currentClient && (
                <ArchiveConfirmModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={async () => {
                        console.log('[ClientsView] Starting archive...');
                        const entityToArchive = legalEntities.find(le => le.id === selectedClientId);
                        console.log('[ClientsView] Entity to archive:', entityToArchive);
                        if (!entityToArchive) {
                            console.error('[ClientsView] No entity found!');
                            return;
                        }
                        setIsDeleting(true);
                        try {
                            // Архивируем вместо удаления
                            console.log('[ClientsView] Calling archiveItem...');
                            await archiveItem('clients', entityToArchive);
                            console.log('[ClientsView] Archive success, calling onDelete...');
                            // Вызываем onDelete чтобы обновить состояние в родителе
                            await onDelete(entityToArchive);
                            console.log('[ClientsView] onDelete done, closing modal...');
                            setShowDeleteModal(false);
                        } catch (error) {
                            console.error('[ClientsView] Archive error:', error);
                        } finally {
                            setIsDeleting(false);
                        }
                    }}
                    entityType="Клиент"
                    entityName={currentClient.name}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

interface ClientsViewProps {
    employees?: Employee[];
    initialClientId?: string; // Для перехода сразу в детализацию клиента
    onNavigateToTasks?: (clientId: string, month: Date) => void; // Переход в TasksView
    onDataChanged?: () => void; // Callback для синхронизации с App.tsx
}

export const ClientsView: React.FC<ClientsViewProps> = ({ employees = [], initialClientId, onNavigateToTasks, onDataChanged }) => {
    // Если есть initialClientId — сразу открываем details
    const [activeTab, setActiveTab] = useState<ClientTab>(initialClientId ? 'details' : 'list');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
    const [contractPreview, setContractPreview] = useState<{ clientId: string; clientName: string } | null>(null);

    // ===== ПРЯМОЕ ЧТЕНИЕ ИЗ БД =====
    const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Загрузка данных напрямую из API
    const fetchClients = async () => {
        try {
            const data = await storage.loadAllClients();
            console.log('[ClientsView] Loaded', data.length, 'clients from API');
            setLegalEntities(data);
        } catch (error) {
            console.error('[ClientsView] Failed to load clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Загрузка при монтировании
    useEffect(() => {
        fetchClients();
    }, []);

    // Конвертируем LegalEntity в Client для отображения в UI
    const clients = useMemo(() => {
        return legalEntities.map(adaptLegalEntityToClient);
    }, [legalEntities]);

    const handleSelectClient = (id: string) => {
        setSelectedClientId(id);
        setActiveTab('details');
    };

    const handleViewContract = (clientId: string, clientName: string) => {
        setContractPreview({ clientId, clientName });
    };

    // ===== СОХРАНЕНИЕ С ПЕРЕЗАГРУЗКОЙ =====
    const handleSaveEntity = async (entity: LegalEntity) => {
        try {
            console.log('[ClientsView] Saving entity:', entity.id, entity.name);
            await storage.saveClient(entity);
            console.log('[ClientsView] Save successful, refetching...');
            // После сохранения - перезагружаем данные из БД
            await fetchClients();
            // Синхронизируем с App.tsx для TasksView
            if (onDataChanged) {
                onDataChanged();
            }
            console.log('[ClientsView] Refetch complete');
        } catch (error) {
            console.error('[ClientsView] Failed to save client:', error);
            // TODO: показать ошибку пользователю
        }
    };

    // Удаление клиента из списка (архивация через DELETE API)
    const handleDeleteFromList = async (clientId: string) => {
        try {
            // Вызываем DELETE API который архивирует клиента в SQLite
            await storage.deleteClient(clientId);
            // После удаления - перезагружаем данные
            await fetchClients();
            // Синхронизируем с App.tsx
            if (onDataChanged) {
                onDataChanged();
            }
        } catch (error) {
            console.error('[ClientsView] Failed to archive client:', error);
        }
    };

    // Удаление entity (через архивацию)
    const handleDeleteEntity = async (entity: LegalEntity) => {
        await handleDeleteFromList(entity.id);
    };

    const tabs = [
        { id: 'list' as const, label: 'Список' },
        { id: 'details' as const, label: 'Детализация' },
        { id: 'manage' as const, label: 'Управление' },
    ];

    // Показываем загрузку
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-slate-500">Загрузка клиентов...</div>
            </div>
        );
    }

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
                {activeTab === 'list' && <ClientListTab clients={clients} onSelectClient={handleSelectClient} onViewContract={handleViewContract} onDeleteClient={handleDeleteFromList} />}
                {activeTab === 'details' && <ClientDetailsTab clients={clients} clientId={selectedClientId} onNavigateToTasks={onNavigateToTasks} onDeleteClient={handleDeleteFromList} />}
                {activeTab === 'manage' && <ClientManageTab clients={clients} legalEntities={legalEntities} onSave={handleSaveEntity} onDelete={handleDeleteEntity} employees={employees} initialClientId={selectedClientId} />}
            </div>

            {/* Модалка просмотра договора из списка */}
            {contractPreview && (
                <ContractPreviewFromList
                    clientId={contractPreview.clientId}
                    clientName={contractPreview.clientName}
                    onClose={() => setContractPreview(null)}
                />
            )}
        </div>
    );
};

// Компонент предпросмотра договора (используется из списка)
const ContractPreviewFromList: React.FC<{
    clientId: string;
    clientName: string;
    onClose: () => void;
}> = ({ clientId, clientName, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [contractName, setContractName] = useState<string>('');

    const SERVER_URL = 'http://localhost:3001';
    const DEFAULT_TENANT = 'org_default';

    React.useEffect(() => {
        const loadContract = async () => {
            try {
                // Сначала получаем метаданные
                const metaRes = await fetch(`${SERVER_URL}/api/${DEFAULT_TENANT}/clients/${clientId}/contract`);
                if (!metaRes.ok) {
                    setError('Договор не загружен');
                    setIsLoading(false);
                    return;
                }
                const meta = await metaRes.json();
                setContractName(meta.name);

                // Затем загружаем файл
                const fileRes = await fetch(`${SERVER_URL}/api/${DEFAULT_TENANT}/clients/${clientId}/contract/view`);
                if (!fileRes.ok) throw new Error('Failed to load file');

                const blob = await fileRes.blob();
                setBlobUrl(URL.createObjectURL(blob));
                setIsLoading(false);
            } catch (err) {
                setError('Ошибка загрузки договора');
                setIsLoading(false);
            }
        };

        loadContract();

        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [clientId]);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-green-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Договор</div>
                            <h3 className="text-lg font-semibold text-slate-800">{clientName}</h3>
                            {contractName && <p className="text-sm text-slate-500">{contractName}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden bg-slate-200 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <div className="flex flex-col items-center gap-3">
                                <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span className="text-slate-500">Загрузка договора...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <div className="text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-lg text-slate-600">{error}</p>
                                <p className="text-sm text-slate-400 mt-2">Загрузите договор в карточке клиента</p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && blobUrl && (
                        <iframe src={blobUrl} className="w-full h-full border-0" title="Договор" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientsView;

