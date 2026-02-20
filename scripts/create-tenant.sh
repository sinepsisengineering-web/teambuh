#!/bin/bash
# ==========================================
# scripts/create-tenant.sh
# Создание нового тенанта из template
# ==========================================
#
# Использование:
#   ./scripts/create-tenant.sh <tenant_id> <email> <name> <password>
#
# Пример:
#   ./scripts/create-tenant.sh romashka petrov@romashka.ru "Петров Иван" mypassword123
#
# Что делает:
#   1. Копирует template/ → tenants/<tenant_id>/
#   2. Генерирует .env с уникальным портом и JWT_SECRET
#   3. Создаёт admin-пользователя в auth.db
#   4. Собирает и запускает Docker-контейнер
#   5. Добавляет роут в Traefik (динамический конфиг)

set -e

# ==========================================
# АРГУМЕНТЫ
# ==========================================

TENANT_ID=$1
EMAIL=$2
NAME=$3
PASSWORD=$4

if [ -z "$TENANT_ID" ] || [ -z "$EMAIL" ] || [ -z "$NAME" ] || [ -z "$PASSWORD" ]; then
    echo ""
    echo "Использование:"
    echo "  ./scripts/create-tenant.sh <tenant_id> <email> <name> <password>"
    echo ""
    echo "Пример:"
    echo "  ./scripts/create-tenant.sh romashka petrov@romashka.ru \"Петров Иван\" mypassword123"
    echo ""
    exit 1
fi

# ==========================================
# ПУТИ
# ==========================================

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$BASE_DIR/template"
TENANTS_DIR="$BASE_DIR/tenants"
TENANT_DIR="$TENANTS_DIR/$TENANT_ID"
MASTER_DIR="$BASE_DIR/master"
TRAEFIK_DYNAMIC="$MASTER_DIR/traefik/dynamic"

# ==========================================
# ПРОВЕРКИ
# ==========================================

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "[ОШИБКА] Папка template/ не найдена: $TEMPLATE_DIR"
    echo "         Сначала подготовьте template (см. README)"
    exit 1
fi

if [ -d "$TENANT_DIR" ]; then
    echo "[ОШИБКА] Тенант '$TENANT_ID' уже существует: $TENANT_DIR"
    exit 1
fi

# ==========================================
# 1. КОПИРОВАНИЕ TEMPLATE
# ==========================================

echo "[1/5] Копирую template → tenants/$TENANT_ID ..."
mkdir -p "$TENANTS_DIR"
cp -r "$TEMPLATE_DIR" "$TENANT_DIR"
echo "      ✅ Скопировано"

# ==========================================
# 2. ГЕНЕРАЦИЯ .env
# ==========================================

echo "[2/5] Генерирую .env ..."

# Автоинкремент порта: 8001, 8002, 8003...
EXISTING_COUNT=$(ls -d "$TENANTS_DIR"/*/ 2>/dev/null | wc -l)
APP_PORT=$((8000 + EXISTING_COUNT))

# Уникальный JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)

cat > "$TENANT_DIR/.env" <<EOF
# Автоматически сгенерировано create-tenant.sh
# Тенант: $TENANT_ID
# Дата: $(date -Iseconds)

INSTANCE_NAME=$TENANT_ID
APP_PORT=$APP_PORT
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
EOF

echo "      ✅ Порт: $APP_PORT, JWT_SECRET: ${JWT_SECRET:0:16}..."

# ==========================================
# 3. СОЗДАНИЕ ADMIN-ПОЛЬЗОВАТЕЛЯ
# ==========================================

echo "[3/5] Создаю администратора: $EMAIL ..."
cd "$TENANT_DIR"
node scripts/create-admin.js "$EMAIL" "$NAME" "$PASSWORD"
echo "      ✅ Администратор создан"

# ==========================================
# 4. ЗАПУСК DOCKER-КОНТЕЙНЕРА
# ==========================================

echo "[4/5] Запускаю Docker-контейнер ..."
cd "$TENANT_DIR"

# Добавляем контейнер в общую сеть
docker network create teambuh-network 2>/dev/null || true
docker compose up -d --build

echo "      ✅ Контейнер teambuh-$TENANT_ID запущен на порту $APP_PORT"

# ==========================================
# 5. ДОБАВЛЕНИЕ РОУТА В TRAEFIK
# ==========================================

echo "[5/5] Настраиваю маршрутизацию (Traefik) ..."
mkdir -p "$TRAEFIK_DYNAMIC"

DOMAIN="${DOMAIN:-teambuh.ru}"

cat > "$TRAEFIK_DYNAMIC/$TENANT_ID.yml" <<EOF
# Автоматически сгенерировано для тенанта: $TENANT_ID
http:
  routers:
    $TENANT_ID:
      rule: "Host(\`$TENANT_ID.$DOMAIN\`)"
      service: $TENANT_ID
      entryPoints:
        - websecure
      tls:
        certResolver: le

  services:
    $TENANT_ID:
      loadBalancer:
        servers:
          - url: "http://teambuh-$TENANT_ID:3001"
EOF

echo "      ✅ Роут: $TENANT_ID.$DOMAIN → teambuh-$TENANT_ID:3001"

# ==========================================
# ИТОГ
# ==========================================

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Тенант '$TENANT_ID' успешно создан!             "
echo "║                                                  "
echo "║  URL:   https://$TENANT_ID.$DOMAIN/              "
echo "║  Email: $EMAIL                                   "
echo "║  Порт:  $APP_PORT                                "
echo "║  Папка: $TENANT_DIR                              "
echo "╚══════════════════════════════════════════════════╝"
echo ""
