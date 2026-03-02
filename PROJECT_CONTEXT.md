# TeamBuh — Полный контекст проекта

> Этот файл содержит исчерпывающее описание проекта TeamBuh для быстрого ввода нового AI-агента или разработчика.

---

## 1. Что это за проект

**TeamBuh** — мультипользовательская CRM-система для бухгалтерских фирм. Позволяет управлять клиентами, сотрудниками, задачами, услугами и документами. Поддерживает SaaS-модель: каждая бухгалтерская фирма получает изолированную копию приложения.

### Ключевые возможности

- **Клиенты** — полная карточка юридического лица (ИП, ООО, АО), контакты, документы, прикреплённые услуги
- **Задачи** — автогенерация по правилам, ручное создание, календарь с дедлайнами, статусы (не начата → в работе → завершена), привязка к клиентам и сотрудникам
- **Правила** — шаблоны для автоматической генерации задач (ежемесячные, квартальные, годовые)
- **Сотрудники** — роли (Директор, Старший бухгалтер, Бухгалтер), приглашения по ссылке
- **Услуги** — каталог услуг и пакетов, привязка к клиентам
- **Документы** — загрузка, хранение, предпросмотр
- **Архив** — перенос и восстановление данных
- **Авторизация** — JWT, ролевая модель, инвайт-система

---

## 2. Технологический стек

