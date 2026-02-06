// migrate_to_append_only.js
// Миграция существующих данных на append-only архитектуру
// Запуск: node migrate_to_append_only.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'tenants', 'org_default', 'db', 'clients.db');
const BACKUP_PATH = path.join(__dirname, 'data', 'tenants', 'org_default', 'db', 'clients_backup_' + Date.now() + '.db');

console.log('='.repeat(60));
console.log('МИГРАЦИЯ НА APPEND-ONLY АРХИТЕКТУРУ');
console.log('='.repeat(60));

// Проверяем существование БД
if (!fs.existsSync(DB_PATH)) {
    console.log('❌ База данных не найдена:', DB_PATH);
    process.exit(1);
}

// Создаём бэкап
console.log('\n📦 Создание бэкапа...');
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log('✅ Бэкап сохранён:', BACKUP_PATH);

// Открываем БД
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Проверяем, нужна ли миграция
const columns = db.prepare("PRAGMA table_info(clients)").all();
const hasRecordId = columns.some(c => c.name === 'record_id');
const hasClientId = columns.some(c => c.name === 'client_id');

if (hasRecordId && hasClientId) {
    console.log('\n✅ База данных уже мигрирована на append-only архитектуру');
    db.close();
    process.exit(0);
}

console.log('\n🔄 Начинаем миграцию...');

