# Руководство по развёртыванию сервера TeamBuh

## Обзор архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│                    КЛИЕНТ (Браузер)                         │
│  React + Vite + TailwindCSS                                 │
│  Статические файлы (.html, .js, .css)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP запросы
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    СЕРВЕР (Node.js)                         │
│  Express.js API                                             │
│  ├── better-sqlite3  (SQLite база данных)                   │
│  ├── multer          (загрузка файлов)                      │
│  ├── crypto          (шифрование файлов)                    │
│  └── cors            (CORS для API)                         │
│                                                             │
│  Данные хранятся в: ./data/tenants/org_default/             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Требования к серверу

### Минимальные требования
- **ОС**: Windows Server 2019+ / Ubuntu 20.04+ / любая с Node.js
- **RAM**: 2 ГБ
- **Диск**: 10 ГБ (растёт с количеством документов)
- **Node.js**: v18.0.0 или выше
- **npm**: v9.0.0 или выше

### Проверка версий
```bash
node --version   # Должно быть v18+
npm --version    # Должно быть v9+
```

---

## 2. Установка зависимостей

### 2.1 Зависимости СЕРВЕРА (backend)

Эти библиотеки работают на сервере:

```bash
# Основные
npm install express           # Веб-сервер
npm install cors              # Разрешение кросс-доменных запросов
npm install multer            # Загрузка файлов

# База данных
npm install better-sqlite3    # SQLite для Node.js (требует компиляции)

# Шифрование (встроено в Node.js, не требует установки)
# crypto — встроенный модуль
```

#### Важно для better-sqlite3
`better-sqlite3` требует компиляции C++ кода. На Windows нужно:

```bash
# Установить Windows Build Tools (от администратора)
npm install --global windows-build-tools

# Или установить Visual Studio Build Tools вручную
```

### 2.2 Зависимости КЛИЕНТА (frontend)

Эти библиотеки работают в браузере:

```bash
npm install react react-dom   # React
npm install vite              # Сборщик (dev только)
npm install tailwindcss       # Стили
```

**Они уже установлены в проекте!**

---

## 3. Структура папок на сервере

```
TeamBuh/
├── server/                      # Серверный код
│   ├── index.js                 # Главный файл сервера
│   ├── routes/                  # API маршруты
│   └── services/                # Бизнес-логика
│
├── data/                        # ДАННЫЕ (создаётся автоматически)
│   └── tenants/
│       └── org_default/
│           ├── vault/           # Зашифрованные данные
│           │   ├── clients/     # Клиенты
│           │   ├── employees/   # Сотрудники
│           │   └── documents/   # Файлы
│           ├── db/              # SQLite базы
│           │   └── tasks.db     # Задачи
│           └── archive/         # Архив
│               └── tasks.db     # Архивные задачи
│
├── dist/                        # Скомпилированный frontend
└── package.json
```

---

## 4. Команды запуска

### Разработка (локально)
```bash
npm run dev:all     # Запуск frontend + backend одновременно
# или отдельно:
npm run dev         # Только frontend (Vite, порт 5173)
npm run server      # Только backend (Express, порт 3001)
```

### Продакшен
```bash
# 1. Сборка frontend
npm run build

# 2. Запуск сервера
npm run server:prod
# или
node server/index.js
```

---

## 5. Порты и сеть

| Сервис | Порт | Описание |
|--------|------|----------|
| Frontend (dev) | 5173 | Vite dev server |
| Backend API | 3001 | Express API сервер |
| Frontend (prod) | 80/443 | Через nginx/reverse proxy |

### Настройка firewall
```bash
# Windows (PowerShell от администратора)
New-NetFirewallRule -DisplayName "TeamBuh API" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow

# Linux (ufw)
sudo ufw allow 3001/tcp
```

---

## 6. Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Порт сервера
PORT=3001

# Режим работы
NODE_ENV=production

# Путь к данным (опционально)
DATA_PATH=./data

# Ключ шифрования (генерируется автоматически при первом запуске)
# ENCRYPTION_KEY=...
```

---

## 7. Бэкап данных

### Важные папки для бэкапа
```
data/tenants/org_default/vault/     # Зашифрованные данные клиентов
data/tenants/org_default/db/        # SQLite базы задач
data/tenants/org_default/.key       # Ключ шифрования (КРИТИЧЕСКИ ВАЖНО!)
```

### Команды бэкапа
```bash
# Windows
xcopy /E /I "data\tenants\org_default" "backup\%date%"

# Linux
tar -czvf backup_$(date +%Y%m%d).tar.gz data/tenants/org_default/
```

---

## 8. Обновление приложения

```bash
# 1. Остановить сервер

# 2. Сохранить данные (бэкап)

# 3. Обновить код
git pull origin main

# 4. Обновить зависимости
npm install

# 5. Пересобрать frontend
npm run build

# 6. Запустить сервер
npm run server:prod
```

---

## 9. Возможные проблемы

### better-sqlite3 не устанавливается
```bash
# Ошибка компиляции на Windows
npm install --global windows-build-tools
npm rebuild better-sqlite3
```

### CORS ошибки
Проверьте что в `server/index.js` разрешён ваш домен:
```javascript
app.use(cors({ origin: 'https://your-domain.com' }));
```

### Нет доступа к данным
Проверьте права на папку `data/`:
```bash
# Linux
chmod -R 755 data/
chown -R node:node data/
```

---

## 10. Мониторинг

### Логи сервера
```bash
# Запуск с логами в файл
node server/index.js >> logs/server.log 2>&1
```

### PM2 (рекомендуется для продакшена)
```bash
npm install -g pm2
pm2 start server/index.js --name "teambuh-api"
pm2 logs teambuh-api
pm2 monit
```

---

## Контрольный список установки

- [ ] Node.js v18+ установлен
- [ ] npm install выполнен без ошибок
- [ ] better-sqlite3 скомпилирован
- [ ] Папка data/ создана с правами записи
- [ ] .env файл настроен
- [ ] Firewall открыт для порта 3001
- [ ] Бэкап настроен
- [ ] PM2 установлен (для продакшена)