| Слой | Технологии |
|------|-----------|
| **Фронтенд** | React 19, TypeScript, TailwindCSS 4, Vite 5 |
| **Бэкенд** | Node.js 20, Express 4, JavaScript |
| **БД** | SQLite (better-sqlite3), Append-Only модель |
| **Авторизация** | JWT (jsonwebtoken), bcryptjs |
| **Загрузка файлов** | Multer |
| **Контейнеризация** | Docker, Docker Compose |
| **Reverse Proxy** | Traefik v3 (SSL, Let's Encrypt) |
| **SaaS** | Bash-скрипты управления тенантами |

---

## 3. Структура проекта

```
TeamBuh/
├── App.tsx                    # Главный компонент, роутинг между View
├── index.tsx                  # Точка входа React
├── index.html                 # HTML-шаблон (Vite)
├── index.css                  # Глобальные стили
├── apiConfig.ts               # Настройка API URL (VITE_API_URL)
├── types.ts                   # Основные типы: Client, Task, Rule, Service...
├── types/
│   ├── auth.ts                # Типы авторизации: User, UserRole, Invitation
│   └── data.ts                # Типы данных
├── constants/
│   └── dictionaries.ts        # Справочники: налоговые системы, юр. формы
│
├── components/                # React-компоненты (34 файла)
│   ├── LoginScreen.tsx        # Экран входа (3 режима: login/register/admin)
│   ├── Sidebar.tsx            # Боковая навигация
│   ├── DashboardView.tsx      # Главная панель
│   ├── ClientsView.tsx        # Управление клиентами (самый большой: 140KB)
│   ├── TasksView.tsx          # Управление задачами (82KB)
│   ├── StaffView.tsx          # Управление сотрудниками (69KB)
│   ├── CalendarTab.tsx        # Календарь задач (50KB)
│   ├── ServicesView.tsx       # Каталог услуг и пакетов (42KB)
│   ├── RulesView.tsx          # Правила автогенерации задач (35KB)
│   ├── RuleCreateModal.tsx    # Модалка создания правила (45KB)
│   ├── TaskCreateTab.tsx      # Вкладка создания задачи (66KB)
│   ├── Calendar.tsx           # Виджет-календарь
│   ├── ArchiveView.tsx        # Архив клиентов
│   ├── FormComponents.tsx     # Переиспользуемые компоненты форм
│   ├── LegalEntityForm.tsx    # Форма юридического лица
│   ├── LegalEntityEditForm.tsx # Редактирование юр. лица
│   ├── ContractUpload.tsx     # Загрузка договоров
│   ├── DocumentUpload.tsx     # Загрузка документов
│   ├── InviteModal.tsx        # Модалка приглашения сотрудника
│   ├── Modal.tsx              # Базовый компонент модалки
│   ├── ConfirmationModal.tsx  # Модалка подтверждения
│   └── ...                    # И другие компоненты
│
├── services/                  # Фронтенд-сервисы (16 файлов)
│   ├── taskGenerator.ts       # Генерация задач по правилам
│   ├── taskSyncService.ts     # Синхронизация задач с сервером
│   ├── taskStorageService.ts  # Хранение задач
│   ├── taskLifecycle.ts       # Жизненный цикл задачи
│   ├── taskIndicators.ts      # Индикаторы статусов задач
│   ├── rulesService.ts        # Работа с правилами
│   ├── holidayService.ts      # Производственный календарь РФ
│   ├── dateRegistry.ts        # Реестр дат и дедлайнов
│   ├── employeeService.ts     # Работа с сотрудниками
│   ├── permissionService.ts   # Проверка прав доступа
│   ├── documentService.ts     # Работа с документами
│   ├── storageService.ts      # Обёртка хранилища
│   ├── database.ts            # Клиентская БД (PouchDB)
│   ├── tenantService.ts       # Мультитенантность
│   └── idService.ts           # Генерация ID
│
├── contexts/                  # React Context
│   ├── AuthContext.tsx         # Контекст авторизации
│   ├── ConfirmationProvider.tsx # Контекст подтверждений
│   └── TaskModalContext.tsx   # Контекст модалки задач
│
├── hooks/
│   └── useTasks.ts            # Хук для работы с задачами
│
├── server/                    # Бэкенд (Express)
│   ├── index.js               # Главный файл сервера (82KB!)
│   ├── auth.js                # JWT, хеширование, секреты
│   ├── database/
│   │   ├── authDatabase.js    # Users, Invitations (auth.db)
│   │   ├── clientsDatabase.js # Clients (clients.db) — Append-Only
│   │   ├── taskDatabase.js    # Tasks (tasks.db) — Append-Only
│   │   ├── rulesDatabase.js   # Rules (rules.db) — Append-Only
│   │   ├── servicesDatabase.js # Services, Packages (services.db)
│   │   └── rulesMigration.js  # Миграция правил
│   ├── routes/
│   │   ├── taskRoutes.ts      # API задач
│   │   ├── rulesRoutes.ts     # API правил
│   │   └── servicesRoutes.js  # API услуг
│   └── services/
│       └── ...
│
├── scripts/                   # Скрипты управления
│   ├── create-admin.js        # Создание admin-пользователя
│   ├── create-tenant.sh       # Создание нового тенанта (SaaS)
│   ├── update-tenants.sh      # Обновление кода тенантов
│   ├── delete-tenant.sh       # Удаление тенанта
│   ├── backup-tenant.sh       # Бэкап данных тенанта
│   ├── prepare-template.sh    # Подготовка template/ из проекта
│   ├── init-fresh-instance.js # Инициализация чистой БД
│   └── clean-for-production.js # Очистка для продакшена
│
├── master/                    # SaaS Master-сервис
│   ├── docker-compose.yml     # Traefik + master-api
│   ├── server.js              # REST API управления тенантами
│   ├── Dockerfile             # Контейнер master
│   ├── package.json           # Зависимости master
│   ├── public/
│   │   └── index.html         # Лендинг + форма регистрации фирмы
│   └── traefik/
│       └── dynamic/           # Автогенерируемые конфиги роутов
│
├── template/                  # Эталонная копия для клонирования
│   ├── docker-compose.yml     # Шаблон compose для тенантов
│   └── .env.template          # Шаблон переменных
│
├── docker-compose.yml         # Для локальной разработки
├── Dockerfile                 # Образ приложения
├── vite.config.ts             # Конфигурация Vite
├── tailwind.config.js         # Конфигурация Tailwind
├── tsconfig.json              # TypeScript конфигурация
└── PROJECT_RULES.md           # Правила разработки
```

---

## 4. Архитектура данных

### Модель Append-Only

Все таблицы клиентов, задач и правил используют **Append-Only** модель:
- Каждая запись имеет `version` (инкремент при обновлении)
- Удаление = создание записи с `_deleted: true`
- GET-запросы возвращают только последнюю версию (MAX version)
- Полная история изменений сохраняется

### SQLite базы данных

Каждый тенант имеет свои изолированные БД:

```
data/client_data/org_default/db/
├── auth.db       # Пользователи и приглашения
├── clients.db    # Клиенты (юр. лица)
├── tasks.db      # Задачи
├── rules.db      # Правила автогенерации
└── services.db   # Услуги и пакеты
```

### Основные сущности

| Сущность | Ключевые поля |
|----------|--------------|
| **Client** | id, shortName, legalForm (IP/OOO/AO), taxSystem (OSNO/USN6/USN15/PATENT), inn, status, accountantId, contacts[], credentials[] |
| **Task** | id, title, ruleId, clientIds[], assignedTo, status (not_started/in_progress/done), priority (low/medium/high/critical), deadline |
| **Rule** | id, name, taskTitle, frequency (monthly/quarterly/yearly), deadlineDay, applicableFilters, assignTo |
| **User** | id, email, name, role (super-admin/admin/senior/junior), tenantId |
| **Service** | id, name, price, unit, periodicity, category |
| **Package** | id, name, price, includedItems[], targetEntityType |

---

## 5. Ролевая модель

| Роль | Код | Может |
|------|-----|-------|
| Владелец | `super-admin` | Всё + назначать директоров |
| Директор | `admin` | Управление сотрудниками, клиентами, правилами, приглашения |
| Старший бухгалтер | `senior` | Просмотр и работа с назначенными клиентами и задачами |
| Бухгалтер | `junior` | Только свои задачи и назначенные клиенты |

---

## 6. API-эндпоинты

### Авторизация
```
POST /api/auth/login               # Вход
POST /api/auth/register            # Регистрация по инвайту
POST /api/auth/register-admin      # Регистрация директора
GET  /api/auth/me                  # Текущий пользователь
```

### Клиенты
```
GET    /api/:tenantId/clients      # Список клиентов
POST   /api/:tenantId/clients      # Создать клиента
PUT    /api/:tenantId/clients/:id  # Обновить клиента
DELETE /api/:tenantId/clients/:id  # Удалить клиента (мягко)
```

### Задачи
```
GET    /api/:tenantId/tasks        # Список задач
POST   /api/:tenantId/tasks        # Создать задачу
PUT    /api/:tenantId/tasks/:id    # Обновить задачу
DELETE /api/:tenantId/tasks/:id    # Удалить задачу
POST   /api/:tenantId/tasks/batch  # Массовое создание/обновление
```

### Правила, Услуги, Пакеты, Сотрудники — аналогичный CRUD

### Master API (управление тенантами)
```
GET    /api/tenants                # Список тенантов
POST   /api/tenants                # Создать тенанта
POST   /api/tenants/:id/stop      # Остановить контейнер
POST   /api/tenants/:id/start     # Запустить контейнер
DELETE /api/tenants/:id            # Удалить тенанта
GET    /health                     # Healthcheck
```

---

## 7. SaaS-архитектура

```
┌─────────────────────────────────────────────┐
│              teambuh.ru                      │
│  ┌─────────┐  ┌──────────────────────────┐  │
│  │ Traefik │──│ Master API               │  │
│  │ :80/:443│  │ Лендинг + Регистрация    │  │
│  └────┬────┘  │ POST /api/tenants        │  │
│       │       └──────────────────────────┘  │
│       │                                      │
│   ┌───┴───────────────────────────────┐     │
│   │       Субдомены                    │     │
│   │                                    │     │
│   │  romashka.teambuh.ru ──→ контейнер │     │
│   │  vesna.teambuh.ru    ──→ контейнер │     │
│   │  ...                               │     │
│   └────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### Каждый тенант — это:
- Полная копия приложения в `tenants/<id>/`
- Свой Docker-контейнер (`teambuh-<id>`)
- Свои БД в `data/` (полная изоляция)
- Свой `.env` (порт, JWT_SECRET)
- Свой роут в Traefik (`<id>.teambuh.ru`)

### Скрипты управления
- `create-tenant.sh` — копирует template, генерирует .env, создаёт admin, запускает контейнер, добавляет роут Traefik
- `update-tenants.sh` — обновляет код (rsync), **исключая data/** (сохраняя данные клиентов)
- `delete-tenant.sh` — останавливает контейнер, удаляет файлы и роут
- `backup-tenant.sh` — бэкап data/ в .tar.gz

---

## 8. Запуск

### Локальная разработка
```bash
npm install          # Установить зависимости
npm run dev          # Vite dev-сервер (фронтенд) → localhost:5173
node server/index.js # Бэкенд → localhost:3001

# Создать тестового пользователя
node scripts/create-admin.js "admin@test.ru" "Admin" "123456"
```

### Продакшен (Docker)
```bash
docker compose up -d --build   # Единый контейнер
```

### SaaS (Master + тенанты)
```bash
cd master
docker compose up -d           # Traefik + Master API
./scripts/create-tenant.sh romashka petrov@romashka.ru "Петров" pass123
```

---

## 9. Паттерны и конвенции

### Фронтенд
- **Direct UI Data Ownership**: каждый View (ClientsView, TasksView, StaffView) сам загружает данные через API, не через App.tsx
- **Hybrid Sync Pattern**: подписка на `onDataChanged` для кросс-компонентного обновления
- Компоненты используют TailwindCSS + inline классы
- Модалки через React Context (ConfirmationProvider, TaskModalContext)
- Все ID генерируются через `idService.ts`

### Бэкенд
- Все маршруты проходят через `/api/:tenantId/...` (мультитенантность)
- `server/index.js` — монолитный файл (82KB), содержит большинство обработчиков
- Специфичные роуты вынесены в `server/routes/`
- БД-операции изолированы в `server/database/`
- JWT-токен проверяется middleware на каждом запросе (кроме auth)

### Данные
- Append-Only: никогда не `UPDATE`, только `INSERT` с новой версией
- Мягкое удаление: `_deleted: true`
- tenantId по умолчанию: `org_default`

---

## 10. Переменные окружения

```env
# Фронтенд (Vite)
VITE_API_URL=http://localhost:3001    # URL бэкенда

# Бэкенд
NODE_ENV=production                    # Режим
PORT=3001                              # Порт сервера
JWT_SECRET=<random_hex_64>             # Секрет JWT

# SaaS (Master)
DOMAIN=teambuh.ru                      # Основной домен
PROJECT_ROOT=/srv                      # Корень проекта (в Docker)
ACME_EMAIL=admin@teambuh.ru            # Email для Let's Encrypt
```

---

## 11. Текущее состояние (Март 2026)

### Что готово ✅
- Полный CRUD клиентов, задач, правил, услуг, сотрудников
- Автогенерация задач по правилам
- Календарь с задачами
- Система приглашений сотрудников
- Загрузка и просмотр документов
- Архивация клиентов
- SaaS: master-сервис, лендинг, скрипты управления
- Docker: рабочие образы, Traefik SSL

### В работе 🔧
- Полное тестирование SaaS потока (создание/удаление тенантов)
- Дебаг create-tenant.sh (Docker CLI внутри master-контейнера)
- Синхронизация template ↔ tenants при обновлениях

### Известные особенности
- `server/index.js` — очень большой (82KB), часть логики стоит вынести в роуты
- Некоторые роут-файлы дублируются (.js и .ts версии)
- PouchDB используется на фронте параллельно с SQLite на бэке (исторический артефакт)

---

## 12. GitHub

**Репозиторий**: https://github.com/sinepsisengineering-web/teambuh  
**Ветка**: `main`  
**Сервер**: `teambuh.ru` (VPS, Docker)
