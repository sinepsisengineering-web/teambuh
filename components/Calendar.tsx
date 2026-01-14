// components/Calendar.tsx

import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, LegalEntity } from '../types';
import { TaskItem } from './TaskItem';
import { TASK_STATUS_STYLES } from '../constants';
import { toISODateString, isWeekend } from '../utils/dateUtils';
import { isHoliday } from '../services/holidayService';


interface CalendarProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
    onAddTask: (date: Date) => void;
    onOpenDetail: (tasks: Task[], date: Date) => void;
    onDeleteTask: (taskId: string) => void;
}

type CalendarView = 'day' | 'week' | 'month' | 'quarter' | 'year';

const AddTaskButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow" aria-label="Добавить задачу">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
        Добавить задачу
    </button>
);

interface DayViewProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    currentDate: Date;
    onAddTask: (date: Date) => void;
    onOpenDetail: (tasks: Task[], date: Date) => void;
    onDeleteTask: (taskId: string) => void;
}

const DayView: React.FC<DayViewProps> = ({ tasks, legalEntities, currentDate, onAddTask, onOpenDetail, onDeleteTask }) => {
    const tasksForDay = useMemo(() => tasks.filter(t => new Date(t.dueDate).toDateString() === currentDate.toDateString()), [tasks, currentDate]);
    const legalEntityMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-700 capitalize">
                    {currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <AddTaskButton onClick={() => onAddTask(currentDate)} />
            </div>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
                {tasksForDay.length > 0 ? tasksForDay.map(task => {
                    const legalEntity = legalEntityMap.get(task.legalEntityId);
                    const clientName = legalEntity ? `${legalEntity.legalForm} «${legalEntity.name}»` : 'Юр. лицо не найдено';

                    return (
                        <TaskItem
                            key={task.id}
                            task={task}
                            clientName={clientName}
                            onOpenDetail={() => onOpenDetail([task], new Date(task.dueDate))}
                            isSelected={false}
                            onTaskSelect={() => { }}
                            onDeleteTask={onDeleteTask}
                        />
                    )
                }) : <p className="text-center text-slate-500 py-8">На этот день задач нет.</p>}
            </div>
        </div>
    );
};

