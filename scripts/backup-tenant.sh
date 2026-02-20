#!/bin/bash
# ==========================================
# scripts/backup-tenant.sh
# Бэкап данных тенанта (только data/)
# ==========================================
#
# Использование:
#   ./scripts/backup-tenant.sh <tenant_id>           # бэкап одного
#   ./scripts/backup-tenant.sh --all                  # бэкап всех

set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TENANTS_DIR="$BASE_DIR/tenants"
BACKUP_DIR="$BASE_DIR/backups"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)

# ==========================================
# ОПРЕДЕЛЯЕМ КАКИХ ТЕНАНТОВ БЭКАПИТЬ
# ==========================================

if [ "$1" = "--all" ]; then
    TENANTS=$(ls -d "$TENANTS_DIR"/*/ 2>/dev/null | xargs -n1 basename)
elif [ -n "$1" ]; then
    TENANTS="$1"
else
    echo "Использование:"
    echo "  ./scripts/backup-tenant.sh <tenant_id>"
    echo "  ./scripts/backup-tenant.sh --all"
    exit 1
fi

# ==========================================
# БЭКАП
# ==========================================

for TENANT in $TENANTS; do
    TENANT_DIR="$TENANTS_DIR/$TENANT"
    DATA_DIR="$TENANT_DIR/data"

    if [ ! -d "$DATA_DIR" ]; then
        echo "[⚠️] $TENANT: папка data/ не найдена, пропускаю"
        continue
    fi

    BACKUP_FILE="$BACKUP_DIR/${TENANT}_${DATE}.tar.gz"
    echo "[$TENANT] Создаю бэкап → $BACKUP_FILE ..."

    tar -czf "$BACKUP_FILE" -C "$TENANT_DIR" data/

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$TENANT] ✅ Бэкап создан ($SIZE)"
done

echo ""
echo "Бэкапы сохранены в: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"/*_${DATE}.tar.gz 2>/dev/null
