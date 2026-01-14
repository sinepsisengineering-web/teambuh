// src/components/TasksListItem.tsx

import React, { useMemo } from 'react';
// ==================== ИСПРАВЛЕНИЕ 1: Заменяем Client на LegalEntity ====================
import { Task, TaskStatus, LegalEntity } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
// ==================== ИСПРАВЛЕНИЕ 2: Используем правильную функцию isTaskLocked ====================
import { isTaskLocked } from '../services/taskGenerator';
import { useConfirmation } from '../contexts/ConfirmationProvider';

interface TasksListItemProps {
  tasks: Task[];
  // ==================== ИСПРАВЛЕНИЕ 3: Обновляем пропсы ====================
  legalEntities: LegalEntity[]; // Было: clients: Client[];
  onOpenDetail: (tasks: Task[]) => void;
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string, isSelected: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksListItem: React.FC<TasksListItemProps> = ({ tasks, legalEntities, onOpenDetail, selectedTasks, onTaskSelect, onDeleteTask }) => {
  const { confirm } = useConfirmation();

  if (tasks.length === 0) return null;
  
  const mainTask = tasks[0];
  const isGrouped = tasks.length > 1;

  // ==================== ИСПРАВЛЕНИЕ 4: Упрощаем и исправляем логику блокировки ====================
  const isLocked = isTaskLocked(mainTask);

  const uncompletedTasks = useMemo(() => tasks.filter(t => t.status !== TaskStatus.Completed), [tasks]);
  const isAllCompleted = uncompletedTasks.length === 0;

  const overallStatus = useMemo(() => {
    if (isAllCompleted) return TaskStatus.Completed;
    if (uncompletedTasks.some(t => t.status === TaskStatus.Overdue)) return TaskStatus.Overdue;
    if (uncompletedTasks.some(t => t.status === TaskStatus.DueSoon)) return TaskStatus.DueSoon;
    return mainTask.status;
  }, [uncompletedTasks, isAllCompleted, mainTask.status]);

  const statusStyle = TASK_STATUS_STYLES[overallStatus];

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      tasks.forEach(task => onTaskSelect(task.id, e.target.checked));
  };
  
  const isGroupSelected = useMemo(() => tasks.every(t => selectedTasks.has(t.id)), [tasks, selectedTasks]);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isConfirmed = await confirm({
      message: `Вы уверены, что хотите удалить задачу "${mainTask.title}"?`
    });
    if (isConfirmed) {
      onDeleteTask(mainTask.id);
    }
  };
  
  return (
    <div className={`p-3 flex items-center gap-4 border-l-4 rounded-md transition-all ${statusStyle.bg} ${statusStyle.border} ${isGroupSelected ? 'ring-2 ring-indigo-500' : ''}`}>
        <div className="flex-shrink-0">
            <input 
                type="checkbox"
                checked={isGroupSelected}
                onChange={handleCheckboxChange}
                className="h-5 w-5 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded cursor-pointer"
            />
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => onOpenDetail(tasks)}>
             <div className="flex items-center gap-2">
                 {isLocked && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <title>Выполнение будет доступно в соответствующем отчетном периоде</title>
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                )}
                <p className={`font-semibold ${statusStyle.text} ${isAllCompleted ? 'line-through text-slate-500' : ''}`}>
                    {mainTask.title}
                </p>
            </div>
            {isGrouped && <p className="text-sm text-slate-600">Для {tasks.length} клиентов</p>}
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyle.text} ${statusStyle.bg.replace('-100', '-200')}`}>{overallStatus}</span>
            </div>
            {!mainTask.isAutomatic && (
                 <button 
                    type="button" 
                    onClick={handleDeleteClick} 
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    title="Удалить задачу"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    </div>
  );
};