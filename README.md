# TeamBuh

**Многопользовательское веб-приложение для бухгалтерских команд**

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com/)

---

## О проекте

TeamBuh — веб-приложение для командного управления бухгалтерскими задачами:

- 📅 Календарь задач с автоматической генерацией по налоговым правилам
- 👥 RBAC (super-admin, admin, senior, junior) с приглашениями по ссылке
- 📊 Управление клиентами и сотрудниками
- 🔐 JWT-авторизация + SQLite хранение (auth.db)
- 🐳 Docker-ready: один контейнер = один клиент

---

## Быстрый старт (разработка)

```bash
# 1. Установить зависимости
npm install

# 2. Инициализировать базу данных
node scripts/init-fresh-instance.js

# 3. Запустить фронт + бэк
npm run dev:all
```

Откройте `http://localhost:5173/` — логин: `admin@teambuh.local` / `admin123`

---

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev:all` | Фронт (Vite :5173) + бэк (Express :3001) |
| `npm run dev` | Только Vite dev-server |
| `npm run server` | Только Express-сервер |
| `npm run build` | Сборка фронтенда (dist/) |
| `npm run start:prod` | Production-запуск (раздаёт dist/) |

---

## Docker

```bash
# Собрать и запустить
docker compose up --build

# С кастомным портом и именем
APP_PORT=8002 INSTANCE_NAME=romashka docker compose up --build -d
```

### Что внутри

- **Stage 1:** `node:20-alpine` → `npm ci` + `vite build` → `dist/`
- **Stage 2:** `node:20-alpine` → production deps + `server/` + `scripts/` + `dist/`
- Volume: `./data:/app/data` — данные клиента (БД, файлы)

---

## Структура данных

```
data/
├── global_data/
│   └── rules.db              ← Налоговые правила (общие)
└── client_data/
    └── org_default/           ← Тенант
        └── db/
            ├── auth.db        ← Пользователи + приглашения
            ├── clients.db     ← Клиенты
            ├── tasks.db       ← Задачи
            └── rules.db       ← Правила тенанта
```

---

## Авторизация

### Роли

| Роль | Описание |
|------|----------|
| `super-admin` | Полный доступ (создаётся при init) |
| `admin` | Директор — управление людьми и клиентами |
| `senior` | Старший бухгалтер |
| `junior` | Стажёр |

### Регистрация

| URL | Кто | Как |
|-----|-----|-----|
| `/` | Любой сотрудник | Логин email + пароль |
| `/?invite=TOKEN` | Приглашённый | По ссылке от admin/senior |
| `/?register&email=xxx` | Директор | Самостоятельная регистрация |

### API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Логин |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/change-password` | Смена пароля |
| POST | `/api/auth/invite` | Создать приглашение |
| GET | `/api/auth/invite/:token` | Проверить приглашение |
| POST | `/api/auth/register` | Регистрация по приглашению |
| POST | `/api/auth/register-admin` | Регистрация директора |

---

## Структура проекта

```
teambuh/
├── components/          # React-компоненты (TasksView, ClientsView, ...)
├── contexts/            # AuthContext, ...
├── hooks/               # useTasks, useClients, ...
├── services/            # taskLifecycle, rulesService, ...
├── types/               # TypeScript типы
├── server/
│   ├── index.js         # Express API + static serving
│   ├── auth.js          # JWT, bcrypt, middleware
│   └── database/
│       ├── authDatabase.js     # users + invitations
│       ├── clientsDatabase.js  # clients (append-only)
│       ├── taskDatabase.js     # tasks
│       └── rulesDatabase.js    # tax rules
├── scripts/
│   └── init-fresh-instance.js  # Инициализация БД
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Production деплой

См. [server_architecture.md](./server_architecture.md) — полная архитектура с Traefik, автоматическая регистрация тенантов, Docker volumes.

---

## Лицензия

MIT
