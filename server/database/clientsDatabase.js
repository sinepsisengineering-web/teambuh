// server/database/clientsDatabase.js
// Сервис работы с SQLite базой данных клиентов
// АРХИТЕКТУРА: Append-Only (версионирование строк)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// ПУТЬ К БАЗЕ ДАННЫХ
// ============================================

const getDbPath = (tenantId = 'org_default') => {
    const dbDir = path.join(process.cwd(), 'data', 'client_data', tenantId, 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'clients.db');
};

// ============================================
// SQL СХЕМЫ ТАБЛИЦ (APPEND-ONLY)
// ============================================

const CREATE_TABLES_SQL = `
    -- Основная таблица клиентов (версионированная)
    CREATE TABLE IF NOT EXISTS clients (
        -- Версионирование
        record_id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_by TEXT,
        
        -- Основные данные
        name TEXT NOT NULL,
        legal_form TEXT NOT NULL,
        inn TEXT NOT NULL,
        kpp TEXT,
        ogrn TEXT,
        
        -- Налоги
        tax_system TEXT NOT NULL,
        is_nds_payer INTEGER DEFAULT 0,
        nds_value TEXT,
        profit_advance_periodicity TEXT,
        
        -- Сотрудники
        has_employees INTEGER DEFAULT 0,
        employee_count INTEGER DEFAULT 0,
        is_ndfl_agent INTEGER DEFAULT 0,
        pays_ndfl_self INTEGER DEFAULT 0,
        
        -- Адреса
        legal_address TEXT,
        actual_address TEXT,
        
        -- Банк
        bank_name TEXT,
        bank_account TEXT,
        bik TEXT,
        corr_account TEXT,
        
        -- Обслуживание
        accountant_id TEXT,
        accountant_name TEXT,
        client_status TEXT DEFAULT 'permanent',
        tariff_name TEXT,
        tariff_price REAL,
        package_id TEXT,
        package_name TEXT,
        service_price REAL,
        service_price_manual INTEGER DEFAULT 0,
        
        -- Флаги
        is_eshn INTEGER DEFAULT 0,
        has_patents INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        
        -- Метаданные
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
    CREATE INDEX IF NOT EXISTS idx_clients_valid_from ON clients(valid_from);
    CREATE INDEX IF NOT EXISTS idx_clients_latest ON clients(client_id, record_id DESC);
    CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived);

    -- Контакты клиентов (версионированные)
    CREATE TABLE IF NOT EXISTS client_contacts (
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
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_contact_id ON client_contacts(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_client ON client_contacts(client_id);

    -- Патенты (версионированные с is_active)
    CREATE TABLE IF NOT EXISTS client_patents (
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
    );

    CREATE INDEX IF NOT EXISTS idx_patents_patent_id ON client_patents(patent_id);
    CREATE INDEX IF NOT EXISTS idx_patents_client ON client_patents(client_id);
    CREATE INDEX IF NOT EXISTS idx_patents_dates ON client_patents(start_date, end_date);

    -- Доступы к сервисам (без версионирования)
    CREATE TABLE IF NOT EXISTS client_credentials (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        login TEXT NOT NULL,
        password TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_credentials_client ON client_credentials(client_id);

    -- Заметки (без версионирования)
    CREATE TABLE IF NOT EXISTS client_notes (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        text TEXT NOT NULL,
        author_id TEXT,
        author_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notes_client ON client_notes(client_id);
`;

// ============================================
// МАППИНГ СТРОКИ БД В ОБЪЕКТ
// ============================================

