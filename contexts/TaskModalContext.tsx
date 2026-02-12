// contexts/TaskModalContext.tsx
// Контекст для открытия модального окна задачи из любого места приложения

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { TaskInfoModal, TaskInfoData } from '../components/TaskInfoModal';

interface TaskModalContextType {
    openTaskModal: (task: TaskInfoData) => void;
    closeTaskModal: () => void;
    setOnComplete: (handler: ((taskId: string) => void) | null) => void;
    setOnEdit: (handler: ((taskId: string) => void) | null) => void;
    /** Подписка на событие после выполнения задачи (для обновления локальных списков) */
    subscribeAfterComplete: (cb: (taskId: string) => void) => () => void;
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
    const [onCompleteHandler, setOnCompleteHandler] = useState<((taskId: string) => void) | null>(null);
    const [onEditHandler, setOnEditHandler] = useState<((taskId: string) => void) | null>(null);
    const afterCompleteListeners = useRef<Set<(taskId: string) => void>>(new Set());

    const openTaskModal = (task: TaskInfoData) => {
        setCurrentTask(task);
        setIsOpen(true);
    };

    const closeTaskModal = () => {
        setIsOpen(false);
        setCurrentTask(null);
    };

    const setOnComplete = useCallback((handler: ((taskId: string) => void) | null) => {
        setOnCompleteHandler(() => handler);
    }, []);

    const setOnEdit = useCallback((handler: ((taskId: string) => void) | null) => {
        setOnEditHandler(() => handler);
    }, []);

    const subscribeAfterComplete = useCallback((cb: (taskId: string) => void) => {
        afterCompleteListeners.current.add(cb);
        return () => { afterCompleteListeners.current.delete(cb); };
    }, []);

    const handleComplete = useCallback((taskId: string) => {
        if (onCompleteHandler) {
            onCompleteHandler(taskId);
            // Уведомляем подписчиков (ClientsView и др.)
            afterCompleteListeners.current.forEach(cb => cb(taskId));
            closeTaskModal();
        }
    }, [onCompleteHandler]);

    const handleEdit = useCallback((taskId: string) => {
        if (onEditHandler) {
            onEditHandler(taskId);
            closeTaskModal();
        }
    }, [onEditHandler]);

    return (
        <TaskModalContext.Provider value={{ openTaskModal, closeTaskModal, setOnComplete, setOnEdit, subscribeAfterComplete }}>
            {children}
            <TaskInfoModal
                isOpen={isOpen}
                task={currentTask}
                onClose={closeTaskModal}
                onComplete={handleComplete}
                onEdit={handleEdit}
            />
        </TaskModalContext.Provider>
    );
};
