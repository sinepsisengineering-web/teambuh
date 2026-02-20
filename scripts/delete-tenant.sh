#!/bin/bash
# ==========================================
# scripts/delete-tenant.sh
# Удаление тенанта (контейнер + файлы + роут)
# ==========================================
#
# Использование:
#   ./scripts/delete-tenant.sh <tenant_id>
#   ./scripts/delete-tenant.sh romashka --force   # без подтверждения

set -e

TENANT_ID=$1
FORCE=$2

if [ -z "$TENANT_ID" ]; then
    echo "Использование: ./scripts/delete-tenant.sh <tenant_id> [--force]"
    exit 1
fi

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TENANT_DIR="$BASE_DIR/tenants/$TENANT_ID"
TRAEFIK_DYNAMIC="$BASE_DIR/master/traefik/dynamic"

if [ ! -d "$TENANT_DIR" ]; then
    echo "[ОШИБКА] Тенант '$TENANT_ID' не найден"
    exit 1
fi

# ==========================================
# ПОДТВЕРЖДЕНИЕ
# ==========================================

if [ "$FORCE" != "--force" ]; then
    echo "⚠️  ВНИМАНИЕ: Будет удалено:"
    echo "   - Docker-контейнер: teambuh-$TENANT_ID"
    echo "   - Все файлы: $TENANT_DIR"
    echo "   - Все базы данных клиента!"
    echo ""
    read -p "Введите '$TENANT_ID' для подтверждения: " CONFIRM
    if [ "$CONFIRM" != "$TENANT_ID" ]; then
        echo "Отменено."
        exit 0
    fi
fi

# ==========================================
# 1. ОСТАНОВИТЬ КОНТЕЙНЕР
# ==========================================

echo "[1/3] Останавливаю контейнер..."
cd "$TENANT_DIR"
docker compose down 2>/dev/null || echo "      Контейнер не был запущен"
echo "      ✅ Контейнер остановлен"

# ==========================================
# 2. УДАЛИТЬ РОУТ TRAEFIK
# ==========================================

echo "[2/3] Удаляю маршрут Traefik..."
rm -f "$TRAEFIK_DYNAMIC/$TENANT_ID.yml"
echo "      ✅ Маршрут удалён"

# ==========================================
# 3. УДАЛИТЬ ФАЙЛЫ
# ==========================================

echo "[3/3] Удаляю файлы..."
rm -rf "$TENANT_DIR"
echo "      ✅ Папка удалена"

echo ""
echo "Тенант '$TENANT_ID' полностью удалён."