const mapRowToClient = (row) => {
    if (!row) return null;
    return {
        // Версионирование (опционально для API)
        recordId: row.record_id,
        id: row.client_id,  // Для совместимости используем client_id как id
        clientId: row.client_id,
        version: row.version,
        validFrom: row.valid_from,
        changedBy: row.changed_by,

        // Данные
        name: row.name,
        legalForm: row.legal_form,
        inn: row.inn,
        kpp: row.kpp,
        ogrn: row.ogrn,

        taxSystem: row.tax_system,
        isNdsPayer: !!row.is_nds_payer,
        ndsValue: row.nds_value,
        profitAdvancePeriodicity: row.profit_advance_periodicity,

        hasEmployees: !!row.has_employees,
        employeeCount: row.employee_count,
        isNdflAgent: !!row.is_ndfl_agent,
        paysNdflSelf: !!row.pays_ndfl_self,

        legalAddress: row.legal_address,
        actualAddress: row.actual_address,

        bankName: row.bank_name,
        bankAccount: row.bank_account,
        bik: row.bik,
        corrAccount: row.corr_account,

        accountantId: row.accountant_id,
        accountantName: row.accountant_name,
        clientStatus: row.client_status,
        tariffName: row.tariff_name,
        tariffPrice: row.tariff_price,
        packageId: row.package_id || null,
        packageName: row.package_name || row.tariff_name || null,
        servicePrice: row.service_price != null ? row.service_price : (row.tariff_price || null),
        servicePriceManual: !!row.service_price_manual,

        isEshn: !!row.is_eshn,
        hasPatents: !!row.has_patents,
        isArchived: !!row.is_archived,

        createdAt: row.created_at
    };
};

const mapRowToContact = (row) => {
    if (!row) return null;
    return {
        recordId: row.record_id,
        id: row.contact_id,
        contactId: row.contact_id,
        clientId: row.client_id,
        version: row.version,
        validFrom: row.valid_from,
        changedBy: row.changed_by,

        role: row.role,
        name: row.name,
        phone: row.phone,
        email: row.email,
        isPrimary: !!row.is_primary,
        isDeleted: !!row.is_deleted
    };
};

const mapRowToPatent = (row) => {
    if (!row) return null;
    return {
        recordId: row.record_id,
        id: row.patent_id,
        patentId: row.patent_id,
        clientId: row.client_id,
        version: row.version,
        validFrom: row.valid_from,
        changedBy: row.changed_by,

        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        autoRenew: !!row.auto_renew,
        isActive: !!row.is_active,
        isDeleted: !!row.is_deleted
    };
};

const mapRowToCredential = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        clientId: row.client_id,
        serviceName: row.service_name,
        login: row.login,
        password: row.password,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const mapRowToNote = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        clientId: row.client_id,
        text: row.text,
        authorId: row.author_id,
        authorName: row.author_name,
        createdAt: row.created_at
    };
};

// ============================================
// КЛАСС ДЛЯ РАБОТЫ С КЛИЕНТАМИ (APPEND-ONLY)
// ============================================

class ClientsDatabase {
    constructor(tenantId = 'org_default') {
        const dbPath = getDbPath(tenantId);
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.exec(CREATE_TABLES_SQL);

        // Миграция: добавить новые колонки если их нет
        const migrateCols = [
            ['package_id', 'TEXT'],
            ['package_name', 'TEXT'],
            ['service_price', 'REAL'],
            ['service_price_manual', 'INTEGER DEFAULT 0']
        ];
        for (const [col, type] of migrateCols) {
            try {
                this.db.exec(`ALTER TABLE clients ADD COLUMN ${col} ${type}`);
                console.log(`[ClientsDB] Added column ${col}`);
            } catch (e) {
                // Колонка уже существует — ОК
            }
        }

        console.log('[ClientsDB] Append-only database initialized:', dbPath);
    }

    // ==========================================
    // CLIENTS CRUD (APPEND-ONLY)
    // ==========================================

