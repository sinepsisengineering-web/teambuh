#!/bin/bash
# ==========================================
# scripts/update-tenants.sh
# Обновление кода тенантов из template
# НЕ затирает data/ (базы данных клиентов)
# ==========================================
#
# Использование:
#   ./scripts/update-tenants.sh --all
#   ./scripts/update-tenants.sh <tenant_id> [tenant_id...]
#   ./scripts/update-tenants.sh --dry-run --all
#
# Что обновляется:
#   ✅ server/, dist/, scripts/, Dockerfile, docker-compose.yml, package*.json, .dockerignore
#
# Что НЕ обновляется:
#   ❌ data/ (БД клиента)
#   ❌ .env и .env.template (уникальные настройки)
#   ❌ node_modules/ (пересобирается docker build)

set -u
set -o pipefail

usage() {
    cat <<'EOF'
Использование:
  ./scripts/update-tenants.sh --all
  ./scripts/update-tenants.sh <tenant_id> [tenant_id...]
  ./scripts/update-tenants.sh --dry-run --all

Примеры:
  ./scripts/update-tenants.sh test-2
  ./scripts/update-tenants.sh --all
EOF
}

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$BASE_DIR/template"
TENANTS_DIR="$BASE_DIR/tenants"

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "[ОШИБКА] Папка template/ не найдена: $TEMPLATE_DIR"
    exit 1
fi

if [ ! -d "$TENANTS_DIR" ]; then
    echo "[ОШИБКА] Папка tenants/ не найдена: $TENANTS_DIR"
    exit 1
fi

if [ ! -f "$TEMPLATE_DIR/Dockerfile" ] || [ ! -f "$TEMPLATE_DIR/dist/index.html" ]; then
    echo "[ОШИБКА] template не готов: нет Dockerfile или dist/index.html"
    echo "Сначала выполните: ./scripts/prepare-template.sh"
    exit 1
fi

DRY_RUN=0
MODE_ALL=0
declare -a REQUESTED_TENANTS=()

while [ $# -gt 0 ]; do
    case "$1" in
        --all)
            MODE_ALL=1
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            REQUESTED_TENANTS+=("$1")
            shift
            ;;
    esac
done

if [ "$MODE_ALL" -eq 0 ] && [ "${#REQUESTED_TENANTS[@]}" -eq 0 ]; then
    echo "[ОШИБКА] Не указан tenant_id или --all"
    usage
    exit 1
fi

declare -a TENANTS=()
if [ "$MODE_ALL" -eq 1 ]; then
    while IFS= read -r tenant; do
        [ -n "$tenant" ] && TENANTS+=("$tenant")
    done < <(find "$TENANTS_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
else
    TENANTS=("${REQUESTED_TENANTS[@]}")
fi

if [ "${#TENANTS[@]}" -eq 0 ]; then
    echo "[ОШИБКА] Нет тенантов для обновления"
    exit 1
fi

echo "═══════════════════════════════════════"
echo "  Обновление тенантов из template"
echo "═══════════════════════════════════════"
echo "Режим: $([ "$MODE_ALL" -eq 1 ] && echo '--all' || echo 'выборочно')"
echo "Dry-run: $([ "$DRY_RUN" -eq 1 ] && echo 'да' || echo 'нет')"
echo ""

UPDATED=0
FAILED=0
declare -a FAILED_TENANTS=()

for TENANT in "${TENANTS[@]}"; do
    TENANT_DIR="$TENANTS_DIR/$TENANT"

    if [ ! -d "$TENANT_DIR" ]; then
        echo "[$TENANT] ❌ Тенант не найден: $TENANT_DIR"
        FAILED=$((FAILED + 1))
        FAILED_TENANTS+=("$TENANT (not found)")
        continue
    fi

    if [ ! -f "$TENANT_DIR/docker-compose.yml" ]; then
        echo "[$TENANT] ❌ Нет docker-compose.yml, пропускаю"
        FAILED=$((FAILED + 1))
        FAILED_TENANTS+=("$TENANT (no docker-compose.yml)")
        continue
    fi

    echo "[$TENANT] Обновляю код..."

    RSYNC_ARGS=(
        -av --delete
        --exclude='data/'
        --exclude='.env'
        --exclude='.env.template'
        --exclude='node_modules/'
        --exclude='.git/'
    )
    [ "$DRY_RUN" -eq 1 ] && RSYNC_ARGS+=(--dry-run)

    if ! rsync "${RSYNC_ARGS[@]}" "$TEMPLATE_DIR/" "$TENANT_DIR/"; then
        echo "[$TENANT] ❌ Ошибка rsync"
        FAILED=$((FAILED + 1))
        FAILED_TENANTS+=("$TENANT (rsync)")
        continue
    fi

    # Защита от типовой поломки: dist не должен быть в .dockerignore.
    if [ -f "$TENANT_DIR/.dockerignore" ]; then
        sed -i '/^dist$/d' "$TENANT_DIR/.dockerignore" || true
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        echo "[$TENANT] ℹ️ dry-run: сборка контейнера пропущена"
        echo ""
        UPDATED=$((UPDATED + 1))
        continue
    fi

    echo "[$TENANT] Пересобираю контейнер..."
    if ! (cd "$TENANT_DIR" && docker compose up -d --build); then
        echo "[$TENANT] ❌ Ошибка docker compose up -d --build"
        FAILED=$((FAILED + 1))
        FAILED_TENANTS+=("$TENANT (docker build)")
        continue
    fi

    echo "[$TENANT] ✅ Готово"
    echo ""
    UPDATED=$((UPDATED + 1))
done

echo "═══════════════════════════════════════"
echo "  Итого: $UPDATED обновлено, $FAILED ошибок"
if [ "$FAILED" -gt 0 ]; then
    echo "  Ошибки: ${FAILED_TENANTS[*]}"
fi
echo "═══════════════════════════════════════"

[ "$FAILED" -gt 0 ] && exit 1
exit 0
