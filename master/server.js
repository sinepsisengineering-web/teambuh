// master/server.js
// Master API — управление тенантами TeamBuh
//
// Endpoints:
//   GET  /api/tenants          — список тенантов
//   POST /api/tenants          — создать тенанта
//   POST /api/tenants/:id/stop — остановить контейнер
//   POST /api/tenants/:id/start — запустить контейнер
//   DELETE /api/tenants/:id    — удалить тенанта
//   GET  /health               — healthcheck

const express = require('express');
const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'teambuh.ru';
const SUPERADMIN_HOST = process.env.SUPERADMIN_HOST || `admin-oleg.${DOMAIN}`;
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const TENANTS_DIR = path.join(PROJECT_ROOT, 'tenants');
const TEMPLATE_DIR = path.join(PROJECT_ROOT, 'template');
const SUPERADMIN_DB_PATH = path.join(__dirname, 'superadmin.db');
const SUPERADMIN_SESSION_TTL_MS = 30 * 60 * 1000; // 30 мин

app.use(express.json());

app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    const allow =
        origin.includes('.teambuh.ru') ||
        origin === 'https://teambuh.ru' ||
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173';

    if (allow) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// ============================================
// БАЗА ДАННЫХ SUPERADMIN
// ============================================
const superAdminDb = new Database(SUPERADMIN_DB_PATH);
superAdminDb.pragma('journal_mode = WAL');
superAdminDb.exec(`
    CREATE TABLE IF NOT EXISTS superadmins (
        login TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS superadmin_sessions (
        token TEXT PRIMARY KEY,
        login TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
`);

function ensureDefaultSuperAdmin() {
    const login = process.env.SUPERADMIN_LOGIN || 'oleg';
    const envPassword = process.env.SUPERADMIN_PASSWORD || 'J9v#3Qm@7Rk$2Lp%8Tx^4Nb';
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync(envPassword, 10);

    superAdminDb.prepare('UPDATE superadmins SET is_active = 0 WHERE login != ?').run(login);

    superAdminDb
        .prepare(`
            INSERT INTO superadmins (login, password_hash, is_active, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(login) DO UPDATE SET
                password_hash = excluded.password_hash,
                is_active = 1,
                updated_at = excluded.updated_at
        `)
        .run(login, hash, now, now);

    console.log('[SuperAdmin] Account configured');
    console.log(`[SuperAdmin] Login: ${login}`);
}

ensureDefaultSuperAdmin();

// Роутинг главной страницы по хосту
app.get('/', (req, res, next) => {
    const host = (req.headers.host || '').split(':')[0];
    if (host === SUPERADMIN_HOST) {
        return res.sendFile(path.join(__dirname, 'public', 'superadmin.html'));
    }
    return next();
});

// Статика
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// БАЗА ДАННЫХ ТЕНАНТОВ
// ============================================

const DB_PATH = path.join(__dirname, 'tenants.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        port INTEGER UNIQUE,
        jwt_secret TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log('[Master] tenants.db initialized');

// ============================================
// HEALTHCHECK
// ============================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'teambuh-master' });
});

