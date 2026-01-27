// contexts/TaskModalContext.tsx
// Контекст для открытия модального окна задачи из любого места приложения

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TaskInfoModal, TaskInfoData } from '../components/TaskInfoModal';

interface TaskModalContextType {
    openTaskModal: (task: TaskInfoData) => void;
    closeTaskModal: () => void;
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

export const useTaskModal = () => {
    const context = useContext(TaskModalContext);
    if (!context) {
        throw new Error('useTaskModal must be used within TaskModalProvider');
    }
    return context;
};

interface TaskModalProviderProps {
    children: ReactNode;
}

export const TaskModalProvider: React.FC<TaskModalProviderProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<TaskInfoData | null>(null);

    const openTaskModal = (task: TaskInfoData) => {
        setCurrentTask(task);
        setIsOpen(true);
    };

    const closeTaskModal = () => {
        setIsOpen(false);
        setCurrentTask(null);
    };

    return (
        <TaskModalContext.Provider value={{ openTaskModal, closeTaskModal }}>
            {children}
            <TaskInfoModal
                isOpen={isOpen}
                task={currentTask}
                onClose={closeTaskModal}
            />
        </TaskModalContext.Provider>
    );
};
