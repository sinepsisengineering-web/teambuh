// Скрипт миграции правил из customRules.json в SQLite
// Запустить: node migrate_json_rules_to_sqlite.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const TENANTS_DIR = path.join(__dirname, 'data', 'tenants');

console.log('=== Миграция правил из JSON в SQLite ===\n');

// 1. Найти все tenant'ы
const tenants = fs.readdirSync(TENANTS_DIR).filter(name => {
    const fullPath = path.join(TENANTS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
});

let totalMigrated = 0;

tenants.forEach(tenantId => {
    console.log(`\n--- Tenant: ${tenantId} ---`);

    const jsonPath = path.join(TENANTS_DIR, tenantId, 'customRules.json');
    const dbPath = path.join(TENANTS_DIR, tenantId, 'db', 'rules.db');

    if (!fs.existsSync(jsonPath)) {
        console.log('  JSON файл не найден, пропуск');
        return;
    }

    if (!fs.existsSync(dbPath)) {
        console.log('  SQLite БД не найдена, пропуск');
        return;
    }

    const rules = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`  Найдено ${rules.length} правил в JSON`);

    const db = new Database(dbPath);

    rules.forEach(rule => {
        // Проверяем есть ли уже такое правило
        const existing = db.prepare('SELECT id FROM task_rules WHERE id = ?').get(rule.id);
        if (existing) {
            console.log(`    ${rule.id} — уже существует, пропуск`);
            return;
        }

        // Вставляем правило
        const stmt = db.prepare(`
            INSERT INTO task_rules (
                id, source, storage_category, is_active, version,
                task_type, short_title, short_description, description, title_template, law_reference,
                periodicity, period_type,
                day_of_month, target_month, month_offset, quarter_month_offset, special_rule,
                due_date_rule,
                applies_to_all, applies_to_legal_forms, applies_to_tax_systems,
                requires_employees, requires_nds, applies_to_client_ids, profit_advance_periodicity,
                created_at, updated_at, created_by
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?, ?,
                ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?
            )
        `);

        stmt.run(
            rule.id,
            'custom',
            rule.category || 'налоговые',
            rule.isActive !== false ? 1 : 0,
            1,
            rule.taskType || 'Другое',
            rule.shortTitle,
            rule.shortDescription || rule.shortTitle,
            rule.description || null,
            rule.titleTemplate || rule.shortTitle,
            rule.lawReference || null,
            rule.periodicity || 'yearly',
            'past',
            rule.dateConfig?.day || 1,
            rule.dateConfig?.month ?? null,
            rule.dateConfig?.monthOffset || 0,
            rule.dateConfig?.quarterMonthOffset ?? null,
            null,
            rule.dueDateRule === 'next' ? 'next_business_day' :
                rule.dueDateRule === 'previous' ? 'previous_business_day' :
                    rule.dueDateRule || 'next_business_day',
            rule.applicabilityConfig?.allClients !== false ? 1 : 0,
            rule.applicabilityConfig?.legalForms ? JSON.stringify(rule.applicabilityConfig.legalForms) : null,
            rule.applicabilityConfig?.taxSystems ? JSON.stringify(rule.applicabilityConfig.taxSystems) : null,
            rule.applicabilityConfig?.requiresEmployees ? 1 : 0,
            rule.applicabilityConfig?.requiresNds ? 1 : 0,
            rule.applicabilityConfig?.clientIds ? JSON.stringify(rule.applicabilityConfig.clientIds) : null,
            rule.applicabilityConfig?.profitAdvancePeriodicity || null,
            rule.createdAt || new Date().toISOString(),
            rule.updatedAt || new Date().toISOString(),
            rule.createdBy || 'migration'
        );

        console.log(`    ${rule.id} — мигрировано ✓`);
        totalMigrated++;
    });

    db.close();

    // Удаляем JSON файл после успешной миграции
    fs.unlinkSync(jsonPath);
    console.log(`  Удалён ${jsonPath}`);
});

console.log(`\n=== Готово! Мигрировано правил: ${totalMigrated} ===`);