function resolvePath(candidates) {
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function runCommandWithLog(command) {
    try {
        const output = execSync(command, {
            encoding: 'utf8',
            timeout: 300000,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, output };
    } catch (error) {
        const stdout = error.stdout ? String(error.stdout) : '';
        const stderr = error.stderr ? String(error.stderr) : '';
        const message = error.message ? String(error.message) : 'Command failed';
        return {
            ok: false,
            output: [stdout, stderr, message].filter(Boolean).join('\n'),
        };
    }
}

function requireSuperAdmin(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const token = auth.slice(7);
        const session = superAdminDb
            .prepare('SELECT token, login, expires_at FROM superadmin_sessions WHERE token = ?')
            .get(token);
        if (!session) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (new Date(session.expires_at).getTime() < Date.now()) {
            superAdminDb.prepare('DELETE FROM superadmin_sessions WHERE token = ?').run(token);
            return res.status(401).json({ success: false, error: 'Session expired' });
        }

        // Sliding expiration
        const nextExpiry = new Date(Date.now() + SUPERADMIN_SESSION_TTL_MS).toISOString();
        superAdminDb
            .prepare('UPDATE superadmin_sessions SET expires_at = ? WHERE token = ?')
            .run(nextExpiry, token);

        req.superAdmin = { login: session.login, token };
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
}

function getTenantsEnriched() {
    const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
    return tenants.map(t => {
        let containerRunning = false;
        try {
            const output = execSync(
                `docker inspect --format='{{.State.Running}}' teambuh-${t.id} 2>/dev/null`,
                { encoding: 'utf8', timeout: 5000 }
            ).trim();
            containerRunning = output === 'true';
        } catch {
            containerRunning = false;
        }
        return {
            ...t,
            containerRunning,
            url: `https://${t.id}.${DOMAIN}/`,
        };
    });
}

// ============================================
// GET /api/tenants — список всех тенантов
// ============================================

app.get('/api/tenants', (req, res) => {
    try {
        const enriched = getTenantsEnriched();

        res.json({ success: true, tenants: enriched });
    } catch (error) {
        console.error('[Master] Error listing tenants:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SUPERADMIN AUTH/API
// ============================================
app.post('/api/superadmin/auth/login', (req, res) => {
    const { login, password } = req.body || {};
    if (!login || !password) {
        return res.status(400).json({ success: false, error: 'Login and password required' });
    }

    const admin = superAdminDb
        .prepare('SELECT login, password_hash, is_active FROM superadmins WHERE login = ?')
        .get(login);
    if (!admin || admin.is_active !== 1) {
        return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
    }
    const ok = bcrypt.compareSync(password, admin.password_hash);
    if (!ok) {
        return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
    }

    const token = crypto.randomBytes(48).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUPERADMIN_SESSION_TTL_MS).toISOString();
    superAdminDb
        .prepare(`
            INSERT INTO superadmin_sessions (token, login, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `)
        .run(token, login, expiresAt, now.toISOString());

    return res.json({ success: true, token, expiresAt });
});

app.post('/api/superadmin/auth/logout', requireSuperAdmin, (req, res) => {
    superAdminDb.prepare('DELETE FROM superadmin_sessions WHERE token = ?').run(req.superAdmin.token);
    res.json({ success: true });
});

app.get('/api/superadmin/me', requireSuperAdmin, (req, res) => {
    res.json({ success: true, login: req.superAdmin.login });
});

app.get('/api/superadmin/tenants', requireSuperAdmin, (req, res) => {
    try {
        res.json({ success: true, tenants: getTenantsEnriched() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/superadmin/system-rules', requireSuperAdmin, (req, res) => {
    try {
        const rulesDbPath = resolvePath([
            path.join(TEMPLATE_DIR, 'data', 'global_data', 'rules.db'),
            '/srv/template/data/global_data/rules.db',
        ]);

        if (!rulesDbPath) {
            return res.status(404).json({
                success: false,
                error: 'rules.db not found in template',
            });
        }

        const rulesDb = new Database(rulesDbPath, { readonly: true });
        const rules = rulesDb
            .prepare(`
                SELECT
                    id,
                    COALESCE(short_title, id) AS title,
                    COALESCE(description, short_description, '') AS shortDescription,
                    COALESCE(periodicity, '') AS periodicity,
                    COALESCE(task_type, 'прочее') AS taskType,
                    COALESCE(law_reference, '') AS lawReference,
                    COALESCE(source, 'system') AS source,
                    updated_at AS updatedAt
                FROM task_rules
                ORDER BY title COLLATE NOCASE
            `)
            .all();
        rulesDb.close();
        return res.json({ success: true, rules });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/superadmin/system-rules', requireSuperAdmin, (req, res) => {
    try {
        const rulesDbPath = resolvePath([
            path.join(TEMPLATE_DIR, 'data', 'global_data', 'rules.db'),
            '/srv/template/data/global_data/rules.db',
        ]);

        if (!rulesDbPath) {
            return res.status(404).json({ success: false, error: 'rules.db not found in template' });
        }

        const { id, title, shortDescription, description, periodicity, taskType, lawReference } = req.body || {};
        const ruleId = String(id || '').trim();
        const ruleTitle = String(title || '').trim();
        const ruleShortDescription = String(shortDescription || '').trim();
        if (!ruleId || !ruleTitle || !ruleShortDescription) {
            return res.status(400).json({ success: false, error: 'id, title, shortDescription are required' });
        }

        const now = new Date().toISOString();
        const dbw = new Database(rulesDbPath);
        dbw.prepare(`
            INSERT INTO task_rules (
                id, source, storage_category, is_active, version, task_type,
                short_title, short_description, description, title_template,
                law_reference, periodicity, period_type, day_of_month,
                due_date_rule, applies_to_all, completion_lead_days,
                manual_only, created_at, updated_at, created_by
            ) VALUES (
                @id, 'system', 'налоговые', 1, 1, @task_type,
                @short_title, @short_description, @description, @title_template,
                @law_reference, @periodicity, 'past', 25,
                'next_business_day', 1, 3,
                0, @created_at, @updated_at, 'superadmin'
            )
        `).run({
            id: ruleId,
            task_type: String(taskType || 'прочее'),
            short_title: ruleTitle,
            short_description: ruleShortDescription,
            description: String(description || ruleShortDescription).trim(),
            title_template: ruleTitle,
            law_reference: String(lawReference || '').trim(),
            periodicity: String(periodicity || 'monthly'),
            created_at: now,
            updated_at: now,
        });
        dbw.close();
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/superadmin/system-rules/:ruleId', requireSuperAdmin, (req, res) => {
    try {
        const rulesDbPath = resolvePath([
            path.join(TEMPLATE_DIR, 'data', 'global_data', 'rules.db'),
            '/srv/template/data/global_data/rules.db',
        ]);

        if (!rulesDbPath) {
            return res.status(404).json({ success: false, error: 'rules.db not found in template' });
        }

        const ruleId = String(req.params.ruleId || '').trim();
        const { title, shortDescription, description, periodicity, taskType, lawReference } = req.body || {};
        const ruleTitle = String(title || '').trim();
        const ruleShortDescription = String(shortDescription || '').trim();
        if (!ruleId || !ruleTitle || !ruleShortDescription) {
            return res.status(400).json({ success: false, error: 'ruleId, title, shortDescription are required' });
        }

        const dbw = new Database(rulesDbPath);
        const result = dbw.prepare(`
            UPDATE task_rules SET
                short_title = @short_title,
                short_description = @short_description,
                description = @description,
                title_template = @title_template,
                periodicity = @periodicity,
                task_type = @task_type,
                law_reference = @law_reference,
                storage_category = 'налоговые',
                source = 'system',
                updated_at = @updated_at
            WHERE id = @id
        `).run({
            id: ruleId,
            short_title: ruleTitle,
            short_description: ruleShortDescription,
            description: String(description || ruleShortDescription).trim(),
            title_template: ruleTitle,
            periodicity: String(periodicity || 'monthly'),
            task_type: String(taskType || 'прочее'),
            law_reference: String(lawReference || '').trim(),
            updated_at: new Date().toISOString(),
        });
        dbw.close();

        if (!result.changes) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/superadmin/deploy/pull-code', requireSuperAdmin, (req, res) => {
    const gitRoot = resolvePath([
        '/srv/teambuh/.git',
        '/srv/.git',
    ]);

    if (!gitRoot) {
        return res.status(400).json({
            success: false,
            output: 'Git-репозиторий не найден в контейнере master-api. Выполните git pull на хосте сервера.',
        });
    }

    const repoDir = path.dirname(gitRoot);
    const result = runCommandWithLog(`git -C "${repoDir}" pull origin main`);
    if (!result.ok) {
        return res.status(500).json({ success: false, output: result.output });
    }
    return res.json({ success: true, output: result.output });
});

app.post('/api/superadmin/deploy/update-tenants', requireSuperAdmin, (req, res) => {
    try {
        const payload = req.body || {};
        const all = Boolean(payload.all);
        const tenantIds = Array.isArray(payload.tenantIds)
            ? payload.tenantIds.filter(Boolean)
            : [];

        const scriptPath = resolvePath([
            path.join(SCRIPTS_DIR, 'update-tenants.sh'),
            '/srv/scripts/update-tenants.sh',
        ]);

        if (!scriptPath) {
            return res.status(500).json({
                success: false,
                output: 'Не найден update-tenants.sh',
            });
        }

        let combinedOutput = '';
        if (all) {
            const result = runCommandWithLog(`bash "${scriptPath}" --all`);
            combinedOutput += result.output;
            if (!result.ok) {
                return res.status(500).json({ success: false, output: combinedOutput });
            }
        } else {
            if (tenantIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    output: 'Не выбраны клиенты для обновления',
                });
            }
            for (const tenantId of tenantIds) {
                const result = runCommandWithLog(`bash "${scriptPath}" "${tenantId}"`);
                combinedOutput += `\n\n=== ${tenantId} ===\n${result.output}`;
                if (!result.ok) {
                    return res.status(500).json({ success: false, output: combinedOutput });
                }
            }
        }

        return res.json({ success: true, output: combinedOutput.trim() });
    } catch (error) {
        return res.status(500).json({ success: false, output: error.message });
    }
});

// ============================================
// GET /api/system-rules — системные правила из серверной template/rules.db
// ============================================
app.get('/api/system-rules', (req, res) => {
    try {
        const rulesDbPath = resolvePath([
            path.join(TEMPLATE_DIR, 'data', 'global_data', 'rules.db'),
            '/srv/template/data/global_data/rules.db',
        ]);

        if (!rulesDbPath) {
            return res.status(404).json({
                success: false,
                error: 'rules.db not found in template',
            });
        }

        const rulesDb = new Database(rulesDbPath, { readonly: true });
        const rules = rulesDb
            .prepare(`
                SELECT
                    id,
                    COALESCE(short_title, title, id) AS title,
                    COALESCE(description, short_description, '') AS shortDescription,
                    COALESCE(periodicity, '') AS periodicity,
                    COALESCE(source, 'system') AS source,
                    updated_at AS updatedAt
                FROM task_rules
                ORDER BY title COLLATE NOCASE
            `)
            .all();
        rulesDb.close();

        res.json({ success: true, rules });
    } catch (error) {
        console.error('[Master] Error loading system rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/deploy/pull-code — попытка git pull на сервере
// ============================================
app.post('/api/deploy/pull-code', (req, res) => {
    const gitRoot = resolvePath([
        '/srv/teambuh/.git',
        '/srv/.git',
    ]);

    if (!gitRoot) {
        return res.status(400).json({
            success: false,
            output: 'Git-репозиторий не найден в контейнере master-api. Выполните git pull на хосте сервера.',
        });
    }

    const repoDir = path.dirname(gitRoot);
    const result = runCommandWithLog(`git -C "${repoDir}" pull origin main`);
    if (!result.ok) {
        return res.status(500).json({ success: false, output: result.output });
    }
    res.json({ success: true, output: result.output });
});

// ============================================
// POST /api/deploy/update-tenants — обновление выбранных тенантов
// ============================================
app.post('/api/deploy/update-tenants', (req, res) => {
    try {
        const payload = req.body || {};
        const all = Boolean(payload.all);
        const tenantIds = Array.isArray(payload.tenantIds)
            ? payload.tenantIds.filter(Boolean)
            : [];

        const scriptPath = resolvePath([
            path.join(SCRIPTS_DIR, 'update-tenants.sh'),
            '/srv/scripts/update-tenants.sh',
        ]);

        if (!scriptPath) {
            return res.status(500).json({
                success: false,
                output: 'Не найден update-tenants.sh',
            });
        }

        let combinedOutput = '';
        if (all) {
            const result = runCommandWithLog(`bash "${scriptPath}" --all`);
            combinedOutput += result.output;
            if (!result.ok) {
                return res.status(500).json({ success: false, output: combinedOutput });
            }
        } else {
            if (tenantIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    output: 'Не выбраны клиенты для обновления',
                });
            }
            for (const tenantId of tenantIds) {
                const result = runCommandWithLog(`bash "${scriptPath}" "${tenantId}"`);
                combinedOutput += `\n\n=== ${tenantId} ===\n${result.output}`;
                if (!result.ok) {
                    return res.status(500).json({ success: false, output: combinedOutput });
                }
            }
        }

        res.json({ success: true, output: combinedOutput.trim() });
    } catch (error) {
        console.error('[Master] Error update-tenants:', error);
        res.status(500).json({ success: false, output: error.message });
    }
});

// ============================================
// POST /api/tenants — создать нового тенанта
// ============================================

app.post('/api/tenants', (req, res) => {
    try {
        const { tenantId, email, name, password } = req.body;

        if (!tenantId || !email || !name || !password) {
            return res.status(400).json({
                success: false,
                error: 'Требуются: tenantId, email, name, password'
            });
        }

        // Проверка уникальности
        const existing = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: `Тенант '${tenantId}' уже существует`
            });
        }

        // Запускаем скрипт создания тенанта
        console.log(`[Master] Creating tenant: ${tenantId} (${email})`);

        const scriptPath = path.join(SCRIPTS_DIR, 'create-tenant.sh');
        const output = execSync(
            `bash "${scriptPath}" "${tenantId}" "${email}" "${name}" "${password}"`,

            {
                encoding: 'utf8',
                timeout: 120000,  // 2 минуты на сборку
                env: { ...process.env, DOMAIN },
            }
        );

        console.log(`[Master] create-tenant.sh output:\n${output}`);

        // Записываем в реестр
        const port = getNextPort();
        const crypto = require('crypto');
        const jwtSecret = crypto.randomBytes(32).toString('hex');

        db.prepare(`
            INSERT INTO tenants (id, name, admin_email, port, jwt_secret)
            VALUES (?, ?, ?, ?, ?)
        `).run(tenantId, name, email, port, jwtSecret);

        res.json({
            success: true,
            tenant: {
                id: tenantId,
                url: `https://${tenantId}.${DOMAIN}/`,
                email,
            }
        });

    } catch (error) {
        console.error('[Master] Error creating tenant:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/tenants/:id/stop
// ============================================

app.post('/api/tenants/:id/stop', (req, res) => {
    try {
        const { id } = req.params;
        execSync(`docker stop teambuh-${id}`, { timeout: 30000 });
        db.prepare("UPDATE tenants SET status = 'suspended', updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), id);
        res.json({ success: true, message: `Тенант ${id} остановлен` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/tenants/:id/start
// ============================================

app.post('/api/tenants/:id/start', (req, res) => {
    try {
        const { id } = req.params;
        execSync(`docker start teambuh-${id}`, { timeout: 30000 });
        db.prepare("UPDATE tenants SET status = 'active', updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), id);
        res.json({ success: true, message: `Тенант ${id} запущен` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE /api/tenants/:id
// ============================================

app.delete('/api/tenants/:id', (req, res) => {
    try {
        const { id } = req.params;

        // Запускаем скрипт удаления
        const delScript = path.join(SCRIPTS_DIR, 'delete-tenant.sh');
        execSync(
            `bash "${delScript}" "${id}" --force`,
            { encoding: 'utf8', timeout: 30000 }
        );

        // Удаляем из реестра
        db.prepare('DELETE FROM tenants WHERE id = ?').run(id);

        res.json({ success: true, message: `Тенант ${id} удалён` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// УТИЛИТЫ
// ============================================

function getNextPort() {
    const row = db.prepare('SELECT MAX(port) as maxPort FROM tenants').get();
    return (row.maxPort || 8000) + 1;
}

// ============================================
// ЗАПУСК
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   TeamBuh Master API                      ║');
    console.log(`║   Port: ${PORT}                               ║`);
    console.log(`║   Domain: ${DOMAIN}                    ║`);
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
});
