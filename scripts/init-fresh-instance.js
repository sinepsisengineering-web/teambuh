// scripts/init-fresh-instance.js
// Скрипт первого запуска: создаёт структуру, Супер-Админа и заполняет global_data
//
// Использование: node scripts/init-fresh-instance.js [tenantId]
// По умолчанию: org_default

const Database = require('better-sqlite3');
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
// 2. СОЗДАНИЕ СУПЕР-АДМИНА
// ============================================

const adminId = 'emp-admin';
const adminDir = path.join(CLIENT_DATA_DIR, 'employees', adminId);

if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir, { recursive: true });

    // Хэшируем пароль через bcrypt (синхронно для скрипта)
    const defaultPassword = 'admin123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const adminProfile = {
        id: adminId,
        name: 'Администратор',
        lastName: 'Администратор',
        role: 'super-admin',
        email: 'admin@teambuh.local',
        phone: '',
        position: 'Супер-Администратор',
        passwordHash: passwordHash,
        isActive: true,
        createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(adminDir, 'profile.json'),
        JSON.stringify(adminProfile, null, 2)
    );

    console.log('  👤 Создан Супер-Админ:');
    console.log('     Email:  admin@teambuh.local');
    console.log('     Пароль: admin123');
    console.log('     ⚠️  Смените пароль после первого входа!');
} else {
    console.log('  ✅ Супер-Админ уже существует');
}

console.log('');

// ============================================
// 3. ИНИЦИАЛИЗАЦИЯ GLOBAL_DATA (системные правила)
// ============================================

const globalRulesDbPath = path.join(GLOBAL_DATA_DIR, 'rules.db');
const isNewGlobalDb = !fs.existsSync(globalRulesDbPath);

const globalDb = new Database(globalRulesDbPath);
globalDb.pragma('journal_mode = WAL');

// Создаём таблицу (та же схема что в rulesDatabase.js)
globalDb.exec(`
    CREATE TABLE IF NOT EXISTS task_rules (
        id TEXT PRIMARY KEY,
        source TEXT CHECK(source IN ('system', 'custom')) NOT NULL,
        storage_category TEXT CHECK(storage_category IN (
            'налоги', 'бухгалтерия', 'кадры', 'отчётность', 'организационные', 'шаблоны'
        )) NOT NULL DEFAULT 'налоги',
        
        name TEXT NOT NULL,
        description TEXT,
        
        periodicity TEXT CHECK(periodicity IN ('monthly', 'quarterly', 'yearly', 'one-time')) NOT NULL,
        day_of_month INTEGER,
        month_of_quarter INTEGER,
        month_of_year INTEGER,
        
        due_date_rule TEXT DEFAULT 'standard',
        due_time TEXT,
        
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        
        estimated_hours REAL,
        category TEXT,
        
        is_active INTEGER DEFAULT 1,
        applies_to_all INTEGER DEFAULT 1,
        applies_to_legal_forms TEXT,
        applies_to_tax_systems TEXT,
        requires_employees INTEGER DEFAULT 0,
        requires_nds INTEGER DEFAULT 0,
        applies_to_client_ids TEXT,
        profit_advance_periodicity TEXT,
        
        is_eshn_specific INTEGER DEFAULT 0,
        is_patent_specific INTEGER DEFAULT 0,
        completion_lead_days INTEGER DEFAULT 3,
        manual_only INTEGER DEFAULT 0,
        
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_task_rules_source ON task_rules(source);
    CREATE INDEX IF NOT EXISTS idx_task_rules_category ON task_rules(storage_category);
    CREATE INDEX IF NOT EXISTS idx_task_rules_active ON task_rules(is_active);
`);

// Заполняем системные правила только если БД новая
const existingCount = globalDb.prepare('SELECT COUNT(*) as count FROM task_rules').get().count;

