// components/TaskForm.tsx

import React, { useState, useEffect } from 'react';
import { Task, LegalEntity, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';

interface TaskFormProps {
    legalEntities: LegalEntity[];
    onSave: (task: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => void;
    onCancel: () => void;
    taskToEdit: Task | null;
    defaultDate: Date | null;
}

type FormData = {
    title: string;
    description: string;
    dueDate: string;
    dueTime: string;
    showTime: boolean;
    dueDateRule: TaskDueDateRule;
    legalEntityId: string;
    repeat: RepeatFrequency;
    reminder: ReminderSetting;
};

const toInputDateString = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getMaxDateString = (): string => {
    const maxYear = new Date().getFullYear() + 2;
    return `${maxYear}-12-31`;
};

export const TaskForm: React.FC<TaskFormProps> = ({ legalEntities, onSave, onCancel, taskToEdit, defaultDate }) => {
    
    const getInitialState = (): FormData => {
        const initialDate = taskToEdit?.dueDate ? new Date(taskToEdit.dueDate) : (defaultDate || new Date());
        return {
            title: taskToEdit?.title || '',
            description: taskToEdit?.description || '',
            dueDate: toInputDateString(initialDate),
            dueTime: taskToEdit?.dueTime || '',
            showTime: !!taskToEdit?.dueTime,
            dueDateRule: taskToEdit?.dueDateRule || TaskDueDateRule.NextBusinessDay,
            legalEntityId: taskToEdit?.legalEntityId || '',
            repeat: taskToEdit?.repeat || RepeatFrequency.None,
            reminder: taskToEdit?.reminder || ReminderSetting.ThreeDays,
        };
    };
    
    const [formData, setFormData] = useState<FormData>(getInitialState());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(getInitialState());
    }, [taskToEdit, defaultDate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (error) setError(null);

        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormData(prev => ({...prev, [name]: checked}));
             if(name === 'showTime' && !checked) {
                setFormData(prev => ({...prev, dueTime: ''}));
             }
        } else {
             setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError("Название задачи не может быть пустым.");
            return;
        }

        const [year, month, day] = formData.dueDate.split('-').map(Number);
        if (!formData.dueDate || isNaN(new Date(year, month - 1, day).getTime())) {
            setError("Укажите корректную дату выполнения.");
            return;
        }
        
        onSave({
            title: formData.title,
            description: formData.description,
            dueDate: new Date(year, month - 1, day),
            dueTime: formData.showTime ? formData.dueTime : undefined,
            dueDateRule: formData.dueDateRule,
            legalEntityId: formData.legalEntityId,
            repeat: formData.repeat,
            reminder: formData.reminder,
        });
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                    <span className="font-medium">Ошибка:</span> {error}
                </div>
            )}
            
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">Название задачи *</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Описание</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900"></textarea>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                     <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">Дата выполнения</label>
                     <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} min={toInputDateString(new Date())} max={getMaxDateString()} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
                </div>
                 <div>
                    <label htmlFor="dueDateRule" className="block text-sm font-medium text-slate-700">Правило переноса</label>
                    <select name="dueDateRule" id="dueDateRule" value={formData.dueDateRule} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                        <option value={TaskDueDateRule.NextBusinessDay}>На следующий рабочий день</option>
                        <option value={TaskDueDateRule.PreviousBusinessDay}>На предыдущий рабочий день</option>
                        <option value={TaskDueDateRule.NoTransfer}>Не переносить</option>
                    </select>
                </div>
            </div>
            
            <div className="flex items-center">
                <input type="checkbox" name="showTime" id="showTime" checked={formData.showTime} onChange={handleChange} className="h-4 w-4 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded" />
                <label htmlFor="showTime" className="ml-2 block text-sm text-slate-900">Указать время</label>
                {formData.showTime && (
                    <input type="time" name="dueTime" value={formData.dueTime} onChange={handleChange} className="ml-4 px-3 py-1 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
                )}
            </div>
            
            <div>
                <label htmlFor="legalEntityId" className="block text-sm font-medium text-slate-700">Клиент</label>
                <select name="legalEntityId" id="legalEntityId" value={formData.legalEntityId} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                    <option value="">- Выберите юр. лицо -</option>
                    {legalEntities.map(entity => (
                        <option key={entity.id} value={entity.id}>
                            {`${entity.legalForm} «${entity.name}» (ИНН: ${entity.inn})`}
                        </option>
                    ))}
                </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="repeat" className="block text-sm font-medium text-slate-700">Повторение</label>
                    <select name="repeat" id="repeat" value={formData.repeat} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                       <option value={RepeatFrequency.None}>Не повторять</option>
                       <option value={RepeatFrequency.Daily}>Ежедневно</option>
                       <option value={RepeatFrequency.Weekly}>Еженедельно</option>
                       <option value={RepeatFrequency.Monthly}>Ежемесячно</option>
                       <option value={RepeatFrequency.Quarterly}>Ежеквартально</option>
                       <option value={RepeatFrequency.Yearly}>Ежегодно</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="reminder" className="block text-sm font-medium text-slate-700">Напомнить</label>
                    <select name="reminder" id="reminder" value={formData.reminder} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                       <option value={ReminderSetting.OneHour}>За 1 час</option>
                       <option value={ReminderSetting.OneDay}>За 1 день</option>
                       <option value={ReminderSetting.ThreeDays}>За 3 дня</option> 
                       <option value={ReminderSetting.OneWeek}>За 1 неделю</option>
                    </select>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-4">
                {/* --- ВОТ ИСПРАВЛЕННАЯ СТРОКА --- */}
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
            </div>
        </form>
    );
};