// services/notificationService.ts

import { Task, TaskStatus, LegalEntity } from '../types';

// --- Вспомогательная функция для показа уведомлений ---
// Она будет нашим единым центром для вызова API Electron
const notify = (title: string, body: string) => {
  if (window.electronAPI) {
    window.electronAPI.showNotification(title, body);
  } else {
    console.warn('Electron API не доступно. Уведомление в консоли:', title, body);
  }
};

// --- Вспомогательная функция для сравнения дат ---
// Сравнивает две даты, игнорируя время. Возвращает true, если они совпадают.
const areDatesOnSameDay = (date1: Date, date2: Date): boolean => {
  // Добавим проверку на случай, если пришла невалидная дата
  if (!(date1 instanceof Date) || isNaN(date1.getTime())) return false;
  if (!(date2 instanceof Date) || isNaN(date2.getTime())) return false;
  
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};


// --- ГЛАВНАЯ ФУНКЦИЯ ПРОВЕРКИ ---
export const checkNotificationsOnStartup = (
  tasks: Task[], 
  legalEntityMap: Map<string, LegalEntity>
) => {
  
  console.log("Запуск проверки уведомлений..."); // Для отладки
  const now = new Date();

  const dueTodayTasks: Task[] = [];
  const dueInThreeDaysTasks: Task[] = [];

  // Мы будем проверять только активные задачи
  const activeTasks = tasks.filter(
    task => task.status !== TaskStatus.Completed && task.status !== TaskStatus.Locked
  );

  for (const task of activeTasks) {
    // ГАРАНТИРУЕМ, что работаем с объектом Date, а не со строкой
    const dueDate = new Date(task.dueDate);

    // Пропускаем задачи, у которых дата выполнения уже в прошлом
    if (dueDate < now && !areDatesOnSameDay(dueDate, now)) {
      continue;
    }

    const entity = legalEntityMap.get(task.legalEntityId);
    // const entityName = entity?.name || 'Неизвестный клиент'; // Пока не используется в сводных уведомлениях

    // --- ПРАВИЛО №2: Для задач БЕЗ точного времени (включая автоматические) ---
    if (!task.dueTime) {
      
      // 1. Основное напоминание: В день выполнения
      if (areDatesOnSameDay(dueDate, now)) {
        dueTodayTasks.push(task); // Добавляем задачу в массив "на сегодня"
      }

      // 2. Предварительное напоминание: За 3 дня
      const threeDaysBefore = new Date(dueDate);
      threeDaysBefore.setDate(dueDate.getDate() - 3);
      
      if (areDatesOnSameDay(threeDaysBefore, now)) {
        dueInThreeDaysTasks.push(task); // Добавляем задачу в массив "на 3 дня"
      }
    }
    // --- КОНЕЦ ПРАВИЛА №2 ---

    if (task.dueTime) {
        // TODO: Реализовать фоновую проверку для задач со временем
    }
  }

  // --- Формирование и отправка сводных уведомлений ---

  // 1. Формируем уведомление для задач НА СЕГОДНЯ
  if (dueTodayTasks.length > 0) {
    const title = `Задачи на сегодня (${dueTodayTasks.length})`;
    
    // Перечисляем названия первых нескольких задач, чтобы текст не был слишком длинным
    const taskTitles = dueTodayTasks.map(t => t.title).slice(0, 3).join(', ');
    
    const body = dueTodayTasks.length > 3
      ? `${taskTitles} и еще ${dueTodayTasks.length - 3}...`
      : taskTitles;

    notify(title, body);
    console.log(`Отправлено сводное уведомление "на сегодня" для ${dueTodayTasks.length} задач.`);
  }

  // 2. Формируем уведомление для задач НА БЛИЖАЙШИЕ 3 ДНЯ
  if (dueInThreeDaysTasks.length > 0) {
    const title = `Задачи в ближайшие 3 дня (${dueInThreeDaysTasks.length})`;
    
    const taskTitles = dueInThreeDaysTasks.map(t => t.title).slice(0, 3).join(', ');

    const body = dueInThreeDaysTasks.length > 3
      ? `${taskTitles} и еще ${dueInThreeDaysTasks.length - 3}...`
      : taskTitles;
      
    notify(title, body);
    console.log(`Отправлено сводное уведомление "на 3 дня" для ${dueInThreeDaysTasks.length} задач.`);
  }
};
