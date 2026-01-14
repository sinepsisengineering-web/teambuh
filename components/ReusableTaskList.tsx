// src/components/ReusableTaskList.tsx

import React, { useMemo, useEffect, useRef } from 'react';
import { Task, LegalEntity } from '../types';
import { TaskItem } from './TaskItem';

const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export interface ReusableTaskListProps {
  tasks: Task[];
  legalEntityMap: Map<string, LegalEntity>;
  selectedTaskIds: Set<string>;
  selectableTaskIds: Set<string>;
  onTaskSelect: (taskId: string, isSelected: boolean) => void;
  onOpenDetail: (tasks: Task[], date: Date) => void;
  onDeleteTask: (taskId:string) => void;
  headerComponent?: React.ReactNode;
  emptyStateText?: string;
  stickyTopOffset?: number;
}

export const ReusableTaskList: React.FC<ReusableTaskListProps> = ({
  tasks,
  legalEntityMap,
  selectedTaskIds,
  onTaskSelect,
  onOpenDetail,
  onDeleteTask,
  headerComponent,
  emptyStateText = "Задачи не найдены.",
  stickyTopOffset = 73
}) => {
    const scrollTargetRef = useRef<HTMLDivElement | null>(null);

    const groupedTasksByDate = useMemo(() => {
        const groups = new Map<string, Task[]>();
        tasks.forEach(task => {
            const dateKey = toLocalDateString(new Date(task.dueDate));
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey)!.push(task);
        });
        return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }, [tasks]);

    const todayISO = toLocalDateString(new Date());
    const initialScrollTargetKey = useMemo(() => {
        if (groupedTasksByDate.has(todayISO)) return todayISO;
        for (const dateKey of groupedTasksByDate.keys()) {
            if (dateKey >= todayISO) return dateKey;
        }
        return null;
    }, [groupedTasksByDate, todayISO]);

    useEffect(() => {
        setTimeout(() => scrollTargetRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 100);
    }, [initialScrollTargetKey]);

    return (
        <div className="bg-white rounded-lg shadow-md">
            {headerComponent && (
                <div className="sticky top-0 bg-white p-4 border-b z-20 rounded-t-lg">
                    {headerComponent}
                </div>
            )}
            
            <div className="p-4">
                {Array.from(groupedTasksByDate.entries()).map(([date, dateTasks]) => {
                    const [y, m, d] = date.split('-').map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    return (
                        <div key={date} ref={el => { if (date === initialScrollTargetKey) scrollTargetRef.current = el; }} className="mb-6">
                            <h3 
                                className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky bg-white py-2 z-10 ${date === todayISO ? 'text-indigo-600' : ''}`} 
                                style={{ top: `${stickyTopOffset}px`, transform: 'translateZ(0)' }}
                            >
                                {displayDate.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            
                            <div className="relative z-0 flex flex-col gap-3">
                                {dateTasks.map(task => {
                                    const entity = legalEntityMap.get(task.legalEntityId);
                                    const clientName = entity ? `${entity.legalForm} «${entity.name}»` : 'Юр. лицо не найдено';
                                    return (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            clientName={clientName}
                                            isSelected={selectedTaskIds.has(task.id)}
                                            onTaskSelect={onTaskSelect}
                                            onOpenDetail={() => onOpenDetail(dateTasks, displayDate)}
                                            onDeleteTask={onDeleteTask}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {tasks.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-slate-500">{emptyStateText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};