// components/MiniCalendar.tsx
// Унифицированный компактный мини-календарь

import React, { useState } from 'react';
import { getHolidaysSync } from '../services/holidayService';

interface Task {
    id: string;
    dueDate: Date | string;
    status?: string;
}

interface MiniCalendarProps {
    tasks?: Task[];
    onDayClick?: (date: Date, tasks: Task[]) => void;
    selectedDate?: Date;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
    tasks = [],
    onDayClick,
    selectedDate
}) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const holidays = getHolidaysSync(currentYear);

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

    // Генерация дней месяца (включая дни предыдущего/следующего месяца)
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
                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
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
                    const dayOfWeek = d.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isHoliday = holidays.has(key);
                    const isToday = key === todayKey;
                    const isSelected = key === selectedKey;
                    const dayTasks = tasksByDate.get(key) || [];
                    const hasTask = dayTasks.length > 0;

                    return (
                        <div
                            key={i}
                            onClick={() => isCurrentMonth && onDayClick?.(d, dayTasks)}
                            className={`
                                aspect-square flex items-center justify-center text-[10px] rounded cursor-pointer relative
                                ${!isCurrentMonth ? 'text-slate-300' : ''}
                                ${isCurrentMonth && isToday ? 'bg-primary text-white font-bold' : ''}
                                ${isSelected && !isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                                ${isCurrentMonth && (isWeekend || isHoliday) && !isToday ? 'bg-red-50 text-red-500' : ''}
                                ${isCurrentMonth && !isToday && !isWeekend && !isHoliday ? 'text-slate-600 hover:bg-slate-100' : ''}
                            `}
                        >
                            {d.getDate()}
                            {hasTask && isCurrentMonth && (
                                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-primary'}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;
