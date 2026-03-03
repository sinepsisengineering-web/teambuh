#!/bin/bash
# ==========================================
# scripts/deploy-tenants.sh
# Единая команда: пересобрать template + обновить тенанты
# ==========================================
#
# Использование:
#   ./scripts/deploy-tenants.sh test-2
#   ./scripts/deploy-tenants.sh --all
#   ./scripts/deploy-tenants.sh --dry-run --all

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "═══════════════════════════════════════"
echo "  Deploy Tenants"
echo "═══════════════════════════════════════"
echo ""

echo "[1/2] Подготавливаю template..."
bash "$BASE_DIR/scripts/prepare-template.sh"
echo ""

echo "[2/2] Обновляю тенанты..."
bash "$BASE_DIR/scripts/update-tenants.sh" "$@"
echo ""

echo "✅ Deploy completed"
