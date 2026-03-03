#!/bin/bash
# ==========================================
# scripts/prepare-template.sh
# Подготовка эталонной папки template/ из текущего проекта
# ==========================================
#
# Использование (из корня проекта):
#   ./scripts/prepare-template.sh
#
# Что делает:
#   1. Собирает фронтенд (npm run build → dist/)
#   2. Копирует нужные файлы в template/
#   3. Инициализирует чистые БД (без тестовых данных)
#   4. Очищает таблицу users (директор создаётся при регистрации)

set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$BASE_DIR/template"

echo "═══════════════════════════════════════"
echo "  Подготовка template/"
echo "═══════════════════════════════════════"
echo ""

# ==========================================
# 1. СБОРКА ФРОНТЕНДА
# ==========================================

echo "[1/4] Собираю фронтенд..."
cd "$BASE_DIR"
npm run build
echo "      ✅ dist/ собран"

# ==========================================
# 2. КОПИРОВАНИЕ ФАЙЛОВ
# ==========================================

echo "[2/4] Копирую файлы в template/..."

# Файлы корня для tenant runtime
cp "$BASE_DIR/package.json" "$TEMPLATE_DIR/"
cp "$BASE_DIR/package-lock.json" "$TEMPLATE_DIR/" 2>/dev/null || true

# Tenant Dockerfile: фиксированная runtime-версия (без npm run build в контейнере)
cat > "$TEMPLATE_DIR/Dockerfile" <<'EOF'
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash openssl sqlite

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY server/ ./server/
COPY scripts/ ./scripts/
COPY dist/ ./dist/

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
EOF

# Tenant .dockerignore: dist должен входить в build context
cat > "$TEMPLATE_DIR/.dockerignore" <<'EOF'
node_modules
release
data
.git
.gitignore
.agent
.vscode
*.md
*.log
.env
.env.local
.env.example
EOF

# Серверный код
rm -rf "$TEMPLATE_DIR/server"
cp -r "$BASE_DIR/server" "$TEMPLATE_DIR/server"

# Скрипты
rm -rf "$TEMPLATE_DIR/scripts"
cp -r "$BASE_DIR/scripts" "$TEMPLATE_DIR/scripts"

# Собранный фронтенд
rm -rf "$TEMPLATE_DIR/dist"
cp -r "$BASE_DIR/dist" "$TEMPLATE_DIR/dist"

echo "      ✅ Файлы скопированы"

# ==========================================
# 3. ИНИЦИАЛИЗАЦИЯ ЧИСТЫХ БД
# ==========================================

echo "[3/4] Инициализирую чистые БД..."

# Сохраняем серверный эталон системных правил.
# Важно: rules.db не подгружается из GitHub, источник только сервер.
RULES_BACKUP_DIR=""
if [ -f "$TEMPLATE_DIR/data/global_data/rules.db" ]; then
    RULES_BACKUP_DIR="$(mktemp -d)"
    cp -a "$TEMPLATE_DIR/data/global_data/rules.db" "$RULES_BACKUP_DIR/"
    [ -f "$TEMPLATE_DIR/data/global_data/rules.db-shm" ] && cp -a "$TEMPLATE_DIR/data/global_data/rules.db-shm" "$RULES_BACKUP_DIR/" || true
    [ -f "$TEMPLATE_DIR/data/global_data/rules.db-wal" ] && cp -a "$TEMPLATE_DIR/data/global_data/rules.db-wal" "$RULES_BACKUP_DIR/" || true
    echo "      ✅ Сохранена серверная эталонная rules.db"
else
    echo "      ❌ Не найдена $TEMPLATE_DIR/data/global_data/rules.db"
    echo "         Перед prepare-template сначала создайте/восстановите серверную эталонную БД правил."
    exit 1
fi

# Очистим data/ в template
rm -rf "$TEMPLATE_DIR/data"
mkdir -p "$TEMPLATE_DIR/data"

# Запускаем init-fresh-instance из контекста template
cd "$TEMPLATE_DIR"
SKIP_SYSTEM_RULES_INIT=1 node scripts/init-fresh-instance.js

# Возвращаем серверную эталонную rules.db после инициализации.
mkdir -p "$TEMPLATE_DIR/data/global_data"
cp -a "$RULES_BACKUP_DIR/rules.db" "$TEMPLATE_DIR/data/global_data/rules.db"
[ -f "$RULES_BACKUP_DIR/rules.db-shm" ] && cp -a "$RULES_BACKUP_DIR/rules.db-shm" "$TEMPLATE_DIR/data/global_data/rules.db-shm" || true
[ -f "$RULES_BACKUP_DIR/rules.db-wal" ] && cp -a "$RULES_BACKUP_DIR/rules.db-wal" "$TEMPLATE_DIR/data/global_data/rules.db-wal" || true
rm -rf "$RULES_BACKUP_DIR"

echo "      ✅ БД инициализированы"

# ==========================================
# 4. ОЧИСТКА ТЕСТОВЫХ ДАННЫХ
# ==========================================

echo "[4/4] Очищаю тестовых пользователей..."

AUTH_DB="$TEMPLATE_DIR/data/client_data/org_default/db/auth.db"
if [ -f "$AUTH_DB" ]; then
    # Удаляем всех пользователей (директор будет создан create-tenant.sh)
    sqlite3 "$AUTH_DB" "DELETE FROM users; DELETE FROM invitations;"
    echo "      ✅ Таблицы users и invitations очищены"
else
    echo "      ⚠️ auth.db не найден, пропускаю"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Template готов!"
echo "  Путь: $TEMPLATE_DIR"
echo "═══════════════════════════════════════"
echo ""
echo "Содержимое template/:"
ls -la "$TEMPLATE_DIR"
