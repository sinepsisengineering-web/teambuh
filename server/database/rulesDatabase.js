// server/database/rulesDatabase.js
// Сервис работы с таблицами правил задач (Master + Tenant)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// ПУТИ К БАЗАМ ДАННЫХ
// ============================================

/**
 * Master DB — общая база системных правил (одна на весь сервер)
 */
const getMasterDbPath = () => {
    const dbDir = path.join(process.cwd(), 'data', 'global_data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'rules.db');
};

/**
 * Tenant DB — база правил конкретной организации
 */
const getTenantDbPath = (tenantId = 'org_default') => {
    const dbDir = path.join(process.cwd(), 'data', 'client_data', tenantId, 'db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'rules.db');
};

// ============================================
// SQL СХЕМА ТАБЛИЦЫ
// ============================================

const CREATE_RULES_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS task_rules (
        -- Идентификация
        id TEXT PRIMARY KEY,
        source TEXT CHECK(source IN ('system', 'custom')) NOT NULL,
        storage_category TEXT CHECK(storage_category IN ('налоговые', 'финансовые', 'организационные', 'шаблоны')) NOT NULL,
        is_active INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        
        -- Отображение в UI (поля модального окна)
        task_type TEXT NOT NULL,
        short_title TEXT NOT NULL,
        short_description TEXT NOT NULL,
        description TEXT,
        title_template TEXT NOT NULL,
        law_reference TEXT,
        
        -- Периодичность
        periodicity TEXT CHECK(periodicity IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
        period_type TEXT CHECK(period_type IN ('current', 'past')) DEFAULT 'past',
        
        -- Расчёт даты
        day_of_month INTEGER NOT NULL,
        target_month INTEGER,
        month_offset INTEGER DEFAULT 0,
        quarter_month_offset INTEGER,
        special_rule TEXT,
        
        -- Перенос выходных
        due_date_rule TEXT CHECK(due_date_rule IN ('next_business_day', 'previous_business_day', 'no_transfer')) DEFAULT 'next_business_day',
        
        -- Применимость (JSON поля)
        applies_to_all INTEGER DEFAULT 1,
        applies_to_legal_forms TEXT,
        applies_to_tax_systems TEXT,
        requires_employees INTEGER DEFAULT 0,
        requires_nds INTEGER DEFAULT 0,
        applies_to_client_ids TEXT,
        profit_advance_periodicity TEXT, -- 'monthly' | 'quarterly' | null (для любой)
        
        -- Исключения
        exclude_months TEXT,
        
        -- Допуск к выполнению (за сколько дней до срока можно выполнить)
        completion_lead_days INTEGER DEFAULT 3,
        
        -- Только по привязке (не авто-генерировать)
        manual_only INTEGER DEFAULT 0,
        
        -- Метаданные
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_task_rules_source ON task_rules(source);
    CREATE INDEX IF NOT EXISTS idx_task_rules_category ON task_rules(storage_category);
    CREATE INDEX IF NOT EXISTS idx_task_rules_active ON task_rules(is_active);
`;

// ============================================
// МАППИНГ СТРОКИ БД В ОБЪЕКТ
// ============================================

// Маппинг dueDateRule — identity (DB и TypeScript используют одинаковые значения)
const mapDueDateRule = (dbValue) => {
    return dbValue || 'next_business_day';
};

// Обратный маппинг — identity
const mapDueDateRuleToDb = (tsValue) => {
    return tsValue || 'next_business_day';
};

const mapRowToRule = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        source: row.source,
        storageCategory: row.storage_category,
        isActive: !!row.is_active,
        version: row.version,

        taskType: row.task_type,
        shortTitle: row.short_title,
        shortDescription: row.short_description,
        description: row.description,
        titleTemplate: row.title_template,
        lawReference: row.law_reference,

        periodicity: row.periodicity,
        periodType: row.period_type,

        dateConfig: {
            day: row.day_of_month,
            month: row.target_month,
            monthOffset: row.month_offset,
            quarterMonthOffset: row.quarter_month_offset,
            specialRule: row.special_rule
        },

        // Маппинг в формат TypeScript enum: 'next' | 'previous' | 'none'
        dueDateRule: mapDueDateRule(row.due_date_rule),

        applicabilityConfig: {
            allClients: !!row.applies_to_all,
            legalForms: row.applies_to_legal_forms ? JSON.parse(row.applies_to_legal_forms) : null,
            taxSystems: row.applies_to_tax_systems ? JSON.parse(row.applies_to_tax_systems) : null,
            requiresEmployees: !!row.requires_employees,
            requiresNds: !!row.requires_nds,
            clientIds: row.applies_to_client_ids ? JSON.parse(row.applies_to_client_ids) : null,
            profitAdvancePeriodicity: row.profit_advance_periodicity || null
        },

        excludeMonths: row.exclude_months ? JSON.parse(row.exclude_months) : null,

        completionLeadDays: row.completion_lead_days ?? 3,
        manualOnly: !!row.manual_only,

        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by
    };
};

// ============================================
// КЛАСС ДЛЯ РАБОТЫ С ПРАВИЛАМИ
// ============================================

class RulesDatabase {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(CREATE_RULES_TABLE_SQL);

        // Миграция: добавляем колонку profit_advance_periodicity если её нет (для существующих БД)
        try {
            this.db.exec(`ALTER TABLE task_rules ADD COLUMN profit_advance_periodicity TEXT`);
            console.log('[RulesDB] Migration: added profit_advance_periodicity column');
        } catch (e) {
            // Колонка уже существует — это нормально
        }

        // Миграция: добавляем колонку completion_lead_days если её нет
        try {
            this.db.exec(`ALTER TABLE task_rules ADD COLUMN completion_lead_days INTEGER DEFAULT 3`);
            console.log('[RulesDB] Migration: added completion_lead_days column');
        } catch (e) {
            // Колонка уже существует — это нормально
        }
        // Миграция: manual_only
        try {
            this.db.exec(`ALTER TABLE task_rules ADD COLUMN manual_only INTEGER DEFAULT 0`);
            console.log('[RulesDB] Migration: added manual_only column');
        } catch (e) {
            // Колонка уже существует
        }

        // Миграция: добавляем категорию 'шаблоны' — пересоздаём таблицу с новым CHECK
        try {
            const hasTemplateCategory = this.db.prepare(
                `SELECT sql FROM sqlite_master WHERE type='table' AND name='task_rules'`
            ).get();
            if (hasTemplateCategory && !hasTemplateCategory.sql.includes('шаблоны')) {
                console.log('[RulesDB] Migration: adding шаблоны category...');
                this.db.exec(`
                    ALTER TABLE task_rules RENAME TO task_rules_old;
                `);
                this.db.exec(CREATE_RULES_TABLE_SQL);
                this.db.exec(`
                    INSERT INTO task_rules SELECT * FROM task_rules_old;
                `);
                this.db.exec(`DROP TABLE task_rules_old;`);
                // Перевести старые custom-шаблоны в новую категорию
                this.db.exec(`
                    UPDATE task_rules SET storage_category = 'шаблоны' 
                    WHERE source = 'custom' AND storage_category = 'организационные';
                `);
                console.log('[RulesDB] Migration: шаблоны category added successfully');
            }
        } catch (e) {
            console.error('[RulesDB] Migration error (шаблоны):', e.message);
        }

        console.log('[RulesDB] Database initialized:', dbPath);
    }

    // Получить все правила
    getAll() {
        const rows = this.db.prepare('SELECT * FROM task_rules WHERE is_active = 1 ORDER BY storage_category, short_title').all();
        return rows.map(mapRowToRule);
    }

    // Получить по ID
    getById(id) {
        const row = this.db.prepare('SELECT * FROM task_rules WHERE id = ?').get(id);
        return mapRowToRule(row);
    }

    // Получить по источнику (system/custom)
    getBySource(source) {
        const rows = this.db.prepare('SELECT * FROM task_rules WHERE source = ? AND is_active = 1').all(source);
        return rows.map(mapRowToRule);
    }

    // Получить по категории
    getByCategory(category) {
        const rows = this.db.prepare('SELECT * FROM task_rules WHERE storage_category = ? AND is_active = 1').all(category);
        return rows.map(mapRowToRule);
    }

    // Создать правило
    create(rule) {
        const stmt = this.db.prepare(`
            INSERT INTO task_rules (
                id, source, storage_category, is_active, version,
                task_type, short_title, short_description, description, title_template, law_reference,
                periodicity, period_type,
                day_of_month, target_month, month_offset, quarter_month_offset, special_rule,
                due_date_rule,
                applies_to_all, applies_to_legal_forms, applies_to_tax_systems,
                requires_employees, requires_nds, applies_to_client_ids, profit_advance_periodicity,
                exclude_months, completion_lead_days, manual_only, created_by
            ) VALUES (
                @id, @source, @storageCategory, @isActive, @version,
                @taskType, @shortTitle, @shortDescription, @description, @titleTemplate, @lawReference,
                @periodicity, @periodType,
                @dayOfMonth, @targetMonth, @monthOffset, @quarterMonthOffset, @specialRule,
                @dueDateRule,
                @appliesToAll, @appliesToLegalForms, @appliesToTaxSystems,
                @requiresEmployees, @requiresNds, @appliesToClientIds, @profitAdvancePeriodicity,
                @excludeMonths, @completionLeadDays, @manualOnly, @createdBy
            )
        `);

        stmt.run({
            id: rule.id,
            source: rule.source || 'custom',
            storageCategory: rule.storageCategory || 'организационные',
            isActive: rule.isActive !== false ? 1 : 0,
            version: rule.version || 1,

            taskType: rule.taskType,
            shortTitle: rule.shortTitle,
            shortDescription: rule.shortDescription,
            description: rule.description || null,
            titleTemplate: rule.titleTemplate,
            lawReference: rule.lawReference || null,

            periodicity: rule.periodicity,
            periodType: rule.periodType || 'past',

            dayOfMonth: rule.dateConfig?.day || 1,
            targetMonth: rule.dateConfig?.month ?? null,
            monthOffset: rule.dateConfig?.monthOffset || 0,
            quarterMonthOffset: rule.dateConfig?.quarterMonthOffset ?? null,
            specialRule: rule.dateConfig?.specialRule || null,

            dueDateRule: mapDueDateRuleToDb(rule.dueDateRule),

            appliesToAll: rule.applicabilityConfig?.allClients !== false ? 1 : 0,
            appliesToLegalForms: rule.applicabilityConfig?.legalForms ? JSON.stringify(rule.applicabilityConfig.legalForms) : null,
            appliesToTaxSystems: rule.applicabilityConfig?.taxSystems ? JSON.stringify(rule.applicabilityConfig.taxSystems) : null,
            requiresEmployees: rule.applicabilityConfig?.requiresEmployees ? 1 : 0,
            requiresNds: rule.applicabilityConfig?.requiresNds ? 1 : 0,
            appliesToClientIds: rule.applicabilityConfig?.clientIds ? JSON.stringify(rule.applicabilityConfig.clientIds) : null,
            profitAdvancePeriodicity: rule.applicabilityConfig?.profitAdvancePeriodicity || null,

            excludeMonths: rule.excludeMonths ? JSON.stringify(rule.excludeMonths) : null,
            completionLeadDays: rule.completionLeadDays ?? 3,
            manualOnly: rule.manualOnly ? 1 : 0,
            createdBy: rule.createdBy || 'system'
        });

        return this.getById(rule.id);
    }

    // Обновить правило
    update(id, updates) {
        const existing = this.getById(id);
        if (!existing) return null;

        const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

        this.db.prepare(`
            UPDATE task_rules SET
                storage_category = @storageCategory,
                task_type = @taskType,
                short_title = @shortTitle,
                short_description = @shortDescription,
                description = @description,
                title_template = @titleTemplate,
                law_reference = @lawReference,
                periodicity = @periodicity,
                period_type = @periodType,
                day_of_month = @dayOfMonth,
                target_month = @targetMonth,
                month_offset = @monthOffset,
                quarter_month_offset = @quarterMonthOffset,
                special_rule = @specialRule,
                due_date_rule = @dueDateRule,
                applies_to_all = @appliesToAll,
                applies_to_legal_forms = @appliesToLegalForms,
                applies_to_tax_systems = @appliesToTaxSystems,
                requires_employees = @requiresEmployees,
                requires_nds = @requiresNds,
                applies_to_client_ids = @appliesToClientIds,
                profit_advance_periodicity = @profitAdvancePeriodicity,
                exclude_months = @excludeMonths,
                completion_lead_days = @completionLeadDays,
                manual_only = @manualOnly,
                updated_at = @updatedAt,
                version = version + 1
            WHERE id = @id
        `).run({
            id,
            storageCategory: merged.storageCategory || merged.category || existing.storageCategory,
            taskType: merged.taskType,
            shortTitle: merged.shortTitle,
            shortDescription: merged.shortDescription,
            description: merged.description,
            titleTemplate: merged.titleTemplate,
            lawReference: merged.lawReference,
            periodicity: merged.periodicity,
            periodType: merged.periodType,
            dayOfMonth: merged.dateConfig?.day || 1,
            targetMonth: merged.dateConfig?.month ?? null,
            monthOffset: merged.dateConfig?.monthOffset || 0,
            quarterMonthOffset: merged.dateConfig?.quarterMonthOffset ?? null,
            specialRule: merged.dateConfig?.specialRule || null,
            dueDateRule: mapDueDateRuleToDb(merged.dueDateRule),
            appliesToAll: merged.applicabilityConfig?.allClients !== false ? 1 : 0,
            appliesToLegalForms: merged.applicabilityConfig?.legalForms ? JSON.stringify(merged.applicabilityConfig.legalForms) : null,
            appliesToTaxSystems: merged.applicabilityConfig?.taxSystems ? JSON.stringify(merged.applicabilityConfig.taxSystems) : null,
            requiresEmployees: merged.applicabilityConfig?.requiresEmployees ? 1 : 0,
            requiresNds: merged.applicabilityConfig?.requiresNds ? 1 : 0,
            appliesToClientIds: merged.applicabilityConfig?.clientIds ? JSON.stringify(merged.applicabilityConfig.clientIds) : null,
            profitAdvancePeriodicity: merged.applicabilityConfig?.profitAdvancePeriodicity || null,
            excludeMonths: merged.excludeMonths ? JSON.stringify(merged.excludeMonths) : null,
            completionLeadDays: merged.completionLeadDays ?? 3,
            manualOnly: merged.manualOnly ? 1 : 0,
            updatedAt: merged.updatedAt
        });

        return this.getById(id);
    }

    // Удалить правило (мягкое удаление)
    delete(id) {
        const result = this.db.prepare('UPDATE task_rules SET is_active = 0 WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // Проверить существование правила
    exists(id) {
        const row = this.db.prepare('SELECT 1 FROM task_rules WHERE id = ?').get(id);
        return !!row;
    }

    // Количество правил
    count() {
        const row = this.db.prepare('SELECT COUNT(*) as count FROM task_rules WHERE is_active = 1').get();
        return row.count;
    }

    // Закрыть соединение
    close() {
        this.db.close();
    }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

let masterInstance = null;
const tenantInstances = new Map();

/**
 * Получить Master DB (системные правила)
 */
const getMasterRulesDatabase = () => {
    if (!masterInstance) {
        masterInstance = new RulesDatabase(getMasterDbPath());
    }
    return masterInstance;
};

/**
 * Получить Tenant DB (правила организации)
 */
const getTenantRulesDatabase = (tenantId = 'org_default') => {
    if (!tenantInstances.has(tenantId)) {
        tenantInstances.set(tenantId, new RulesDatabase(getTenantDbPath(tenantId)));
    }
    return tenantInstances.get(tenantId);
};

module.exports = {
    RulesDatabase,
    getMasterRulesDatabase,
    getTenantRulesDatabase,
    getMasterDbPath,
    getTenantDbPath
};
