// src/components/ClientDetailCard.tsx

import React, { useState, useMemo } from 'react';
import { LegalEntity, Task, Patent, Credential, Note } from '../types';
import { ReusableTaskList } from './ReusableTaskList';
import { FilterModal, FilterState } from './FilterModal';
import { isTaskLocked } from '../services/taskGenerator';
import { useConfirmation } from '../contexts/ConfirmationProvider';

type DetailTab = 'requisites' | 'tasks' | 'patents' | 'credentials' | 'notes';

interface ClientDetailCardProps {
  legalEntity: LegalEntity;
  tasks: Task[];
  onClose: () => void;
  onEdit: (entity: LegalEntity) => void;
  onArchive: (entity: LegalEntity) => void;
  onDelete: (entity: LegalEntity) => void;
  onAddTask: (defaultValues: Partial<Task>) => void;
  onOpenTaskDetail: (tasks: Task[], date: Date) => void;
  onBulkComplete: (taskIds: string[]) => void;
  onBulkDelete: (taskIds: string[]) => void;
  onDeleteTask: (taskId: string) => void;
  onAddNote: (legalEntityId: string, noteText: string) => void;
  onEditNote: (legalEntityId: string, noteId: string, newText: string) => void;
  onDeleteNote: (legalEntityId: string, noteId: string) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-slate-200 first:border-t-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{value || <span className="text-slate-400">-</span>}</dd>
    </div>
);

const AddNoteForm: React.FC<{ onAdd: (text: string) => void }> = ({ onAdd }) => {
    const [text, setText] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim());
            setText('');
        }
    };
    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border-t border-slate-200">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст новой заметки..."
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
            />
            <div className="flex justify-end mt-2">
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    disabled={!text.trim()}
                >
                    Добавить заметку
                </button>
            </div>
        </form>
    );
};


