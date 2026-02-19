// server/database/servicesDatabase.js
// Сервис работы с SQLite базой данных услуг и комплексов

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// ПУТЬ К БАЗЕ ДАННЫХ
// ============================================

function getDbPath(tenantId = 'org_default') {
    const dbDir = path.join(__dirname, '..', '..', 'data', 'client_data', tenantId, 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'services.db');
}

// ============================================
// SQL СХЕМЫ ТАБЛИЦ
// ============================================

const CREATE_TABLES_SQL = `
    -- Услуги (разовые)
    CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        unit TEXT,
        category TEXT DEFAULT 'accounting',
        periodicity TEXT DEFAULT 'once',
        target_entity_type TEXT DEFAULT 'all',
        is_archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_services_org ON services(org_id);
    CREATE INDEX IF NOT EXISTS idx_services_archived ON services(is_archived);

    -- Комплексы (абонентские пакеты)
    CREATE TABLE IF NOT EXISTS packages (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        target_entity_type TEXT DEFAULT 'all',
        included_items TEXT DEFAULT '[]',
        is_archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_packages_org ON packages(org_id);
    CREATE INDEX IF NOT EXISTS idx_packages_archived ON packages(is_archived);
`;

// ============================================
// МАППИНГ СТРОКИ БД В ОБЪЕКТ
// ============================================

function mapRowToService(row) {
    if (!row) return null;
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        description: row.description,
        price: row.price,
        unit: row.unit,
        category: row.category,
        periodicity: row.periodicity,
        targetEntityType: row.target_entity_type,
        isArchived: row.is_archived === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapRowToPackage(row) {
    if (!row) return null;
    let includedItems = [];
    try {
        includedItems = JSON.parse(row.included_items || '[]');
    } catch (e) {
        includedItems = [];
    }
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        description: row.description,
        price: row.price,
        targetEntityType: row.target_entity_type,
        includedItems,
        isArchived: row.is_archived === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ============================================
// КЛАСС ДЛЯ РАБОТЫ С УСЛУГАМИ
// ============================================

class ServicesDatabase {
    constructor(tenantId = 'org_default') {
        const dbPath = getDbPath(tenantId);
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(CREATE_TABLES_SQL);
        console.log(`[ServicesDB] Initialized for tenant: ${tenantId}, path: ${dbPath}`);
    }

    // --- УСЛУГИ ---

    createService(data) {
        const id = data.id || `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const stmt = this.db.prepare(`
            INSERT INTO services (id, org_id, name, description, price, unit, category, periodicity, target_entity_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            id,
            data.orgId || 'org_default',
            data.name,
            data.description || null,
            data.price || 0,
            data.unit || null,
            data.category || 'accounting',
            data.periodicity || 'once',
            data.targetEntityType || 'all'
        );
        return this.getServiceById(id);
    }

    updateService(id, data) {
        const existing = this.getServiceById(id);
        if (!existing) return null;

        const stmt = this.db.prepare(`
            UPDATE services SET
                name = ?, description = ?, price = ?, unit = ?,
                category = ?, periodicity = ?, target_entity_type = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(
            data.name ?? existing.name,
            data.description ?? existing.description,
            data.price ?? existing.price,
            data.unit ?? existing.unit,
            data.category ?? existing.category,
            data.periodicity ?? existing.periodicity,
            data.targetEntityType ?? existing.targetEntityType,
            id
        );
        return this.getServiceById(id);
    }

    getServiceById(id) {
        const row = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id);
        return mapRowToService(row);
    }

    getAllServices(includeArchived = false) {
        const sql = includeArchived
            ? 'SELECT * FROM services ORDER BY created_at DESC'
            : 'SELECT * FROM services WHERE is_archived = 0 ORDER BY created_at DESC';
        return this.db.prepare(sql).all().map(mapRowToService);
    }

    archiveService(id) {
        this.db.prepare('UPDATE services SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return this.getServiceById(id);
    }

    restoreService(id) {
        this.db.prepare('UPDATE services SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return this.getServiceById(id);
    }

    // --- КОМПЛЕКСЫ ---

    createPackage(data) {
        const id = data.id || `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const stmt = this.db.prepare(`
            INSERT INTO packages (id, org_id, name, description, price, target_entity_type, included_items)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            id,
            data.orgId || 'org_default',
            data.name,
            data.description || null,
            data.price || 0,
            data.targetEntityType || 'all',
            JSON.stringify(data.includedItems || [])
        );
        return this.getPackageById(id);
    }

    updatePackage(id, data) {
        const existing = this.getPackageById(id);
        if (!existing) return null;

        const stmt = this.db.prepare(`
            UPDATE packages SET
                name = ?, description = ?, price = ?,
                target_entity_type = ?, included_items = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(
            data.name ?? existing.name,
            data.description ?? existing.description,
            data.price ?? existing.price,
            data.targetEntityType ?? existing.targetEntityType,
            JSON.stringify(data.includedItems ?? existing.includedItems),
            id
        );
        return this.getPackageById(id);
    }

    getPackageById(id) {
        const row = this.db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
        return mapRowToPackage(row);
    }

    getAllPackages(includeArchived = false) {
        const sql = includeArchived
            ? 'SELECT * FROM packages ORDER BY created_at DESC'
            : 'SELECT * FROM packages WHERE is_archived = 0 ORDER BY created_at DESC';
        return this.db.prepare(sql).all().map(mapRowToPackage);
    }

    archivePackage(id) {
        this.db.prepare('UPDATE packages SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return this.getPackageById(id);
    }

    restorePackage(id) {
        this.db.prepare('UPDATE packages SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return this.getPackageById(id);
    }

    // --- СТАТИСТИКА ---

    getStats() {
        const servicesCount = this.db.prepare('SELECT COUNT(*) as count FROM services WHERE is_archived = 0').get().count;
        const packagesCount = this.db.prepare('SELECT COUNT(*) as count FROM packages WHERE is_archived = 0').get().count;
        const archivedServices = this.db.prepare('SELECT COUNT(*) as count FROM services WHERE is_archived = 1').get().count;
        const archivedPackages = this.db.prepare('SELECT COUNT(*) as count FROM packages WHERE is_archived = 1').get().count;
        return { servicesCount, packagesCount, archivedServices, archivedPackages };
    }

    close() {
        this.db.close();
    }
}

// ============================================
// СИНГЛТОН-КЭШИРОВАНИЕ ПО TENANT
// ============================================

const instances = new Map();

function getServicesDatabase(tenantId = 'org_default') {
    if (!instances.has(tenantId)) {
        instances.set(tenantId, new ServicesDatabase(tenantId));
    }
    return instances.get(tenantId);
}

module.exports = { ServicesDatabase, getServicesDatabase };
