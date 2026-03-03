// components/CalendarTab.tsx
// Вкладка «Календарь» — 5 режимов: День, Неделя, Месяц, Квартал, Год

import React, { useState, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Task, TaskStatus, LegalEntity, Employee } from '../types';
import { useTaskModal } from '../contexts/TaskModalContext';
import { getDateProps } from '../services/dateRegistry';
import { getCalendarDayColor } from '../services/taskIndicators';
import { getPriorityBarColor } from '../services/taskIndicators';
import { canCompleteTask, isTaskLocked, getBlockingPredecessor } from '../services/taskGenerator';

// ============================================
// ТИПЫ
// ============================================

type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface CalendarTabProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    employees: Employee[];
    onAddTask?: (prefillDate: Date) => void;
}

// Состояние модалки дня
interface DayModalState {
    isOpen: boolean;
    date: Date;
    tasks: Task[];
}

// Утилиты
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const toDateKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

const getQuarter = (d: Date): number => Math.floor(d.getMonth() / 3);

// Получить эффективного исполнителя
const getEffectiveAssignee = (task: Task, clientMap: Map<string, LegalEntity>): string | null => {
    if (task.assignedTo !== undefined) return task.assignedTo;
    const client = clientMap.get(task.legalEntityId);
    return client?.accountantId || null;
};

// ============================================
// КОМПАКТНАЯ СТРОКА ЗАДАЧИ (для всех режимов)
// ============================================

interface CompactTaskRowProps {
    title: string;
    clientCount: number;
    assigneeName: string;
    statusIcon: string;
    dueDate?: string;
    onClick: () => void;
}

