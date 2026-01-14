// components/ArchiveView.tsx

import React from 'react';
// <<< ИЗМЕНЕНО: Импортируем LegalEntity вместо Client >>>
import { LegalEntity } from '../types';

// <<< ИЗМЕНЕНО: Пропсы обновлены >>>
interface ArchiveViewProps {
  archivedLegalEntities: LegalEntity[];
  onUnarchive: (entityId: string) => void;
  onDelete: (entityId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ archivedLegalEntities, onUnarchive, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Архив</h2>
      {/* <<< ИЗМЕНЕНО: Проверяем archivedLegalEntities >>> */}
      {archivedLegalEntities.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-500">Архив пуст.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* <<< ИЗМЕНЕНО: Перебираем archivedLegalEntities >>> */}
          {archivedLegalEntities.map(entity => (
            <div
              key={entity.id}
              className="p-4 border border-slate-200 rounded-lg bg-slate-50"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  {/* <<< ИЗМЕНЕНО: Отображаем данные из entity >>> */}
                  <h3 className="font-semibold text-lg text-slate-700">{entity.legalForm} «{entity.name}»</h3>
                  <p className="text-sm text-slate-500">ИНН: {entity.inn}</p>
                </div>
                <div className="flex items-center gap-4 mt-3 sm:mt-0">
                  <button
                    onClick={() => onUnarchive(entity.id)}
                    className="px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                  >
                    Восстановить
                  </button>
                  <button
                    onClick={() => onDelete(entity.id)}
                    className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Удалить навсегда
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};