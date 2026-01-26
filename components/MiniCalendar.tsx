// components/MiniCalendar.tsx
// Унифицированный компактный мини-календарь с индикаторами задач

import React, { useState } from 'react';
import { getDateProps } from '../services/dateRegistry';
import { getCalendarDayColor } from '../services/taskIndicators';

interface Task {
    id: string;
    dueDate: Date | string;
    status?: string;
    isUrgent?: boolean;
    isBlocked?: boolean;
}

interface MiniCalendarProps {
    tasks?: Task[];
    onDayClick?: (date: Date, tasks: Task[]) => void;
    selectedDate?: Date | null;
    onDateChange?: (date: Date) => void;
    highlightedDay?: number;
    onShowFullMonth?: () => void;
    showFullMonthButton?: boolean;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];


export const MiniCalendar: React.FC<MiniCalendarProps> = ({
    tasks = [],
    onDayClick,
    selectedDate,
    onDateChange,
    highlightedDay,
    onShowFullMonth,
    showFullMonthButton = false
}) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const toDateKey = (date: Date): string => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Группировка задач по датам
    const tasksByDate = new Map<string, Task[]>();
    tasks.forEach(task => {
        const d = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
        const key = toDateKey(d);
        if (!tasksByDate.has(key)) tasksByDate.set(key, []);
        tasksByDate.get(key)!.push(task);
    });

    // Генерация дней месяца
    const monthStart = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    const endDate = new Date(monthEnd);
    if (endDate.getDay() !== 0) {
        endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
    }

    const days: Date[] = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }

    const todayKey = toDateKey(today);
    const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-3">
            {/* Заголовок: месяц (dropdown) и год */}
            <div className="flex items-center justify-between mb-2">
                <select
                    value={currentMonth}
                    onChange={(e) => {
                        const newMonth = Number(e.target.value);
                        setCurrentMonth(newMonth);
                        onDateChange?.(new Date(currentYear, newMonth, 1));
                    }}
                    className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                    {MONTHS.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                    ))}
                </select>
                <span className="text-xs text-slate-500">{currentYear}</span>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-px mb-1">
                {WEEKDAYS.map((wd, i) => (
                    <div key={i} className={`text-center text-[9px] font-medium ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>
                        {wd}
                    </div>
                ))}
            </div>

            {/* Сетка дней */}
            <div className="grid grid-cols-7 gap-px">
                {days.map((d, i) => {
                    const key = toDateKey(d);
                    const isCurrentMonth = d.getMonth() === currentMonth;
                    const dateProps = getDateProps(d);
                    const isNonWorkday = !dateProps.isWorkday;
                    const isToday = key === todayKey;
                    const isSelected = key === selectedKey;
                    const dayTasks = tasksByDate.get(key) || [];
                    const hasTask = dayTasks.length > 0;
                    const taskColor = getCalendarDayColor(dayTasks, d);

                    return (
                        <div
                            key={i}
                            onClick={() => isCurrentMonth && onDayClick?.(d, dayTasks)}
                            className={`
                                aspect-square flex flex-col items-center justify-center text-[10px] rounded cursor-pointer relative pb-1
                                ${!isCurrentMonth ? 'text-slate-300' : ''}
                                ${isCurrentMonth && isToday ? 'bg-primary text-white font-bold' : ''}
                                ${isSelected && !isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                                ${highlightedDay === d.getDate() && isCurrentMonth && !isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                                ${isCurrentMonth && isNonWorkday && !isToday ? 'bg-red-50 text-red-500' : ''}
                                ${isCurrentMonth && !isToday && !isNonWorkday ? 'text-slate-600 hover:bg-slate-100' : ''}
                            `}
                        >
                            <span>{d.getDate()}</span>
                            {/* Черта-индикатор под датой */}
                            {hasTask && isCurrentMonth && (
                                <span
                                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full ${isToday ? 'bg-white' : taskColor
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Кнопка "Показать весь месяц" */}
            {showFullMonthButton && onShowFullMonth && (
                <button
                    onClick={onShowFullMonth}
                    className="w-full mt-2 py-1.5 text-xs text-primary hover:text-primary-hover hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    ← Показать весь месяц
                </button>
            )}
        </div>
    );
};

export default MiniCalendar;

