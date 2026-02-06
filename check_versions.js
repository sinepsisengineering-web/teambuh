// check_versions.js
// Проверка версий клиента в БД
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'tenants', 'org_default', 'db', 'clients.db');
const db = new Database(DB_PATH);

console.log('=== ВСЕ ВЕРСИИ КЛИЕНТОВ ===\n');

const rows = db.prepare(`
    SELECT record_id, client_id, version, valid_from, changed_by, name, has_employees, employee_count
    FROM clients 
    ORDER BY client_id, version DESC
`).all();

let currentClient = '';
rows.forEach(row => {
    if (row.client_id !== currentClient) {
        console.log(`\n--- ${row.name} (${row.client_id}) ---`);
        currentClient = row.client_id;
    }
    console.log(`  v${row.version}: has_employees=${row.has_employees}, count=${row.employee_count}, changed_by="${row.changed_by || 'null'}", valid_from=${row.valid_from}`);
});

console.log('\n=== TOTAL RECORDS:', rows.length, '===');
db.close();