    /**
     * Создать нового клиента (версия 1)
     */
    createClient(client, changedBy = null) {
        const clientId = client.id || `cli_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const stmt = this.db.prepare(`
            INSERT INTO clients (
                client_id, version, changed_by,
                name, legal_form, inn, kpp, ogrn,
                tax_system, is_nds_payer, nds_value, profit_advance_periodicity,
                has_employees, employee_count, is_ndfl_agent, pays_ndfl_self,
                legal_address, actual_address,
                bank_name, bank_account, bik, corr_account,
                accountant_id, accountant_name, client_status, tariff_name, tariff_price,
                package_id, package_name, service_price, service_price_manual,
                is_eshn, has_patents, is_archived
            ) VALUES (
                @clientId, 1, @changedBy,
                @name, @legalForm, @inn, @kpp, @ogrn,
                @taxSystem, @isNdsPayer, @ndsValue, @profitAdvancePeriodicity,
                @hasEmployees, @employeeCount, @isNdflAgent, @paysNdflSelf,
                @legalAddress, @actualAddress,
                @bankName, @bankAccount, @bik, @corrAccount,
                @accountantId, @accountantName, @clientStatus, @tariffName, @tariffPrice,
                @packageId, @packageName, @servicePrice, @servicePriceManual,
                @isEshn, @hasPatents, @isArchived
            )
        `);

        stmt.run({
            clientId,
            changedBy: changedBy || null,
            name: client.name,
            legalForm: client.legalForm,
            inn: client.inn,
            kpp: client.kpp || null,
            ogrn: client.ogrn || null,
            taxSystem: client.taxSystem,
            isNdsPayer: client.isNdsPayer ? 1 : 0,
            ndsValue: client.ndsValue || null,
            profitAdvancePeriodicity: client.profitAdvancePeriodicity || null,
            hasEmployees: client.hasEmployees ? 1 : 0,
            employeeCount: client.employeeCount || 0,
            isNdflAgent: client.isNdflAgent ? 1 : 0,
            paysNdflSelf: client.paysNdflSelf ? 1 : 0,
            legalAddress: client.legalAddress || null,
            actualAddress: client.actualAddress || null,
            bankName: client.bankName || null,
            bankAccount: client.bankAccount || null,
            bik: client.bik || null,
            corrAccount: client.corrAccount || null,
            accountantId: client.accountantId || null,
            accountantName: client.accountantName || null,
            clientStatus: client.clientStatus || 'permanent',
            tariffName: client.packageName || client.tariffName || null,
            tariffPrice: client.servicePrice || client.tariffPrice || null,
            packageId: client.packageId || null,
            packageName: client.packageName || null,
            servicePrice: client.servicePrice || null,
            servicePriceManual: client.servicePriceManual ? 1 : 0,
            isEshn: client.isEshn ? 1 : 0,
            hasPatents: client.hasPatents ? 1 : 0,
            isArchived: client.isArchived ? 1 : 0
        });

        return this.getClientById(clientId);
    }

    /**
     * Обновить клиента (создать новую версию)
     */
    updateClient(clientId, updates, changedBy = null) {
        // Получаем текущую версию
        const current = this.getClientById(clientId);
        if (!current) return null;

        const newVersion = current.version + 1;
        const merged = { ...current, ...updates };

        const stmt = this.db.prepare(`
            INSERT INTO clients (
                client_id, version, changed_by,
                name, legal_form, inn, kpp, ogrn,
                tax_system, is_nds_payer, nds_value, profit_advance_periodicity,
                has_employees, employee_count, is_ndfl_agent, pays_ndfl_self,
                legal_address, actual_address,
                bank_name, bank_account, bik, corr_account,
                accountant_id, accountant_name, client_status, tariff_name, tariff_price,
                package_id, package_name, service_price, service_price_manual,
                is_eshn, has_patents, is_archived, created_at
            ) VALUES (
                @clientId, @version, @changedBy,
                @name, @legalForm, @inn, @kpp, @ogrn,
                @taxSystem, @isNdsPayer, @ndsValue, @profitAdvancePeriodicity,
                @hasEmployees, @employeeCount, @isNdflAgent, @paysNdflSelf,
                @legalAddress, @actualAddress,
                @bankName, @bankAccount, @bik, @corrAccount,
                @accountantId, @accountantName, @clientStatus, @tariffName, @tariffPrice,
                @packageId, @packageName, @servicePrice, @servicePriceManual,
                @isEshn, @hasPatents, @isArchived, @createdAt
            )
        `);

        stmt.run({
            clientId,
            version: newVersion,
            changedBy: changedBy || null,
            name: merged.name,
            legalForm: merged.legalForm,
            inn: merged.inn,
            kpp: merged.kpp || null,
            ogrn: merged.ogrn || null,
            taxSystem: merged.taxSystem,
            isNdsPayer: merged.isNdsPayer ? 1 : 0,
            ndsValue: merged.ndsValue || null,
            profitAdvancePeriodicity: merged.profitAdvancePeriodicity || null,
            hasEmployees: merged.hasEmployees ? 1 : 0,
            employeeCount: merged.employeeCount || 0,
            isNdflAgent: merged.isNdflAgent ? 1 : 0,
            paysNdflSelf: merged.paysNdflSelf ? 1 : 0,
            legalAddress: merged.legalAddress || null,
            actualAddress: merged.actualAddress || null,
            bankName: merged.bankName || null,
            bankAccount: merged.bankAccount || null,
            bik: merged.bik || null,
            corrAccount: merged.corrAccount || null,
            accountantId: merged.accountantId || null,
            accountantName: merged.accountantName || null,
            clientStatus: merged.clientStatus || 'permanent',
            tariffName: merged.packageName || merged.tariffName || null,
            tariffPrice: merged.servicePrice || merged.tariffPrice || null,
            packageId: merged.packageId || null,
            packageName: merged.packageName || null,
            servicePrice: merged.servicePrice || null,
            servicePriceManual: merged.servicePriceManual ? 1 : 0,
            isEshn: merged.isEshn ? 1 : 0,
            hasPatents: merged.hasPatents ? 1 : 0,
            isArchived: merged.isArchived ? 1 : 0,
            createdAt: current.createdAt
        });

        console.log(`[ClientsDB] Client ${clientId} updated to version ${newVersion} by ${changedBy || 'unknown'}`);
        return this.getClientById(clientId);
    }

    /**
     * Получить клиента по ID (последняя версия)
     */
    getClientById(clientId) {
        const row = this.db.prepare(`
            SELECT * FROM clients 
            WHERE client_id = ? AND is_archived = 0 
            ORDER BY record_id DESC 
            LIMIT 1
        `).get(clientId);
        return mapRowToClient(row);
    }

    /**
     * Получить всех клиентов (последние версии)
     */
    getAllClients(includeArchived = false) {
        const sql = `
            SELECT c.* FROM clients c
            INNER JOIN (
                SELECT client_id, MAX(record_id) as max_record_id
                FROM clients
                ${includeArchived ? '' : 'WHERE is_archived = 0'}
                GROUP BY client_id
            ) latest ON c.client_id = latest.client_id AND c.record_id = latest.max_record_id
            ORDER BY c.name
        `;
        const rows = this.db.prepare(sql).all();
        return rows.map(mapRowToClient);
    }

    /**
     * Получить историю изменений клиента
     */
    getClientHistory(clientId) {
        const rows = this.db.prepare(`
            SELECT * FROM clients 
            WHERE client_id = ? 
            ORDER BY version DESC
        `).all(clientId);
        return rows.map(mapRowToClient);
    }

    /**
     * Получить состояние клиента на определённую дату
     */
    getClientAtDate(clientId, date) {
        const row = this.db.prepare(`
            SELECT * FROM clients 
            WHERE client_id = ? AND valid_from <= ? 
            ORDER BY valid_from DESC 
            LIMIT 1
        `).get(clientId, date);
        return mapRowToClient(row);
    }

    /**
     * Получить клиентов по бухгалтеру
     */
    getClientsByAccountant(accountantId) {
        const sql = `
            SELECT c.* FROM clients c
            INNER JOIN (
                SELECT client_id, MAX(record_id) as max_record_id
                FROM clients
                WHERE is_archived = 0
                GROUP BY client_id
            ) latest ON c.client_id = latest.client_id AND c.record_id = latest.max_record_id
            WHERE c.accountant_id = ?
            ORDER BY c.name
        `;
        const rows = this.db.prepare(sql).all(accountantId);
        return rows.map(mapRowToClient);
    }

    /**
     * Архивировать клиента (новая версия с is_archived = 1)
     */
    archiveClient(clientId, changedBy = null) {
        return this.updateClient(clientId, { isArchived: true }, changedBy);
    }

    /**
     * Удалить клиента (жёсткое удаление всех версий)
     */
    deleteClient(clientId) {
        const result = this.db.prepare('DELETE FROM clients WHERE client_id = ?').run(clientId);
        // Удаляем связанные данные
        this.db.prepare('DELETE FROM client_contacts WHERE client_id = ?').run(clientId);
        this.db.prepare('DELETE FROM client_patents WHERE client_id = ?').run(clientId);
        this.db.prepare('DELETE FROM client_credentials WHERE client_id = ?').run(clientId);
        this.db.prepare('DELETE FROM client_notes WHERE client_id = ?').run(clientId);
        return result.changes > 0;
    }

    // ==========================================
    // CONTACTS (APPEND-ONLY)
    // ==========================================

    addContact(contact, changedBy = null) {
        const contactId = contact.id || `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        // Проверка обязательных полей
        if (!contact.name) {
            console.warn('[ClientsDB] addContact: missing name, skipping');
            return null;
        }

        const stmt = this.db.prepare(`
            INSERT INTO client_contacts (contact_id, client_id, version, changed_by, role, name, phone, email, is_primary)
            VALUES (@contactId, @clientId, 1, @changedBy, @role, @name, @phone, @email, @isPrimary)
        `);
        stmt.run({
            contactId,
            clientId: contact.clientId,
            changedBy: changedBy || null,
            role: contact.role || 'Контактное лицо',  // default role
            name: contact.name,
            phone: contact.phone || null,
            email: contact.email || null,
            isPrimary: contact.isPrimary ? 1 : 0
        });
        return this.getContactById(contactId);
    }

