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

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'teambuh.ru';

app.use(express.json());

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

// ============================================
// GET /api/tenants — список всех тенантов
// ============================================

app.get('/api/tenants', (req, res) => {
    try {
        const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();

        // Добавляем статус контейнера
        const enriched = tenants.map(t => {
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

        res.json({ success: true, tenants: enriched });
    } catch (error) {
        console.error('[Master] Error listing tenants:', error);
        res.status(500).json({ success: false, error: error.message });
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

        const scriptPath = '/srv/scripts/create-tenant.sh';
        const output = execSync(
            `bash ${scriptPath} "${tenantId}" "${email}" "${name}" "${password}"`,
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
        execSync(
            `bash /srv/scripts/delete-tenant.sh "${id}" --force`,
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
