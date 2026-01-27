// components/StaffView.tsx
// Раздел «Персонал» с тремя вкладками: Список, Детализация, Управление

import React, { useState, useEffect, useMemo } from 'react';
import { ServerDocumentUpload } from './ServerDocumentUpload';
import { MiniCalendar } from './MiniCalendar';
import { Input, Select, Label, FormSection, PhoneInput, EmailInput, INNInput, PercentInput, SNILSInput, PassportInput, BankAccountInput, BIKInput, CorrAccountInput, CardNumberInput, SalaryInput } from './FormComponents';
import { EmployeeAvatar } from './EmployeeAvatar';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import * as taskStorage from '../services/taskStorageService';
import { archiveItem } from '../services/storageService';
import { useTaskModal } from '../contexts/TaskModalContext';
import { getStatusIcon, getPriorityBarColor } from '../services/taskIndicators';

const SERVER_URL = 'http://localhost:3001';

type StaffTab = 'list' | 'details' | 'manage';

// ============================================
// Вкладка А: СПИСОК (сетка карточек сотрудников)
// ============================================
import { Employee, EmploymentType, LegalEntity } from '../types';

const StaffListTab: React.FC<{ employees: Employee[], legalEntities: LegalEntity[], onSelectEmployee: (id: string) => void }> = ({ employees, legalEntities, onSelectEmployee }) => {
    const [sortBy, setSortBy] = useState<'alpha' | 'load-asc' | 'load-desc'>('alpha');

    // Считаем кол-во клиентов для каждого сотрудника
    const clientCountMap = new Map<string, number>();
    legalEntities.forEach(le => {
        if (le.accountantId) {
            clientCountMap.set(le.accountantId, (clientCountMap.get(le.accountantId) || 0) + 1);
        }
    });

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
                            <EmployeeAvatar
                                employeeId={emp.id}
                                name={`${emp.lastName || ''} ${emp.firstName || ''}`}
                                size="sm"
                            />
                            <div>
                                <div className="font-semibold text-slate-800">{emp.lastName || 'Без фамилии'} {emp.firstName || ''}</div>
                                <div className="text-sm text-slate-500">{emp.role === 'accountant' ? 'Бухгалтер' : emp.role === 'admin' ? 'Администратор' : 'Помощник'}</div>
                            </div>
                        </div>

                        {/* Метрики */}
                        <div className="flex justify-between text-sm text-slate-600 mb-3">
                            <span>Клиентов: <b>{clientCountMap.get(emp.id) || 0}</b></span>
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

const StaffDetailsTab: React.FC<{ employees: Employee[], employeeId: string | null, legalEntities: LegalEntity[] }> = ({ employees, employeeId, legalEntities }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(employeeId || (employees.length > 0 ? employees[0].id : ''));
    const { openTaskModal } = useTaskModal();

    // === Состояние задач и фильтров ===
    const [allTasks, setAllTasks] = useState<taskStorage.StoredTask[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Клиенты сотрудника
    const linkedClients = legalEntities.filter(le => le.accountantId === selectedEmployee);
    const clientMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);

    // Загрузка задач сотрудника
    useEffect(() => {
        if (selectedEmployee) {
            // Загружаем задачи для всех клиентов этого сотрудника
            const clientIds = linkedClients.map(c => c.id);
            if (clientIds.length > 0) {
                taskStorage.getAllTasks().then(tasks => {
                    // Фильтруем по клиентам сотрудника или по assignedToId
                    const employeeTasks = tasks.filter(t =>
                        clientIds.includes(t.clientId) || t.assignedToId === selectedEmployee
                    );
                    setAllTasks(employeeTasks);
                });
            } else {
                setAllTasks([]);
            }
        }
    }, [selectedEmployee, linkedClients.length]);

    // Фильтрация задач по месяцу/дню и клиенту
    const filteredTasks = useMemo(() => {
        let tasks = allTasks;

        // Фильтр по месяцу
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        tasks = tasks.filter(t => {
            const due = new Date(t.currentDueDate);
            return due >= monthStart && due <= monthEnd;
        });

        // Фильтр по конкретному дню
        if (selectedDate) {
            tasks = tasks.filter(t => {
                const due = new Date(t.currentDueDate);
                return due.toDateString() === selectedDate.toDateString();
            });
        }

        // Фильтр по клиенту
        if (selectedClientId) {
            tasks = tasks.filter(t => t.clientId === selectedClientId);
        }

        // Сортировка по дате
        return tasks.sort((a, b) =>
            new Date(a.currentDueDate).getTime() - new Date(b.currentDueDate).getTime()
        );
    }, [allTasks, currentMonth, selectedDate, selectedClientId]);

    // Статистика
    const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
    const pendingCount = filteredTasks.filter(t => t.status !== 'completed').length;

    // Задачи для календаря (маркеры на днях)
    const calendarTasks = useMemo(() => {
        return allTasks.map(t => ({
            id: t.id,
            title: t.title,
            dueDate: new Date(t.currentDueDate),
            status: t.status as any,
            clientId: t.clientId
        }));
    }, [allTasks]);

    // Подсчёт задач по клиентам
    const clientsWithTaskCount = linkedClients.map(client => ({
        ...client,
        taskCount: allTasks.filter(t => t.clientId === client.id).length
    }));

    // Рендер иконки статуса
    const renderStatusIcon = (task: taskStorage.StoredTask) => {
        return getStatusIcon({
            dueDate: task.currentDueDate,
            status: task.status,
            cyclePattern: task.cyclePattern ?? undefined,
        });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Шапка */}
            <div className="flex justify-between items-center mb-4">
                <select
                    value={selectedEmployee}
                    onChange={(e) => {
                        setSelectedEmployee(e.target.value);
                        setSelectedClientId(null);
                        setSelectedDate(null);
                    }}
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
                <div className="w-[70%] flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
                    {/* Заголовок таблицы */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0">
                        <div style={{ width: '18px' }}></div>
                        <div className="w-8 text-center">Статус</div>
                        <div className="w-12 text-center">Тип</div>
                        <div className="flex-1">Задача</div>
                        <div className="w-10 text-center">Клиент</div>
                        <div className="w-20 text-center">Срок</div>
                    </div>

                    {/* Список задач */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="text-4xl mb-3">📋</div>
                                <p className="text-sm">Нет задач</p>
                                <p className="text-xs">
                                    {selectedDate ? 'на выбранную дату' : selectedClientId ? 'для выбранного клиента' : 'в этом месяце'}
                                </p>
                            </div>
                        ) : (
                            filteredTasks.map(task => {
                                const client = clientMap.get(task.clientId);
                                const dueDate = new Date(task.currentDueDate);
                                const isCompleted = task.status === 'completed';

                                // Используем общую функцию для цвета полосы
                                const priorityColor = getPriorityBarColor({
                                    dueDate: task.currentDueDate,
                                    status: task.status,
                                    cyclePattern: task.cyclePattern ?? undefined,
                                    taskSource: task.taskSource,
                                    recurrence: task.recurrence,
                                });

                                return (
                                    <div
                                        key={task.id}
                                        className={`flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isCompleted ? 'opacity-60' : ''}`}
                                    >
                                        {/* Цвет приоритета */}
                                        <div
                                            className={`rounded ${priorityColor}`}
                                            style={{ width: '18px', minHeight: '40px', alignSelf: 'stretch' }}
                                        />

                                        {/* Статус */}
                                        <div className="w-8 text-center text-lg flex-shrink-0">
                                            {renderStatusIcon(task)}
                                        </div>

                                        {/* Тип */}
                                        <div className="w-12 text-center flex-shrink-0 flex flex-col items-center justify-center">
                                            <div className="text-base">{task.taskSource === 'auto' ? '🤖' : '✍️'}</div>
                                            <div className="text-sm">{task.cyclePattern && task.cyclePattern !== 'once' ? '🔄' : '1️⃣'}</div>
                                        </div>

                                        {/* Название — кликабельное */}
                                        <div
                                            className={`flex-1 min-w-0 cursor-pointer hover:text-primary ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}
                                            onClick={() => openTaskModal({
                                                id: task.id,
                                                title: task.title,
                                                description: task.description ?? undefined,
                                                dueDate: task.currentDueDate,
                                                status: task.status,
                                            })}
                                        >
                                            <div className="text-sm font-medium leading-tight truncate">{task.title}</div>
                                            {task.description && (
                                                <div className="text-xs text-slate-500 leading-tight truncate">{task.description}</div>
                                            )}
                                        </div>

                                        {/* Клиент */}
                                        <div className="w-10 text-center flex-shrink-0">
                                            <button
                                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary/20 text-xs font-bold text-slate-600 hover:text-primary transition-colors"
                                                title={client?.name || 'Клиент'}
                                                onClick={() => setSelectedClientId(task.clientId === selectedClientId ? null : task.clientId)}
                                            >
                                                1
                                            </button>
                                        </div>

                                        {/* Срок */}
                                        <div className="w-20 text-center flex-shrink-0 text-xs text-slate-500">
                                            {dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Правая колонка — Виджеты */}
                <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                    {/* Мини-календарь */}
                    <MiniCalendar
                        tasks={calendarTasks}
                        selectedDate={selectedDate}
                        onDayClick={(date) => setSelectedDate(date.toDateString() === selectedDate?.toDateString() ? null : date)}
                        onDateChange={(date) => setCurrentMonth(date)}
                        onShowFullMonth={() => setSelectedDate(null)}
                    />

                    {/* Профиль + Клиенты */}
                    {(() => {
                        const emp = employees.find(e => e.id === selectedEmployee);
                        return (
                            <div className="flex-1 min-h-0 bg-white rounded-lg border border-slate-200 flex flex-col overflow-hidden">
                                {/* Профиль сотрудника */}
                                <div className="flex-shrink-0 p-3 border-b border-slate-100 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 text-sm truncate">
                                            {emp?.lastName || 'Сотрудник'} {emp?.firstName || ''}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {emp?.role === 'accountant' ? 'Бухгалтер' : emp?.role === 'admin' ? 'Администратор' : 'Помощник'}
                                        </div>
                                    </div>
                                    <EmployeeAvatar
                                        employeeId={emp?.id}
                                        name={`${emp?.lastName || ''} ${emp?.firstName || ''}`}
                                        size="md"
                                    />
                                </div>

                                {/* Клиенты — кликабельные для фильтрации */}
                                <div className="flex-1 overflow-y-auto p-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-slate-700 text-xs">Клиенты ({linkedClients.length})</h4>
                                        {selectedClientId && (
                                            <button
                                                onClick={() => setSelectedClientId(null)}
                                                className="text-[10px] text-primary hover:underline"
                                            >
                                                Сбросить
                                            </button>
                                        )}
                                    </div>
                                    {linkedClients.length === 0 ? (
                                        <div className="text-slate-400 text-xs text-center py-4">
                                            Нет привязанных клиентов
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {clientsWithTaskCount.map(client => (
                                                <div
                                                    key={client.id}
                                                    onClick={() => setSelectedClientId(client.id === selectedClientId ? null : client.id)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${client.id === selectedClientId
                                                        ? 'bg-primary/10 border border-primary/30'
                                                        : 'bg-slate-50 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-medium text-slate-800 truncate">{client.name}</div>
                                                        <div className="text-[10px] text-slate-400">ИНН: {client.inn}</div>
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center">
                                                        {client.taskCount}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Статистика */}
                    <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2">
                        <h4 className="font-medium text-slate-700 mb-1">Статистика</h4>
                        <div className="flex justify-between text-slate-600">
                            <span>Клиентов: <b>{linkedClients.length}</b></span>
                            <span>Задач: <b>{filteredTasks.length}</b></span>
                            <span className="text-green-600">✓ <b>{completedCount}</b></span>
                            <span className="text-orange-500">⏳ <b>{pendingCount}</b></span>
                        </div>
                    </div>

                    {/* Финансы */}
                    {(() => {
                        const emp = employees.find(e => e.id === selectedEmployee);
                        const DEFAULT_TARIFF = 7000;
                        const totalIncome = linkedClients.reduce((sum, client) => sum + (client.tariffPrice || DEFAULT_TARIFF), 0);
                        const employeePercent = parseFloat(emp?.percent || '0') || 0;
                        const salary = Math.round(totalIncome * employeePercent / 100);

                        return (
                            <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2">
                                <h4 className="font-medium text-slate-700 mb-1 flex items-center justify-between">
                                    Финансы
                                    <span className="text-primary font-bold">{employeePercent}%</span>
                                </h4>
                                <div className="flex justify-between text-slate-600">
                                    <span>Приход: <b>{totalIncome.toLocaleString()}₽</b></span>
                                    <span className="text-green-600">ЗП: {salary.toLocaleString()}₽</span>
                                    <button className="text-primary hover:underline">+Премия</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div >
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
    confirm?: (options: { title: string; message: string; confirmButtonText?: string }) => Promise<boolean>;
}

const StaffManageTab: React.FC<StaffManageTabProps> = ({ employees, onSave, onDelete, confirm }) => {
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

    // Уведомление о сохранении
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Модальное окно сохранения (аналогично ClientsView)
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalType, setSaveModalType] = useState<'confirm' | 'success' | 'error'>('confirm');
    const [isSaving, setIsSaving] = useState(false);

    // Модальное окно увольнения/удаления
    const [showDismissModal, setShowDismissModal] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);

    const handleSelectEmployee = (id: string) => { setSelectedEmployee(id); setIsAddingNew(false); setSaveMessage(null); };
    const handleAddNew = () => { setIsAddingNew(true); setSelectedEmployee(null); setNewEmploymentType('staff'); setErrors({}); setSaveMessage(null); };

    const handleSaveClick = async () => {
        // Валидация обязательных полей
        if (!validateForm()) {
            setSaveModalType('error');
            setShowSaveModal(true);
            return;
        }

        // Показываем модальное окно подтверждения
        if (isExisting) {
            setSaveModalType('confirm');
            setShowSaveModal(true);
        } else {
            // Для нового сотрудника — сразу сохраняем
            performSave();
        }
    };

    const performSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData as Employee);

            setSaveModalType('success');
            // Автоматически закрываем окно успеха через 1.5 сек
            setTimeout(() => {
                setShowSaveModal(false);
                setIsAddingNew(false);
                setErrors({});
                if (formData.id) setSelectedEmployee(formData.id);
            }, 1500);
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmSave = () => {
        performSave();
    };

    const updateField = (field: keyof Employee, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Валидация обязательных полей
    const [errors, setErrors] = useState<Record<string, string>>({});
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Личные данные
        if (!formData.lastName?.trim()) newErrors.lastName = 'Обязательное поле';
        if (!formData.firstName?.trim()) newErrors.firstName = 'Обязательное поле';
        if (!formData.email?.trim()) newErrors.email = 'Обязательное поле';
        if (!formData.phone?.trim()) newErrors.phone = 'Обязательное поле';

        // Документы
        if (!formData.hireDate) newErrors.hireDate = 'Обязательное поле';

        // Финансы
        if (!formData.percent && formData.percent !== '0') newErrors.percent = 'Обязательное поле';

        // Доступы
        if (!formData.role) newErrors.role = 'Выберите роль';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };



    // Если нет сотрудников и не в режиме добавления — показываем кнопку добавления
    if (!currentEmployee && !isAddingNew) {
        return (
            <div className="h-full flex gap-4">
                {/* Левая колонка — пустое состояние */}
                <div className="w-[70%] h-full flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-slate-600 mb-2">Нет сотрудников</h3>
                        <p className="text-sm text-slate-400 mb-4">Добавьте первого сотрудника</p>
                        <button
                            onClick={handleAddNew}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 mx-auto"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Добавить сотрудника
                        </button>
                    </div>
                </div>
                {/* Правая колонка — пустая */}
                <div className="w-[30%] flex flex-col">
                    <div className="bg-white rounded-lg border border-slate-200 flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Список пуст
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex gap-4">
                {/* Левая колонка — Форма (70%) */}
                <div className="w-[70%] h-full overflow-y-auto">
                    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3 text-xs h-full">

                        {/* Уведомление о сохранении */}
                        {saveMessage && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                                {saveMessage}
                            </div>
                        )}

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
                        <FormSection title="Личные данные">
                            <div className="flex gap-4">
                                {/* Фото */}
                                <EmployeeAvatar
                                    employeeId={formData.id}
                                    name={`${formData.lastName || ''} ${formData.firstName || ''}`}
                                    size="lg"
                                    editable={true}
                                />
                                {/* Поля ФИО */}
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                    <div>
                                        <Label required>Фамилия</Label>
                                        <Input
                                            value={formData.lastName || ''}
                                            onChange={(v) => updateField('lastName', v)}
                                            error={errors.lastName}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label required>Имя</Label>
                                        <Input
                                            value={formData.firstName || ''}
                                            onChange={(v) => updateField('firstName', v)}
                                            error={errors.firstName}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Отчество</Label>
                                        <Input
                                            value={formData.middleName || ''}
                                            onChange={(v) => updateField('middleName', v)}
                                        />
                                    </div>
                                    <div>
                                        <Label required>Email (логин)</Label>
                                        <EmailInput
                                            value={formData.email || ''}
                                            onChange={(v) => updateField('email', v)}
                                            error={errors.email}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label required>Телефон</Label>
                                        <PhoneInput
                                            value={formData.phone || ''}
                                            onChange={(v) => updateField('phone', v)}
                                            error={errors.phone}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Пароль</Label>
                                        <button className="w-full px-3 py-2 bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-slate-200 transition-colors">
                                            Сбросить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                        {/* ДОКУМЕНТЫ */}
                        <FormSection title="Документы">
                            <div className="grid grid-cols-4 gap-3 mb-3">
                                <div>
                                    <Label required>{empType === 'staff' ? 'Дата приёма' : 'Начало'}</Label>
                                    <Input
                                        type="date"
                                        value={formData.hireDate || ''}
                                        onChange={(v) => updateField('hireDate', v)}
                                        error={errors.hireDate}
                                        readOnly={isExisting}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>ИНН</Label>
                                    <INNInput
                                        value={formData.inn || ''}
                                        onChange={(v) => updateField('inn', v)}
                                        length={empType === 'ip' ? 12 : 10}
                                    />
                                </div>
                                {empType === 'staff' && (<>
                                    <div>
                                        <Label>Паспорт</Label>
                                        <PassportInput
                                            value={formData.passport || ''}
                                            onChange={(v) => updateField('passport', v)}
                                        />
                                    </div>
                                    <div>
                                        <Label>СНИЛС</Label>
                                        <SNILSInput
                                            value={formData.snils || ''}
                                            onChange={(v) => updateField('snils', v)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Тип работы</Label>
                                        <Select
                                            value={formData.workType || 'office'}
                                            onChange={(v) => updateField('workType', v)}
                                            options={[
                                                { value: 'office', label: 'В офисе' },
                                                { value: 'remote', label: 'Удалённо' }
                                            ]}
                                        />
                                    </div>
                                </>)}
                                {empType === 'ip' && (
                                    <div>
                                        <Label>ОГРНИП</Label>
                                        <Input
                                            value={formData.ogrnip || ''}
                                            onChange={(v) => updateField('ogrnip', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Документы сотрудника — серверное хранение */}
                            {formData.id && (
                                <ServerDocumentUpload
                                    entityType="employees"
                                    entityId={formData.id}
                                />
                            )}
                            {!formData.id && (
                                <div className="text-sm text-[var(--color-text-muted)] italic p-3 bg-[var(--color-bg-muted)] rounded-lg border border-dashed border-[var(--color-border)]">
                                    💡 Сохраните сотрудника, чтобы добавить документы
                                </div>
                            )}
                        </FormSection>

                        {/* ФИНАНСЫ */}
                        <FormSection title="Финансы">
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <Label>Банк</Label>
                                    <Input
                                        value={formData.bankName || ''}
                                        onChange={(v) => updateField('bankName', v)}
                                        placeholder="Сбербанк"
                                    />
                                </div>
                                <div>
                                    <Label>Р/с</Label>
                                    <BankAccountInput
                                        value={formData.bankAccount || ''}
                                        onChange={(v) => updateField('bankAccount', v)}
                                    />
                                </div>
                                {(empType === 'staff' || empType === 'selfemployed') && (
                                    <div>
                                        <Label>№ карты</Label>
                                        <CardNumberInput
                                            value={formData.cardNumber || ''}
                                            onChange={(v) => updateField('cardNumber', v)}
                                        />
                                    </div>
                                )}
                                {empType === 'ip' && (<>
                                    <div>
                                        <Label>БИК</Label>
                                        <BIKInput
                                            value={formData.bik || ''}
                                            onChange={(v) => updateField('bik', v)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Корр. счёт</Label>
                                        <CorrAccountInput
                                            value={formData.corrAccount || ''}
                                            onChange={(v) => updateField('corrAccount', v)}
                                        />
                                    </div>
                                </>)}
                                {empType === 'staff' && (
                                    <div>
                                        <Label>Оклад</Label>
                                        <SalaryInput
                                            value={formData.salary?.toString() || ''}
                                            onChange={(v) => updateField('salary', v)}
                                        />
                                    </div>
                                )}
                                <div>
                                    <Label required>Процент</Label>
                                    <PercentInput
                                        value={formData.percent?.toString() || ''}
                                        onChange={(v) => updateField('percent', v)}
                                        error={errors.percent}
                                        required
                                    />
                                </div>
                            </div>
                        </FormSection>

                        {/* ДОСТУПЫ */}
                        <FormSection title="Доступы">
                            <div className="flex items-end gap-6">
                                <div className="w-48">
                                    <Label required>Роль в системе</Label>
                                    <Select
                                        value={formData.role || ''}
                                        onChange={(v) => updateField('role', v)}
                                        placeholder="Выбрать..."
                                        options={[
                                            { value: 'admin', label: 'Администратор' },
                                            { value: 'accountant', label: 'Бухгалтер' },
                                            { value: 'assistant', label: 'Помощник бухгалтера' }
                                        ]}
                                        error={errors.role}
                                    />
                                </div>
                                <div className="flex gap-4 pb-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.isActive !== false}
                                            onChange={() => updateField('isActive', true)}
                                            className="w-4 h-4 text-[var(--color-success)]"
                                        />
                                        <span className="text-[var(--color-success)]">✓ Активен</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.isActive === false}
                                            onChange={() => updateField('isActive', false)}
                                            className="w-4 h-4 text-[var(--color-error)]"
                                        />
                                        <span className="text-[var(--color-error)]">⛔ Заблокирован</span>
                                    </label>
                                </div>
                            </div>
                        </FormSection>

                        {/* Кнопки */}
                        <div className="flex gap-3 pt-4 border-t border-[var(--color-border-light)]">
                            <button
                                onClick={handleSaveClick}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                            >
                                {isAddingNew ? 'Создать' : 'Сохранить'}
                            </button>
                            <button
                                onClick={() => { setIsAddingNew(false); setErrors({}); }}
                                className="px-4 py-2 bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] text-sm rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Отмена
                            </button>
                            {!isAddingNew && isExisting && currentEmployee && (
                                <button
                                    onClick={() => setShowDismissModal(true)}
                                    className="ml-auto px-4 py-2 bg-[var(--color-error-bg)] text-[var(--color-error)] text-sm rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    {empType === 'staff' ? 'Уволить' : 'Удалить'}
                                </button>
                            )}
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
                                            {saveModalType === 'confirm' && 'Обновление данных сотрудника'}
                                            {saveModalType === 'success' && 'Данные сотрудника сохранены'}
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
                                        <p className="mb-3">Вы уверены, что хотите сохранить карточку сотрудника?</p>
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">ФИО:</span>
                                                <span className="font-medium">{formData.lastName || '—'} {formData.firstName || ''}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Email:</span>
                                                <span className="font-medium">{formData.email || '—'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Тип:</span>
                                                <span className="font-medium">
                                                    {empType === 'staff' ? 'Штатный' : empType === 'selfemployed' ? 'Самозанятый' : 'ИП'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {saveModalType === 'success' && (
                                    <div className="text-center py-2">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <p className="text-sm text-slate-600">Карточка сотрудника успешно сохранена</p>
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

            {/* Модальное окно увольнения/удаления */}
            {currentEmployee && (
                <ArchiveConfirmModal
                    isOpen={showDismissModal}
                    onClose={() => setShowDismissModal(false)}
                    onConfirm={async () => {
                        setIsDismissing(true);
                        try {
                            // Архивируем вместо удаления
                            await archiveItem('employees', currentEmployee);
                            // Вызываем onDelete чтобы обновить состояние в родителе
                            await onDelete(currentEmployee);
                            setShowDismissModal(false);
                        } finally {
                            setIsDismissing(false);
                        }
                    }}
                    entityType={empType === 'staff' ? 'Сотрудник' : empType === 'selfemployed' ? 'Самозанятый' : 'ИП'}
                    entityName={`${currentEmployee.lastName || ''} ${currentEmployee.firstName || ''}`}
                    isLoading={isDismissing}
                />
            )}
        </>
    );
};


// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

interface StaffViewProps {
    employees?: Employee[];
    legalEntities?: LegalEntity[];
    onSave?: (emp: Employee) => void;
    onDelete?: (emp: Employee) => void;
    confirm?: (options: { title: string; message: string; confirmButtonText?: string }) => Promise<boolean>;
}

export const StaffView: React.FC<StaffViewProps> = ({ employees = [], legalEntities = [], onSave = () => { }, onDelete = () => { }, confirm }) => {
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
                {activeTab === 'list' && <StaffListTab employees={employees} legalEntities={legalEntities} onSelectEmployee={handleSelectEmployee} />}
                {activeTab === 'details' && <StaffDetailsTab employees={employees} employeeId={selectedEmployeeId} legalEntities={legalEntities} />}
                {activeTab === 'manage' && <StaffManageTab employees={employees} onSave={onSave} onDelete={onDelete} confirm={confirm} />}
            </div>
        </div>
    );
};

export default StaffView;
