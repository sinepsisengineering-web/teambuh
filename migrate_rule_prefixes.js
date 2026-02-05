// Скрипт для обновления префиксов CUSTOM_ на rule_ в существующих правилах
// Запустить: node migrate_rule_prefixes.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const TENANTS_DIR = path.join(__dirname, 'data', 'tenants');

console.log('=== Миграция префиксов правил CUSTOM_ -> rule_ ===\n');

// 1. Найти все tenant'ы
const tenants = fs.readdirSync(TENANTS_DIR).filter(name => {
    const fullPath = path.join(TENANTS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
});

console.log(`Найдено tenant'ов: ${tenants.length}`);

let totalUpdated = 0;

tenants.forEach(tenantId => {
    console.log(`\n--- Tenant: ${tenantId} ---`);

    // 2. Проверить SQLite БД правил
    const dbPath = path.join(TENANTS_DIR, tenantId, 'db', 'rules.db');
    if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath);

        // Найти правила с CUSTOM_
        const customRules = db.prepare("SELECT id FROM task_rules WHERE id LIKE 'CUSTOM_%'").all();
        console.log(`  SQLite: найдено ${customRules.length} правил с CUSTOM_`);

        customRules.forEach(rule => {
            const newId = rule.id.replace('CUSTOM_', 'rule_');
            db.prepare('UPDATE task_rules SET id = ? WHERE id = ?').run(newId, rule.id);
            console.log(`    ${rule.id} -> ${newId}`);
            totalUpdated++;
        });

        db.close();
    }

    // 3. Проверить JSON файл кастомных правил
    const jsonPath = path.join(TENANTS_DIR, tenantId, 'customRules.json');
    if (fs.existsSync(jsonPath)) {
        const rules = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let jsonUpdated = 0;

        rules.forEach(rule => {
            if (rule.id && rule.id.startsWith('CUSTOM_')) {
                const newId = rule.id.replace('CUSTOM_', 'rule_');
                console.log(`    JSON: ${rule.id} -> ${newId}`);
                rule.id = newId;
                jsonUpdated++;
                totalUpdated++;
            }
        });

        if (jsonUpdated > 0) {
            fs.writeFileSync(jsonPath, JSON.stringify(rules, null, 2));
            console.log(`  JSON: обновлено ${jsonUpdated} правил`);
        }
    }
});

console.log(`\n=== Готово! Обновлено правил: ${totalUpdated} ===`);