const WeekView: React.FC<{ tasks: Task[]; legalEntities: LegalEntity[]; currentDate: Date; onSelectDate: (date: Date) => void; onAddTask: (date: Date) => void; onOpenDetail: (tasks: Task[], date: Date) => void; }> = ({ tasks, currentDate, onSelectDate, onAddTask, onOpenDetail }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    return (
        <div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {weekDays.map(day => {
                    const tasksForDay = tasks.filter(t => new Date(t.dueDate).toDateString() === day.toDateString());

                    return (
                        <div key={day.toISOString()} className="flex flex-col bg-white group relative">
                            <button onClick={() => onAddTask(day)} className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-indigo-200 transition-opacity z-10" aria-label="Добавить задачу">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="text-center py-2 border-b border-slate-200">
                                <p className="text-xs text-slate-500 uppercase">{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</p>
                                <p onClick={() => onSelectDate(day)} className={`mt-1 h-7 w-7 mx-auto flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer hover:bg-indigo-100 ${day.getTime() === today.getTime() ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                                    {day.getDate()}
                                </p>
                            </div>
                            <div className="p-1 sm:p-2 space-y-1 sm:space-y-2 flex-1 min-h-[120px] overflow-y-auto">
                                {tasksForDay.map(task => {
                                    const isLocked = task.status === TaskStatus.Locked;
                                    const statusStyle = isLocked ? TASK_STATUS_STYLES[TaskStatus.Locked] : TASK_STATUS_STYLES[task.status];

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => {
                                                if (isLocked) return;
                                                onOpenDetail([task], new Date(task.dueDate))
                                            }}
                                            className={`text-xs p-1 rounded truncate transition-colors
                                                ${task.status === TaskStatus.Completed ? 'bg-green-100 text-green-700 line-through' : `${statusStyle.bg} ${statusStyle.text}`}
                                                ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                                            `}
                                            title={`${task.title}`}
                                        >
                                            {task.title}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MonthView: React.FC<{ tasks: Task[]; legalEntities: LegalEntity[]; currentDate: Date; onSelectDate: (date: Date) => void; onAddTask: (date: Date) => void; onOpenDetail: (tasks: Task[], date: Date) => void; }> = ({ tasks, currentDate, onSelectDate, onAddTask, onOpenDetail }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart); startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    const endDate = new Date(monthEnd); if (endDate.getDay() !== 0) { endDate.setDate(endDate.getDate() + (7 - endDate.getDay())); }

    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) { days.push(new Date(day)); day.setDate(day.getDate() + 1); }

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {weekDays.map(wd => <div key={wd} className="text-center py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">{wd}</div>)}
            {days.map((d, i) => {
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                const isToday = d.getTime() === today.getTime();
                const isWknd = isWeekend(d);
                const isHol = isHoliday(d);

                const tasksForDay = tasks.filter(t => new Date(t.dueDate).toDateString() === d.toDateString());
                const groupedTasks = new Map<string, Task[]>();
                tasksForDay.forEach(task => {
                    const key = task.title;
                    if (!groupedTasks.has(key)) {
                        groupedTasks.set(key, []);
                    }
                    groupedTasks.get(key)!.push(task);
                });
                const taskGroups = Array.from(groupedTasks.values());

                return (
                    <div key={i} onClick={() => onSelectDate(d)} className={`p-2 min-h-[120px] cursor-pointer group relative ${!isCurrentMonth ? 'bg-slate-50' : (isWknd || isHol) ? 'bg-red-50' : 'bg-white'} hover:bg-indigo-50`}>
                        {isCurrentMonth && (
                            <button onClick={(e) => { e.stopPropagation(); onAddTask(d); }} className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-indigo-200 transition-opacity z-10" aria-label="Добавить задачу">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full text-sm transition-colors ${isToday ? 'bg-indigo-600 text-white font-bold' : ''} ${!isCurrentMonth ? 'text-slate-400' : (isWknd || isHol) ? 'text-red-600' : 'text-slate-700'}`}>
                            {d.getDate()}
                        </div>
                        <div className="mt-1 space-y-1">
                            {taskGroups.slice(0, 3).map(group => {
                                const mainTask = group[0];
                                const uncompletedTasks = group.filter(t => t.status !== TaskStatus.Completed);
                                const uncompletedCount = uncompletedTasks.length;
                                const isAllCompleted = uncompletedCount === 0;

                                const overallStatus = isAllCompleted
                                    ? TaskStatus.Completed
                                    : uncompletedTasks.find(t => t.status === TaskStatus.Overdue)?.status ||
                                    uncompletedTasks.find(t => t.status === TaskStatus.DueToday)?.status ||
                                    uncompletedTasks.find(t => t.status === TaskStatus.DueSoon)?.status ||
                                    uncompletedTasks.find(t => t.status === TaskStatus.Locked)?.status ||
                                    TaskStatus.Upcoming;

                                const isLocked = overallStatus === TaskStatus.Locked;
                                const statusStyle = TASK_STATUS_STYLES[overallStatus] || TASK_STATUS_STYLES[TaskStatus.Upcoming];

                                return (
                                    <div
                                        key={mainTask.seriesId || mainTask.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isLocked) return;
                                            onOpenDetail(group, new Date(mainTask.dueDate));
                                        }}
                                        className={`text-xs px-1.5 py-0.5 rounded truncate relative flex items-center justify-between gap-1 
                                        ${isAllCompleted ? 'bg-green-100 text-green-700 line-through' : `${statusStyle.bg} ${statusStyle.text}`}
                                        ${isLocked ? 'cursor-not-allowed opacity-70' : ''}
                                    `}
                                        title={`${mainTask.title} (${isAllCompleted ? 'Выполнено' : `Невыполнено: ${uncompletedCount}`})`}>
                                        <span className="truncate flex-1">{mainTask.title}</span>
                                        {group.length > 1 && (
                                            <span className={`flex-shrink-0 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${isAllCompleted ? 'bg-green-500' : isLocked ? 'bg-gray-400' : statusStyle.bg.replace('-100', '-500')}`}>
                                                {isAllCompleted
                                                    ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>)
                                                    : uncompletedCount
                                                }
                                            </span>
                                        )}
                                    </div>
                                )
                            }
                            )}
                            {taskGroups.length > 3 && (<div className="text-xs text-slate-500 text-center">+ {taskGroups.length - 3} еще</div>)}
                        </div>
                    </div>
                )
            })}
        </div>
    )
};

