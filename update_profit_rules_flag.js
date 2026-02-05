// Скрипт для добавления флага profitAdvancePeriodicity='quarterly' к правилам авансов по прибыли
// Запустить: node update_profit_rules_flag.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const TENANTS_DIR = path.join(__dirname, 'data', 'tenants');

console.log('=== Обновление флага profitAdvancePeriodicity в правилах ===\n');

// 1. Найти все tenant'ы
const tenants = fs.readdirSync(TENANTS_DIR).filter(name => {
    const fullPath = path.join(TENANTS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
});

let totalUpdated = 0;

tenants.forEach(tenantId => {
    console.log(`\n--- Tenant: ${tenantId} ---`);

    const dbPath = path.join(TENANTS_DIR, tenantId, 'db', 'rules.db');

    if (!fs.existsSync(dbPath)) {
        console.log('  SQLite БД не найдена, пропуск');
        return;
    }

    const db = new Database(dbPath);

    // Найти правила связанные с авансами по прибыли (quarterly)
    // Ищем по ID или названию
    const profitRules = db.prepare(`
        SELECT id, short_title, profit_advance_periodicity 
        FROM task_rules 
        WHERE (
            id LIKE '%прибыль%' OR 
            id LIKE '%profit%' OR
            short_title LIKE '%прибыль%' OR 
            short_title LIKE '%Прибыль%' OR
            title_template LIKE '%прибыль%' OR
            title_template LIKE '%Прибыль%'
        )
        AND id LIKE 'rule_%'
    `).all();

    console.log(`  Найдено ${profitRules.length} правил по прибыли с rule_ префиксом:`);

    profitRules.forEach(rule => {
        console.log(`    ${rule.id}: "${rule.short_title}" [profitAdvancePeriodicity=${rule.profit_advance_periodicity}]`);

        if (!rule.profit_advance_periodicity) {
            // Обновляем флаг на 'quarterly'
            db.prepare('UPDATE task_rules SET profit_advance_periodicity = ? WHERE id = ?')
                .run('quarterly', rule.id);
            console.log(`      --> Обновлено на 'quarterly'`);
            totalUpdated++;
        }
    });

    db.close();
});

console.log(`\n=== Готово! Обновлено правил: ${totalUpdated} ===`);
