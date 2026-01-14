// src/components/Modal.tsx

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
  // Мы больше не возвращаем null. Вместо этого мы управляем видимостью через CSS-классы.
  // if (!isOpen) return null;  // <-- ЭТА СТРОКА УДАЛЕНА

  // Определяем классы для основного контейнера в зависимости от состояния isOpen
  const overlayClasses = isOpen 
    ? "fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start pt-10 transition-opacity duration-300 ease-in-out" 
    : "hidden"; // 'hidden' (display: none) полностью убирает элемент из потока и делает его неинтерактивным
  
  const modalContainerClasses = isOpen
    ? "transform opacity-100 scale-100 transition-transform transition-opacity duration-300 ease-in-out"
    : "transform opacity-0 scale-95"; // Начальные состояния для анимации

  return (
    // Применяем динамические классы к overlay
    <div
      className={overlayClasses}
      // Добавляем проверку, чтобы onClose не срабатывал, когда модальное окно уже закрывается
      onClick={isOpen ? onClose : undefined}
      // aria-hidden для доступности
      aria-hidden={!isOpen}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col ${modalContainerClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            // Делаем кнопку недоступной для Tab, когда модальное окно скрыто
            tabIndex={isOpen ? 0 : -1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};