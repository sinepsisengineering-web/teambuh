// components/StaffView.tsx
// Раздел «Персонал» с тремя вкладками: Список, Детализация, Управление

import React, { useState } from 'react';
import { isWeekend } from '../utils/dateUtils';
import { isHoliday } from '../services/holidayService';
import { DocumentUpload, UploadedDocument } from './DocumentUpload';
import { MiniCalendar } from './MiniCalendar';

type StaffTab = 'list' | 'details' | 'manage';

// ============================================
// Вкладка А: СПИСОК (сетка карточек сотрудников)
// ============================================
const StaffListTab: React.FC<{ onSelectEmployee: (id: string) => void }> = ({ onSelectEmployee }) => {
    const [sortBy, setSortBy] = useState<'alpha' | 'load-asc' | 'load-desc'>('alpha');

    // Мок-данные сотрудников
    const employees = [
        { id: '1', name: 'Иванова Мария', role: 'Бухгалтер', clients: 12, tasks: 34, load: 85 },
        { id: '2', name: 'Петров Алексей', role: 'Бухгалтер', clients: 8, tasks: 21, load: 60 },
        { id: '3', name: 'Сидорова Елена', role: 'Бухгалтер', clients: 15, tasks: 42, load: 95 },
        { id: '4', name: 'Козлов Дмитрий', role: 'Бухгалтер', clients: 5, tasks: 12, load: 35 },
    ];

    const getLoadColor = (load: number) => {
        if (load >= 90) return 'text-red-500';
        if (load >= 70) return 'text-orange-500';
        return 'text-green-500';
    };

    return (
        <div className="h-full flex flex-col">
            {/* Панель инструментов */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Сотрудники</h2>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="alpha">По алфавиту</option>
                    <option value="load-desc">Нагрузка ↓</option>
                    <option value="load-asc">Нагрузка ↑</option>
                </select>
            </div>

            {/* Сетка карточек */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map((emp) => (
                    <div
                        key={emp.id}
                        onClick={() => onSelectEmployee(emp.id)}
                        className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
                    >
                        {/* Аватар + ФИО */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                                {emp.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">{emp.name}</div>
                                <div className="text-sm text-slate-500">{emp.role}</div>
                            </div>
                        </div>

                        {/* Метрики */}
                        <div className="flex justify-between text-sm text-slate-600 mb-3">
                            <span>Клиентов: <b>{emp.clients}</b></span>
                            <span>Задач: <b>{emp.tasks}</b></span>
                        </div>

                        {/* Нагрузка */}
                        <div className="text-center">
                            <span className={`text-3xl font-bold ${getLoadColor(emp.load)}`}>
                                {emp.load}%
                            </span>
                            <div className="text-xs text-slate-400 mt-1">Нагрузка</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// Вкладка Б: ДЕТАЛИЗАЦИЯ (дашборд сотрудника)
// ============================================
// Используем глобальный MiniCalendar из ./MiniCalendar.tsx

const StaffDetailsTab: React.FC<{ employeeId: string | null }> = ({ employeeId }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(employeeId || '1');

    const employees = [
        { id: '1', name: 'Иванова Мария' },
        { id: '2', name: 'Петров Алексей' },
        { id: '3', name: 'Сидорова Елена' },
        { id: '4', name: 'Козлов Дмитрий' },
    ];

    const clients = [
        'ООО "Рога и Копыта"',
        'ИП Иванов А.А.',
        'ООО "Звезда"',
        'ИП Петров Б.Б.',
        'ООО "Альфа"',
        'ИП Сидорова В.В.',
        'ООО "Бета Групп"',
        'ИП Козлов Г.Г.',
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Шапка */}
            <div className="flex justify-between items-center mb-4">
                <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить задачу
                </button>
            </div>

            {/* Две колонки: 70% / 30% */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Левая колонка — Задачи (70%) */}
                <div className="w-[70%] flex flex-col gap-3 overflow-y-auto">
                    {/* Критично */}
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <h3 className="text-red-600 font-medium text-sm mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Критично
                        </h3>
                        <div className="space-y-1.5">
                            <div className="bg-white rounded-md p-2 border border-red-100 text-xs">
                                <div className="font-medium text-slate-800">Сдать НДС — ООО "Рога и Копыта"</div>
                                <div className="text-red-500 mt-0.5">Просрочено на 2 дня</div>
                            </div>
                        </div>
                    </div>

                    {/* В работе */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <h3 className="text-blue-600 font-medium text-sm mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            В работе
                        </h3>
                        <div className="space-y-1.5">
                            <div className="bg-white rounded-md p-2 border border-blue-100 text-xs">
                                <div className="font-medium text-slate-800">Подготовить баланс — ИП Иванов</div>
                                <div className="text-slate-500 mt-0.5">До 25 января</div>
                            </div>
                            <div className="bg-white rounded-md p-2 border border-blue-100 text-xs">
                                <div className="font-medium text-slate-800">Ответ в ФНС — ООО "Звезда"</div>
                                <div className="text-slate-500 mt-0.5">До 28 января</div>
                            </div>
                        </div>
                    </div>

                    {/* В планах */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <h3 className="text-slate-600 font-medium text-sm mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            В планах
                        </h3>
                        <div className="space-y-1.5">
                            <div className="bg-white rounded-md p-2 border border-slate-100 text-xs">
                                <div className="font-medium text-slate-800">Страховые взносы — все клиенты</div>
                                <div className="text-slate-500 mt-0.5">До 15 февраля</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Правая колонка — Виджеты (30%): Календарь → Клиенты (flex) → Статистика → Финансы */}
                <div className="w-[30%] flex flex-col gap-2 text-[11px]">
                    {/* Мини-календарь (auto height) */}
                    <div className="flex-shrink-0">
                        <MiniCalendar />
                    </div>

                    {/* Клиенты (заполняет оставшееся пространство) */}
                    <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 p-2 flex flex-col">
                        <h4 className="font-medium text-slate-700 mb-1 flex-shrink-0">Клиенты</h4>
                        <div className="flex-1 overflow-y-auto">
                            <ul className="space-y-0.5 text-slate-600">
                                {clients.map((client, i) => (
                                    <li key={i} className="py-0.5 hover:text-primary cursor-pointer truncate">• {client}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Статистика (fixed) */}
                    <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2">
                        <h4 className="font-medium text-slate-700 mb-1">Статистика</h4>
                        <div className="flex justify-between text-slate-600">
                            <span>Клиентов: <b>12</b></span>
                            <span>Задач: <b>34</b></span>
                            <span className="text-green-600">✓ 28</span>
                            <span className="text-orange-500">⏳ 6</span>
                        </div>
                    </div>

                    {/* Финансы (fixed) */}
                    <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2">
                        <h4 className="font-medium text-slate-700 mb-1 flex items-center justify-between">
                            Финансы
                            <span className="text-primary font-bold">30%</span>
                        </h4>
                        <div className="flex justify-between text-slate-600">
                            <span>Приход: <b>145 000₽</b></span>
                            <span className="text-green-600">ЗП: 43 500₽</span>
                            <button className="text-primary hover:underline">+Премия</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ============================================
// Вкладка В: УПРАВЛЕНИЕ (редактор данных)
// ============================================
type EmploymentType = 'staff' | 'selfemployed' | 'ip';

const StaffManageTab: React.FC = () => {
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>('1');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newEmploymentType, setNewEmploymentType] = useState<EmploymentType>('staff');

    // Мок-данные сотрудников с полной информацией
    const employeesData = [
        {
            id: '1', lastName: 'Иванова', firstName: 'Мария', middleName: 'Петровна',
            email: 'maria@teambuh.ru', phone: '+7 (999) 123-45-67',
            employmentType: 'staff' as EmploymentType, workType: 'office' as const,
            hireDate: '2023-01-15', passport: '1234 567890', inn: '123456789012', snils: '123-456-789 00',
            bankName: 'Сбербанк', bankAccount: '40817810099910004567', cardNumber: '4276 **** 1234',
            salary: '50000', percent: '30', isActive: true, isBlocked: false,
            documents: [
                { id: 'd1', name: 'Паспорт.pdf', uploadDate: new Date('2023-01-15'), size: 1245000, type: 'pdf' },
                { id: 'd2', name: 'Трудовой договор.pdf', uploadDate: new Date('2023-01-15'), size: 890000, type: 'pdf' },
            ] as UploadedDocument[]
        },
        {
            id: '2', lastName: 'Петров', firstName: 'Алексей', middleName: 'Иванович',
            email: 'alex@teambuh.ru', phone: '+7 (999) 987-65-43',
            employmentType: 'selfemployed' as EmploymentType, hireDate: '2023-06-01',
            inn: '987654321098', bankName: 'Тинькофф', bankAccount: '40817810099910001234', cardNumber: '5536 **** 5678',
            percent: '35', isActive: true, isBlocked: false,
            documents: [{ id: 'd3', name: 'Договор ГПХ.pdf', uploadDate: new Date('2023-06-01'), size: 567000, type: 'pdf' }] as UploadedDocument[]
        },
        {
            id: '3', lastName: 'Сидорова', firstName: 'Елена', middleName: 'Викторовна',
            email: 'elena@teambuh.ru', phone: '+7 (999) 555-44-33',
            employmentType: 'ip' as EmploymentType, hireDate: '2022-03-10',
            inn: '111222333444', ogrnip: '315774600012345',
            bankName: 'Альфа-Банк', bankAccount: '40802810099910009999', bik: '044525593', corrAccount: '30101810200000000593',
            percent: '40', isActive: true, isBlocked: false,
            documents: [
                { id: 'd4', name: 'Договор с ИП.pdf', uploadDate: new Date('2022-03-10'), size: 1123000, type: 'pdf' },
                { id: 'd5', name: 'Выписка ЕГРИП.pdf', uploadDate: new Date('2022-03-10'), size: 445000, type: 'pdf' },
            ] as UploadedDocument[]
        },
        {
            id: '4', lastName: 'Козлов', firstName: 'Дмитрий', middleName: 'Сергеевич',
            email: 'dmitry@teambuh.ru', phone: '+7 (999) 111-22-33',
            employmentType: 'staff' as EmploymentType, workType: 'remote' as const,
            hireDate: '2024-01-01', passport: '9876 543210', inn: '555666777888', snils: '987-654-321 00',
            bankName: 'ВТБ', bankAccount: '40817810099910005555', cardNumber: '4272 **** 9999',
            salary: '45000', percent: '25', isActive: true, isBlocked: false,
            documents: [] as UploadedDocument[]
        },
    ];

    // Получаем данные выбранного сотрудника
    const currentEmployee = employeesData.find(e => e.id === selectedEmployee) || employeesData[0];
    const isExisting = !isAddingNew && currentEmployee;
    const empType = isAddingNew ? newEmploymentType : currentEmployee.employmentType;

    const handleSelectEmployee = (id: string) => { setSelectedEmployee(id); setIsAddingNew(false); };
    const handleAddNew = () => { setIsAddingNew(true); setSelectedEmployee(null); setNewEmploymentType('staff'); };
    const handleUploadDocument = (file: File) => console.log('Upload:', file.name);
    const handleDeleteDocument = (docId: string) => console.log('Delete:', docId);
    const handleViewDocument = (doc: UploadedDocument) => { console.log('View:', doc.name); window.open('#', '_blank'); };

    const inputClass = "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30";
    const inputReadonlyClass = "w-full px-2 py-1 text-xs border border-slate-100 rounded bg-slate-50 text-slate-500";
    const labelClass = "block text-[10px] text-slate-500 mb-0.5";

    return (
        <div className="h-full flex gap-4">
            {/* Левая колонка — Форма (70%) */}
            <div className="w-[70%] h-full overflow-y-auto">
                <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3 text-xs h-full">

                    {/* ТИП ОТНОШЕНИЙ */}
                    <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                        <label className="block text-[10px] font-medium text-slate-700 mb-1.5">Тип отношений</label>
                        {isExisting ? (
                            <div className="py-1 px-2 bg-white rounded border border-slate-200 text-xs font-medium text-slate-700">
                                {empType === 'staff' ? '👔 Штатный сотрудник' : empType === 'selfemployed' ? '📱 Самозанятый' : '🏢 ИП'}
                            </div>
                        ) : (
                            <div className="flex gap-1">
                                {[{ value: 'staff', label: '👔 Штат' }, { value: 'selfemployed', label: '📱 СЗ' }, { value: 'ip', label: '🏢 ИП' }].map(opt => (
                                    <button key={opt.value} onClick={() => setNewEmploymentType(opt.value as EmploymentType)}
                                        className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${newEmploymentType === opt.value ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ЛИЧНЫЕ ДАННЫЕ */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-700 mb-2 pb-1 border-b border-slate-100">Личные данные</h3>
                        <div className="flex gap-4">
                            {/* Фото */}
                            <div className="flex-shrink-0">
                                <div className="w-20 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className="text-center">
                                        <svg className="w-6 h-6 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-[9px] text-slate-400 mt-1 block">Фото</span>
                                    </div>
                                </div>
                            </div>
                            {/* Поля ФИО */}
                            <div className="flex-1 grid grid-cols-3 gap-2">
                                <div>
                                    <label className={labelClass}>Фамилия</label>
                                    <input type="text" className={inputClass} defaultValue={currentEmployee.lastName} />
                                </div>
                                <div>
                                    <label className={labelClass}>Имя</label>
                                    <input type="text" className={inputClass} defaultValue={currentEmployee.firstName} />
                                </div>
                                <div>
                                    <label className={labelClass}>Отчество</label>
                                    <input type="text" className={inputClass} defaultValue={currentEmployee.middleName} />
                                </div>
                                <div>
                                    <label className={labelClass}>Email (логин)</label>
                                    <input type="email" className={inputClass} defaultValue={currentEmployee.email} />
                                </div>
                                <div>
                                    <label className={labelClass}>Телефон</label>
                                    <input type="tel" className={inputClass} defaultValue={currentEmployee.phone} />
                                </div>
                                <div>
                                    <label className={labelClass}>Пароль</label>
                                    <button className="w-full px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200">
                                        Сбросить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ДОКУМЕНТЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Документы</h3>
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                            <div>
                                <label className={labelClass}>{empType === 'staff' ? 'Дата приёма' : 'Начало'}</label>
                                <input type="date" className={isExisting ? inputReadonlyClass : inputClass} defaultValue={isAddingNew ? '' : currentEmployee.hireDate} readOnly={!!isExisting} />
                            </div>
                            <div>
                                <label className={labelClass}>ИНН</label>
                                <input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.inn} />
                            </div>
                            {empType === 'staff' && (<>
                                <div><label className={labelClass}>Паспорт</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.passport} /></div>
                                <div><label className={labelClass}>СНИЛС</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.snils} /></div>
                                <div><label className={labelClass}>Тип работы</label><select className={inputClass} defaultValue={currentEmployee.workType || 'office'}><option value="office">В офисе</option><option value="remote">Удалённо</option></select></div>
                            </>)}
                            {empType === 'ip' && <div><label className={labelClass}>ОГРНИП</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.ogrnip} /></div>}
                        </div>
                        <DocumentUpload documents={isAddingNew ? [] : currentEmployee.documents} onUpload={handleUploadDocument} onDelete={handleDeleteDocument} onView={handleViewDocument} label="Загрузить документ" />
                    </div>

                    {/* ФИНАНСЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Финансы</h3>
                        <div className="grid grid-cols-4 gap-1.5">
                            <div><label className={labelClass}>Банк</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.bankName} /></div>
                            <div><label className={labelClass}>Р/с</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.bankAccount} /></div>
                            {(empType === 'staff' || empType === 'selfemployed') && <div><label className={labelClass}>№ карты</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.cardNumber} /></div>}
                            {empType === 'ip' && (<>
                                <div><label className={labelClass}>БИК</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.bik} /></div>
                                <div><label className={labelClass}>Корр. счёт</label><input type="text" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.corrAccount} /></div>
                            </>)}
                            {empType === 'staff' && <div><label className={labelClass}>Оклад</label><input type="number" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.salary} /></div>}
                            <div><label className={labelClass}>Процент</label><input type="number" className={inputClass} defaultValue={isAddingNew ? '' : currentEmployee.percent} /></div>
                        </div>
                    </div>

                    {/* ДОСТУПЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Доступы</h3>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className={labelClass}>Роль в системе</label>
                                <select className={inputClass} defaultValue="accountant">
                                    <option value="admin">Администратор</option>
                                    <option value="accountant">Бухгалтер</option>
                                    <option value="assistant">Помощник бухгалтера</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer"><input type="radio" name="status" defaultChecked={isAddingNew || currentEmployee.isActive} /><span className="text-green-600">✓ Активен</span></label>
                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer"><input type="radio" name="status" defaultChecked={!isAddingNew && currentEmployee.isBlocked} /><span className="text-red-500">⛔ Заблокирован</span></label>
                            </div>
                        </div>
                    </div>

                    {/* Кнопки */}
                    <div className="flex gap-2 pt-1">
                        <button className="px-3 py-1 bg-primary text-white text-[10px] rounded hover:bg-primary-hover">{isAddingNew ? 'Создать' : 'Сохранить'}</button>
                        <button className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] rounded hover:bg-slate-200">Отмена</button>
                        {!isAddingNew && <button className="ml-auto px-3 py-1 bg-red-50 text-red-600 text-[10px] rounded hover:bg-red-100">{empType === 'staff' ? 'Уволить' : 'Удалить'}</button>}
                    </div>
                </div>
            </div>

            {/* Правая колонка */}
            <div className="w-[30%] flex flex-col">
                <button onClick={handleAddNew} className={`w-full mb-2 px-2 py-1.5 text-[10px] rounded-lg flex items-center justify-center gap-1 ${isAddingNew ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {isAddingNew ? 'Создание...' : 'Добавить'}
                </button>
                <div className="bg-white rounded-lg border border-slate-200 flex-1 overflow-y-auto">
                    {employeesData.map(emp => (
                        <div key={emp.id} onClick={() => handleSelectEmployee(emp.id)}
                            className={`px-2 py-1.5 cursor-pointer border-b border-slate-100 last:border-0 ${selectedEmployee === emp.id && !isAddingNew ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-slate-50'}`}>
                            <div className="text-[10px] font-medium text-slate-800">{emp.lastName} {emp.firstName}</div>
                            <div className="text-[9px] text-slate-400">{emp.employmentType === 'staff' ? '👔' : emp.employmentType === 'selfemployed' ? '📱' : '🏢'} {!emp.isActive && '⛔'}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================
export const StaffView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<StaffTab>('list');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    const handleSelectEmployee = (id: string) => {
        setSelectedEmployeeId(id);
        setActiveTab('details');
    };

    const tabs = [
        { id: 'list' as const, label: 'Список' },
        { id: 'details' as const, label: 'Детализация' },
        { id: 'manage' as const, label: 'Управление' },
    ];

    return (
        <div className="h-full flex flex-col -m-8">
            {/* Верхняя панель с вкладками */}
            <div className="bg-[linear-gradient(135deg,#1E1E3F_0%,#312e81_50%,#1E1E3F_100%)] px-6 py-3">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                px-4 py-2 text-sm font-medium rounded-lg transition-all
                                ${activeTab === tab.id
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:text-white hover:bg-white/10'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Контент */}
            <div className="flex-1 min-h-0 p-4 bg-slate-50">
                {activeTab === 'list' && <StaffListTab onSelectEmployee={handleSelectEmployee} />}
                {activeTab === 'details' && <StaffDetailsTab employeeId={selectedEmployeeId} />}
                {activeTab === 'manage' && <StaffManageTab />}
            </div>
        </div>
    );
};

export default StaffView;