const CompactTaskRow: React.FC<CompactTaskRowProps> = ({ title, clientCount, assigneeName, statusIcon, dueDate, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-indigo-50 cursor-pointer transition-colors text-xs group"
    >
        <span className="text-[10px]">{statusIcon}</span>
        <span className="flex-1 truncate text-slate-700 group-hover:text-indigo-700 font-medium">{title}</span>
        {dueDate && <span className="text-slate-400 text-[10px] shrink-0">{dueDate}</span>}
        {clientCount > 1 && (
            <span className="bg-indigo-100 text-indigo-600 rounded-full px-1.5 text-[10px] font-semibold shrink-0">{clientCount}</span>
        )}
        {assigneeName && (
            <span className="text-slate-400 text-[10px] truncate max-w-16 shrink-0">{assigneeName}</span>
        )}
    </div>
);

// ============================================
// ПОЛНАЯ СТРОКА ЗАДАЧИ (для режима «День»)
// ============================================

interface DayTaskRowProps {
    task: Task;
    clientName: string;
    assigneeName: string;
    statusIcon: string;
    clientCount: number;
    onClick: () => void;
}

const DayTaskRow: React.FC<DayTaskRowProps> = ({ task, clientName, assigneeName, statusIcon, clientCount, onClick }) => {
    const priorityColor = getPriorityBarColor({
        dueDate: task.dueDate,
        status: task.status,
        isBlocked: task.isBlocked,
    });

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors group"
        >
            <div className={`w-1 h-8 rounded-full shrink-0 ${priorityColor}`} />
            <span className="text-sm shrink-0">{statusIcon}</span>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate">{task.title}</div>
                <div className="text-xs text-slate-400 truncate">{clientName}</div>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
                {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </span>
            {clientCount > 1 && (
                <span className="bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 text-xs font-semibold shrink-0">{clientCount}</span>
            )}
            {assigneeName && (
                <span className="text-xs text-slate-400 shrink-0 max-w-20 truncate">{assigneeName}</span>
            )}
        </div>
    );
};

// ============================================
// HOVER BADGE — бейдж с фиксированным тултипом
// ============================================

const HoverBadge: React.FC<{
    icon: string; count: number; label: string; names: string[]; colorClass: string;
}> = ({ icon, count, label, names, colorClass }) => {
    const ref = React.useRef<HTMLSpanElement>(null);
    const tooltipRef = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pos) { setPos(null); return; }
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ top: r.top - 6, left: r.right });
    };

    // Закрытие при клике вне
    React.useEffect(() => {
        if (!pos) return;
        const handler = (e: MouseEvent) => {
            if (ref.current?.contains(e.target as Node)) return;
            if (tooltipRef.current?.contains(e.target as Node)) return;
            setPos(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pos]);

    return (
        <span ref={ref} onClick={toggle} className="relative cursor-pointer">
            <span className={`${colorClass} rounded-full px-1.5 py-0.5 text-[10px] font-semibold`}>
                {icon} {count}
            </span>
            {pos && ReactDOM.createPortal(
                <div
                    ref={tooltipRef}
                    className="fixed z-[9999] bg-slate-800 text-white text-[12px] rounded-lg px-3 py-2.5 shadow-2xl whitespace-nowrap"
                    style={{ top: pos.top, left: pos.left, transform: 'translate(-100%, -100%)' }}
                >
                    <div className="text-[10px] text-slate-400 font-semibold mb-1">{label}:</div>
                    {names.map((n, i) => (
                        <div key={i} className="py-0.5 text-[11px]">{n}</div>
                    ))}
                </div>,
                document.body
            )}
        </span>
    );
};

// ============================================
// СЕТКА МЕСЯЦА (для Месяц/Квартал/Год)
// ============================================

interface MonthGridProps {
    year: number;
    month: number;
    tasks: Task[];
    size: 'large' | 'medium' | 'small';
    showTaskCount?: boolean;
    onDayClick?: (date: Date, dayTasks: Task[]) => void;
    onTaskClick: (task: Task) => void;
    clientMap: Map<string, LegalEntity>;
    employeeMap: Map<string, Employee>;
}

const MonthGrid: React.FC<MonthGridProps> = ({ year, month, tasks, size, showTaskCount, onDayClick, onTaskClick, clientMap, employeeMap }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Группировка задач по дням
    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(t => {
            const d = new Date(t.dueDate);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const key = toDateKey(d);
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(t);
            }
        });
        return map;
    }, [tasks, year, month]);

    // Генерация дней
    const monthStart = new Date(year, month, 1);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    const monthEnd = new Date(year, month + 1, 0);
    const endDate = new Date(monthEnd);
    if (endDate.getDay() !== 0) endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));

    const days: Date[] = [];
    let d = new Date(startDate);
    while (d <= endDate) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }

    const todayKey = toDateKey(today);

    // Группировка задач по title для компактного показа
    const groupTasksForDay = (dayTasks: Task[]) => {
        const groups = new Map<string, { task: Task; count: number }>();
        dayTasks.forEach(t => {
            const key = t.title;
            if (!groups.has(key)) groups.set(key, { task: t, count: 0 });
            groups.get(key)!.count++;
        });
        return Array.from(groups.values());
    };

    const getStatusIcon = (task: Task): string => {
        if (task.status === TaskStatus.Completed) return '✅';
        if (task.isBlocked) return '⏸️';
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return '‼️';
        if (diff === 0) return '🔥';
        return '🔵';
    };

    const maxVisible = size === 'large' ? 4 : size === 'medium' ? 2 : 0;

    return (
        <div className={`${size === 'small' ? '' : 'bg-white rounded-lg border border-slate-200 overflow-hidden'}`}>
            {/* Заголовок месяца (для medium/small) */}
            {size !== 'large' && (
                <div className={`text-center font-semibold ${size === 'medium' ? 'text-sm py-2 bg-slate-50 border-b border-slate-200' : 'text-xs py-1 text-slate-600'}`}>
                    {MONTHS[month]} {size === 'small' && year}
                </div>
            )}

            {/* Дни недели */}
            <div className="grid grid-cols-7">
                {WEEKDAYS.map((wd, i) => (
                    <div key={i} className={`text-center font-medium border-b border-slate-100 ${size === 'large' ? 'text-xs py-1.5 text-slate-500' : 'text-[9px] py-0.5'} ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>
                        {wd}
                    </div>
                ))}
            </div>

            {/* Сетка */}
            <div className="grid grid-cols-7">
                {days.map((day, i) => {
                    const key = toDateKey(day);
                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = key === todayKey;
                    const dateProps = getDateProps(day);
                    const isNonWorkday = !dateProps.isWorkday;
                    const dayTasks = tasksByDate.get(key) || [];
                    const hasTask = dayTasks.length > 0;
                    const taskColor = getCalendarDayColor(dayTasks, day);
                    const grouped = groupTasksForDay(dayTasks);

                    if (size === 'small') {
                        // Компактный вид: числа с точками и опционально цифрой-кол-вом
                        return (
                            <div
                                key={i}
                                className={`
                                    aspect-square flex flex-col items-center justify-center text-[9px] relative cursor-pointer
                                    ${!isCurrentMonth ? 'text-slate-200' : ''}
                                    ${isToday ? 'bg-indigo-600 text-white rounded-sm font-bold' : ''}
                                    ${isCurrentMonth && isNonWorkday && !isToday ? 'text-red-400' : ''}
                                    ${isCurrentMonth && !isToday ? 'hover:bg-slate-100' : ''}
                                `}
                                onClick={(e) => { e.stopPropagation(); isCurrentMonth && onDayClick?.(day, dayTasks); }}
                            >
                                <span>{day.getDate()}</span>
                                {hasTask && isCurrentMonth && (
                                    <>
                                        <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 rounded-full ${isToday ? 'bg-white' : taskColor}`} />
                                        {showTaskCount && (
                                            <span className={`absolute -top-0.5 -right-0.5 text-[7px] font-bold leading-none px-0.5 rounded-sm ${isToday ? 'text-indigo-200' : 'text-indigo-500'}`}>
                                                {dayTasks.length}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    }

                    if (size === 'medium') {
                        // Квартальный вид: числа + 1-2 задачи
                        return (
                            <div
                                key={i}
                                className={`
                                    min-h-[48px] border-b border-r border-slate-100 p-0.5
                                    ${!isCurrentMonth ? 'bg-slate-50/50' : ''}
                                    ${isToday ? 'bg-indigo-50' : ''}
                                    ${isCurrentMonth && isNonWorkday ? 'bg-red-50/30' : ''}
                                `}
                                onClick={() => isCurrentMonth && onDayClick?.(day, dayTasks)}
                            >
                                <div className={`text-[10px] font-medium mb-0.5 ${!isCurrentMonth ? 'text-slate-300' : isToday ? 'text-indigo-600 font-bold' : isNonWorkday ? 'text-red-400' : 'text-slate-600'}`}>
                                    {day.getDate()}
                                </div>
                                {isCurrentMonth && grouped.slice(0, maxVisible).map((g, gi) => (
                                    <div
                                        key={gi}
                                        onClick={(e) => { e.stopPropagation(); onTaskClick(g.task); }}
                                        className="text-[9px] text-slate-600 truncate hover:text-indigo-600 cursor-pointer leading-tight"
                                    >
                                        {g.task.title.substring(0, 12)}{g.count > 1 ? ` (${g.count})` : ''}
                                    </div>
                                ))}
                                {isCurrentMonth && grouped.length > maxVisible && (
                                    <div className="text-[8px] text-slate-400">+{grouped.length - maxVisible}</div>
                                )}
                            </div>
                        );
                    }

                    // Large (месячный вид): полноразмерные ячейки
                    return (
                        <div
                            key={i}
                            className={`
                                min-h-[90px] border-b border-r border-slate-100 p-1 cursor-pointer
                                ${!isCurrentMonth ? 'bg-slate-50/50' : ''}
                                ${isToday ? 'bg-indigo-50' : ''}
                                ${isCurrentMonth && isNonWorkday ? 'bg-red-50/30' : ''}
                            `}
                            onClick={() => isCurrentMonth && onDayClick?.(day, dayTasks)}
                        >
                            <div className={`text-xs font-medium mb-1 ${!isCurrentMonth ? 'text-slate-300' : isToday ? 'text-indigo-600 font-bold' : isNonWorkday ? 'text-red-400' : 'text-slate-600'}`}>
                                {day.getDate()}
                            </div>
                            {isCurrentMonth && (
                                <div className="space-y-0.5">
                                    {grouped.slice(0, maxVisible).map((g, gi) => {
                                        const assigneeId = getEffectiveAssignee(g.task, clientMap);
                                        const emp = assigneeId ? employeeMap.get(assigneeId) : null;
                                        const assigneeName = emp ? `${emp.lastName?.charAt(0) || ''}${emp.firstName?.charAt(0) || ''}` : '';
                                        return (
                                            <CompactTaskRow
                                                key={gi}
                                                title={g.task.title}
                                                clientCount={g.count}
                                                assigneeName={assigneeName}
                                                statusIcon={getStatusIcon(g.task)}
                                                onClick={() => { /* task click handled via modal */ }}
                                            />
                                        );
                                    })}
                                    {grouped.length > maxVisible && (
                                        <div className="text-[10px] text-slate-400 px-2">+{grouped.length - maxVisible} ещё</div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// НАВИГАЦИЯ ПО ПЕРИОДАМ
// ============================================

interface PeriodNavProps {
    viewMode: ViewMode;
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

const PeriodNav: React.FC<PeriodNavProps> = ({ viewMode, currentDate, onPrev, onNext, onToday }) => {
    const getLabel = (): string => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        switch (viewMode) {
            case 'day':
                return currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            case 'week': {
                const mondayDate = getMonday(currentDate);
                const sunday = new Date(mondayDate);
                sunday.setDate(sunday.getDate() + 6);
                return `${mondayDate.getDate()} ${MONTHS_SHORT[mondayDate.getMonth()]} — ${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]} ${y}`;
            }
            case 'month':
                return `${MONTHS[m]} ${y}`;
            case 'quarter':
                return `${getQuarter(currentDate) + 1}-й квартал ${y}`;
            case 'year':
                return `${y} год`;
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={onPrev} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700" title="Назад">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={onToday} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                Сегодня
            </button>
            <button onClick={onNext} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700" title="Вперёд">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <span className="text-sm font-semibold text-slate-800 ml-1">{getLabel()}</span>
        </div>
    );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

export const CalendarTab: React.FC<CalendarTabProps> = ({ tasks, legalEntities, employees, onAddTask }) => {
    const { openTaskModal } = useTaskModal();

    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    // Модалка дня
    const [dayModal, setDayModal] = useState<DayModalState>({ isOpen: false, date: new Date(), tasks: [] });

    const openDayModal = useCallback((date: Date, dayTasks: Task[]) => {
        setDayModal({ isOpen: true, date, tasks: dayTasks });
    }, []);

    const closeDayModal = useCallback(() => {
        setDayModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const clientMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    // Фильтрация задач по клиенту/сотруднику
    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (selectedClientId) {
            result = result.filter(t => t.legalEntityId === selectedClientId);
        }
        if (selectedEmployeeId) {
            result = result.filter(t => getEffectiveAssignee(t, clientMap) === selectedEmployeeId);
        }
        return result;
    }, [tasks, selectedClientId, selectedEmployeeId, clientMap]);

    // Навигация
    const navigate = useCallback((direction: -1 | 0 | 1) => {
        if (direction === 0) { setCurrentDate(new Date()); return; }
        setCurrentDate(prev => {
            const d = new Date(prev);
            switch (viewMode) {
                case 'day': d.setDate(d.getDate() + direction); break;
                case 'week': d.setDate(d.getDate() + 7 * direction); break;
                case 'month': d.setMonth(d.getMonth() + direction); break;
                case 'quarter': d.setMonth(d.getMonth() + 3 * direction); break;
                case 'year': d.setFullYear(d.getFullYear() + direction); break;
            }
            return d;
        });
    }, [viewMode]);

    // Открытие модалки задачи
    const handleTaskClick = useCallback((task: Task) => {
        const client = clientMap.get(task.legalEntityId);
        const allSeriesTaskIds = task.seriesId
            ? tasks.filter(t => t.seriesId === task.seriesId).map(t => t.id)
            : (task.repeat !== 'none'
                ? tasks.filter(t =>
                    !t.isAutomatic &&
                    t.repeat === task.repeat &&
                    t.legalEntityId === task.legalEntityId &&
                    t.title === task.title &&
                    (t.ruleId || '') === (task.ruleId || '')
                ).map(t => t.id)
                : [task.id]);
        openTaskModal({
            id: task.id,
            title: task.title,
            description: task.description,
            fullDescription: task.fullDescription,
            legalBasis: task.legalBasis,
            clientName: client?.name || task.legalEntityId,
            dueDate: task.dueDate,
            status: task.status,
            isBlocked: task.isBlocked,
            isCompleted: task.status === TaskStatus.Completed,
            isAutomatic: task.isAutomatic,
            ruleId: task.ruleId,
            isFloating: task.isFloating,
            repeat: task.repeat,
            seriesId: task.seriesId,
            legalEntityId: task.legalEntityId,
            taskIds: [task.id],
            allSeriesTaskIds,
        });
    }, [clientMap, openTaskModal, tasks]);

    // Иконка статуса
    const getStatusIcon = (task: Task): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (task.status === TaskStatus.Completed) return '✅';
        if (task.isBlocked) return '⏸️';
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return '‼️';
        if (diff === 0) return '🔥';
        return '🔵';
    };

    // Группировка задач по title (для компактного показа)
    const groupTasks = (tasksArr: Task[]) => {
        const groups = new Map<string, { task: Task; clients: string[]; count: number }>();
        tasksArr.forEach(t => {
            const key = `${t.title}|${toDateKey(new Date(t.dueDate))}`;
            if (!groups.has(key)) groups.set(key, { task: t, clients: [], count: 0 });
            const g = groups.get(key)!;
            g.clients.push(t.legalEntityId);
            g.count++;
        });
        return Array.from(groups.values());
    };

    // ============ РЕНДЕР РЕЖИМОВ ============

    // ДЕНЬ
    const renderDay = () => {
        const dayTasks = filteredTasks.filter(t => {
            const d = new Date(t.dueDate);
            return isSameDay(d, currentDate);
        }).sort((a, b) => {
            if (a.status === TaskStatus.Completed && b.status !== TaskStatus.Completed) return 1;
            if (a.status !== TaskStatus.Completed && b.status === TaskStatus.Completed) return -1;
            return 0;
        });

        const grouped = groupTasks(dayTasks);

        return (
            <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">
                        Задачи на {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">({dayTasks.length} задач)</span>
                </div>
                <div className="flex-1 overflow-auto">
                    {grouped.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-sm text-slate-400">Нет задач на этот день</div>
                    ) : grouped.map((g, i) => {
                        const assigneeId = getEffectiveAssignee(g.task, clientMap);
                        const emp = assigneeId ? employeeMap.get(assigneeId) : null;
                        const assigneeName = emp ? `${emp.lastName || ''} ${emp.firstName?.charAt(0) || ''}.` : '';
                        const clientName = g.count > 1
                            ? `${g.count} клиентов`
                            : (clientMap.get(g.task.legalEntityId)?.name || '');

                        return (
                            <DayTaskRow
                                key={i}
                                task={g.task}
                                clientName={clientName}
                                assigneeName={assigneeName}
                                statusIcon={getStatusIcon(g.task)}
                                clientCount={g.count}
                                onClick={() => handleTaskClick(g.task)}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    // НЕДЕЛЯ
    const renderWeek = () => {
        const monday = getMonday(currentDate);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            return d;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (
            <div className="h-full flex gap-1">
                {weekDays.map((day, dayIdx) => {
                    const dayTasks = filteredTasks.filter(t => isSameDay(new Date(t.dueDate), day));
                    const grouped = groupTasks(dayTasks);
                    const isToday = isSameDay(day, today);
                    const dateProps = getDateProps(day);
                    const isNonWorkday = !dateProps.isWorkday;

                    return (
                        <div
                            key={dayIdx}
                            className={`flex-1 flex flex-col rounded-lg border overflow-hidden ${isToday ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                        >
                            {/* Заголовок дня */}
                            <div className={`px-2 py-1.5 text-center border-b ${isToday ? 'bg-indigo-100 border-indigo-200' : isNonWorkday ? 'bg-red-50 border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className={`text-[10px] font-medium ${isNonWorkday ? 'text-red-400' : 'text-slate-400'}`}>
                                    {WEEKDAYS[dayIdx]}
                                </div>
                                <div className={`text-sm font-bold ${isToday ? 'text-indigo-600' : isNonWorkday ? 'text-red-500' : 'text-slate-700'}`}>
                                    {day.getDate()}
                                </div>
                                <div className="text-[10px] text-slate-400">{MONTHS_SHORT[day.getMonth()]}</div>
                            </div>

                            {/* Задачи */}
                            <div className="flex-1 overflow-auto p-0.5 space-y-0.5">
                                {grouped.length === 0 ? (
                                    <div className="text-center text-[10px] text-slate-300 pt-2">—</div>
                                ) : grouped.map((g, gi) => {
                                    const assigneeId = getEffectiveAssignee(g.task, clientMap);
                                    const emp = assigneeId ? employeeMap.get(assigneeId) : null;
                                    const initials = emp ? `${emp.lastName?.charAt(0) || ''}${emp.firstName?.charAt(0) || ''}` : '';

                                    return (
                                        <CompactTaskRow
                                            key={gi}
                                            title={g.task.title}
                                            clientCount={g.count}
                                            assigneeName={initials}
                                            statusIcon={getStatusIcon(g.task)}
                                            onClick={() => handleTaskClick(g.task)}
                                        />
                                    );
                                })}
                            </div>

                            {/* Счётчик */}
                            {dayTasks.length > 0 && (
                                <div className="px-2 py-1 text-center text-[10px] text-slate-400 border-t border-slate-100">
                                    {dayTasks.length} задач
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // МЕСЯЦ
    const renderMonth = () => (
        <MonthGrid
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            tasks={filteredTasks}
            size="large"
            onDayClick={openDayModal}
            onTaskClick={handleTaskClick}
            clientMap={clientMap}
            employeeMap={employeeMap}
        />
    );

    // КВАРТАЛ — компактный вид как Год, но с цифрами количества задач
    const renderQuarter = () => {
        const q = getQuarter(currentDate);
        const startMonth = q * 3;
        const year = currentDate.getFullYear();

        return (
            <div className="grid grid-cols-3 gap-4 h-full">
                {[0, 1, 2].map(offset => (
                    <div key={offset} className="bg-white rounded-lg border border-slate-200 p-2 overflow-hidden flex flex-col">
                        <MonthGrid
                            year={year}
                            month={startMonth + offset}
                            tasks={filteredTasks}
                            size="small"
                            showTaskCount={true}
                            onDayClick={openDayModal}
                            onTaskClick={handleTaskClick}
                            clientMap={clientMap}
                            employeeMap={employeeMap}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // ГОД
    const renderYear = () => {
        const year = currentDate.getFullYear();

        return (
            <div className="grid grid-cols-4 gap-2 h-full auto-rows-fr">
                {Array.from({ length: 12 }, (_, m) => (
                    <div key={m} className="bg-white rounded-lg border border-slate-200 p-1 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-300 transition-colors"
                        onClick={() => { setCurrentDate(new Date(year, m, 1)); setViewMode('month'); }}
                    >
                        <MonthGrid
                            year={year}
                            month={m}
                            tasks={filteredTasks}
                            size="small"
                            onDayClick={openDayModal}
                            onTaskClick={handleTaskClick}
                            clientMap={clientMap}
                            employeeMap={employeeMap}
                        />
                    </div>
                ))}
            </div>
        );
    };

    // Подсчёт задач для фильтров
    const clientsWithTasks = useMemo(() => {
        const counts = new Map<string, number>();
        filteredTasks.forEach(t => counts.set(t.legalEntityId, (counts.get(t.legalEntityId) || 0) + 1));
        return legalEntities
            .filter(le => counts.has(le.id))
            .map(le => ({ id: le.id, name: le.name, count: counts.get(le.id) || 0 }))
            .sort((a, b) => b.count - a.count);
    }, [filteredTasks, legalEntities]);

    const employeesWithTasks = useMemo(() => {
        const counts = new Map<string, number>();
        filteredTasks.forEach(t => {
            const assignee = getEffectiveAssignee(t, clientMap);
            if (assignee) counts.set(assignee, (counts.get(assignee) || 0) + 1);
        });
        return employees
            .filter(e => counts.has(e.id))
            .map(e => ({ id: e.id, name: `${e.lastName || ''} ${e.firstName || ''}`.trim(), count: counts.get(e.id) || 0 }))
            .sort((a, b) => b.count - a.count);
    }, [filteredTasks, employees, clientMap]);

    // Кнопки режимов
    const viewModes: { id: ViewMode; label: string }[] = [
        { id: 'day', label: 'День' },
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' },
        { id: 'quarter', label: 'Квартал' },
        { id: 'year', label: 'Год' },
    ];

    return (
        <div className="h-full flex gap-4">
            {/* Левая часть — Календарь (основной контент) */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Навигация */}
                <div className="mb-3">
                    <PeriodNav
                        viewMode={viewMode}
                        currentDate={currentDate}
                        onPrev={() => navigate(-1)}
                        onNext={() => navigate(1)}
                        onToday={() => navigate(0)}
                    />
                </div>

                {/* Контент */}
                <div className="flex-1 min-h-0 overflow-auto">
                    {viewMode === 'day' && renderDay()}
                    {viewMode === 'week' && renderWeek()}
                    {viewMode === 'month' && renderMonth()}
                    {viewMode === 'quarter' && renderQuarter()}
                    {viewMode === 'year' && renderYear()}
                </div>
            </div>

            {/* Правая панель — Фильтры */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                {/* Переключатель режимов */}
                <div className="bg-white rounded-lg border border-slate-200 p-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Вид</div>
                    <div className="flex flex-wrap gap-1">
                        {viewModes.map(vm => (
                            <button
                                key={vm.id}
                                onClick={() => setViewMode(vm.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === vm.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {vm.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Клиенты */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-0 overflow-hidden">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">👥 Клиенты</div>
                    {selectedClientId && (
                        <button
                            onClick={() => setSelectedClientId(null)}
                            className="w-full text-left px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded mb-1 font-medium"
                        >
                            ← Все клиенты
                        </button>
                    )}
                    <div className="overflow-auto max-h-40 space-y-0.5">
                        {clientsWithTasks.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedClientId(selectedClientId === c.id ? null : c.id)}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-1 ${selectedClientId === c.id
                                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedClientId === c.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{c.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Персонал */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-0 overflow-hidden">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">👤 Персонал</div>
                    {selectedEmployeeId && (
                        <button
                            onClick={() => setSelectedEmployeeId(null)}
                            className="w-full text-left px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded mb-1 font-medium"
                        >
                            ← Все сотрудники
                        </button>
                    )}
                    <div className="overflow-auto max-h-40 space-y-0.5">
                        {employeesWithTasks.map(e => (
                            <button
                                key={e.id}
                                onClick={() => setSelectedEmployeeId(selectedEmployeeId === e.id ? null : e.id)}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-1 ${selectedEmployeeId === e.id
                                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="flex-1 truncate">{e.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedEmployeeId === e.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{e.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ====== МОДАЛКА ДНЯ ====== */}
            {dayModal.isOpen && (() => {
                // Группировка задач для отображения
                const groups: { task: Task; clientNames: string[]; assigneeNames: string[] }[] = [];
                if (dayModal.tasks.length > 0) {
                    const gMap = new Map<string, { task: Task; clientIds: Set<string>; assigneeIds: Set<string> }>();
                    dayModal.tasks.forEach(t => {
                        if (!gMap.has(t.title)) gMap.set(t.title, { task: t, clientIds: new Set(), assigneeIds: new Set() });
                        const g = gMap.get(t.title)!;
                        g.clientIds.add(t.legalEntityId);
                        const assignee = getEffectiveAssignee(t, clientMap);
                        if (assignee) g.assigneeIds.add(assignee);
                    });
                    gMap.forEach(g => {
                        groups.push({
                            task: g.task,
                            clientNames: Array.from(g.clientIds).map(id => clientMap.get(id)?.name || id).sort(),
                            assigneeNames: Array.from(g.assigneeIds).map(id => employeeMap.get(id)).filter(Boolean)
                                .map(e => `${e!.lastName || ''} ${e!.firstName || ''}`.trim()).sort(),
                        });
                    });
                }

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDayModal} />
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-visible">
                            {/* Header */}
                            <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between rounded-t-xl">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        📅 {dayModal.date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <span className="text-xs text-slate-400">{dayModal.tasks.length} задач</span>
                                </div>
                                <button onClick={closeDayModal} className="p-1.5 hover:bg-white/60 rounded-full transition-colors">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Список задач */}
                            <div className="max-h-80 overflow-y-auto overflow-x-visible">
                                {groups.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-400">
                                        Нет задач на этот день
                                    </div>
                                ) : groups.map((g, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { closeDayModal(); handleTaskClick(g.task); }}
                                        className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors"
                                    >
                                        <span className="text-sm shrink-0">{getStatusIcon(g.task)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-700 hover:text-indigo-700 truncate">{g.task.title}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                            {/* Клиенты */}
                                            {g.clientNames.length === 1 ? (
                                                <span className="text-[11px] text-slate-500 max-w-28 truncate" title={g.clientNames[0]}>🏢 {g.clientNames[0]}</span>
                                            ) : g.clientNames.length > 1 && (
                                                <HoverBadge icon="🏢" count={g.clientNames.length} label="Клиенты" names={g.clientNames} colorClass="bg-indigo-100 text-indigo-600" />
                                            )}
                                            {/* Исполнители */}
                                            {g.assigneeNames.length === 1 ? (
                                                <span className="text-[11px] text-slate-500 max-w-28 truncate" title={g.assigneeNames[0]}>👤 {g.assigneeNames[0]}</span>
                                            ) : g.assigneeNames.length > 1 && (
                                                <HoverBadge icon="👤" count={g.assigneeNames.length} label="Исполнители" names={g.assigneeNames} colorClass="bg-slate-100 text-slate-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer — кнопка Добавить */}
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                                <button
                                    onClick={() => {
                                        closeDayModal();
                                        onAddTask?.(dayModal.date);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Добавить задачу
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CalendarTab;