if (existingCount === 0) {
    console.log('  📋 Заполнение системных налоговых правил...');

    const systemRules = [
        // --- НАЛОГИ (ежемесячные) ---
        {
            id: 'sys-ndfl-monthly',
            name: 'НДФЛ — перечисление',
            description: 'Перечисление удержанного НДФЛ с выплат сотрудникам',
            storage_category: 'налоги',
            periodicity: 'monthly',
            day_of_month: 28,
            priority: 'high',
            requires_employees: 1,
        },
        {
            id: 'sys-insurance-monthly',
            name: 'Страховые взносы — перечисление',
            description: 'Перечисление страховых взносов (ПФР, ФСС, ФОМС)',
            storage_category: 'налоги',
            periodicity: 'monthly',
            day_of_month: 28,
            priority: 'high',
            requires_employees: 1,
        },
        {
            id: 'sys-nds-monthly',
            name: 'НДС — уплата 1/3',
            description: 'Уплата 1/3 НДС за прошлый квартал',
            storage_category: 'налоги',
            periodicity: 'monthly',
            day_of_month: 28,
            priority: 'high',
            requires_nds: 1,
        },

        // --- ОТЧЁТНОСТЬ (ежеквартальная) ---
        {
            id: 'sys-rsv-quarterly',
            name: 'РСВ — расчёт по страховым взносам',
            description: 'Сдача расчёта по страховым взносам за квартал',
            storage_category: 'отчётность',
            periodicity: 'quarterly',
            day_of_month: 25,
            month_of_quarter: 1,
            priority: 'high',
            requires_employees: 1,
        },
        {
            id: 'sys-6ndfl-quarterly',
            name: '6-НДФЛ — расчёт',
            description: 'Сдача расчёта 6-НДФЛ за квартал',
            storage_category: 'отчётность',
            periodicity: 'quarterly',
            day_of_month: 25,
            month_of_quarter: 1,
            priority: 'high',
            requires_employees: 1,
        },
        {
            id: 'sys-nds-declaration',
            name: 'Декларация по НДС',
            description: 'Сдача декларации по НДС за квартал',
            storage_category: 'отчётность',
            periodicity: 'quarterly',
            day_of_month: 25,
            month_of_quarter: 1,
            priority: 'critical',
            requires_nds: 1,
        },
        {
            id: 'sys-profit-quarterly',
            name: 'Налог на прибыль — авансовый платёж',
            description: 'Уплата авансового платежа по налогу на прибыль',
            storage_category: 'налоги',
            periodicity: 'quarterly',
            day_of_month: 28,
            month_of_quarter: 1,
            priority: 'high',
            applies_to_tax_systems: '["OSNO"]',
        },
        {
            id: 'sys-usn-quarterly',
            name: 'УСН — авансовый платёж',
            description: 'Уплата авансового платежа по УСН за квартал',
            storage_category: 'налоги',
            periodicity: 'quarterly',
            day_of_month: 28,
            month_of_quarter: 1,
            priority: 'high',
            applies_to_tax_systems: '["USN6", "USN15"]',
        },

        // --- ОТЧЁТНОСТЬ (ежегодная) ---
        {
            id: 'sys-buh-balance',
            name: 'Бухгалтерская отчётность (баланс)',
            description: 'Сдача годовой бухгалтерской отчётности',
            storage_category: 'бухгалтерия',
            periodicity: 'yearly',
            day_of_month: 31,
            month_of_year: 3,
            priority: 'critical',
        },
        {
            id: 'sys-profit-yearly',
            name: 'Декларация по налогу на прибыль (годовая)',
            description: 'Сдача годовой декларации по налогу на прибыль',
            storage_category: 'отчётность',
            periodicity: 'yearly',
            day_of_month: 25,
            month_of_year: 3,
            priority: 'critical',
            applies_to_tax_systems: '["OSNO"]',
        },
        {
            id: 'sys-usn-yearly',
            name: 'Декларация по УСН (годовая)',
            description: 'Сдача годовой декларации по УСН',
            storage_category: 'отчётность',
            periodicity: 'yearly',
            day_of_month: 25,
            month_of_year: 3,
            priority: 'critical',
            applies_to_tax_systems: '["USN6", "USN15"]',
        },
        {
            id: 'sys-2ndfl-yearly',
            name: 'Справка 2-НДФЛ (в составе 6-НДФЛ)',
            description: 'Сдача сведений о доходах физлиц за год',
            storage_category: 'отчётность',
            periodicity: 'yearly',
            day_of_month: 25,
            month_of_year: 2,
            priority: 'high',
            requires_employees: 1,
        },
        {
            id: 'sys-szvm-monthly',
            name: 'ЕФС-1 (подраздел 1.1) — сведения о стаже',
            description: 'Ежемесячная отчётность в СФР (бывший СЗВ-М)',
            storage_category: 'отчётность',
            periodicity: 'monthly',
            day_of_month: 25,
            priority: 'medium',
            requires_employees: 1,
        },
        {
            id: 'sys-eshn-yearly',
            name: 'Декларация по ЕСХН',
            description: 'Сдача годовой декларации по ЕСХН',
            storage_category: 'отчётность',
            periodicity: 'yearly',
            day_of_month: 25,
            month_of_year: 3,
            priority: 'critical',
            is_eshn_specific: 1,
        },
    ];

    const insertStmt = globalDb.prepare(`
        INSERT OR IGNORE INTO task_rules (
            id, source, storage_category, name, description,
            periodicity, day_of_month, month_of_quarter, month_of_year,
            priority, requires_employees, requires_nds,
            applies_to_tax_systems, is_eshn_specific, is_patent_specific
        ) VALUES (
            @id, 'system', @storage_category, @name, @description,
            @periodicity, @day_of_month, @month_of_quarter, @month_of_year,
            @priority, @requires_employees, @requires_nds,
            @applies_to_tax_systems, @is_eshn_specific, @is_patent_specific
        )
    `);

    const insertMany = globalDb.transaction((rules) => {
        for (const rule of rules) {
            insertStmt.run({
                id: rule.id,
                storage_category: rule.storage_category || 'налоги',
                name: rule.name,
                description: rule.description || null,
                periodicity: rule.periodicity,
                day_of_month: rule.day_of_month || null,
                month_of_quarter: rule.month_of_quarter || null,
                month_of_year: rule.month_of_year || null,
                priority: rule.priority || 'medium',
                requires_employees: rule.requires_employees || 0,
                requires_nds: rule.requires_nds || 0,
                applies_to_tax_systems: rule.applies_to_tax_systems || null,
                is_eshn_specific: rule.is_eshn_specific || 0,
                is_patent_specific: rule.is_patent_specific || 0,
            });
        }
    });

    insertMany(systemRules);
    console.log(`  ✅ Добавлено ${systemRules.length} системных правил`);
} else {
    console.log(`  ✅ Системные правила уже есть (${existingCount} шт.)`);
}

globalDb.close();

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