try {
    db.exec('BEGIN TRANSACTION');

    // ===========================
    // МИГРАЦИЯ ТАБЛИЦЫ CLIENTS
    // ===========================
    console.log('\n📋 Миграция таблицы clients...');

    // Получаем все данные
    const clients = db.prepare('SELECT * FROM clients').all();
    console.log(`   Найдено ${clients.length} клиентов`);

    // Переименовываем старую таблицу
    db.exec('ALTER TABLE clients RENAME TO clients_old');

    // Создаём новую таблицу
    db.exec(`
        CREATE TABLE clients (
            record_id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
            changed_by TEXT,
            
            name TEXT NOT NULL,
            legal_form TEXT NOT NULL,
            inn TEXT NOT NULL,
            kpp TEXT,
            ogrn TEXT,
            
            tax_system TEXT NOT NULL,
            is_nds_payer INTEGER DEFAULT 0,
            nds_value TEXT,
            profit_advance_periodicity TEXT,
            
            has_employees INTEGER DEFAULT 0,
            employee_count INTEGER DEFAULT 0,
            is_ndfl_agent INTEGER DEFAULT 0,
            pays_ndfl_self INTEGER DEFAULT 0,
            
            legal_address TEXT,
            actual_address TEXT,
            
            bank_name TEXT,
            bank_account TEXT,
            bik TEXT,
            corr_account TEXT,
            
            accountant_id TEXT,
            accountant_name TEXT,
            client_status TEXT DEFAULT 'permanent',
            tariff_name TEXT,
            tariff_price REAL,
            
            is_eshn INTEGER DEFAULT 0,
            has_patents INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Создаём индексы (IF NOT EXISTS для безопасности)
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
        CREATE INDEX IF NOT EXISTS idx_clients_valid_from ON clients(valid_from);
        CREATE INDEX IF NOT EXISTS idx_clients_latest ON clients(client_id, record_id DESC);
        CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived);
    `);

    // Переносим данные
    const insertClient = db.prepare(`
        INSERT INTO clients (
            client_id, version, valid_from, changed_by,
            name, legal_form, inn, kpp, ogrn,
            tax_system, is_nds_payer, nds_value, profit_advance_periodicity,
            has_employees, employee_count, is_ndfl_agent, pays_ndfl_self,
            legal_address, actual_address,
            bank_name, bank_account, bik, corr_account,
            accountant_id, accountant_name, client_status, tariff_name, tariff_price,
            is_eshn, has_patents, is_archived, created_at
        ) VALUES (
            @id, 1, @created_at, NULL,
            @name, @legal_form, @inn, @kpp, @ogrn,
            @tax_system, @is_nds_payer, @nds_value, @profit_advance_periodicity,
            @has_employees, @employee_count, @is_ndfl_agent, @pays_ndfl_self,
            @legal_address, @actual_address,
            @bank_name, @bank_account, @bik, @corr_account,
            @accountant_id, @accountant_name, @client_status, @tariff_name, @tariff_price,
            @is_eshn, @has_patents, @is_archived, @created_at
        )
    `);

    for (const client of clients) {
        insertClient.run(client);
    }
    console.log(`   ✅ Перенесено ${clients.length} клиентов`);

    // Удаляем старую таблицу
    db.exec('DROP TABLE clients_old');

    // ===========================
    // МИГРАЦИЯ ТАБЛИЦЫ CONTACTS
    // ===========================
    console.log('\n📋 Миграция таблицы client_contacts...');

    const contacts = db.prepare('SELECT * FROM client_contacts').all();
    console.log(`   Найдено ${contacts.length} контактов`);

    db.exec('ALTER TABLE client_contacts RENAME TO client_contacts_old');

    db.exec(`
        CREATE TABLE client_contacts (
            record_id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
            changed_by TEXT,
            
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            is_primary INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_contacts_contact_id ON client_contacts(contact_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_client ON client_contacts(client_id);
    `);

    const insertContact = db.prepare(`
        INSERT INTO client_contacts (contact_id, client_id, version, valid_from, role, name, phone, email, is_primary)
        VALUES (@id, @client_id, 1, @created_at, @role, @name, @phone, @email, @is_primary)
    `);

    for (const contact of contacts) {
        insertContact.run(contact);
    }
    console.log(`   ✅ Перенесено ${contacts.length} контактов`);

    db.exec('DROP TABLE client_contacts_old');

    // ===========================
    // МИГРАЦИЯ ТАБЛИЦЫ PATENTS
    // ===========================
    console.log('\n📋 Миграция таблицы client_patents...');

    const patents = db.prepare('SELECT * FROM client_patents').all();
    console.log(`   Найдено ${patents.length} патентов`);

    db.exec('ALTER TABLE client_patents RENAME TO client_patents_old');

    db.exec(`
        CREATE TABLE client_patents (
            record_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patent_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
            changed_by TEXT,
            
            name TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            auto_renew INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            is_deleted INTEGER DEFAULT 0
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_patents_patent_id ON client_patents(patent_id);
        CREATE INDEX IF NOT EXISTS idx_patents_client ON client_patents(client_id);
        CREATE INDEX IF NOT EXISTS idx_patents_dates ON client_patents(start_date, end_date);
    `);

    const insertPatent = db.prepare(`
        INSERT INTO client_patents (patent_id, client_id, version, valid_from, name, start_date, end_date, auto_renew, is_active)
        VALUES (@id, @client_id, 1, @created_at, @name, @start_date, @end_date, @auto_renew, 1)
    `);

    for (const patent of patents) {
        insertPatent.run(patent);
    }
    console.log(`   ✅ Перенесено ${patents.length} патентов`);

    db.exec('DROP TABLE client_patents_old');

    // ===========================
    // УДАЛЕНИЕ client_changes
    // ===========================
    console.log('\n📋 Удаление таблицы client_changes (история теперь встроена)...');
    db.exec('DROP TABLE IF EXISTS client_changes');
    console.log('   ✅ Таблица удалена');

    db.exec('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
    console.log('='.repeat(60));
    console.log('\nБэкап сохранён в:', BACKUP_PATH);
    console.log('Перезапустите сервер: npm run dev:all');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ ОШИБКА МИГРАЦИИ:', error.message);
    console.error('База данных не изменена.');

    // Восстанавливаем из бэкапа
    console.log('\n🔄 Восстановление из бэкапа...');
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    console.log('✅ Восстановлено из бэкапа');
} finally {
    db.close();
}
