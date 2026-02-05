// components/TasksView.tsx
// Новый модуль управления задачами с каскадной фильтрацией

import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, LegalEntity, Employee } from '../types';
import { MiniCalendar } from './MiniCalendar';
import { TaskCompletionModal } from './TaskCompletionModal';
import { ClientListModal } from './ClientListModal';
import { useTaskModal } from '../contexts/TaskModalContext';
import { getPriorityBarColor } from '../services/taskIndicators';

// ============================================
// ТИПЫ
// ============================================

// Сгруппированная задача (одинаковые задачи для разных клиентов)
interface GroupedTask {
    key: string;                  // Уникальный ключ группы
    baseTask: Task;               // Шаблон задачи для отображения
    clients: { id: string; name: string; taskId: string }[]; // Все клиенты и их taskId
    status: TaskStatus;           // Статус этой группы
}

interface TasksViewProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    employees: Employee[];
    onToggleComplete?: (taskId: string) => void;
    onDeleteTask?: (taskId: string) => void;
    onReassignTask?: (taskId: string, newAssigneeId: string | null) => void;
    onNavigateToClient?: (clientId: string) => void; // Переход на страницу клиента
    initialClientId?: string | null; // Для предустановки фильтра клиента
}

// Состояние фильтров
interface FilterState {
    selectedMonth: Date;
    selectedDay: Date | null; // null = весь месяц
    selectedEmployeeId: string | null; // null = все
    selectedClientId: string | null; // null = все
    showUnassigned: boolean;
}

// ============================================
// УТИЛИТЫ
// ============================================

// Локальная getStatusIcon остаётся для Task типа
// Для цвета приоритета используем общую getPriorityBarColor из taskIndicators

// Получить иконку статуса
const getStatusIcon = (task: Task): string => {
    // Выполнено
    if (task.status === TaskStatus.Completed) return '✅';

    // Заблокирована
    if (task.isBlocked) return '⏸️';

    // Проверяем дату
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Просрочена
    if (diffDays < 0) return '‼️';

    // Сегодня — срочная
    if (diffDays === 0) return '🔥';

    // Ручная срочная (установлена вручную)
    if (task.isUrgent) return '🔥';

    // Иначе — в работе
    return '🔵';
};

// Форматирование даты
const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

// Получить эффективного исполнителя задачи
// Если у задачи нет явной привязки (assignedTo), берём accountantId от клиента
const getEffectiveAssignee = (
    task: Task,
    clientMap: Map<string, LegalEntity>
): string | 'shared' | null => {
    // Если у задачи явно указан исполнитель — используем его
    if (task.assignedTo !== undefined) {
        return task.assignedTo;
    }

    // Иначе берём accountantId от клиента
    const client = clientMap.get(task.legalEntityId);
    return client?.accountantId || null;
};

// ============================================
// КОМПОНЕНТ СТРОКИ ЗАДАЧИ
// ============================================