    updateContact(contactId, updates, changedBy = null) {
        const current = this.getContactById(contactId);
        if (!current) return null;

        const merged = { ...current, ...updates };
        const newVersion = current.version + 1;

        const stmt = this.db.prepare(`
            INSERT INTO client_contacts (contact_id, client_id, version, changed_by, role, name, phone, email, is_primary, is_deleted)
            VALUES (@contactId, @clientId, @version, @changedBy, @role, @name, @phone, @email, @isPrimary, @isDeleted)
        `);
        stmt.run({
            contactId,
            clientId: current.clientId,
            version: newVersion,
            changedBy: changedBy || null,
            role: merged.role,
            name: merged.name,
            phone: merged.phone || null,
            email: merged.email || null,
            isPrimary: merged.isPrimary ? 1 : 0,
            isDeleted: merged.isDeleted ? 1 : 0
        });
        return this.getContactById(contactId);
    }

    getContactById(contactId) {
        const row = this.db.prepare(`
            SELECT * FROM client_contacts 
            WHERE contact_id = ? AND is_deleted = 0
            ORDER BY record_id DESC 
            LIMIT 1
        `).get(contactId);
        return mapRowToContact(row);
    }

    getContactsByClient(clientId) {
        const sql = `
            SELECT c.* FROM client_contacts c
            INNER JOIN (
                SELECT contact_id, MAX(record_id) as max_record_id
                FROM client_contacts
                WHERE client_id = ? AND is_deleted = 0
                GROUP BY contact_id
            ) latest ON c.contact_id = latest.contact_id AND c.record_id = latest.max_record_id
        `;
        const rows = this.db.prepare(sql).all(clientId);
        return rows.map(mapRowToContact);
    }

