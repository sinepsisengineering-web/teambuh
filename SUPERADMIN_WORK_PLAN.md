# TeamBuh — План разработки SuperAdmin панели

## 1) Зафиксированные решения
- Домен панели: `admin-oleg.teambuh.ru`
- Авторизация: `login + password + TOTP (Authy)`
- Антибрут: `5 неудачных попыток -> блок 15 минут`
- SuperAdmin: только `1` аккаунт
- Хранилище SuperAdmin: отдельная SQLite БД `master/superadmin.db`
- Главная: без дашбордов, только навигация по разделам
- Вход в клиента: через одноразовый `impersonation token`
- Внутри клиента: полный доступ ко всем разделам
- Обязательный баннер: `Вы в режиме SuperAdmin` + кнопка `Выйти из режима`
- Таймаут сессии SuperAdmin: `30 минут` неактивности
- Сброс пароля пользователя клиента: показать новый пароль `1 раз` в модалке + предупреждение "сохраните пароль"
- В архив клиента: сразу блокировать вход всем пользователям клиента
- Восстановление из архива: доступ автоматически возвращается
- Удаление из архива: одно подтверждение `OK` (без ручного ввода tenant_id)
- Полное удаление клиента: удалить все данные клиента, но сохранить общий журнал SuperAdmin
- Email-функции: отложены на отдельный этап после стабилизации
- Важно: эталонная БД налоговых правил хранится на сервере и не подгружается автоматически из GitHub

## 2) Меню SuperAdmin панели
- Главная
- Клиенты
- Архив
- Налоговые правила
- Журнал
- Настройки

## 3) Раздел "Клиенты"
- Таблица клиентов (тенантов) с колонками:
- `tenant_id` (имя папки на сервере)
- Название компании
- Домен
- Статус (`active / archived / suspended`)
- Дата создания
- Количество пользователей
- Действия:
- Войти как SuperAdmin (impersonation)
- Сбросить пароль пользователя
- Приостановить / Возобновить
- Отправить в архив

## 4) Раздел "Архив"
- Список архивных клиентов
- Действия:
- Восстановить
- Удалить навсегда (с одним подтверждением)

## 5) Раздел "Налоговые правила"
- Полный CRUD системных налоговых правил
- Версионирование изменений правил
- Логирование действий SuperAdmin
- Ограничение доступа: только SuperAdmin

## 6) Вход в клиента (impersonation)
- Генерация одноразового токена (короткий TTL)
- Открытие клиентского интерфейса в режиме SuperAdmin
- Отдельный признак сессии `superadmin_mode=true`
- Явный выход из режима + автозавершение по таймауту

## 7) База данных SuperAdmin (master/superadmin.db)
- Таблица `superadmins`:
- id, login, password_hash, totp_secret, is_active, created_at, updated_at
- Таблица `auth_attempts`:
- login, ip, success, attempt_at, lock_until
- Таблица `tenant_registry`:
- tenant_id, company_name, domain, status, created_at, archived_at, suspended_at
- Таблица `audit_log`:
- action, actor, tenant_id, payload_json, created_at

## 8) API-контур SuperAdmin
- `POST /superadmin/auth/login` (login+password)
- `POST /superadmin/auth/verify-totp` (2FA)
- `POST /superadmin/auth/logout`
- `GET /superadmin/tenants`
- `POST /superadmin/tenants/:tenantId/impersonate`
- `POST /superadmin/tenants/:tenantId/suspend`
- `POST /superadmin/tenants/:tenantId/resume`
- `POST /superadmin/tenants/:tenantId/archive`
- `POST /superadmin/tenants/:tenantId/restore`
- `DELETE /superadmin/tenants/:tenantId` (только из архива)
- `POST /superadmin/tenants/:tenantId/users/:userId/reset-password`
- `GET /superadmin/rules`
- `POST /superadmin/rules`
- `PUT /superadmin/rules/:ruleId`
- `DELETE /superadmin/rules/:ruleId`
- `GET /superadmin/audit`

## 9) Этапы реализации
1. Инфраструктура домена `admin-oleg.teambuh.ru` + роутинг Traefik.
2. SuperAdmin auth (пароль + TOTP + антибрут + таймаут).
3. Каркас UI и меню SuperAdmin (без дашбордов).
4. Раздел "Клиенты" + операции suspend/archive/restore.
5. Impersonation вход в клиента + баннер режима.
6. Сброс пароля пользователя клиента (показ 1 раз).
7. Раздел "Архив" + безвозвратное удаление.
8. Раздел "Налоговые правила" (полный CRUD).
9. Раздел "Журнал".
10. E2E тесты и hardening.

## 10) Критерии готовности
- Доступ к панели только через `admin-oleg.teambuh.ru`
- Логин SuperAdmin без TOTP невозможен
- Брутфорс блокируется по правилу 5/15
- Клиенты корректно архивируются/восстанавливаются/удаляются
- Impersonation работает стабильно и безопасно
- Все действия отражаются в общем журнале
- Управление налоговыми правилами работает только в SuperAdmin панели