interface TaskRowProps {
    task: Task;
    clientName?: string;
    assigneeName?: string;
    clientCount: number;
    employeeCount: number; // Количество сотрудников на задаче
    onComplete?: () => void;
    onDelete?: () => void;
    onReassign?: () => void;
    onMove?: () => void;
    onClientClick?: () => void;
    onEmployeeClick?: () => void;
    onTaskClick?: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
    task,
    clientName,
    assigneeName,
    clientCount,
    employeeCount,
    onComplete,
    onDelete,
    onReassign,
    onMove,
    onClientClick,
    onEmployeeClick,
    onTaskClick
}) => {
    // Используем общую функцию для цвета полосы приоритета
    const priorityClass = getPriorityBarColor({
        dueDate: task.dueDate,
        status: task.status === TaskStatus.Completed ? 'completed' : 'pending',
    });
    const statusIcon = getStatusIcon(task);
    const isCompleted = task.status === TaskStatus.Completed;
    const canMove = !task.isAutomatic || !task.isPeriodLocked;

    return (
        <div className={`flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
            {/* 1. ЦВЕТ — толстая полоска приоритета (18px) */}
            <div
                className={`rounded ${priorityClass}`}
                style={{ width: '18px', minHeight: '48px', alignSelf: 'stretch' }}
            />

            {/* 2. СТАТУС — иконка (🔥⏸️🔵✅) */}
            <div className="w-8 text-center text-lg flex-shrink-0">
                {statusIcon || '🔵'}
            </div>

            {/* 3. ТИП — 2 строки */}
            <div className="w-14 text-center flex-shrink-0 flex flex-col items-center justify-center">
                {/* Строка 1: Авто/Ручн с иконкой */}
                <div className="text-base">
                    {task.isAutomatic ? '🤖' : '✍️'}
                </div>
                {/* Строка 2: Цикл/Разовая */}
                <div className="text-sm">
                    {task.repeat !== 'none' ? '🔄' : '1️⃣'}
                </div>
            </div>

            {/* 4. НАЗВАНИЕ — 2 строки (разделяем по скобке) */}
            {(() => {
                // Парсим title: всё до первой '(' — строка 1, после — строка 2
                const parenIndex = task.title.indexOf('(');
                const mainTitle = parenIndex > 0 ? task.title.substring(0, parenIndex).trim() : task.title;
                const subTitle = parenIndex > 0 ? task.title.substring(parenIndex).trim() : null;

                return (
                    <div
                        className={`flex-1 min-w-0 flex flex-col justify-center cursor-pointer hover:text-primary ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}
                        onClick={onTaskClick}
                    >
                        {/* Строка 1: Основное название */}
                        <div className="text-sm font-medium leading-tight truncate">
                            {mainTitle}
                        </div>
                        {/* Строка 2: Скобки или период */}
                        <div className="text-xs text-slate-500 leading-tight truncate">
                            {subTitle || task.description || `за ${new Date(task.dueDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`}
                        </div>
                    </div>
                );
            })()}

            {/* 5. Клиенты — кликабельное число */}
            <div className="w-10 text-center flex-shrink-0">
                <button
                    onClick={onClientClick}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-primary/20 text-xs font-bold text-slate-600 hover:text-primary transition-colors"
                    title={clientName || 'Клиенты'}
                >
                    {clientCount}
                </button>
            </div>

            {/* 6. Исполнители — кликабельное число */}
            <div className="w-10 text-center flex-shrink-0">
                <button
                    onClick={onEmployeeClick}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${employeeCount === 0
                        ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                    title={assigneeName || 'Исполнители'}
                >
                    {employeeCount}
                </button>
            </div>

            {/* 7. ПЕРЕНАЗНАЧИТЬ — ↔️ */}
            <button
                onClick={onReassign}
                className="w-8 h-8 flex items-center justify-center text-lg text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
                title="Переназначить"
            >
                ↔️
            </button>

            {/* 8. Срок */}
            <div className="w-14 text-xs text-slate-700 text-center font-semibold flex-shrink-0">
                {formatDate(task.dueDate)}
            </div>

            {/* 9. Действия */}
            <div className="w-20 flex items-center justify-end gap-0.5 flex-shrink-0">
                {isCompleted ? (
                    <button
                        onClick={onComplete}
                        className="w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded transition-colors"
                        title="Вернуть в работу"
                    >
                        <span className="text-sm">↩️</span>
                    </button>
                ) : (
                    <button
                        onClick={onComplete}
                        className="w-6 h-6 flex items-center justify-center text-green-500 hover:bg-green-100 rounded transition-colors"
                        title="Выполнить"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                )}
                <button
                    disabled
                    className="w-6 h-6 flex items-center justify-center text-slate-300 cursor-not-allowed rounded transition-colors flex-shrink-0"
                    title="Удаление временно отключено — в разработке"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
                {canMove && !isCompleted && (
                    <button
                        onClick={onMove}
                        className="w-6 h-6 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded transition-colors"
                        title="Перенести"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================
// КОМПОНЕНТ ЛЕГЕНДЫ
// ============================================

const TaskLegend: React.FC = () => (
    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200">
        {/* Цвета */}
        <div className="flex items-center gap-1">
            <span className="text-[9px] font-semibold text-slate-500 mr-1">ЦВЕТ:</span>
            <div className="flex flex-col items-center w-12">
                <span className="w-4 h-4 rounded bg-sky-400"></span>
                <span className="text-[8px] text-slate-500">5-7 дн</span>
            </div>
            <div className="flex flex-col items-center w-12">
                <span className="w-4 h-4 rounded bg-green-500"></span>
                <span className="text-[8px] text-slate-500">2-4 дн</span>
            </div>
            <div className="flex flex-col items-center w-14">
                <span className="w-4 h-4 rounded bg-yellow-300"></span>
                <span className="text-[8px] text-slate-500">1-сегодня</span>
            </div>
            <div className="flex flex-col items-center w-12">
                <span className="w-4 h-4 rounded bg-red-500"></span>
                <span className="text-[8px] text-slate-500">Проср.</span>
            </div>
        </div>

        {/* Статусы */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-3">
            <span className="text-[9px] font-semibold text-slate-500 mr-1">СТАТУС:</span>
            <div className="flex flex-col items-center w-10">
                <span className="text-sm">‼️</span>
                <span className="text-[8px] text-slate-500">Проср.</span>
            </div>
            <div className="flex flex-col items-center w-10">
                <span className="text-sm">🔥</span>
                <span className="text-[8px] text-slate-500">Срочн.</span>
            </div>
            <div className="flex flex-col items-center w-12">
                <span className="text-sm">🔵</span>
                <span className="text-[8px] text-slate-500">В работе</span>
            </div>
            <div className="flex flex-col items-center w-10">
                <span className="text-sm">⏸️</span>
                <span className="text-[8px] text-slate-500">Ожид.</span>
            </div>
            <div className="flex flex-col items-center w-10">
                <span className="text-sm">✅</span>
                <span className="text-[8px] text-slate-500">Готово</span>
            </div>
        </div>
    </div>
);

// ============================================
// КОМПОНЕНТ ФИЛЬТРА СПИСКА
// ============================================

interface FilterListProps {
    title: string;
    items: { id: string; name: string; count: number }[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    showAllButton?: boolean;
    showUnassignedButton?: boolean;
    isUnassignedActive?: boolean;
    onUnassignedClick?: () => void;
}

const FilterList: React.FC<FilterListProps> = ({
    title,
    items,
    selectedId,
    onSelect,
    showAllButton = true,
    showUnassignedButton = false,
    isUnassignedActive = false,
    onUnassignedClick
}) => (
    <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</div>
        <div className="flex flex-wrap gap-1 mb-2">
            {showAllButton && (
                <button
                    onClick={() => onSelect(null)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${selectedId === null && !isUnassignedActive
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Все
                </button>
            )}
            {showUnassignedButton && (
                <button
                    onClick={onUnassignedClick}
                    className={`px-2 py-1 text-xs rounded transition-colors ${isUnassignedActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Нераспред.
                </button>
            )}
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
            {items.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">Нет данных</div>
            ) : (
                items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex justify-between items-center ${selectedId === item.id
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-white border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <span className="truncate">{item.name}</span>
                        <span className="text-slate-400 ml-2">({item.count})</span>
                    </button>
                ))
            )}
        </div>
    </div>
);

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

export const TasksView: React.FC<TasksViewProps> = ({
    tasks,
    legalEntities,
    employees,
    onToggleComplete,
    onDeleteTask,
    onReassignTask,
    onNavigateToClient,
    initialClientId
}) => {
    const { openTaskModal } = useTaskModal();

    // Состояние фильтров
    const [filters, setFilters] = useState<FilterState>({
        selectedMonth: new Date(),
        selectedDay: null,
        selectedEmployeeId: null,
        selectedClientId: initialClientId || null,
        showUnassigned: false
    });

    // Карты для быстрого доступа
    const clientMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    // Фильтрация задач по месяцу
    const tasksInMonth = useMemo(() => {
        const year = filters.selectedMonth.getFullYear();
        const month = filters.selectedMonth.getMonth();

        return tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate.getFullYear() === year && taskDate.getMonth() === month;
        });
    }, [tasks, filters.selectedMonth]);

    // Фильтрация по дню (если выбран)
    const tasksFiltered = useMemo(() => {
        let result = tasksInMonth;

        // Фильтр по дню
        if (filters.selectedDay) {
            const day = filters.selectedDay.getDate();
            result = result.filter(task => new Date(task.dueDate).getDate() === day);
        }

        // Фильтр по нераспределённым
        if (filters.showUnassigned) {
            result = result.filter(task => !getEffectiveAssignee(task, clientMap));
        } else {
            // Фильтр по сотруднику
            if (filters.selectedEmployeeId) {
                result = result.filter(task => getEffectiveAssignee(task, clientMap) === filters.selectedEmployeeId);
            }

            // Фильтр по клиенту
            if (filters.selectedClientId) {
                result = result.filter(task => task.legalEntityId === filters.selectedClientId);
            }
        }

        // Сортировка: сначала незавершённые, потом по дате
        return result.sort((a, b) => {
            if (a.status === TaskStatus.Completed && b.status !== TaskStatus.Completed) return 1;
            if (a.status !== TaskStatus.Completed && b.status === TaskStatus.Completed) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [tasksInMonth, filters]);

    // Группировка задач по title + dueDate + type + status
    const groupedTasks = useMemo((): GroupedTask[] => {
        const groups = new Map<string, GroupedTask>();

        tasksFiltered.forEach(task => {
            const client = clientMap.get(task.legalEntityId);
            if (!client) return;

            // Ключ группы: title + dueDate + isAutomatic + status
            const dueDateStr = new Date(task.dueDate).toDateString();
            const groupKey = `${task.title}|${dueDateStr}|${task.isAutomatic}|${task.status}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    baseTask: task,
                    clients: [],
                    status: task.status
                });
            }

            groups.get(groupKey)!.clients.push({
                id: client.id,
                name: client.name,
                taskId: task.id
            });
        });

        return Array.from(groups.values());
    }, [tasksFiltered, clientMap]);

    // Задачи для календаря (маркеры на днях)
    const calendarTasks = useMemo(() => {
        return tasksInMonth.map(t => ({
            id: t.id,
            title: t.title,
            dueDate: new Date(t.dueDate),
            status: t.status,
            clientId: t.legalEntityId
        }));
    }, [tasksInMonth]);

    // Состояние модального окна выполнения
    const [completionModal, setCompletionModal] = useState<{
        isOpen: boolean;
        groupKey: string;
        clients: { id: string; name: string; taskId: string }[];
        taskTitle: string;
    } | null>(null);

    // Обработчик клика на "Выполнить"
    const handleCompleteClick = (group: GroupedTask) => {
        if (group.clients.length === 1) {
            // Один клиент — выполняем сразу
            onToggleComplete?.(group.clients[0].taskId);
        } else {
            // Несколько клиентов — открываем модалку
            setCompletionModal({
                isOpen: true,
                groupKey: group.key,
                clients: group.clients,
                taskTitle: group.baseTask.title
            });
        }
    };

    // Обработчик подтверждения выполнения
    const handleCompletionConfirm = (selectedClientIds: string[]) => {
        if (!completionModal) return;

        // Находим taskId для каждого выбранного клиента
        completionModal.clients
            .filter(c => selectedClientIds.includes(c.id))
            .forEach(c => {
                onToggleComplete?.(c.taskId);
            });

        setCompletionModal(null);
    };

    // Состояние модального окна списка клиентов
    const [clientListModal, setClientListModal] = useState<{
        isOpen: boolean;
        clients: { id: string; name: string }[];
        taskTitle: string;
    } | null>(null);

    // Обработчик клика на количество клиентов
    const handleClientCountClick = (group: GroupedTask) => {
        setClientListModal({
            isOpen: true,
            clients: group.clients.map(c => ({ id: c.id, name: c.name })),
            taskTitle: group.baseTask.title
        });
    };

    // Обработчик клика на клиента в модалке — переход на страницу клиента
    const handleClientNavigate = (clientId: string) => {
        setClientListModal(null);
        onNavigateToClient?.(clientId);
    };

    // Список сотрудников с задачами в этом месяце
    const employeesWithTasks = useMemo(() => {
        const counts = new Map<string, number>();

        tasksInMonth.forEach(task => {
            const effectiveAssignee = getEffectiveAssignee(task, clientMap);
            if (effectiveAssignee && effectiveAssignee !== 'shared') {
                counts.set(effectiveAssignee, (counts.get(effectiveAssignee) || 0) + 1);
            }
        });

        return Array.from(counts.entries())
            .map(([id, count]) => {
                const emp = employeeMap.get(id);
                return emp ? { id, name: `${emp.lastName} ${emp.firstName}`, count } : null;
            })
            .filter(Boolean) as { id: string; name: string; count: number }[];
    }, [tasksInMonth, employeeMap]);

    // Список клиентов с задачами (с учётом выбранного сотрудника)
    const clientsWithTasks = useMemo(() => {
        let relevantTasks = tasksInMonth;

        // Если выбран сотрудник, показываем только его клиентов
        if (filters.selectedEmployeeId) {
            relevantTasks = tasksInMonth.filter(t => getEffectiveAssignee(t, clientMap) === filters.selectedEmployeeId);
        }

        const counts = new Map<string, number>();

        relevantTasks.forEach(task => {
            counts.set(task.legalEntityId, (counts.get(task.legalEntityId) || 0) + 1);
        });

        return Array.from(counts.entries())
            .map(([id, count]) => {
                const client = clientMap.get(id);
                return client ? { id, name: client.name, count } : null;
            })
            .filter(Boolean) as { id: string; name: string; count: number }[];
    }, [tasksInMonth, clientMap, filters.selectedEmployeeId]);

    // Обработчики
    const handleMonthChange = (date: Date) => {
        setFilters(prev => ({
            ...prev,
            selectedMonth: date,
            selectedDay: null // Сброс выбранного дня
        }));
    };

    const handleDayClick = (date: Date) => {
        setFilters(prev => ({
            ...prev,
            selectedDay: prev.selectedDay?.getDate() === date.getDate() ? null : date
        }));
    };

    const handleMonthNameClick = () => {
        setFilters(prev => ({ ...prev, selectedDay: null }));
    };

    const handleEmployeeSelect = (id: string | null) => {
        setFilters(prev => ({
            ...prev,
            selectedEmployeeId: id,
            selectedClientId: null, // Сброс клиента при смене сотрудника
            showUnassigned: false
        }));
    };

    const handleClientSelect = (id: string | null) => {
        setFilters(prev => ({
            ...prev,
            selectedClientId: id,
            showUnassigned: false
        }));
    };

    const handleUnassignedClick = () => {
        setFilters(prev => ({
            ...prev,
            showUnassigned: !prev.showUnassigned,
            selectedEmployeeId: null,
            selectedClientId: null
        }));
    };

    // Подсчёт нераспределённых
    const unassignedCount = useMemo(() =>
        tasksInMonth.filter(t => !getEffectiveAssignee(t, clientMap)).length
        , [tasksInMonth, clientMap]);

    return (
        <>
            <div className="h-full flex gap-4">
                {/* Левая колонка — Список задач (70%) */}
                <div className="w-[70%] h-full flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
                    {/* Заголовок */}
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">
                                    Задачи на {filters.selectedMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                                    {filters.selectedDay && ` • ${filters.selectedDay.getDate()} число`}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Всего задач: {tasksFiltered.length}
                                    {filters.selectedEmployeeId && ` • ${employeeMap.get(filters.selectedEmployeeId)?.lastName || ''}`}
                                    {filters.selectedClientId && ` • ${clientMap.get(filters.selectedClientId)?.name || ''}`}
                                    {filters.showUnassigned && ' • Без назначения'}
                                </p>
                            </div>
                            <button className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2">
                                <span className="text-lg">+</span>
                                Добавить задачу
                            </button>
                        </div>
                    </div>

                    {/* Заголовок таблицы */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        <div style={{ width: '18px' }}></div>
                        <div className="w-8 text-center">Статус</div>
                        <div className="w-14 text-center">Тип</div>
                        <div className="flex-1">Задача</div>
                        <div className="w-10 text-center">Клиент</div>
                        <div className="w-10 text-center">Исполн.</div>
                        <div className="w-8"></div>
                        <div className="w-14 text-center">Срок</div>
                        <div className="w-20 text-center">Действия</div>
                    </div>

                    {/* Список задач */}
                    <div className="flex-1 overflow-y-auto">
                        {groupedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="text-4xl mb-3">📋</div>
                                <p className="text-sm">Задач нет</p>
                                <p className="text-xs">Попробуйте изменить фильтры</p>
                            </div>
                        ) : (
                            groupedTasks.map(group => {
                                const effectiveAssignee = getEffectiveAssignee(group.baseTask, clientMap);
                                const assignee = effectiveAssignee && effectiveAssignee !== 'shared'
                                    ? employeeMap.get(effectiveAssignee)
                                    : null;

                                // Передаём эффективную привязку в task для TaskRow
                                const taskWithAssignee = { ...group.baseTask, assignedTo: effectiveAssignee };

                                return (
                                    <TaskRow
                                        key={group.key}
                                        task={taskWithAssignee}
                                        clientName={group.clients.map(c => c.name).join(', ')}
                                        assigneeName={assignee ? `${assignee.lastName} ${assignee.firstName}` : undefined}
                                        clientCount={group.clients.length}
                                        employeeCount={effectiveAssignee ? 1 : 0}
                                        onComplete={() => handleCompleteClick(group)}
                                        onDelete={() => {
                                            // Удаляем все задачи в группе
                                            group.clients.forEach(c => onDeleteTask?.(c.taskId));
                                        }}
                                        onReassign={() => console.log('Reassign group:', group.key)}
                                        onMove={() => console.log('Move group:', group.key)}
                                        onClientClick={() => handleClientCountClick(group)}
                                        onEmployeeClick={() => console.log('Employee:', effectiveAssignee)}
                                        onTaskClick={() => openTaskModal({
                                            id: group.baseTask.id,
                                            title: group.baseTask.title,
                                            description: group.baseTask.description,
                                            fullDescription: group.baseTask.fullDescription,
                                            legalBasis: group.baseTask.legalBasis,
                                            clientName: group.clients.map(c => c.name).join(', '),
                                            dueDate: group.baseTask.dueDate,
                                            status: group.baseTask.status,
                                        })}
                                    />
                                );
                            })
                        )}
                    </div>

                    {/* Легенда (фиксированная внизу) */}
                    <TaskLegend />
                </div>

                {/* Правая колонка — Фильтры */}
                <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                    {/* MiniCalendar */}
                    <MiniCalendar
                        tasks={calendarTasks}
                        selectedDate={filters.selectedMonth}
                        onDateChange={handleMonthChange}
                        onDayClick={handleDayClick}
                        highlightedDay={filters.selectedDay?.getDate()}
                        onShowFullMonth={handleMonthNameClick}
                    />

                    {/* Клиенты */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-0 overflow-hidden">
                        <FilterList
                            title="👥 Клиенты"
                            items={clientsWithTasks}
                            selectedId={filters.selectedClientId}
                            onSelect={handleClientSelect}
                        />
                    </div>

                    {/* Персонал */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-0 overflow-hidden">
                        <FilterList
                            title="👤 Персонал"
                            items={employeesWithTasks}
                            selectedId={filters.selectedEmployeeId}
                            onSelect={handleEmployeeSelect}
                            showUnassignedButton={true}
                            isUnassignedActive={filters.showUnassigned}
                            onUnassignedClick={handleUnassignedClick}
                        />
                        {unassignedCount > 0 && !filters.showUnassigned && (
                            <p className="text-xs text-orange-500 mt-2">
                                ⚠️ Нераспределённых: {unassignedCount}
                            </p>
                        )}
                    </div>
                </div>
            </div >

            {/* Модальное окно выполнения задач */}
            {
                completionModal && (
                    <TaskCompletionModal
                        isOpen={completionModal.isOpen}
                        onClose={() => setCompletionModal(null)}
                        onConfirm={handleCompletionConfirm}
                        clients={completionModal.clients}
                        taskTitle={completionModal.taskTitle}
                    />
                )
            }

            {/* Модальное окно списка клиентов */}
            {
                clientListModal && (
                    <ClientListModal
                        isOpen={clientListModal.isOpen}
                        onClose={() => setClientListModal(null)}
                        onClientClick={handleClientNavigate}
                        clients={clientListModal.clients}
                        taskTitle={clientListModal.taskTitle}
                    />
                )
            }
        </>
    );
};

export default TasksView;
