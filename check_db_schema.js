// check_db_schema.js
// Проверка схемы БД клиентов
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'tenants', 'org_default', 'db', 'clients.db');
const db = new Database(DB_PATH);

console.log('=== СХЕМА ТАБЛИЦЫ CLIENTS ===');
const columns = db.prepare("PRAGMA table_info(clients)").all();
columns.forEach(c => console.log(`  ${c.cid}: ${c.name} (${c.type}) ${c.notnull ? 'NOT NULL' : ''}`));

console.log('\n=== ДАННЫЕ В CLIENTS (первые 2 записи) ===');
const rows = db.prepare("SELECT * FROM clients LIMIT 2").all();
rows.forEach((row, i) => {
    console.log(`\nЗапись ${i + 1}:`);
    Object.entries(row).forEach(([key, val]) => {
        if (val !== null) console.log(`  ${key}: ${val}`);
    });
});

db.close();