    deleteContact(contactId, changedBy = null) {
        return this.updateContact(contactId, { isDeleted: true }, changedBy);
    }

    // ==========================================
    // PATENTS (APPEND-ONLY)
    // ==========================================

    addPatent(patent, changedBy = null) {
        const patentId = patent.id || `pat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const stmt = this.db.prepare(`
            INSERT INTO client_patents (patent_id, client_id, version, changed_by, name, start_date, end_date, auto_renew, is_active)
            VALUES (@patentId, @clientId, 1, @changedBy, @name, @startDate, @endDate, @autoRenew, 1)
        `);
        stmt.run({
            patentId,
            clientId: patent.clientId,
            changedBy: changedBy || null,
            name: patent.name || null,
            startDate: patent.startDate,
            endDate: patent.endDate,
            autoRenew: patent.autoRenew ? 1 : 0
        });
        return this.getPatentById(patentId);
    }

    updatePatent(patentId, updates, changedBy = null) {
        const current = this.getPatentById(patentId);
        if (!current) return null;

        const merged = { ...current, ...updates };
        const newVersion = current.version + 1;

        const stmt = this.db.prepare(`
            INSERT INTO client_patents (patent_id, client_id, version, changed_by, name, start_date, end_date, auto_renew, is_active, is_deleted)
            VALUES (@patentId, @clientId, @version, @changedBy, @name, @startDate, @endDate, @autoRenew, @isActive, @isDeleted)
        `);
        stmt.run({
            patentId,
            clientId: current.clientId,
            version: newVersion,
            changedBy: changedBy || null,
            name: merged.name || null,
            startDate: merged.startDate,
            endDate: merged.endDate,
            autoRenew: merged.autoRenew ? 1 : 0,
            isActive: merged.isActive !== false ? 1 : 0,
            isDeleted: merged.isDeleted ? 1 : 0
        });
        return this.getPatentById(patentId);
    }

    getPatentById(patentId) {
        const row = this.db.prepare(`
            SELECT * FROM client_patents 
            WHERE patent_id = ? AND is_deleted = 0
            ORDER BY record_id DESC 
            LIMIT 1
        `).get(patentId);
        return mapRowToPatent(row);
    }

    getPatentsByClient(clientId) {
        const sql = `
            SELECT p.* FROM client_patents p
            INNER JOIN (
                SELECT patent_id, MAX(record_id) as max_record_id
                FROM client_patents
                WHERE client_id = ? AND is_deleted = 0
                GROUP BY patent_id
            ) latest ON p.patent_id = latest.patent_id AND p.record_id = latest.max_record_id
        `;
        const rows = this.db.prepare(sql).all(clientId);
        return rows.map(mapRowToPatent);
    }

    deletePatent(patentId, changedBy = null) {
        return this.updatePatent(patentId, { isDeleted: true }, changedBy);
    }

    // ==========================================
    // CREDENTIALS (простое хранение)
    // ==========================================

    addCredential(credential) {
        const stmt = this.db.prepare(`
            INSERT INTO client_credentials (id, client_id, service_name, login, password, notes)
            VALUES (@id, @clientId, @serviceName, @login, @password, @notes)
        `);
        stmt.run({
            id: credential.id,
            clientId: credential.clientId,
            serviceName: credential.serviceName,
            login: credential.login,
            password: credential.password || null,
            notes: credential.notes || null
        });
        return this.getCredentialById(credential.id);
    }

    getCredentialById(id) {
        const row = this.db.prepare('SELECT * FROM client_credentials WHERE id = ?').get(id);
        return mapRowToCredential(row);
    }

    getCredentialsByClient(clientId) {
        const rows = this.db.prepare('SELECT * FROM client_credentials WHERE client_id = ?').all(clientId);
        return rows.map(mapRowToCredential);
    }

    deleteCredential(id) {
        const result = this.db.prepare('DELETE FROM client_credentials WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ==========================================
    // NOTES (простое хранение)
    // ==========================================

    addNote(note) {
        const stmt = this.db.prepare(`
            INSERT INTO client_notes (id, client_id, text, author_id, author_name)
            VALUES (@id, @clientId, @text, @authorId, @authorName)
        `);
        stmt.run({
            id: note.id,
            clientId: note.clientId,
            text: note.text,
            authorId: note.authorId || null,
            authorName: note.authorName || null
        });
        return this.getNoteById(note.id);
    }

    getNoteById(id) {
        const row = this.db.prepare('SELECT * FROM client_notes WHERE id = ?').get(id);
        return mapRowToNote(row);
    }

    getNotesByClient(clientId) {
        const rows = this.db.prepare(
            'SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC'
        ).all(clientId);
        return rows.map(mapRowToNote);
    }

    deleteNote(id) {
        const result = this.db.prepare('DELETE FROM client_notes WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ==========================================
    // ПОЛНЫЙ КЛИЕНТ СО СВЯЗЯМИ
    // ==========================================

    getClientWithRelations(clientId) {
        const client = this.getClientById(clientId);
        if (!client) return null;

        return {
            ...client,
            contacts: this.getContactsByClient(clientId),
            patents: this.getPatentsByClient(clientId),
            credentials: this.getCredentialsByClient(clientId),
            notes: this.getNotesByClient(clientId)
        };
    }

    // ==========================================
    // УТИЛИТЫ
    // ==========================================

    close() {
        this.db.close();
    }

    getStats() {
        // Считаем уникальных клиентов (по client_id)
        const row = this.db.prepare(`
            SELECT 
                COUNT(DISTINCT client_id) as total,
                COUNT(DISTINCT CASE WHEN is_archived = 0 THEN client_id END) as active,
                COUNT(DISTINCT CASE WHEN is_archived = 1 THEN client_id END) as archived
            FROM clients c
            WHERE c.record_id IN (
                SELECT MAX(record_id) FROM clients GROUP BY client_id
            )
        `).get();
        return {
            total: row.total || 0,
            active: row.active || 0,
            archived: row.archived || 0
        };
    }
}

// ============================================
// SINGLETON
// ============================================

const instances = new Map();

const getClientsDatabase = (tenantId = 'org_default') => {
    if (!instances.has(tenantId)) {
        instances.set(tenantId, new ClientsDatabase(tenantId));
    }
    return instances.get(tenantId);
};

module.exports = {
    ClientsDatabase,
    getClientsDatabase,
    getDbPath
};
