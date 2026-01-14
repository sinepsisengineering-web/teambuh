// src/components/TaskItem.tsx

import React from 'react';
import { Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
import { useConfirmation } from '../contexts/ConfirmationProvider';

interface TaskItemProps {
  task: Task;
  clientName: string;
  isSelected: boolean;
  onTaskSelect: (taskId: string, isSelected: boolean) => void;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, clientName, isSelected, onTaskSelect, onOpenDetail, onDeleteTask }) => {
  const confirm = useConfirmation();

  if (!task) {
    return null;
  }

  // <<< ОПРЕДЕЛЯЕМ СОСТОЯНИЕ БЛОКИРОВКИ НА ОСНОВЕ СТАТУСА >>>
  const isLocked = task.status === TaskStatus.Locked;
  const isCompleted = task.status === TaskStatus.Completed;

  // <<< ВЫБИРАЕМ ПРАВИЛЬНЫЙ СТИЛЬ: Если задача заблокирована, используем стиль для Locked, иначе - ее текущий стиль >>>
  const finalStatusStyle = isLocked ? TASK_STATUS_STYLES[TaskStatus.Locked] : TASK_STATUS_STYLES[task.status];

  const handleSelectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // Двойная проверка: и на isLocked, и на isCompleted
    if (isLocked || isCompleted) return;
    onTaskSelect(task.id, e.target.checked);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isConfirmed = await confirm({
      title: 'Подтверждение удаления',
      message: `Вы уверены, что хотите удалить задачу "${task.title}"?`,
      confirmButtonText: 'Удалить',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });

    if (isConfirmed) {
      onDeleteTask(task.id);
    }
  };
  
  const handleOpenDetailClick = () => {
    // <<< ЗАПРЕЩАЕМ ОТКРЫВАТЬ ДЕТАЛИ ДЛЯ ЗАБЛОКИРОВАННЫХ ЗАДАЧ >>>
    if (isLocked) return;
    onOpenDetail(task);
  }

  return (
    <div
      onClick={handleOpenDetailClick}
      // <<< ДОБАВЛЯЕМ КЛАССЫ ДЛЯ БЛОКИРОВКИ >>>
      className={`
        p-3 flex items-center gap-4 border-l-4 rounded transition-shadow 
        ${finalStatusStyle.bg} ${finalStatusStyle.border}
        ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:shadow-md'}
      `}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleSelectToggle}
        onClick={(e) => e.stopPropagation()}
        // <<< УПРАВЛЯЕМ disabled НА ОСНОВЕ isLocked И isCompleted >>>
        disabled={isLocked || isCompleted}
        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      <div className="flex-1 min-w-0">
        {/* <<< ДОБАВЛЯЕМ СТИЛИ ДЛЯ ТЕКСТА ЗАБЛОКИРОВАННОЙ ЗАДАЧИ >>> */}
        <p className={`
          font-semibold truncate 
          ${isLocked ? 'text-slate-500' : finalStatusStyle.text}
          ${isCompleted ? 'line-through text-slate-500' : ''}
        `}>
          {task.title}
        </p>
        <p className="text-sm text-slate-500 truncate">{clientName}</p>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end text-right">
          <p className={`text-sm font-medium ${isLocked ? 'text-slate-500' : finalStatusStyle.text}`}>{task.status}</p>
          <p className="text-sm text-slate-600">
            {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={handleDeleteClick}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Удалить задачу"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};