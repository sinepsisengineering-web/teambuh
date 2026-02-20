// server/auth.js
// Модуль авторизации: хэширование паролей, JWT, middleware
//
// Используется bcryptjs для паролей и jsonwebtoken для токенов
// Данные хранятся в auth.db через AuthDatabase

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { AuthDatabase } = require('./database/authDatabase');

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d'; // Токен живёт 7 дней

// JWT_SECRET из переменной окружения или генерация при первом запуске
const getJwtSecret = () => {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }

    // Для dev: генерируем и сохраняем в файл
    const secretPath = path.join(process.cwd(), 'data', '.jwt_secret');
    if (fs.existsSync(secretPath)) {
        return fs.readFileSync(secretPath, 'utf8').trim();
    }

    const crypto = require('crypto');
    const secret = crypto.randomBytes(64).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, secret);
    console.log('[Auth] Generated new JWT secret (dev mode)');
    return secret;
};

const JWT_SECRET = getJwtSecret();

// ============================================
// КЭШ ИНСТАНСОВ AuthDatabase
// ============================================

const authDbCache = {};

/**
 * Получить инстанс AuthDatabase для тенанта
 * Кэшируется для повторного использования
 */
const getAuthDb = (tenantId = 'org_default') => {
    if (!authDbCache[tenantId]) {
        authDbCache[tenantId] = new AuthDatabase(tenantId);
    }
    return authDbCache[tenantId];
};

// ============================================
// ПАРОЛИ (bcrypt)
// ============================================

/**
 * Хэшировать пароль
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Хэшировать пароль (синхронно — для скриптов)
 */
const hashPasswordSync = (password) => {
    return bcrypt.hashSync(password, SALT_ROUNDS);
};

/**
 * Проверить пароль
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

// ============================================
// JWT ТОКЕНЫ
// ============================================

/**
 * Генерировать JWT-токен
 * @param {Object} user — { id, email, name, role, tenantId }
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId || 'org_default',
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

/**
 * Проверить и декодировать JWT-токен
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Middleware: проверка JWT-токена
 * Добавляет req.user с данными из токена
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Невалидный или истёкший токен' });
    }

    // Добавляем данные пользователя в req
    req.user = decoded;
    next();
};

// ============================================
// ПРОВЕРКА РОЛЕЙ
// ============================================

const ROLE_LEVEL = {
    'junior': 1,
    'senior': 2,
    'admin': 3,
    'super-admin': 4,
};

/**
 * Проверить что роль пользователя >= минимальной
 */
const hasMinRole = (userRole, minRole) => {
    return (ROLE_LEVEL[userRole] || 0) >= (ROLE_LEVEL[minRole] || 0);
};

/**
 * Middleware: проверка минимальной роли
 */
const requireRole = (minRole) => (req, res, next) => {
    if (!req.user || !hasMinRole(req.user.role, minRole)) {
        return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
};

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
    // Пароли
    hashPassword,
    hashPasswordSync,
    comparePassword,
    // JWT
    generateToken,
    verifyToken,
    JWT_SECRET,
    // Middleware
    authMiddleware,
    requireRole,
    // Роли
    hasMinRole,
    ROLE_LEVEL,
    // AuthDatabase
    getAuthDb,
};
