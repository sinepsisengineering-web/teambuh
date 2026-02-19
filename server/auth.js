// server/auth.js
// Модуль авторизации: хэширование паролей, JWT, middleware
//
// Используется bcryptjs для паролей и jsonwebtoken для токенов

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

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
// ПОИСК СОТРУДНИКА ПО EMAIL
// ============================================

/**
 * Найти сотрудника по email среди всех employees тенанта
 */
const findEmployeeByEmail = (tenantPath, email) => {
    const employeesDir = path.join(tenantPath, 'employees');

    if (!fs.existsSync(employeesDir)) {
        return null;
    }

    const dirs = fs.readdirSync(employeesDir).filter(name => {
        const fullPath = path.join(employeesDir, name);
        return fs.statSync(fullPath).isDirectory();
    });

    for (const dir of dirs) {
        const profilePath = path.join(employeesDir, dir, 'profile.json');
        if (fs.existsSync(profilePath)) {
            try {
                const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
                if (profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
                    return profile;
                }
            } catch (e) {
                console.error(`[Auth] Error reading profile: ${profilePath}`, e.message);
            }
        }
    }

    return null;
};

/**
 * Найти сотрудника по ID
 */
const findEmployeeById = (tenantPath, employeeId) => {
    const profilePath = path.join(tenantPath, 'employees', employeeId, 'profile.json');

    if (!fs.existsSync(profilePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    } catch (e) {
        return null;
    }
};

/**
 * Обновить profile.json сотрудника
 */
const updateEmployeeProfile = (tenantPath, employeeId, updates) => {
    const profilePath = path.join(tenantPath, 'employees', employeeId, 'profile.json');

    if (!fs.existsSync(profilePath)) {
        return false;
    }

    try {
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        const updated = { ...profile, ...updates };
        fs.writeFileSync(profilePath, JSON.stringify(updated, null, 2));
        return true;
    } catch (e) {
        return false;
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
// ЭКСПОРТ
// ============================================

module.exports = {
    hashPassword,
    hashPasswordSync,
    comparePassword,
    generateToken,
    verifyToken,
    findEmployeeByEmail,
    findEmployeeById,
    updateEmployeeProfile,
    authMiddleware,
    JWT_SECRET,
};
