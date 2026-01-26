// src/App.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { ClientList } from './components/ClientList';
import { Modal } from './components/Modal';
import { ClientForm } from './components/ClientForm';
import { ClientDetailCard } from './components/ClientDetailCard';
import { TaskForm } from './components/TaskForm';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TasksView } from './components/TasksView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { DashboardView } from './components/DashboardView';
import { StaffView } from './components/StaffView';
import { ClientsView } from './components/ClientsView';
import { LoginScreen } from './components/LoginScreen';
import { LegalEntity, Task, Note, Employee } from './types';
import { DUMMY_CLIENTS, DUMMY_EMPLOYEES } from './dummy-data';
import { useTasks } from './hooks/useTasks';
import { useConfirmation } from './contexts/ConfirmationProvider';
import { useAuth } from './contexts/AuthContext';
import { initializeHolidayService } from './services/holidayService';
import { storage } from './services/storageService';

type View = 'dashboard' | 'calendar' | 'tasks' | 'clients' | 'staff' | 'archive' | 'settings';

const parseLegalEntity = (le: any): LegalEntity => {
    let migratedNotes: Note[] = [];
    if (typeof le.notes === 'string' && le.notes.trim() !== '') {
        migratedNotes = [{ id: `note-${Date.now()}-${Math.random()}`, text: le.notes, createdAt: new Date() }];
    } else if (Array.isArray(le.notes)) {
        migratedNotes = le.notes.map((note: any) => ({ ...note, createdAt: new Date(note.createdAt) }));
    }
    return {
        ...le,
        ogrnDate: le.ogrnDate ? new Date(le.ogrnDate) : undefined,
        // <<< ДОБАВЛЕНА ОБРАБОТКА createdAt ПРИ ЗАГРУЗКЕ >>>
        createdAt: le.createdAt ? new Date(le.createdAt) : undefined,
        patents: le.patents ? le.patents.map((p: any) => ({ ...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate) })) : [],
        notes: migratedNotes,
    };
};

const App: React.FC = () => {
    const confirm = useConfirmation();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // ВРЕМЕННО: Сразу показываем LoginScreen для теста
    // return <LoginScreen />;

    // Показываем загрузку пока проверяем авторизацию
    if (authLoading) {
        return (
            <div className="min-h-screen bg-content flex items-center justify-center">
                <div className="text-primary text-xl font-bold">ЗАГРУЗКА...</div>
            </div>
        );
    }

    // Если не авторизован — показываем экран входа
    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    // Основное приложение (будет отрисовано ниже)
    return <AuthenticatedApp confirm={confirm} />;
};

