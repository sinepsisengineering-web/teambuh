// components/ClientList.tsx

import React from 'react';
// <<< ИЗМЕНЕНО: Импортируем LegalEntity вместо Client >>>
import { LegalEntity } from '../types';

// <<< ИЗМЕНЕНО: Интерфейс пропсов обновлен для работы с LegalEntity >>>
interface ClientListProps {
  legalEntities: LegalEntity[];
  onSelectLegalEntity: (entity: LegalEntity) => void;
  onAddLegalEntity: () => void;
}

// <<< ИЗМЕНЕНО: Компонент теперь принимает legalEntities и соответствующие обработчики >>>
export const ClientList: React.FC<ClientListProps> = ({ legalEntities, onSelectLegalEntity, onAddLegalEntity }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        {/* Заголовок оставляем "Клиенты" для простоты восприятия, но кнопка теперь добавляет юр. лицо */}
        <h2 className="text-2xl font-bold text-slate-800">Клиенты</h2>
        <button
          // <<< ИЗМЕНЕНО: Вызываем onAddLegalEntity >>>
          onClick={onAddLegalEntity}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {/* <<< ИЗМЕНЕНО: Текст на кнопке >>> */}
          Добавить юр. лицо
        </button>
      </div>
      
      {/* <<< ИЗМЕНЕНО: Проверяем длину массива legalEntities >>> */}
      {legalEntities.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg flex-1 flex items-center justify-center">
          <div>
            {/* <<< ИЗМЕНЕНО: Текст для пустого состояния >>> */}
            <p className="text-slate-500">Список юридических лиц пуст.</p>
            <p className="text-slate-500">Нажмите "Добавить юр. лицо", чтобы начать.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2">
          {/* <<< ИЗМЕНЕНО: Перебираем массив legalEntities >>> */}
          {legalEntities.map(entity => (
            <div
              key={entity.id}
              // <<< ИЗМЕНЕНО: Передаем entity в обработчик >>>
              onClick={() => onSelectLegalEntity(entity)}
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-lg cursor-pointer transition-all duration-200"
            >
              {/* <<< ИЗМЕНЕНО: Логика отображения полностью переделана под одно юр. лицо >>> */}
              <div>
                <h3 className="font-semibold text-lg text-indigo-700">{`${entity.legalForm} «${entity.name}»`}</h3>
                <p className="text-sm text-slate-600 mt-1">ИНН: {entity.inn}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};