export const ClientDetailCard: React.FC<ClientDetailCardProps> = ({ 
  legalEntity, tasks, onClose, onEdit, onArchive, onDelete, onAddTask,
  onOpenTaskDetail, onBulkComplete, onBulkDelete, onDeleteTask, onAddNote,
  onEditNote,
  onDeleteNote
}) => {
  const confirm = useConfirmation();

  const [activeTab, setActiveTab] = useState<DetailTab>('requisites');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '', selectedClients: [], selectedYear: 'all', selectedStatuses: [],
  });

  // Состояния для редактирования заметок
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // === НОВОЕ СОСТОЯНИЕ: Видимость паролей ===
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const availableYears = useMemo(() => 
    Array.from(new Set(tasks.map(task => new Date(task.dueDate).getFullYear()))).sort((a, b) => a - b), 
  [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const searchLower = filters.searchText.toLowerCase();
        return (
            task.title.toLowerCase().includes(searchLower) &&
            (filters.selectedYear === 'all' || new Date(task.dueDate).getFullYear() === parseInt(filters.selectedYear, 10)) &&
            (filters.selectedStatuses.length === 0 || filters.selectedStatuses.includes(task.status))
        );
    });
  }, [tasks, filters]);
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const selectableTaskIds = useMemo(() => new Set(
      filteredTasks.filter(task => !isTaskLocked(task)).map(t => t.id)
  ), [filteredTasks]);

  const handleSelectAll = () => setSelectedTasks(new Set(selectableTaskIds));
  const handleDeselectAll = () => setSelectedTasks(new Set());

  const handleTaskSelect = (taskId: string, isSelected: boolean) => {
      setSelectedTasks(prev => {
          const newSet = new Set(prev);
          if (isSelected) newSet.add(taskId);
          else newSet.delete(taskId);
          return newSet;
      });
  };

  const handleBulkComplete = () => {
      if (selectedTasks.size === 0) return;
      onBulkComplete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
  };
  
  const handleBulkDelete = async () => {
      if (selectedTasks.size === 0) return;
      const isConfirmed = await confirm({
        title: 'Подтверждение удаления',
        message: 'Вы уверены, что хотите удалить выбранные задачи?',
        confirmButtonText: 'Удалить',
        confirmButtonClass: 'bg-red-600 hover:bg-red-700'
      });
      if (isConfirmed) {
          onBulkDelete(Array.from(selectedTasks));
          setSelectedTasks(new Set());
      }
  };
  
  const handleDeleteClient = async () => {
    const isConfirmed = await confirm({
      title: 'Подтверждение удаления',
      message: `Вы уверены, что хотите удалить клиента «${legalEntity.name}»? Это действие нельзя будет отменить.`,
      confirmButtonText: 'Удалить',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    if (isConfirmed) {
      onDelete(legalEntity);
    }
  };

  // Обработчики заметок
  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleSaveNote = () => {
    if (!editingNoteId || !editingNoteText.trim()) return;
    onEditNote(legalEntity.id, editingNoteId, editingNoteText.trim());
    handleCancelEdit();
  };
  
  const handleDeleteNote = async (noteId: string) => {
    const isConfirmed = await confirm({
      title: 'Подтвердить удаление',
      message: 'Вы уверены, что хотите удалить эту заметку?',
      confirmButtonText: 'Удалить',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    if (isConfirmed) {
      onDeleteNote(legalEntity.id, noteId);
    }
  };

  // === НОВЫЙ ОБРАБОТЧИК: Переключение видимости пароля ===
  const togglePasswordVisibility = (credId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [credId]: !prev[credId] }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'requisites':
        return (
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 mt-4">
              <dl>
                  <DetailRow label="ИНН / КПП" value={`${legalEntity.inn}${legalEntity.kpp ? ` / ${legalEntity.kpp}` : ''}`} />
                  <DetailRow label="ОГРН / ОГРНИП" value={legalEntity.ogrn} />
                  <DetailRow label="Дата ОГРН" value={legalEntity.ogrnDate ? new Date(legalEntity.ogrnDate).toLocaleDateString('ru-RU') : undefined} />
                  <DetailRow label="Система налогообложения" value={legalEntity.taxSystem} />
                  <DetailRow label="Плательщик НДС" value={legalEntity.isNdsPayer ? `Да ${legalEntity.ndsValue ? `(${legalEntity.ndsValue})` : ''}`: 'Нет'} />
                  <DetailRow label="Сотрудники" value={legalEntity.hasEmployees ? 'Есть' : 'Нет'} />
                  <DetailRow label="Юридический адрес" value={legalEntity.legalAddress} />
                  <DetailRow label="Фактический адрес" value={legalEntity.actualAddress} />
                  <DetailRow label="Контактное лицо" value={legalEntity.contactPerson} />
                  <DetailRow label="Телефон / Email" value={`${legalEntity.phone || ''} / ${legalEntity.email || ''}`} />
              </dl>
          </div>
        );
      case 'tasks': {
        const legalEntityMap = new Map<string, LegalEntity>([[legalEntity.id, legalEntity]]);
        const headerComponent = (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {selectedTasks.size > 0 ? (
                <>
                  <span className="text-sm font-medium text-slate-700">Выбрано: {selectedTasks.size}</span>
                  <button onClick={handleBulkComplete} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Выполнить</button>
                  <button onClick={handleBulkDelete} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Удалить</button>
                  <button onClick={handleDeselectAll} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200">Снять</button>
                </>
              ) : (
                <>
                  <button onClick={handleSelectAll} disabled={selectableTaskIds.size === 0} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50">Выбрать все</button>
                  <button onClick={() => setIsFilterModalOpen(true)} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    Фильтры
                  </button>
                </>
              )}
            </div>
            <button onClick={() => onAddTask({ legalEntityId: legalEntity.id })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow" >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Добавить задачу
            </button>
          </div>
        );
        return (
          <div className="h-full flex flex-col">
            <ReusableTaskList tasks={filteredTasks} legalEntityMap={legalEntityMap} selectedTaskIds={selectedTasks} selectableTaskIds={selectableTaskIds} onTaskSelect={handleTaskSelect} onOpenDetail={onOpenTaskDetail} onDeleteTask={onDeleteTask} headerComponent={headerComponent} emptyStateText="У этого клиента нет задач, соответствующих фильтру." stickyTopOffset={0}/>
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} clients={[legalEntity]} availableYears={availableYears} filters={filters} onApplyFilters={setFilters} />
          </div>
        );
      }
      case 'patents': return ( <div className="mt-4 space-y-3"> {legalEntity.patents?.length ? legalEntity.patents.map((patent: Patent, index) => ( <div key={index} className="p-4 border rounded-lg bg-slate-50"> <p className="font-semibold">{patent.name}</p> <p className="text-sm text-slate-600">Срок действия: {new Date(patent.startDate).toLocaleDateString()} - {new Date(patent.endDate).toLocaleDateString()}</p> </div> )) : <p className="text-slate-500 text-center py-8">Патенты не добавлены.</p>} </div> );
      
      // === ОБНОВЛЕННЫЙ БЛОК CREDENTIALS ===
      case 'credentials': 
        return ( 
          <div className="mt-4 space-y-3"> 
            {legalEntity.credentials?.length ? legalEntity.credentials.map((cred: Credential, index) => {
               // Используем cred.id если есть, или index как фоллбэк
               const key = cred.id || index.toString(); 
               return (
                <div key={key} className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex justify-between items-start">
                        <div className="w-full">
                            <p className="font-semibold text-lg text-slate-800 mb-2">{cred.service}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-2 rounded border border-slate-200">
                                    <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Логин</span>
                                    <span className="text-slate-800 select-all">{cred.login}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200 flex justify-between items-center">
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Пароль</span>
                                        <span className="text-slate-800 font-mono select-all">
                                            {visiblePasswords[key] ? cred.password : '••••••••'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => togglePasswordVisibility(key)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
                                        title={visiblePasswords[key] ? "Скрыть пароль" : "Показать пароль"}
                                    >
                                        {visiblePasswords[key] ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
               );
            }) : <p className="text-slate-500 text-center py-8">Учетные данные не добавлены.</p>} 
          </div> 
        );
      
      case 'notes': 
        return ( 
          <div className="mt-4 flex flex-col h-full"> 
            <div className="flex-grow overflow-y-auto pr-2 space-y-4"> 
              {legalEntity.notes && legalEntity.notes.length > 0 ? ( 
                [...legalEntity.notes].reverse().map((note: Note) => ( 
                  <div key={note.id} className="p-4 border rounded-lg bg-slate-50">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          rows={4}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleSaveNote}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start group">
                        <div>
                          <p className="text-sm text-slate-500 mb-2"> 
                            {new Date(note.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} 
                          </p> 
                          <p className="whitespace-pre-wrap">{note.text}</p> 
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-4">
                          <button 
                            onClick={() => handleStartEdit(note)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-full"
                            title="Редактировать заметку"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-full"
                            title="Удалить заметку"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div> 
                    )}
                  </div>
                )) 
              ) : ( 
                <p className="text-slate-500 text-center py-8">Заметок пока нет.</p> 
              )} 
            </div> 
            <div className="flex-shrink-0"> 
              <AddNoteForm onAdd={(text) => onAddNote(legalEntity.id, text)} /> 
            </div> 
          </div> 
        );
      
      default: return null;
    }
  };
  
  const getTabClassName = (tabName: DetailTab) => 
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tabName 
        ? 'bg-indigo-100 text-indigo-700' 
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
        <div className="relative z-10 flex justify-between items-start pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{`${legalEntity.legalForm} «${legalEntity.name}»`}</h2>
          </div>
          <div className="flex items-center gap-2 -mr-2">
              <button onClick={() =>onEdit(legalEntity)} className="p-2 text-slate-500 hover:text-indigo-600" title="Редактировать"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
              <button onClick={() => onArchive(legalEntity)} className="p-2 text-slate-500 hover:text-yellow-600" title="Архивировать"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
              <button onClick={handleDeleteClient} className="p-2 text-slate-500 hover:text-red-600" title="Удалить"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800" title="Закрыть"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        
        <nav className="mt-4 flex space-x-2 border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
          <button className={getTabClassName('requisites')} onClick={() => setActiveTab('requisites')}>Реквизиты</button>
          <button className={getTabClassName('tasks')} onClick={() => setActiveTab('tasks')}>Задачи ({filteredTasks.length})</button>
          <button className={getTabClassName('notes')} onClick={() => setActiveTab('notes')}>Заметки ({legalEntity.notes?.length || 0})</button>
          <button className={getTabClassName('patents')} onClick={() => setActiveTab('patents')}>Патенты ({legalEntity.patents?.length || 0})</button>
          <button className={getTabClassName('credentials')} onClick={() => setActiveTab('credentials')}>Учетные данные ({legalEntity.credentials?.length || 0})</button>
        </nav>

        <div className="flex-1 overflow-y-auto mt-4">
            {renderTabContent()}
        </div>
    </div>
  );
};