const MiniMonthGrid: React.FC<{ year: number; month: number; tasks: Task[]; onSelectDate: (date: Date) => void; today: Date; onAddTask: (date: Date) => void; }> = ({ year, month, tasks, onSelectDate, today, onAddTask }) => {
    const monthStart = new Date(year, month, 1);
    const startDate = new Date(monthStart); startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    const monthEnd = new Date(year, month + 1, 0);
    const endDate = new Date(monthEnd); if (endDate.getDay() !== 0) { endDate.setDate(endDate.getDate() + (7 - endDate.getDay())); }
    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) { days.push(new Date(day)); day.setDate(day.getDate() + 1); }
    const weekDays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
    return (
        <div>
            <h4 className="font-bold text-center text-slate-800 mb-2">{monthStart.toLocaleString('ru-RU', { month: 'long' })}</h4>
            <div className="grid grid-cols-7 gap-px">
                {weekDays.map((wd, i) => <div key={i} className="text-center text-xs font-semibold text-slate-500">{wd}</div>)}
                {days.map((d, i) => {
                    const isCurrentMonth = d.getMonth() === month;
                    const isWknd = isWeekend(d);
                    const isHol = isHoliday(d);
                    const tasksForDay = isCurrentMonth ? tasks.filter(t => new Date(t.dueDate).toDateString() === d.toDateString()) : [];
                    const statuses = [...new Set(tasksForDay.map(t => t.status))];
                    return (
                        <div key={i} onClick={() => isCurrentMonth && onSelectDate(d)} className={`p-1 text-center cursor-pointer rounded-md relative group ${!isCurrentMonth ? 'bg-slate-50' : ''} ${isCurrentMonth && (isWknd || isHol) ? 'bg-red-50' : ''} ${isCurrentMonth ? 'hover:bg-indigo-100' : ''}`}>
                            {isCurrentMonth && (
                                <button onClick={(e) => { e.stopPropagation(); onAddTask(d); }} className="absolute top-0 right-0 p-px rounded-full opacity-0 group-hover:opacity-100 hover:bg-indigo-200 transition-opacity z-10" aria-label="Добавить задачу">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                            <span className={`text-xs ${!isCurrentMonth ? 'text-slate-300' : d.getTime() === today.getTime() ? 'text-indigo-600 font-bold' : (isWknd || isHol) ? 'text-red-600' : 'text-slate-600'}`}>{d.getDate()}</span>
                            <div className="flex justify-center items-center h-2 space-x-px mt-px">
                                {isCurrentMonth && statuses.slice(0, 4).map((status: TaskStatus) => {
                                    const statusStyle = TASK_STATUS_STYLES[status] || TASK_STATUS_STYLES[TaskStatus.Upcoming];
                                    return <div key={status} className={`w-1.5 h-1.5 rounded-full opacity-75 ${statusStyle.bg.replace('-100', '-500')}`} />
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const QuarterView: React.FC<{ tasks: Task[]; currentDate: Date; onSelectDate: (date: Date) => void; onAddTask: (date: Date) => void; }> = ({ tasks, currentDate, onSelectDate, onAddTask }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const currentQuarter = Math.floor(currentDate.getMonth() / 3);
    const startMonth = currentQuarter * 3;
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
                <MiniMonthGrid key={i} year={currentDate.getFullYear()} month={startMonth + i} tasks={tasks} onSelectDate={onSelectDate} today={today} onAddTask={onAddTask} />
            ))}
        </div>
    );
};

const YearView: React.FC<{ tasks: Task[]; currentDate: Date; onSelectDate: (date: Date) => void; onAddTask: (date: Date) => void; }> = ({ tasks, currentDate, onSelectDate, onAddTask }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {[...Array(12)].map((_, i) => (
                <MiniMonthGrid key={i} year={currentDate.getFullYear()} month={i} tasks={tasks} onSelectDate={onSelectDate} today={today} onAddTask={onAddTask} />
            ))}
        </div>
    );
};

export const Calendar: React.FC<CalendarProps> = ({ tasks, legalEntities, onUpdateTaskStatus, onAddTask, onOpenDetail, onDeleteTask }) => {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleSelectDate = (date: Date) => {
        setCurrentDate(date);
        setView('day');
    };

    const handlePrev = () => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            if (view === 'day') newDate.setDate(newDate.getDate() - 1);
            else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
            else if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
            else if (view === 'quarter') newDate.setMonth(newDate.getMonth() - 3);
            else if (view === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
            return newDate;
        });
    };
    const handleNext = () => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            if (view === 'day') newDate.setDate(newDate.getDate() + 1);
            else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
            else if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
            else if (view === 'quarter') newDate.setMonth(newDate.getMonth() + 3);
            else if (view === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
            return newDate;
        });
    };
    const handleToday = () => setCurrentDate(new Date());

    const currentTitle = useMemo(() => {
        switch (view) {
            case 'day': return currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
            case 'week':
                const start = new Date(currentDate);
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                return `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}`;
            case 'month': return currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
            case 'quarter': return `${Math.floor(currentDate.getMonth() / 3) + 1} квартал ${currentDate.getFullYear()}`;
            case 'year': return `${currentDate.getFullYear()} год`;
        }
    }, [view, currentDate]);

    const VIEWS: { id: CalendarView, label: string }[] = [
        { id: 'day', label: 'День' },
        { id: 'week', label: 'Неделя' },
        { id: 'month', label: 'Месяц' },
        { id: 'quarter', label: 'Квартал' },
        { id: 'year', label: 'Год' },
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Календарь задач</h2>
                    <div className="flex items-center gap-4 mt-2">
                        <h3 className="text-xl font-bold text-slate-800 capitalize w-max min-w-[150px]">{currentTitle}</h3>
                        <div className="flex items-center gap-1">
                            <button onClick={handlePrev} className="p-2 rounded-md hover:bg-slate-200" aria-label="Предыдущий период">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </button>
                            <button onClick={handleNext} className="p-2 rounded-md hover:bg-slate-200" aria-label="Следующий период">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <button onClick={handleToday} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">
                            Сегодня
                        </button>
                    </div>
                </div>
                <div className="flex p-1 bg-slate-200 rounded-lg self-start sm:self-center">
                    {VIEWS.map(v => (
                        <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all relative ${view === v.id ? 'text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <span className="relative z-10">{v.label}</span>
                            {view === v.id && <div className="absolute inset-0 bg-white shadow rounded-md z-0"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'day' && <DayView tasks={tasks} legalEntities={legalEntities} currentDate={currentDate} onAddTask={onAddTask} onOpenDetail={onOpenDetail} onDeleteTask={onDeleteTask} />}
            {view === 'week' && <WeekView tasks={tasks} legalEntities={legalEntities} currentDate={currentDate} onSelectDate={handleSelectDate} onAddTask={onAddTask} onOpenDetail={onOpenDetail} />}
            {view === 'month' && <MonthView tasks={tasks} legalEntities={legalEntities} currentDate={currentDate} onSelectDate={handleSelectDate} onAddTask={onAddTask} onOpenDetail={onOpenDetail} />}
            {view === 'quarter' && <QuarterView tasks={tasks} currentDate={currentDate} onSelectDate={handleSelectDate} onAddTask={onAddTask} />}
            {view === 'year' && <YearView tasks={tasks} currentDate={currentDate} onSelectDate={handleSelectDate} onAddTask={onAddTask} />}
        </div>
    );
};