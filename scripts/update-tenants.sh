#!/bin/bash
# ==========================================
# scripts/update-tenants.sh
# Обновление кода тенантов из template
# НЕ затирает data/ (базы данных клиентов)
# ==========================================
#
# Использование:
#   ./scripts/update-tenants.sh              # обновить всех
#   ./scripts/update-tenants.sh romashka     # обновить одного
#   ./scripts/update-tenants.sh romashka daisy  # обновить нескольких
#
# Что обновляется:
#   ✅ server/, dist/, scripts/, Dockerfile, docker-compose.yml, package.json
#
# Что НЕ обновляется:
#   ❌ data/ (БД клиента)
#   ❌ .env (уникальные настройки)
#   ❌ node_modules/ (пересобирается docker build)

set -e

# ==========================================
# ПУТИ
# ==========================================

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$BASE_DIR/template"
TENANTS_DIR="$BASE_DIR/tenants"

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "[ОШИБКА] Папка template/ не найдена: $TEMPLATE_DIR"
    exit 1
fi

# ==========================================
# ОПРЕДЕЛЯЕМ КАКИХ ТЕНАНТОВ ОБНОВЛЯТЬ
# ==========================================

if [ $# -gt 0 ]; then
    # Конкретные тенанты
    TENANTS="$@"
else
    # Все тенанты
    TENANTS=$(ls -d "$TENANTS_DIR"/*/ 2>/dev/null | xargs -n1 basename)
fi

if [ -z "$TENANTS" ]; then
    echo "[ОШИБКА] Нет тенантов для обновления"
    exit 1
fi

echo "═══════════════════════════════════════"
echo "  Обновление тенантов из template"
echo "═══════════════════════════════════════"
echo ""

UPDATED=0
FAILED=0

for TENANT in $TENANTS; do
    TENANT_DIR="$TENANTS_DIR/$TENANT"

    if [ ! -d "$TENANT_DIR" ]; then
        echo "[⚠️] Тенант '$TENANT' не найден, пропускаю"
        FAILED=$((FAILED + 1))
        continue
    fi

    echo "[$TENANT] Обновляю..."

    # Копируем всё из template КРОМЕ data/, .env, node_modules/
    rsync -av --delete \
        --exclude='data/' \
        --exclude='.env' \
        --exclude='.env.template' \
        --exclude='node_modules/' \
        "$TEMPLATE_DIR/" "$TENANT_DIR/"

    echo "[$TENANT] Код обновлён, пересобираю контейнер..."

    # Пересобираем и перезапускаем контейнер
    cd "$TENANT_DIR"
    docker compose up -d --build

    echo "[$TENANT] ✅ Готово"
    echo ""
    UPDATED=$((UPDATED + 1))
done

echo "═══════════════════════════════════════"
echo "  Итого: $UPDATED обновлено, $FAILED ошибок"
echo "═══════════════════════════════════════"
