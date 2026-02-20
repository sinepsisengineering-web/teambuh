// server/database/authDatabase.js
// Сервис работы с SQLite базой данных авторизации
// Таблицы: users (пользователи), invitations (приглашения)

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
    return path.join(dbDir, 'auth.db');
};

// ============================================
// SQL СХЕМЫ ТАБЛИЦ
// ============================================

const CREATE_TABLES_SQL = `
    -- Пользователи системы
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'junior',
        password_hash TEXT,
        is_active INTEGER DEFAULT 1,
        must_change_password INTEGER DEFAULT 0,
        invited_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- Приглашения
    CREATE TABLE IF NOT EXISTS invitations (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_by TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        accepted_at TEXT,
        user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
`;

// ============================================
// МАППИНГ
// ============================================

const mapRowToUser = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        isActive: row.is_active === 1,
        mustChangePassword: row.must_change_password === 1,
        invitedBy: row.invited_by,
        createdAt: row.created_at,
    };
};

const mapRowToInvitation = (row) => {
    if (!row) return null;
    return {
        token: row.token,
        email: row.email,
        name: row.name,
        role: row.role,
        createdBy: row.created_by,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        userId: row.user_id,
    };
};

// ============================================
// КЛАСС AuthDatabase
// ============================================

class AuthDatabase {
    constructor(tenantId = 'org_default') {
        const dbPath = getDbPath(tenantId);
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.db.exec(CREATE_TABLES_SQL);
        console.log('[AuthDB] Database initialized:', dbPath);
    }

    // ============================================
    // ПОЛЬЗОВАТЕЛИ
    // ============================================

    /**
     * Найти пользователя по email
     */
    findByEmail(email) {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1'
        ).get(email);
        return mapRowToUser(row);
    }

    /**
     * Найти пользователя по ID
     */
    findById(id) {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE id = ?'
        ).get(id);
        return mapRowToUser(row);
    }

    /**
     * Получить всех активных пользователей
     */
    getAllUsers() {
        const rows = this.db.prepare(
            'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at'
        ).all();
        return rows.map(mapRowToUser);
    }

    /**
     * Создать пользователя
     */
    createUser({ id, email, name, role, passwordHash, mustChangePassword = false, invitedBy = null }) {
        const stmt = this.db.prepare(`
            INSERT INTO users (id, email, name, role, password_hash, must_change_password, invited_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            email,
            name,
            role,
            passwordHash || null,
            mustChangePassword ? 1 : 0,
            invitedBy,
            new Date().toISOString()
        );

        return this.findById(id);
    }

    /**
     * Обновить пользователя (пароль, роль, статус и т.д.)
     */
    updateUser(id, updates) {
        const allowedFields = {
            name: 'name',
            email: 'email',
            role: 'role',
            passwordHash: 'password_hash',
            isActive: 'is_active',
            mustChangePassword: 'must_change_password',
        };

        const sets = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            const dbField = allowedFields[key];
            if (dbField) {
                sets.push(`${dbField} = ?`);
                // Конвертируем boolean в integer для SQLite
                if (typeof value === 'boolean') {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (sets.length === 0) return false;

        values.push(id);
        this.db.prepare(
            `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
        ).run(...values);

        return true;
    }

    // ============================================
    // ПРИГЛАШЕНИЯ
    // ============================================

    /**
     * Создать приглашение
     */
    createInvitation({ email, name, role, createdBy, expiresInDays = 3 }) {
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        this.db.prepare(`
            INSERT INTO invitations (token, email, name, role, created_by, status, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(
            token,
            email,
            name,
            role,
            createdBy,
            new Date().toISOString(),
            expiresAt.toISOString()
        );

        console.log(`[AuthDB] Invitation created for ${email} (${role}), token: ${token.substring(0, 8)}...`);
        return this.getInvitation(token);
    }

    /**
     * Получить приглашение по токену
     */
    getInvitation(token) {
        const row = this.db.prepare(
            'SELECT * FROM invitations WHERE token = ?'
        ).get(token);

        if (!row) return null;

        const invitation = mapRowToInvitation(row);

        // Проверяем срок действия
        if (invitation.status === 'pending' && new Date(invitation.expiresAt) < new Date()) {
            this.db.prepare(
                "UPDATE invitations SET status = 'expired' WHERE token = ?"
            ).run(token);
            invitation.status = 'expired';
        }

        return invitation;
    }

    /**
     * Принять приглашение — создать пользователя
     */
    acceptInvitation(token, userId) {
        const invitation = this.getInvitation(token);
        if (!invitation || invitation.status !== 'pending') {
            return null;
        }

        this.db.prepare(`
            UPDATE invitations 
            SET status = 'accepted', accepted_at = ?, user_id = ?
            WHERE token = ?
        `).run(new Date().toISOString(), userId, token);

        console.log(`[AuthDB] Invitation accepted: ${invitation.email} → ${userId}`);
        return this.getInvitation(token);
    }

    /**
     * Список приглашений
     */
    listInvitations() {
        const rows = this.db.prepare(
            'SELECT * FROM invitations ORDER BY created_at DESC'
        ).all();
        return rows.map(mapRowToInvitation);
    }

    /**
     * Удалить (отозвать) приглашение
     */
    deleteInvitation(token) {
        const result = this.db.prepare(
            'DELETE FROM invitations WHERE token = ?'
        ).run(token);
        return result.changes > 0;
    }

    /**
     * Закрыть БД
     */
    close() {
        this.db.close();
    }

    /**
     * Статистика
     */
    getStats() {
        const users = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get();
        const invitations = this.db.prepare("SELECT COUNT(*) as count FROM invitations WHERE status = 'pending'").get();
        return {
            activeUsers: users.count,
            pendingInvitations: invitations.count,
        };
    }
}

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = { AuthDatabase, getDbPath };