// Выносим основную логику в отдельный компонент
const AuthenticatedApp: React.FC<{ confirm: ReturnType<typeof useConfirmation> }> = ({ confirm }) => {
    // Данные загружаются с сервера при монтировании
    const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Загрузка данных с сервера при старте
    useEffect(() => {
        const loadData = async () => {
            try {
                // Инициализируем календарные данные (выходные/праздники)
                const { initializeDateRegistry } = await import('./services/dateRegistry');
                initializeDateRegistry();

                const [loadedClients, loadedEmployees] = await Promise.all([
                    storage.loadAllClients(),
                    storage.loadAllEmployees()
                ]);

                // Используем только данные с сервера (без dummy)
                setLegalEntities(loadedClients.map(parseLegalEntity));
                setEmployees(loadedEmployees);
            } catch (error) {
                console.error('Failed to load data from server:', error);
                // Если сервер недоступен — начинаем с пустых данных
                setLegalEntities([]);
                setEmployees([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const [selectedLegalEntity, setSelectedLegalEntity] = useState<LegalEntity | null>(null);
    const [tasksViewKey, setTasksViewKey] = useState(0);
    const [activeView, setActiveView] = useState<View>('calendar');
    const [isLegalEntityModalOpen, setIsLegalEntityModalOpen] = useState(false);
    const [legalEntityToEdit, setLegalEntityToEdit] = useState<LegalEntity | null>(null);
    const [navigateToClientId, setNavigateToClientId] = useState<string | null>(null); // Для перехода в ClientsView

    // Инициализация сервиса праздников при запуске приложения
    useEffect(() => {
        initializeHolidayService();
    }, []);

    const { activeLegalEntities, archivedLegalEntities } = useMemo(() => {
        const active: LegalEntity[] = [];
        const archived: LegalEntity[] = [];
        legalEntities.forEach(le => (le.isArchived ? archived.push(le) : active.push(le)));
        return { activeLegalEntities: active, archivedLegalEntities: archived };
    }, [legalEntities]);

    const legalEntityMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);

    // <<< УДАЛЕНА ЛИШНЯЯ ФУНКЦИЯ addTasksForNewLegalEntity ИЗ ДЕСТРУКТУРИЗАЦИИ >>>
    const {
        tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
        isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView, setTasksForDetailView,
        handleSaveTask, handleOpenNewTaskForm,
        handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask,
        handleBulkComplete, handleBulkDelete, handleDeleteTasksForLegalEntity,
    } = useTasks(activeLegalEntities, legalEntityMap);

    useEffect(() => {
        if (!isTaskDetailModalOpen || tasksForDetailView.length === 0) return;
        const currentDetailTaskIds = new Set(tasksForDetailView.map(t => t.id));
        const updatedTasksForDetail = tasks.filter(t => currentDetailTaskIds.has(t.id));
        if (updatedTasksForDetail.length === 0) setIsTaskDetailModalOpen(false);
        else if (JSON.stringify(tasksForDetailView) !== JSON.stringify(updatedTasksForDetail)) setTasksForDetailView(updatedTasksForDetail);
    }, [tasks, isTaskDetailModalOpen, tasksForDetailView, setTasksForDetailView, setIsTaskDetailModalOpen]);

    useEffect(() => { localStorage.setItem('legalEntities', JSON.stringify(legalEntities)); }, [legalEntities]);

    const handleSaveLegalEntity = async (entityData: LegalEntity) => {
        try {
            // Сохраняем через сервер API
            const savedEntity = await storage.saveClient(entityData);

            const entityExists = legalEntities.some(le => le.id === savedEntity.id);

            if (entityExists) {
                const updatedEntities = legalEntities.map(le => (le.id === savedEntity.id ? savedEntity : le));
                setLegalEntities(updatedEntities);
                if (selectedLegalEntity && selectedLegalEntity.id === savedEntity.id) {
                    setSelectedLegalEntity(savedEntity);
                }
            } else {
                setLegalEntities(prev => [...prev, savedEntity]);
            }

            setIsLegalEntityModalOpen(false);
            setLegalEntityToEdit(null);
        } catch (error) {
            console.error('Failed to save client:', error);
        }
    };

    const handleAddNote = (legalEntityId: string, noteText: string) => {
        const newNote: Note = { id: `note-${Date.now()}-${Math.random()}`, text: noteText, createdAt: new Date() };
        let updatedSelectedEntity: LegalEntity | undefined;

        const updatedEntities = legalEntities.map(le => {
            if (le.id === legalEntityId) {
                const updatedLe = { ...le, notes: [...(le.notes || []), newNote] };
                if (selectedLegalEntity?.id === legalEntityId) {
                    updatedSelectedEntity = updatedLe;
                }
                return updatedLe;
            }
            return le;
        });

        setLegalEntities(updatedEntities);
        if (updatedSelectedEntity) {
            setSelectedLegalEntity(updatedSelectedEntity);
        }
    };

    const handleEditNote = (legalEntityId: string, noteId: string, newText: string) => {
        let updatedSelectedEntity: LegalEntity | undefined;

        const updatedEntities = legalEntities.map(le => {
            if (le.id === legalEntityId) {
                const updatedNotes = (le.notes || []).map(note =>
                    note.id === noteId ? { ...note, text: newText } : note
                );
                const updatedLe = { ...le, notes: updatedNotes };
                if (selectedLegalEntity?.id === legalEntityId) {
                    updatedSelectedEntity = updatedLe;
                }
                return updatedLe;
            }
            return le;
        });

        setLegalEntities(updatedEntities);
        if (updatedSelectedEntity) {
            setSelectedLegalEntity(updatedSelectedEntity);
        }
    };

    const handleDeleteNote = (legalEntityId: string, noteId: string) => {
        let updatedSelectedEntity: LegalEntity | undefined;

        const updatedEntities = legalEntities.map(le => {
            if (le.id === legalEntityId) {
                const updatedNotes = (le.notes || []).filter(note => note.id !== noteId);
                const updatedLe = { ...le, notes: updatedNotes };
                if (selectedLegalEntity?.id === legalEntityId) {
                    updatedSelectedEntity = updatedLe;
                }
                return updatedLe;
            }
            return le;
        });

        setLegalEntities(updatedEntities);
        if (updatedSelectedEntity) {
            setSelectedLegalEntity(updatedSelectedEntity);
        }
    };

    const handleArchiveLegalEntity = (entity: LegalEntity) => {
        setLegalEntities(prev => prev.map(le => (le.id === entity.id ? { ...le, isArchived: true } : le)));
        if (selectedLegalEntity?.id === entity.id) setSelectedLegalEntity(null);
    };

    const handleUnarchiveLegalEntity = (entityId: string) => {
        setLegalEntities(prev => prev.map(le => (le.id === entityId ? { ...le, isArchived: false } : le)));
    };

    const handleDeleteLegalEntity = (legalEntity: LegalEntity) => {
        confirm({
            title: 'Удаление клиента',
            message: `Вы уверены, что хотите удалить клиента "${legalEntity.name}"? Это действие нельзя отменить.`,
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            type: 'danger',
            onConfirm: () => {
                handleDeleteTasksForLegalEntity(legalEntity.id); // Keep this line from original
                setLegalEntities(prev => prev.filter(le => le.id !== legalEntity.id));
                setSelectedLegalEntity(null);
                setActiveView('clients');
            }
        });
    };

    // --- Handlers for Employees ---

    const handleSaveEmployee = async (employee: Employee) => {
        try {
            // Сохраняем через сервер API
            const savedEmployee = await storage.saveEmployee(employee);

            setEmployees(prev => {
                const exists = prev.find(e => e.id === savedEmployee.id);
                if (exists) {
                    return prev.map(e => e.id === savedEmployee.id ? savedEmployee : e);
                }
                return [...prev, savedEmployee];
            });
        } catch (error) {
            console.error('Failed to save employee:', error);
        }
    };

    const handleDeleteEmployee = async (employee: Employee) => {
        const confirmed = await confirm({
            title: 'Удаление сотрудника',
            message: `Вы уверены, что хотите удалить сотрудника "${employee.lastName || ''} ${employee.firstName || ''}"?`,
            confirmButtonText: 'Удалить',
            confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white'
        });

        if (confirmed) {
            try {
                await storage.deleteEmployee(employee.id);
                setEmployees(prev => prev.filter(e => e.id !== employee.id));
                console.log('[Employee] Deleted:', employee.id);
            } catch (error) {
                console.error('Failed to delete employee:', error);
            }
        }
    }; const handleOpenLegalEntityForm = (entity: LegalEntity | null = null) => {
        setLegalEntityToEdit(entity ? { ...entity } : null);
        setIsLegalEntityModalOpen(true);
    };

    const renderContent = () => {
        if (selectedLegalEntity && activeView === 'clients') {
            const entityTasks = tasks.filter(task => task.legalEntityId === selectedLegalEntity.id);
            return <ClientDetailCard
                legalEntity={selectedLegalEntity}
                tasks={entityTasks}
                onClose={() => setSelectedLegalEntity(null)}
                onEdit={handleOpenLegalEntityForm}
                onArchive={handleArchiveLegalEntity}
                onDelete={handleDeleteLegalEntity}
                onAddTask={() => handleOpenNewTaskForm({ legalEntityId: selectedLegalEntity.id })}
                onOpenTaskDetail={handleOpenTaskDetail}
                onBulkComplete={handleBulkComplete}
                onBulkDelete={handleBulkDelete}
                onDeleteTask={handleDeleteTask}
                onAddNote={handleAddNote}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
            />;
        }
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'calendar': return <Calendar tasks={tasks} legalEntities={activeLegalEntities} onUpdateTaskStatus={() => { }} onAddTask={(date) => handleOpenNewTaskForm({ dueDate: date })} onOpenDetail={handleOpenTaskDetail} onDeleteTask={handleDeleteTask} />;
            case 'tasks':
                return <TasksView
                    tasks={tasks}
                    legalEntities={activeLegalEntities}
                    employees={employees}
                    onToggleComplete={(taskId) => handleToggleComplete(taskId)}
                    onDeleteTask={(taskId) => handleDeleteTask(taskId)}
                    onNavigateToClient={(clientId) => {
                        // Переход на страницу Клиенты → Детализация
                        setNavigateToClientId(clientId);
                        setActiveView('clients');
                    }}
                />;
            case 'clients':
                return <ClientsView
                    key={navigateToClientId || 'no-init'}
                    legalEntities={activeLegalEntities}
                    onSave={handleSaveLegalEntity}
                    onDelete={handleDeleteLegalEntity}
                    onArchive={handleArchiveLegalEntity}
                    employees={employees}
                    initialClientId={navigateToClientId || undefined}
                />;
            case 'staff': return <StaffView
                employees={employees}
                legalEntities={activeLegalEntities}
                onSave={handleSaveEmployee}
                onDelete={handleDeleteEmployee}
                confirm={confirm}
            />;
            case 'archive': return <ArchiveView archivedLegalEntities={archivedLegalEntities} onUnarchive={handleUnarchiveLegalEntity} onDelete={() => { }} />;
            case 'settings': return <SettingsView />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-content font-sans">
            <Sidebar activeView={activeView} setActiveView={(v) => { setSelectedLegalEntity(null); if (v === 'tasks') { setTasksViewKey(prev => prev + 1); } setActiveView(v as View); }} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
            <Modal isOpen={isLegalEntityModalOpen} onClose={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} title={legalEntityToEdit ? 'Редактировать юр. лицо' : 'Новое юр. лицо'}>
                <ClientForm legalEntity={legalEntityToEdit} onSave={handleSaveLegalEntity} onCancel={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} />
            </Modal>
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit && taskToEdit.id ? 'Редактировать задачу' : 'Новая задача'}>
                <TaskForm legalEntities={activeLegalEntities} onSave={handleSaveTask} onCancel={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} defaultDate={taskModalDefaultDate} />
            </Modal>
            <TaskDetailModal isOpen={isTaskDetailModalOpen} onClose={() => setIsTaskDetailModalOpen(false)} tasks={tasksForDetailView} allTasks={tasks} legalEntities={activeLegalEntities} onToggleComplete={handleToggleComplete} onEdit={handleEditTaskFromDetail} onDelete={handleDeleteTask} onSelectLegalEntity={(entity: LegalEntity) => { const le = legalEntities.find(le => le.id === entity.id); if (le) { setIsTaskDetailModalOpen(false); setSelectedLegalEntity(le); setActiveView('clients'); } }} />
        </div>
    );
};

export default App;