// scripts/init-fresh-instance.js
// Скрипт первого запуска: создаёт структуру, Супер-Админа и заполняет global_data
//
// Использование: node scripts/init-fresh-instance.js [tenantId]
// По умолчанию: org_default

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const tenantId = process.argv[2] || 'org_default';
const DATA_DIR = path.join(process.cwd(), 'data');
const GLOBAL_DATA_DIR = path.join(DATA_DIR, 'global_data');
const CLIENT_DATA_DIR = path.join(DATA_DIR, 'client_data', tenantId);

console.log('==============================================');
console.log('  ИНИЦИАЛИЗАЦИЯ НОВОГО ИНСТАНСА');
console.log(`  Тенант: ${tenantId}`);
console.log('==============================================');
console.log('');

// ============================================
// 1. СОЗДАНИЕ СТРУКТУРЫ ПАПОК
// ============================================

const dirs = [
    GLOBAL_DATA_DIR,
    path.join(CLIENT_DATA_DIR, 'db'),
    path.join(CLIENT_DATA_DIR, 'clients'),
    path.join(CLIENT_DATA_DIR, 'employees'),
    path.join(CLIENT_DATA_DIR, 'archive'),
    path.join(CLIENT_DATA_DIR, 'backups'),
    path.join(CLIENT_DATA_DIR, 'vault'),
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  📁 Создана: ${path.relative(process.cwd(), dir)}`);
    } else {
        console.log(`  ✅ Уже есть: ${path.relative(process.cwd(), dir)}`);
    }
});

// Создать meta.json
const metaPath = path.join(CLIENT_DATA_DIR, 'meta.json');
if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify({
        tenantId,
        name: 'Новая организация',
        createdAt: new Date().toISOString(),
        settings: { timezone: 'Europe/Moscow', currency: 'RUB', language: 'ru' }
    }, null, 2));
    console.log('  📄 Создан meta.json');
}

console.log('');

// ============================================
// 2. СОЗДАНИЕ СУПЕР-АДМИНА (в auth.db)
// ============================================

const { AuthDatabase } = require('../server/database/authDatabase');
const authDb = new AuthDatabase(tenantId);

const adminId = 'emp-admin';
const existingAdmin = authDb.findById(adminId);

if (!existingAdmin) {
    const defaultPassword = 'admin123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    authDb.createUser({
        id: adminId,
        email: 'admin@teambuh.local',
        name: 'Администратор',
        role: 'super-admin',
        passwordHash,
        mustChangePassword: true,
    });

    console.log('  👤 Создан Супер-Админ (auth.db):');
    console.log('     Email:  admin@teambuh.local');
    console.log('     Пароль: admin123');
    console.log('     ⚠️  Смените пароль после первого входа!');
} else {
    console.log('  ✅ Супер-Админ уже существует в auth.db');
}

console.log('');

// ============================================
// 3. ИНИЦИАЛИЗАЦИЯ GLOBAL_DATA (системные правила)
// ============================================
// Важно: используем только новую схему и единый источник правил.
const { migrateSystemRulesToMasterDb } = require('../server/database/rulesMigration');
const migrationResult = migrateSystemRulesToMasterDb();
console.log(`  ✅ Системные правила готовы: ${migrationResult.total} total, +${migrationResult.inserted} новых`);

console.log('');

// ============================================
// 4. ИНИЦИАЛИЗАЦИЯ ПУСТЫХ КЛИЕНТСКИХ БАЗ
// ============================================

// Они создадутся автоматически при первом запуске сервера
// (конструкторы классов содержат CREATE TABLE IF NOT EXISTS)
console.log('  ℹ️  Клиентские базы (clients, tasks, services) создадутся');
console.log('     автоматически при первом запуске сервера.');

console.log('');
console.log('==============================================');
console.log('  ✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА');
console.log('');
console.log('  Структура:');
console.log(`    data/global_data/rules.db — системные правила`);
console.log(`    data/client_data/${tenantId}/ — данные клиента`);
console.log('');
console.log('  Входные данные:');
console.log('    Логин:  admin');
console.log('    Пароль: admin123');
console.log('==============================================');
