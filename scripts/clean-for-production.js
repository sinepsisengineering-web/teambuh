// scripts/clean-for-production.js
// Скрипт полной очистки клиентских данных перед переносом на сервер
// НЕ ТРОГАЕТ global_data (системные правила)!
//
// Использование: node scripts/clean-for-production.js [tenantId]
// По умолчанию: org_default

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const tenantId = process.argv[2] || 'org_default';
const CLIENT_DATA_DIR = path.join(process.cwd(), 'data', 'client_data', tenantId);
const DB_DIR = path.join(CLIENT_DATA_DIR, 'db');

console.log('==============================================');
console.log('  ОЧИСТКА КЛИЕНТСКИХ ДАННЫХ');
console.log(`  Тенант: ${tenantId}`);
console.log(`  Путь: ${CLIENT_DATA_DIR}`);
console.log('==============================================');
console.log('');

// Проверяем существование папки
if (!fs.existsSync(CLIENT_DATA_DIR)) {
    console.log('❌ Папка клиентских данных не найдена:', CLIENT_DATA_DIR);
    process.exit(1);
}

let cleaned = [];

// 1. Очистка clients.db
const clientsDbPath = path.join(DB_DIR, 'clients.db');
if (fs.existsSync(clientsDbPath)) {
    try {
        const db = new Database(clientsDbPath);
        db.pragma('journal_mode = WAL');

        const tables = ['client_notes', 'client_credentials', 'client_patents', 'client_contacts', 'clients'];
        tables.forEach(table => {
            try {
                const info = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                db.prepare(`DELETE FROM ${table}`).run();
                console.log(`  ✅ ${table}: удалено ${info.count} записей`);
            } catch (e) {
                console.log(`  ⚠️  ${table}: таблица не найдена`);
            }
        });

        db.close();
        cleaned.push('clients.db');
    } catch (e) {
        console.log('  ❌ Ошибка очистки clients.db:', e.message);
    }
} else {
    console.log('  ⏭️  clients.db не найдена, пропускаем');
}

console.log('');

// 2. Очистка tasks.db
const tasksDbPath = path.join(DB_DIR, 'tasks.db');
if (fs.existsSync(tasksDbPath)) {
    try {
        const db = new Database(tasksDbPath);
        db.pragma('journal_mode = WAL');

        try {
            const info = db.prepare(`SELECT COUNT(*) as count FROM tasks`).get();
            db.prepare(`DELETE FROM tasks`).run();
            console.log(`  ✅ tasks: удалено ${info.count} записей`);
        } catch (e) {
            console.log(`  ⚠️  tasks: таблица не найдена`);
        }

        db.close();
        cleaned.push('tasks.db');
    } catch (e) {
        console.log('  ❌ Ошибка очистки tasks.db:', e.message);
    }
} else {
    console.log('  ⏭️  tasks.db не найдена, пропускаем');
}

console.log('');

// 3. Очистка services.db
const servicesDbPath = path.join(DB_DIR, 'services.db');
if (fs.existsSync(servicesDbPath)) {
    try {
        const db = new Database(servicesDbPath);
        db.pragma('journal_mode = WAL');

        ['packages', 'services'].forEach(table => {
            try {
                const info = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                db.prepare(`DELETE FROM ${table}`).run();
                console.log(`  ✅ ${table}: удалено ${info.count} записей`);
            } catch (e) {
                console.log(`  ⚠️  ${table}: таблица не найдена`);
            }
        });

        db.close();
        cleaned.push('services.db');
    } catch (e) {
        console.log('  ❌ Ошибка очистки services.db:', e.message);
    }
} else {
    console.log('  ⏭️  services.db не найдена, пропускаем');
}

console.log('');

// 4. Очистка tenant rules.db (кастомные правила)
const tenantRulesDbPath = path.join(DB_DIR, 'rules.db');
if (fs.existsSync(tenantRulesDbPath)) {
    try {
        const db = new Database(tenantRulesDbPath);
        db.pragma('journal_mode = WAL');

        try {
            const info = db.prepare(`SELECT COUNT(*) as count FROM task_rules`).get();
            db.prepare(`DELETE FROM task_rules`).run();
            console.log(`  ✅ task_rules (tenant): удалено ${info.count} записей`);
        } catch (e) {
            console.log(`  ⚠️  task_rules: таблица не найдена`);
        }

        db.close();
        cleaned.push('rules.db (tenant)');
    } catch (e) {
        console.log('  ❌ Ошибка очистки rules.db:', e.message);
    }
} else {
    console.log('  ⏭️  rules.db (tenant) не найдена, пропускаем');
}

console.log('');

// 5. Список файловых папок для ручного удаления
const fileDirs = ['clients', 'employees', 'archive'];
const dirsToClean = [];

fileDirs.forEach(dir => {
    const dirPath = path.join(CLIENT_DATA_DIR, dir);
    if (fs.existsSync(dirPath)) {
        const contents = fs.readdirSync(dirPath).filter(f => f !== 'README.md');
        if (contents.length > 0) {
            dirsToClean.push({ dir, path: dirPath, count: contents.length });
        }
    }
});

if (dirsToClean.length > 0) {
    console.log('⚠️  Следующие папки содержат файлы (документы, фото):');
    dirsToClean.forEach(d => {
        console.log(`   📁 ${d.dir}/ — ${d.count} элементов → ${d.path}`);
    });
    console.log('');
    console.log('   Удалите их содержимое вручную, если хотите чистую базу.');
}

console.log('');
console.log('==============================================');
console.log('  ИТОГО');
console.log(`  Очищено баз: ${cleaned.length} (${cleaned.join(', ')})`);
console.log('  global_data/rules.db: НЕ ТРОНУТА ✅');
console.log('==============================================');
