// components/ArchiveView.tsx
// Страница архива с layout 70-30

import React, { useState, useEffect } from 'react';

// ============================================
// ТИПЫ
// ============================================

type ArchiveType = 'clients' | 'employees' | 'rules';

interface ArchivedItem {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  shortTitle?: string;
  legalForm?: string;
  archivedAt: string;
}

interface ArchiveViewProps {
  tenantId?: string;
  onBack?: () => void;
  onRestoreItem?: () => void; // Callback для перезагрузки данных после восстановления
}

// ============================================
// API ФУНКЦИИ
// ============================================

const API_BASE = 'http://localhost:3001/api';

const fetchArchive = async (tenantId: string, type: ArchiveType): Promise<ArchivedItem[]> => {
  const response = await fetch(`${API_BASE}/${tenantId}/archive/${type}`);
  if (!response.ok) throw new Error('Failed to fetch archive');
  return response.json();
};

const restoreItem = async (tenantId: string, type: ArchiveType, itemId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/${tenantId}/archive/${type}/${itemId}/restore`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to restore item');
};

const deleteItemForever = async (tenantId: string, type: ArchiveType, itemId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/${tenantId}/archive/${type}/${itemId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete item');
};

// ============================================
// МОДАЛКА УДАЛЕНИЯ НАВСЕГДА
// ============================================

interface DeleteForeverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}

const DeleteForeverModal: React.FC<DeleteForeverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="bg-red-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Удалить навсегда</h2>
              <p className="text-sm text-white/80">Это действие нельзя отменить</p>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              Вы собираетесь <strong>безвозвратно удалить</strong> объект:
            </p>
            <p className="text-lg font-semibold text-red-900 mt-2">«{itemName}»</p>
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p>❌ Все данные будут удалены без возможности восстановления</p>
            <p>❌ Связанные документы и файлы будут потеряны</p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Удаление...
              </>
            ) : (
              <>🗑️ Удалить навсегда</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// КОМПОНЕНТ ЭЛЕМЕНТА СПИСКА
// ============================================

interface ArchiveItemRowProps {
  item: ArchivedItem;
  type: ArchiveType;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring?: boolean;
}

const ArchiveItemRow: React.FC<ArchiveItemRowProps> = ({
  item,
  type,
  onRestore,
  onDelete,
  isRestoring = false
}) => {
  // Получить отображаемое имя
  const getDisplayName = (): string => {
    if (type === 'clients') {
      return item.name || 'Без названия';
    } else if (type === 'employees') {
      return [item.lastName, item.firstName, item.middleName].filter(Boolean).join(' ') || 'Без имени';
    } else {
      return item.shortTitle || item.name || 'Без названия';
    }
  };

  // Получить подзаголовок
  const getSubtitle = (): string => {
    if (type === 'clients') {
      return item.legalForm?.toUpperCase() || '';
    } else if (type === 'employees') {
      return '';
    } else {
      return 'Правило';
    }
  };

  const archivedDate = new Date(item.archivedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Иконка типа */}
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        {type === 'clients' && (
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0 0 20 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
          </svg>
        )}
        {type === 'employees' && <span className="text-lg">👤</span>}
        {type === 'rules' && <span className="text-lg">📋</span>}
      </div>

      {/* Название и тип */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 truncate">{getDisplayName()}</div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {getSubtitle() && <span className="bg-slate-200 px-1.5 py-0.5 rounded">{getSubtitle()}</span>}
          <span>Архивировано: {archivedDate}</span>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onRestore}
          disabled={isRestoring}
          className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {isRestoring ? (
            <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <span>↩️</span>
          )}
          Восстановить
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
        >
          <span>🗑️</span>
          Удалить
        </button>
      </div>
    </div>
  );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  tenantId = 'org_default',
  onBack,
  onRestoreItem
}) => {
  const [selectedType, setSelectedType] = useState<ArchiveType>('clients');
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Модалка удаления
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: ArchivedItem | null;
  }>({ isOpen: false, item: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Загрузка данных при смене типа
  useEffect(() => {
    loadArchive();
  }, [selectedType, tenantId]);

  const loadArchive = async () => {
    setIsLoading(true);
    try {
      const data = await fetchArchive(tenantId, selectedType);
      setItems(data);
    } catch (error) {
      console.error('Failed to load archive:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (item: ArchivedItem) => {
    setRestoringId(item.id);
    try {
      await restoreItem(tenantId, selectedType, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      // Перезагружаем данные в родителе
      if (onRestoreItem) {
        await onRestoreItem();
      }
    } catch (error) {
      console.error('Failed to restore:', error);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteForever = async () => {
    if (!deleteModal.item) return;

    setIsDeleting(true);
    try {
      await deleteItemForever(tenantId, selectedType, deleteModal.item.id);
      setItems(prev => prev.filter(i => i.id !== deleteModal.item!.id));
      setDeleteModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeLabel = (type: ArchiveType): string => {
    switch (type) {
      case 'clients': return 'Клиенты';
      case 'employees': return 'Персонал';
      case 'rules': return 'Справочники';
    }
  };

  const getTypeIcon = (type: ArchiveType): React.ReactNode => {
    switch (type) {
      case 'clients': return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0 0 20 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
        </svg>
      );
      case 'employees': return '👤';
      case 'rules': return '📋';
    }
  };

  return (
    <div className="h-full flex gap-4">
      {/* Левая колонка — Список архива (70%) */}
      <div className="w-[70%] h-full flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Заголовок */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  📦 Архив — {getTypeLabel(selectedType)}
                </h2>
                <p className="text-xs text-slate-500">
                  {items.length} объектов в архиве
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-slate-500">Загрузка...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-medium">Архив пуст</p>
              <p className="text-sm">В этой папке нет архивированных объектов</p>
            </div>
          ) : (
            items.map(item => (
              <ArchiveItemRow
                key={item.id}
                item={item}
                type={selectedType}
                onRestore={() => handleRestore(item)}
                onDelete={() => setDeleteModal({ isOpen: true, item })}
                isRestoring={restoringId === item.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Правая колонка — Папки архива (30%) */}
      <div className="w-[30%] flex flex-col gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Папки архива
          </h3>
          <div className="space-y-2">
            {(['clients', 'employees', 'rules'] as ArchiveType[]).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${selectedType === type
                  ? 'bg-primary text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span className="text-xl">{getTypeIcon(type)}</span>
                <span className="font-medium">{getTypeLabel(type)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Информация */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Как работает архив</p>
              <ul className="text-xs space-y-1 text-amber-700">
                <li>• <strong>Восстановить</strong> — вернуть объект в рабочий список</li>
                <li>• <strong>Удалить</strong> — удалить безвозвратно</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка удаления навсегда */}
      <DeleteForeverModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleDeleteForever}
        itemName={deleteModal.item?.name || deleteModal.item?.shortTitle ||
          [deleteModal.item?.lastName, deleteModal.item?.firstName].filter(Boolean).join(' ') || 'Объект'}
        isLoading={isDeleting}
      />
    </div>
  );
};