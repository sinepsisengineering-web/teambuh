// components/StaffView.tsx
// Раздел «Персонал» с тремя вкладками: Список, Детализация, Управление

import React, { useState } from 'react';
import { isWeekend } from '../utils/dateUtils';
import { isHoliday } from '../services/holidayService';
import { DocumentUpload } from './DocumentUpload';
import { MiniCalendar } from './MiniCalendar';

type StaffTab = 'list' | 'details' | 'manage';

// ============================================
// Вкладка А: СПИСОК (сетка карточек сотрудников)
// ============================================
import { Employee, EmploymentType, UploadedDocument } from '../types';

const StaffListTab: React.FC<{ employees: Employee[], onSelectEmployee: (id: string) => void }> = ({ employees, onSelectEmployee }) => {
    const [sortBy, setSortBy] = useState<'alpha' | 'load-asc' | 'load-desc'>('alpha');

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
                                {emp.lastName.charAt(0)}
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">{emp.lastName} {emp.firstName}</div>
                                <div className="text-sm text-slate-500">{emp.role === 'accountant' ? 'Бухгалтер' : emp.role === 'admin' ? 'Администратор' : 'Помощник'}</div>
                            </div>
                        </div>

                        {/* Метрики */}
                        <div className="flex justify-between text-sm text-slate-600 mb-3">
                            <span>Клиентов: <b>0</b></span>
                            <span>Задач: <b>0</b></span>
                        </div>

                        {/* Нагрузка */}
                        <div className="text-center">
                            <span className={`text-3xl font-bold ${getLoadColor(0)}`}>
                                0%
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

const StaffDetailsTab: React.FC<{ employees: Employee[], employeeId: string | null }> = ({ employees, employeeId }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(employeeId || (employees.length > 0 ? employees[0].id : ''));

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
                        <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>
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
// ============================================
// Вкладка В: УПРАВЛЕНИЕ (редактор данных)
// ============================================

interface StaffManageTabProps {
    employees: Employee[];
    onSave: (emp: Employee) => void;
    onDelete: (emp: Employee) => void;
}

const StaffManageTab: React.FC<StaffManageTabProps> = ({ employees, onSave, onDelete }) => {
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(employees.length > 0 ? employees[0].id : null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newEmploymentType, setNewEmploymentType] = useState<EmploymentType>('staff');

    // Получаем данные выбранного сотрудника
    const currentEmployee = employees.find(e => e.id === selectedEmployee) || (employees.length > 0 ? employees[0] : undefined);
    const isExisting = !isAddingNew && !!currentEmployee;
    const empType = isAddingNew ? newEmploymentType : (currentEmployee?.employmentType || 'staff');

    // Form handlers (using refs or state would be better, but for now we read directly if possible, or bind inputs??
    // Simplified: Just direct state/ref usage would be complex to refactor all inputs.
    // Let's implement full saving logic with state or refs.
    // Current code uses `defaultValue`. We need to switch to controlled components or collect data on save.
    // For minimal refactor, let's collect data from DOM or use state for modified fields.
    // Given the previous code used defaultValue, it wasn't interactive.
    // I will simulate saving by using the existing mock logic structure but calling onSave.
    // Wait, the previous code didn't have inputs state! It just displayed mock data. 
    // I need to properly implement the form state to support editing.
    // For this step I will just map the props and provide a basic implementation that works with what we have.
    // I will replace `employeesData` with `employees` prop usage.

    // ... Actually, I need to make the inputs controlled or use refs. 
    // I will use a simple form state object initialized from currentEmployee.

    const [formData, setFormData] = useState<Partial<Employee>>({});

    React.useEffect(() => {
        if (isExisting && currentEmployee) {
            setFormData({ ...currentEmployee });
        } else if (isAddingNew) {
            setFormData({
                id: `emp-${Date.now()}`,
                employmentType: newEmploymentType,
                isActive: true,
                isBlocked: false,
                documents: []
            });
        }
    }, [selectedEmployee, isAddingNew, currentEmployee, newEmploymentType]);

    const handleSelectEmployee = (id: string) => { setSelectedEmployee(id); setIsAddingNew(false); };
    const handleAddNew = () => { setIsAddingNew(true); setSelectedEmployee(null); setNewEmploymentType('staff'); };

    const handleSaveClick = () => {
        // Collect data (in a real app we'd use form state for everything)
        // For now, let's assume formData is updated or just pass back what we have + type changes.
        // Since I can't easily rewrite all inputs to controlled in one go without making the file huge diff,
        // I will trust the user to fill the form and I'll just save the `formData` which needs to be updated by inputs.
        // IMPORTANT: The original code provided NO mechanism to update values (just defaultValues).
        // I MUST make inputs controlled or use refs to support saving. 
        // I will use `onChange` to update `formData`.

        if (formData.lastName) {
            onSave(formData as Employee);
            setIsAddingNew(false);
            if (formData.id) setSelectedEmployee(formData.id);
        }
    };

    const updateField = (field: keyof Employee, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleUploadDocument = (file: File) => console.log('Upload:', file.name);
    const handleDeleteDocument = (docId: string) => console.log('Delete:', docId);
    const handleViewDocument = (doc: UploadedDocument) => { console.log('View:', doc.name); window.open('#', '_blank'); };

    const inputClass = "w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/30";
    const inputReadonlyClass = "w-full px-2 py-1 text-xs border border-slate-100 rounded bg-slate-50 text-slate-500";
    const labelClass = "block text-[10px] text-slate-500 mb-0.5";

    if (!currentEmployee && !isAddingNew) return <div className="p-4">Нет сотрудников</div>;

    // Helper for inputs
    const Input = ({ field, type = "text", readOnly = false }: { field: keyof Employee, type?: string, readOnly?: boolean }) => (
        <input
            type={type}
            className={readOnly ? inputReadonlyClass : inputClass}
            value={(formData as any)[field] || ''}
            onChange={e => updateField(field, e.target.value)}
            readOnly={readOnly}
        />
    );

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
                                    <button key={opt.value} onClick={() => { setNewEmploymentType(opt.value as EmploymentType); updateField('employmentType', opt.value); }}
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
                                <div><label className={labelClass}>Фамилия</label><Input field="lastName" /></div>
                                <div><label className={labelClass}>Имя</label><Input field="firstName" /></div>
                                <div><label className={labelClass}>Отчество</label><Input field="middleName" /></div>
                                <div><label className={labelClass}>Email (логин)</label><Input field="email" type="email" /></div>
                                <div><label className={labelClass}>Телефон</label><Input field="phone" type="tel" /></div>
                                <div>
                                    <label className={labelClass}>Пароль</label>
                                    <button className="w-full px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] hover:bg-slate-200">Сбросить</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ДОКУМЕНТЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Документы</h3>
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                            <div><label className={labelClass}>{empType === 'staff' ? 'Дата приёма' : 'Начало'}</label><Input field="hireDate" type="date" readOnly={isExisting} /></div>
                            <div><label className={labelClass}>ИНН</label><Input field="inn" /></div>
                            {empType === 'staff' && (<>
                                <div><label className={labelClass}>Паспорт</label><Input field="passport" /></div>
                                <div><label className={labelClass}>СНИЛС</label><Input field="snils" /></div>
                                <div><label className={labelClass}>Тип работы</label><select className={inputClass} value={formData.workType} onChange={e => updateField('workType', e.target.value)}><option value="office">В офисе</option><option value="remote">Удалённо</option></select></div>
                            </>)}
                            {empType === 'ip' && <div><label className={labelClass}>ОГРНИП</label><Input field="ogrnip" /></div>}
                        </div>
                        <DocumentUpload documents={formData.documents || []} onUpload={handleUploadDocument} onDelete={handleDeleteDocument} onView={handleViewDocument} label="Загрузить документ" />
                    </div>

                    {/* ФИНАНСЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Финансы</h3>
                        <div className="grid grid-cols-4 gap-1.5">
                            <div><label className={labelClass}>Банк</label><Input field="bankName" /></div>
                            <div><label className={labelClass}>Р/с</label><Input field="bankAccount" /></div>
                            {(empType === 'staff' || empType === 'selfemployed') && <div><label className={labelClass}>№ карты</label><Input field="cardNumber" /></div>}
                            {empType === 'ip' && (<>
                                <div><label className={labelClass}>БИК</label><Input field="bik" /></div>
                                <div><label className={labelClass}>Корр. счёт</label><Input field="corrAccount" /></div>
                            </>)}
                            {empType === 'staff' && <div><label className={labelClass}>Оклад</label><Input field="salary" type="number" /></div>}
                            <div><label className={labelClass}>Процент</label><Input field="percent" type="number" /></div>
                        </div>
                    </div>

                    {/* ДОСТУПЫ */}
                    <div>
                        <h3 className="text-[10px] font-semibold text-slate-700 mb-1.5 pb-1 border-b border-slate-100">Доступы</h3>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className={labelClass}>Роль в системе</label>
                                <select className={inputClass} value={formData.role || 'accountant'} onChange={e => updateField('role', e.target.value)}>
                                    <option value="admin">Администратор</option>
                                    <option value="accountant">Бухгалтер</option>
                                    <option value="assistant">Помощник бухгалтера</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer"><input type="radio" checked={formData.isActive} onChange={() => updateField('isActive', true)} /><span className="text-green-600">✓ Активен</span></label>
                                <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer"><input type="radio" checked={!formData.isActive} onChange={() => updateField('isActive', false)} /><span className="text-red-500">⛔ Заблокирован</span></label>
                            </div>
                        </div>
                    </div>

                    {/* Кнопки */}
                    <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveClick} className="px-3 py-1 bg-primary text-white text-[10px] rounded hover:bg-primary-hover">{isAddingNew ? 'Создать' : 'Сохранить'}</button>
                        <button onClick={() => isAddingNew ? setIsAddingNew(false) : {}} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] rounded hover:bg-slate-200">Отмена</button>
                        {!isAddingNew && isExisting && currentEmployee && <button onClick={() => onDelete(currentEmployee)} className="ml-auto px-3 py-1 bg-red-50 text-red-600 text-[10px] rounded hover:bg-red-100">{empType === 'staff' ? 'Уволить' : 'Удалить'}</button>}
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
                    {employees.map(emp => (
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

interface StaffViewProps {
    employees?: Employee[];
    onSave?: (emp: Employee) => void;
    onDelete?: (emp: Employee) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({ employees = [], onSave = () => { }, onDelete = () => { } }) => {
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
            {/* Контент */}
            <div className="flex-1 min-h-0 p-4 bg-slate-50">
                {activeTab === 'list' && <StaffListTab employees={employees} onSelectEmployee={handleSelectEmployee} />}
                {activeTab === 'details' && <StaffDetailsTab employees={employees} employeeId={selectedEmployeeId} />}
                {activeTab === 'manage' && <StaffManageTab employees={employees} onSave={onSave} onDelete={onDelete} />}
            </div>
        </div>
    );
};

export default StaffView;
