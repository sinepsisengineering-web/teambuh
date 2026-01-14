// src/contexts/ConfirmationProvider.tsx

import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal'; // Импортируем вашу React-модалку

// Описываем опции, которые можно передать в наше окно
interface ConfirmationOptions {
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  confirmButtonClass?: string;
}

// Создаем тип для контекста. Он будет предоставлять одну функцию
type ConfirmationContextType = (options: ConfirmationOptions) => Promise<boolean>;

// Создаем сам контекст
const ConfirmationContext = createContext<ConfirmationContextType>(() => Promise.resolve(false));

// Создаем кастомный хук, чтобы было удобнее использовать контекст
export const useConfirmation = () => useContext(ConfirmationContext);

// Это главный компонент-провайдер
export const ConfirmationProvider = ({ children }: { children: ReactNode }) => {
  // Состояние для хранения опций модального окна
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  
  // Состояние для хранения resolve-функции нашего Promise
  const [resolvePromise, setResolvePromise] = useState<{ resolve: (value: boolean) => void } | null>(null);

  // Функция `confirm`, которую мы будем вызывать из любого места.
  // Она возвращает Promise, который разрешится, когда пользователь нажмет кнопку.
  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(options);
      setResolvePromise({ resolve });
    });
  }, []);

  // Обработчик для кнопки "Подтвердить"
  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise.resolve(true); // Разрешаем Promise со значением true
    }
    setOptions(null); // Закрываем окно
  };

  // Обработчик для кнопки "Отмена" или закрытия окна
  const handleClose = () => {
    if (resolvePromise) {
      resolvePromise.resolve(false); // Разрешаем Promise со значением false
    }
    setOptions(null); // Закрываем окно
  };

  return (
    // Предоставляем нашу функцию `confirm` всем дочерним компонентам
    <ConfirmationContext.Provider value={confirm}>
      {/* Рендерим дочерние компоненты (все наше приложение) */}
      {children}

      {/* А вот и сама модалка! Она будет рендериться только когда есть опции */}
      {options && (
        <ConfirmationModal
          isOpen={!!options}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={options.title}
          message={options.message}
          confirmButtonText={options.confirmButtonText}
          confirmButtonClass={options.confirmButtonClass}
        />
      )}
    </ConfirmationContext.Provider>
  );
};