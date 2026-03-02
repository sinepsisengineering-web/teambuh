# TeamBuh — Локальная проверка и отправка на сервер

## 1) Работаем только в локальной папке проекта
Папка проекта: `/mnt/e/TeamBuh`

## 2) Локальная проверка
Минимальная проверка перед отправкой:

```bash
cd /mnt/e/TeamBuh
npm run build
```

Если нужно проверить серверную часть локально:

```bash
cd /mnt/e/TeamBuh
npm run server
```

## 3) Отправка измененного файла на сервер одной командой

Вариант A:

```bash
cd /mnt/e/TeamBuh
./scripts/deploy-file-to-server.sh server/index.js
```

Вариант B (через npm):

```bash
cd /mnt/e/TeamBuh
npm run deploy:file -- server/index.js
```

Можно отправлять несколько файлов сразу:

```bash
npm run deploy:file -- server/index.js scripts/init-fresh-instance.js
```

## 4) После отправки — перезапуск нужного контейнера на сервере
Пример для master:

```bash
cd /srv/teambuh/master
docker compose up -d --build master-api
```

Пример для конкретного тенанта:

```bash
cd /srv/teambuh/tenants/test-2
docker compose up -d --build
```

## Настройки по умолчанию
Скрипт отправляет на:
- хост: `oleg@cloud-server`
- путь: `/srv/teambuh`

При необходимости можно переопределить:

```bash
TEAMBUH_DEPLOY_HOST=user@host TEAMBUH_DEPLOY_ROOT=/srv/teambuh npm run deploy:file -- server/index.js
```
