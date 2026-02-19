// server/index.js
// Локальный сервер для хранения файлов (эмуляция production сервера)
// TODO: При переходе на production — заменить на реальный сервер

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — в production фронтенд раздаётся с того же сервера
if (process.env.NODE_ENV === 'production') {
    // В production фронт и бэк на одном порту — CORS не нужен
} else {
    app.use(cors()); // В dev разрешаем всё
}
app.use(express.json({ limit: '50mb' })); // Увеличенный лимит для bulk операций

// В production раздаём собранный фронтенд
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
}

// Базовая папка для данных (структура по PROJECT_RULES.md)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_TENANT = 'org_default';

// Получить путь к папке tenant
const getTenantPath = (tenantId = DEFAULT_TENANT) => {
    return path.join(DATA_DIR, 'client_data', tenantId);
};

// Создать структуру папок для tenant если её нет
const ensureTenantStructure = (tenantId = DEFAULT_TENANT) => {
    const tenantPath = getTenantPath(tenantId);
    const dirs = [
        tenantPath,
        path.join(tenantPath, 'clients'),
        path.join(tenantPath, 'employees'),
        path.join(tenantPath, 'vault'),
        path.join(tenantPath, 'backups')
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Создать meta.json если нет
    const metaPath = path.join(tenantPath, 'meta.json');
    if (!fs.existsSync(metaPath)) {
        fs.writeFileSync(metaPath, JSON.stringify({
            tenantId,
            name: 'TeamBuh Demo',
            createdAt: new Date().toISOString(),
            settings: { timezone: 'Europe/Moscow', currency: 'RUB', language: 'ru' }
        }, null, 2));
    }
};

// Инициализация при старте
ensureTenantStructure();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { tenantId = DEFAULT_TENANT, entityType, entityId } = req.params;
        const dir = path.join(getTenantPath(tenantId), entityType, entityId, 'documents');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Сохраняем только с ASCII именем (timestamp + random + расширение)
        const ext = path.extname(file.originalname) || '.bin';
        const safeName = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;
        cb(null, safeName);
    }
});

const upload = multer({ storage });

// =============================================
// АВТОРИЗАЦИЯ (JWT)
// =============================================

const auth = require('./auth');

// POST /api/auth/login — вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
        }

        // Ищем сотрудника по email в default tenant
        const tenantPath = getTenantPath(DEFAULT_TENANT);
        const employee = auth.findEmployeeByEmail(tenantPath, email);

        if (!employee) {
            return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
        }

        // Проверяем пароль
        if (!employee.passwordHash) {
            return res.status(401).json({ success: false, error: 'Аккаунт не активирован. Обратитесь к администратору.' });
        }

        const isValid = await auth.comparePassword(password, employee.passwordHash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
        }

        // Генерируем токен
        const user = {
            id: employee.id,
            email: employee.email,
            name: employee.name || employee.lastName || 'Пользователь',
            role: employee.role || 'accountant',
            tenantId: DEFAULT_TENANT,
        };

        const token = auth.generateToken(user);

        console.log(`[Auth] Login successful: ${user.email} (${user.role})`);

        res.json({ success: true, token, user });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// GET /api/auth/me — проверка текущего токена
app.get('/api/auth/me', auth.authMiddleware, (req, res) => {
    res.json({ success: true, user: req.user });
});

// POST /api/auth/change-password — смена пароля
app.post('/api/auth/change-password', auth.authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const tenantPath = getTenantPath(req.user.tenantId || DEFAULT_TENANT);

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Укажите текущий и новый пароль' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Новый пароль должен быть не менее 6 символов' });
        }

        const employee = auth.findEmployeeById(tenantPath, req.user.id);
        if (!employee || !employee.passwordHash) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        const isValid = await auth.comparePassword(currentPassword, employee.passwordHash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Неверный текущий пароль' });
        }

        const newHash = await auth.hashPassword(newPassword);
        auth.updateEmployeeProfile(tenantPath, req.user.id, { passwordHash: newHash });

        console.log(`[Auth] Password changed: ${req.user.email}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[Auth] Change password error:', error);
        res.status(500).json({ success: false, error: 'Ошибка смены пароля' });
    }
});

// =============================================
// MIDDLEWARE: Защита API-роутов
// Все /api/:tenantId/* роуты требуют JWT-токен
// =============================================
app.use('/api/:tenantId', auth.authMiddleware);

// =============================================
// API ENDPOINTS (с поддержкой tenantId)
// =============================================

// --- КЛИЕНТЫ (SQLite) ---

let ClientsDatabase = null;
try {
    ClientsDatabase = require('./database/clientsDatabase');
    console.log('[Server] ClientsDatabase module loaded');
} catch (e) {
    console.warn('[Server] ClientsDatabase not available:', e.message);
}

// Сервис пересчёта задач больше не нужен - история встроена в append-only архитектуру

// Получить всех клиентов
// GET /api/:tenantId/clients
app.get('/api/:tenantId/clients', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId } = req.params;
        const { includeArchived } = req.query;
        const db = ClientsDatabase.getClientsDatabase(tenantId);
        const clients = db.getAllClients(includeArchived === 'true');

        // Добавляем связанные данные для совместимости с фронтендом
        const clientsWithRelations = clients.map(client => ({
            ...client,
            contacts: db.getContactsByClient(client.id),
            patents: db.getPatentsByClient(client.id),
            credentials: db.getCredentialsByClient(client.id)
        }));

        res.json(clientsWithRelations);
    } catch (error) {
        console.error('[Server] Error getting clients:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

// Получить клиента по ID
// GET /api/:tenantId/clients/:clientId
app.get('/api/:tenantId/clients/:clientId', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId, clientId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);
        const client = db.getClientWithRelations(clientId);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        console.error('[Server] Error getting client:', error);
        res.status(500).json({ error: 'Failed to get client' });
    }
});

// Сохранить клиента (создать/обновить)
// POST /api/:tenantId/clients
app.post('/api/:tenantId/clients', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId } = req.params;
        const clientData = req.body;
        const db = ClientsDatabase.getClientsDatabase(tenantId);

        // Получаем логин пользователя из заголовка или тела запроса
        const changedBy = req.headers['x-user-email'] || clientData.changedBy || 'unknown';

        // Генерируем ID если нет
        if (!clientData.id) {
            clientData.id = `cli_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        }

        // Проверяем существует ли клиент
        const existing = db.getClientById(clientData.id);
        let client;

        if (existing) {
            // Обновляем существующего клиента (создаёт новую версию в append-only)
            client = db.updateClient(clientData.id, clientData, changedBy);
            console.log(`[Server] Client updated: ${client.id} v${client.version} by ${changedBy}`);
        } else {
            // Создаём нового клиента
            client = db.createClient(clientData, changedBy);
            console.log(`[Server] Client created: ${client.id} by ${changedBy}`);

            // Создаём папку для документов
            const clientDir = path.join(getTenantPath(tenantId), 'clients', client.id);
            fs.mkdirSync(clientDir, { recursive: true });
            fs.mkdirSync(path.join(clientDir, 'documents'), { recursive: true });
        }

        // Обновляем связанные данные (контакты, патенты, доступы)
        console.log('[Server] STEP 1: Client saved, processing contacts...');
        if (clientData.contacts && Array.isArray(clientData.contacts)) {
            // Помечаем старые контакты как удалённые
            console.log('[Server] STEP 2: Getting old contacts...');
            const oldContacts = db.getContactsByClient(client.id);
            console.log('[Server] STEP 3: Found', oldContacts.length, 'old contacts');
            oldContacts.forEach(c => {
                console.log('[Server] STEP 3a: Deleting contact', c.id);
                db.deleteContact(c.id, changedBy);
            });

            // Добавляем новые
            console.log('[Server] STEP 4: Adding', clientData.contacts.length, 'new contacts');
            clientData.contacts.forEach((contact, i) => {
                console.log('[Server] STEP 4a: Adding contact', i, contact.name);
                db.addContact({
                    id: contact.id || `cnt_${client.id}_${i}_${Date.now()}`,
                    clientId: client.id,
                    role: contact.role || 'Контактное лицо',
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.email,
                    isPrimary: i === 0
                }, changedBy);
            });
        }

        console.log('[Server] STEP 5: Processing patents...');
        if (clientData.patents && Array.isArray(clientData.patents)) {
            // Помечаем старые патенты как удалённые
            const oldPatents = db.getPatentsByClient(client.id);
            console.log('[Server] STEP 5a: Found', oldPatents.length, 'old patents');
            oldPatents.forEach(p => db.deletePatent(p.id, changedBy));

            // Добавляем новые
            clientData.patents.forEach((patent, i) => {
                if (patent.startDate && patent.endDate) {
                    db.addPatent({
                        id: patent.id || `pat_${client.id}_${i}_${Date.now()}`,
                        clientId: client.id,
                        name: patent.name,
                        startDate: patent.startDate,
                        endDate: patent.endDate,
                        autoRenew: patent.autoRenew
                    }, changedBy);
                }
            });
        }

        console.log('[Server] STEP 6: Processing credentials...');
        if (clientData.credentials && Array.isArray(clientData.credentials)) {
            // Удаляем старые доступы (credentials не версионируются)
            const oldCreds = db.getCredentialsByClient(client.id);
            console.log('[Server] STEP 6a: Found', oldCreds.length, 'old credentials');
            oldCreds.forEach(c => db.deleteCredential(c.id));

            // Добавляем новые
            clientData.credentials.forEach((cred, i) => {
                if (cred.serviceName && cred.login) {
                    db.addCredential({
                        id: cred.id || `cred_${client.id}_${i}_${Date.now()}`,
                        clientId: client.id,
                        serviceName: cred.serviceName,
                        login: cred.login,
                        password: cred.password
                    });
                }
            });
        }

        // Возвращаем клиента со всеми связями
        console.log('[Server] STEP 7: Getting client with relations for response...');
        const result = db.getClientWithRelations(client.id);
        console.log('[Server] STEP 8: Success! Returning client:', result?.id);
        res.json(result);
    } catch (error) {
        console.error('[Server] ===== ERROR SAVING CLIENT =====');
        console.error('[Server] Error:', error.message);
        console.error('[Server] Stack:', error.stack);
        console.error('[Server] Request body:', JSON.stringify(req.body, null, 2));
        console.error('[Server] ================================');
        res.status(500).json({ error: 'Failed to save client', details: error.message });
    }
});

// Удалить клиента
// DELETE /api/:tenantId/clients/:clientId
app.delete('/api/:tenantId/clients/:clientId', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId, clientId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);

        // Мягкое удаление (архивируем)
        const archived = db.archiveClient(clientId);

        if (archived) {
            console.log(`[Server] Client archived: ${clientId}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Client not found' });
        }
    } catch (error) {
        console.error('[Server] Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// ==============================================
// АРХИВ КЛИЕНТОВ (SQLite)
// ==============================================

// Получить архивных клиентов
// GET /api/:tenantId/archive/clients
app.get('/api/:tenantId/archive/clients', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);

        // Получаем всех клиентов включая архивных и фильтруем только архивных
        const allClients = db.getAllClients(true); // includeArchived = true
        const archivedClients = allClients.filter(c => c.isArchived);

        // Добавляем related данные
        const clientsWithRelations = archivedClients.map(client => ({
            ...client,
            contacts: db.getContactsByClient(client.id),
            patents: db.getPatentsByClient(client.id),
            credentials: db.getCredentialsByClient(client.id)
        }));

        res.json(clientsWithRelations);
    } catch (error) {
        console.error('[Server] Error getting archived clients:', error);
        res.status(500).json({ error: 'Failed to get archived clients' });
    }
});

// Восстановить клиента из архива
// POST /api/:tenantId/archive/clients/:clientId/restore
app.post('/api/:tenantId/archive/clients/:clientId/restore', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId, clientId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);

        // Снимаем флаг архивации
        const result = db.db.prepare(
            'UPDATE clients SET is_archived = 0, archived_at = NULL WHERE id = ?'
        ).run(clientId);

        if (result.changes > 0) {
            console.log(`[Server] Client restored: ${clientId}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Client not found' });
        }
    } catch (error) {
        console.error('[Server] Error restoring client:', error);
        res.status(500).json({ error: 'Failed to restore client' });
    }
});

// Удалить клиента безвозвратно
// DELETE /api/:tenantId/archive/clients/:clientId
app.delete('/api/:tenantId/archive/clients/:clientId', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId, clientId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);

        // Жёсткое удаление (CASCADE удалит связанные данные)
        const deleted = db.deleteClient(clientId);

        if (deleted) {
            console.log(`[Server] Client permanently deleted: ${clientId}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Client not found' });
        }
    } catch (error) {
        console.error('[Server] Error permanently deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// Получить историю изменений клиента
// GET /api/:tenantId/clients/:clientId/changes
app.get('/api/:tenantId/clients/:clientId/changes', (req, res) => {
    if (!ClientsDatabase) {
        return res.status(503).json({ error: 'Clients database not available' });
    }

    try {
        const { tenantId, clientId } = req.params;
        const db = ClientsDatabase.getClientsDatabase(tenantId);
        const changes = db.getChangesByClient(clientId);
        res.json(changes);
    } catch (error) {
        console.error('[Server] Error getting client changes:', error);
        res.status(500).json({ error: 'Failed to get changes' });
    }
});


// --- СОТРУДНИКИ ---

// Получить всех сотрудников
// GET /api/:tenantId/employees
app.get('/api/:tenantId/employees', (req, res) => {
    const { tenantId } = req.params;
    const employeesDir = path.join(getTenantPath(tenantId), 'employees');

    if (!fs.existsSync(employeesDir)) {
        return res.json([]);
    }

    const employees = fs.readdirSync(employeesDir)
        .filter(name => {
            const fullPath = path.join(employeesDir, name);
            return fs.statSync(fullPath).isDirectory();
        })
        .map(id => {
            const profilePath = path.join(employeesDir, id, 'profile.json');
            if (fs.existsSync(profilePath)) {
                return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            }
            return { id };
        })
        .filter(e => e.id);

    res.json(employees);
});

// Сохранить сотрудника
// POST /api/:tenantId/employees
app.post('/api/:tenantId/employees', (req, res) => {
    const { tenantId } = req.params;
    const employee = req.body;

    if (!employee.id) {
        employee.id = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    }

    const empDir = path.join(getTenantPath(tenantId), 'employees', employee.id);
    fs.mkdirSync(empDir, { recursive: true });
    fs.mkdirSync(path.join(empDir, 'documents'), { recursive: true });

    fs.writeFileSync(path.join(empDir, 'profile.json'), JSON.stringify(employee, null, 2));

    console.log(`[Server] Employee saved: ${employee.id} - ${employee.lastName}`);
    res.json(employee);
});

// ============================================
// ФОТО СОТРУДНИКА
// ============================================

// Загрузить фото сотрудника
// POST /api/:tenantId/employees/:employeeId/photo
const uploadPhoto = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const { tenantId, employeeId } = req.params;
            const empDir = path.join(getTenantPath(tenantId), 'employees', employeeId);
            fs.mkdirSync(empDir, { recursive: true });
            cb(null, empDir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '.jpg';
            cb(null, `photo${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

app.post('/api/:tenantId/employees/:employeeId/photo', uploadPhoto.single('photo'), (req, res) => {
    const { tenantId, employeeId } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Обновляем профиль с URL фото
    const empDir = path.join(getTenantPath(tenantId), 'employees', employeeId);
    const profilePath = path.join(empDir, 'profile.json');
    const photoUrl = `/api/${tenantId}/employees/${employeeId}/photo`;

    if (fs.existsSync(profilePath)) {
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        profile.photoUrl = photoUrl;
        fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    }

    console.log(`[Server] Photo uploaded for employee: ${employeeId}`);
    res.json({
        success: true,
        photoUrl,
        filename: req.file.filename
    });
});

// Получить фото сотрудника
// GET /api/:tenantId/employees/:employeeId/photo
app.get('/api/:tenantId/employees/:employeeId/photo', (req, res) => {
    const { tenantId, employeeId } = req.params;
    const empDir = path.join(getTenantPath(tenantId), 'employees', employeeId);

    // Ищем файл фото с любым расширением
    const photoFiles = fs.readdirSync(empDir).filter(f => f.startsWith('photo.'));

    if (photoFiles.length > 0) {
        const photoPath = path.join(empDir, photoFiles[0]);
        res.sendFile(photoPath);
    } else {
        res.status(404).json({ error: 'Photo not found' });
    }
});

// Удалить фото сотрудника
// DELETE /api/:tenantId/employees/:employeeId/photo
app.delete('/api/:tenantId/employees/:employeeId/photo', (req, res) => {
    const { tenantId, employeeId } = req.params;
    const empDir = path.join(getTenantPath(tenantId), 'employees', employeeId);

    const photoFiles = fs.readdirSync(empDir).filter(f => f.startsWith('photo.'));
    photoFiles.forEach(f => fs.unlinkSync(path.join(empDir, f)));

    // Удаляем URL из профиля
    const profilePath = path.join(empDir, 'profile.json');
    if (fs.existsSync(profilePath)) {
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        delete profile.photoUrl;
        fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    }

    console.log(`[Server] Photo deleted for employee: ${employeeId}`);
    res.json({ success: true });
});

// Удалить сотрудника
// DELETE /api/:tenantId/employees/:employeeId
app.delete('/api/:tenantId/employees/:employeeId', (req, res) => {
    const { tenantId, employeeId } = req.params;
    const empDir = path.join(getTenantPath(tenantId), 'employees', employeeId);

    if (fs.existsSync(empDir)) {
        fs.rmSync(empDir, { recursive: true, force: true });
        console.log(`[Server] Employee deleted: ${employeeId}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Employee not found' });
    }
});

// --- ДОКУМЕНТЫ ---

// Загрузить документ
// POST /api/:tenantId/:entityType/:entityId/documents
app.post('/api/:tenantId/:entityType/:entityId/documents', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { tenantId, entityType, entityId } = req.params;

    // Используем originalName из FormData (правильная UTF-8 кодировка)
    const originalName = req.body.originalName || req.file.originalname;

    const doc = {
        id: req.file.filename,
        name: originalName,
        filename: req.file.filename,
        size: req.file.size,
        type: req.file.mimetype,
        uploadDate: new Date().toISOString(),
    };

    // Сохраняем метаданные в JSON файл
    const metaPath = path.join(getTenantPath(tenantId), entityType, entityId, 'documents', '_metadata.json');
    let metadata = {};
    if (fs.existsSync(metaPath)) {
        try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) { metadata = {}; }
    }
    metadata[doc.filename] = { name: originalName, type: doc.type, uploadDate: doc.uploadDate };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    console.log(`[Server] Document uploaded: ${doc.name} -> ${doc.filename}`);
    res.json(doc);
});

// Получить список документов
// GET /api/:tenantId/:entityType/:entityId/documents
app.get('/api/:tenantId/:entityType/:entityId/documents', (req, res) => {
    const { tenantId, entityType, entityId } = req.params;
    const dir = path.join(getTenantPath(tenantId), entityType, entityId, 'documents');

    if (!fs.existsSync(dir)) {
        return res.json([]);
    }

    // Читаем метаданные
    const metaPath = path.join(dir, '_metadata.json');
    let metadata = {};
    if (fs.existsSync(metaPath)) {
        try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) { metadata = {}; }
    }

    const files = fs.readdirSync(dir)
        .filter(f => f !== '_metadata.json') // Исключаем служебный файл
        .map(filename => {
            const filePath = path.join(dir, filename);
            const stats = fs.statSync(filePath);
            const meta = metadata[filename] || {};
            return {
                id: filename,
                name: meta.name || filename,
                filename,
                size: stats.size,
                type: meta.type || 'application/octet-stream',
                uploadDate: meta.uploadDate || stats.mtime.toISOString(),
            };
        });

    res.json(files);
});

// Удалить документ
// DELETE /api/:tenantId/:entityType/:entityId/documents/:filename
app.delete('/api/:tenantId/:entityType/:entityId/documents/:filename', (req, res) => {
    const { tenantId, entityType, entityId, filename } = req.params;
    const dir = path.join(getTenantPath(tenantId), entityType, entityId, 'documents');
    const filePath = path.join(dir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);

        // Удаляем из метаданных
        const metaPath = path.join(dir, '_metadata.json');
        if (fs.existsSync(metaPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                delete metadata[filename];
                fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
            } catch (e) { /* ignore */ }
        }

        console.log(`[Server] Document deleted: ${filename}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Просмотр документа (inline)
// GET /api/:tenantId/:entityType/:entityId/documents/:filename/view
app.get('/api/:tenantId/:entityType/:entityId/documents/:filename/view', (req, res) => {
    const { tenantId, entityType, entityId, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(getTenantPath(tenantId), entityType, entityId, 'documents', decodedFilename);

    if (fs.existsSync(filePath)) {
        // Определяем MIME-тип
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Скачать документ
// GET /api/:tenantId/:entityType/:entityId/documents/:filename/download
app.get('/api/:tenantId/:entityType/:entityId/documents/:filename/download', (req, res) => {
    const { tenantId, entityType, entityId, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const dir = path.join(getTenantPath(tenantId), entityType, entityId, 'documents');
    const filePath = path.join(dir, decodedFilename);

    if (fs.existsSync(filePath)) {
        // Читаем оригинальное имя файла из metadata
        let originalName = decodedFilename;
        const metaPath = path.join(dir, '_metadata.json');
        if (fs.existsSync(metaPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (metadata[decodedFilename]?.name) {
                    originalName = metadata[decodedFilename].name;
                }
            } catch (e) { /* ignore */ }
        }

        // RFC 5987 encoding для кириллицы в Content-Disposition
        const encodedName = encodeURIComponent(originalName).replace(/'/g, '%27');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// --- ДОГОВОРЫ (contracts) ---

// Multer для договоров
const contractStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { tenantId = DEFAULT_TENANT, clientId } = req.params;
        const dir = path.join(getTenantPath(tenantId), 'clients', clientId, 'contracts');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Всегда называем файл contract + расширение
        const ext = path.extname(file.originalname) || '.pdf';
        cb(null, `contract${ext}`);
    }
});
const uploadContract = multer({ storage: contractStorage });

// Загрузить договор
// POST /api/:tenantId/clients/:clientId/contract
app.post('/api/:tenantId/clients/:clientId/contract', uploadContract.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { tenantId, clientId } = req.params;
    const dir = path.join(getTenantPath(tenantId), 'clients', clientId, 'contracts');

    // Сохраняем оригинальное имя
    const originalName = req.body.originalName || req.file.originalname;
    const metaPath = path.join(dir, '_contract.json');
    const meta = {
        filename: req.file.filename,
        name: originalName,
        size: req.file.size,
        type: req.file.mimetype,
        uploadDate: new Date().toISOString()
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    console.log(`[Server] Contract uploaded for ${clientId}: ${originalName}`);
    res.json(meta);
});

// Получить информацию о договоре
// GET /api/:tenantId/clients/:clientId/contract
app.get('/api/:tenantId/clients/:clientId/contract', (req, res) => {
    const { tenantId, clientId } = req.params;
    const dir = path.join(getTenantPath(tenantId), 'clients', clientId, 'contracts');
    const metaPath = path.join(dir, '_contract.json');

    if (fs.existsSync(metaPath)) {
        res.json(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
    } else {
        res.status(404).json({ error: 'Contract not found' });
    }
});

// Просмотр договора (inline)
// GET /api/:tenantId/clients/:clientId/contract/view
app.get('/api/:tenantId/clients/:clientId/contract/view', (req, res) => {
    const { tenantId, clientId } = req.params;
    const dir = path.join(getTenantPath(tenantId), 'clients', clientId, 'contracts');
    const metaPath = path.join(dir, '_contract.json');

    if (!fs.existsSync(metaPath)) {
        return res.status(404).json({ error: 'Contract not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const filePath = path.join(dir, meta.filename);

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', meta.type || 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Contract file not found' });
    }
});

// Удалить договор
// DELETE /api/:tenantId/clients/:clientId/contract
app.delete('/api/:tenantId/clients/:clientId/contract', (req, res) => {
    const { tenantId, clientId } = req.params;
    const dir = path.join(getTenantPath(tenantId), 'clients', clientId, 'contracts');
    const metaPath = path.join(dir, '_contract.json');

    if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const filePath = path.join(dir, meta.filename);

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.unlinkSync(metaPath);

        console.log(`[Server] Contract deleted for ${clientId}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Contract not found' });
    }
});

// --- МЕТА ---

// Получить метаданные организации
// GET /api/:tenantId/meta
app.get('/api/:tenantId/meta', (req, res) => {
    const { tenantId } = req.params;
    const metaPath = path.join(getTenantPath(tenantId), 'meta.json');

    if (fs.existsSync(metaPath)) {
        res.json(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
    } else {
        res.status(404).json({ error: 'Tenant not found' });
    }
});

// =============================================
// --- ЗАДАЧИ (SQLite) ---
// =============================================

let TaskDatabase = null;
try {
    TaskDatabase = require('./database/taskDatabase');
    console.log('[Server] TaskDatabase module loaded');
} catch (e) {
    console.warn('[Server] TaskDatabase not available (better-sqlite3 not installed?):', e.message);
}

// Получить все задачи
// GET /api/:tenantId/tasks
app.get('/api/:tenantId/tasks', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId } = req.params;
        const { clientId, employeeId, status, startDate, endDate } = req.query;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        let tasks;

        if (clientId) {
            tasks = db.getByClient(clientId);
        } else if (employeeId) {
            tasks = db.getByEmployee(employeeId);
        } else if (status) {
            tasks = db.getByStatus(status);
        } else if (startDate && endDate) {
            tasks = db.getByDateRange(startDate, endDate);
        } else {
            tasks = db.getAll();
        }

        res.json(tasks);
    } catch (error) {
        console.error('[Server] Error getting tasks:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

// Получить задачу по ID
// GET /api/:tenantId/tasks/:taskId
app.get('/api/:tenantId/tasks/:taskId', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;
        const db = TaskDatabase.getTaskDatabase(tenantId);
        const task = db.getById(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error('[Server] Error getting task:', error);
        res.status(500).json({ error: 'Failed to get task' });
    }
});

// Создать задачу
// POST /api/:tenantId/tasks
app.post('/api/:tenantId/tasks', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId } = req.params;
        const taskData = req.body;

        if (!taskData.id || !taskData.title || !taskData.clientId || !taskData.clientName) {
            return res.status(400).json({ error: 'Missing required fields: id, title, clientId, clientName' });
        }

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const task = db.create({
            id: taskData.id,
            title: taskData.title,
            description: taskData.description || null,
            taskSource: taskData.taskSource || 'manual',
            recurrence: taskData.recurrence || 'oneTime',
            cyclePattern: taskData.cyclePattern || null,
            clientId: taskData.clientId,
            clientName: taskData.clientName,
            assignedToId: taskData.assignedToId || null,
            assignedToName: taskData.assignedToName || null,
            completedById: null,
            completedByName: null,
            originalDueDate: taskData.originalDueDate || taskData.dueDate,
            currentDueDate: taskData.currentDueDate || taskData.dueDate,
            rescheduledDates: null,
            status: taskData.status || 'pending'
        });

        console.log('[Server] Created task:', task.id);
        res.status(201).json(task);
    } catch (error) {
        console.error('[Server] Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Создать много задач (bulk)
// POST /api/:tenantId/tasks/bulk
app.post('/api/:tenantId/tasks/bulk', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId } = req.params;
        const { tasks } = req.body;

        if (!Array.isArray(tasks)) {
            return res.status(400).json({ error: 'tasks must be an array' });
        }

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const preparedTasks = tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || null,
            fullDescription: t.fullDescription || null,  // Полное описание из правила
            legalBasis: t.legalBasis || null,            // Основание (ссылка на закон)
            ruleId: t.ruleId || null,                    // ID правила
            taskSource: t.taskSource || 'auto',
            recurrence: t.recurrence || 'cyclic',
            cyclePattern: t.cyclePattern || null,
            clientId: t.clientId,
            clientName: t.clientName,
            assignedToId: t.assignedToId || null,
            assignedToName: t.assignedToName || null,
            completedById: null,
            completedByName: null,
            originalDueDate: t.originalDueDate || t.dueDate,
            currentDueDate: t.currentDueDate || t.dueDate,
            rescheduledDates: null,
            status: t.status || 'pending'
        }));

        const count = db.createMany(preparedTasks);
        console.log('[Server] Bulk created tasks:', count);
        res.status(201).json({ created: count });
    } catch (error) {
        console.error('[Server] Error bulk creating tasks:', error);
        res.status(500).json({ error: 'Failed to create tasks' });
    }
});

// Обновить задачу
// PATCH /api/:tenantId/tasks/:taskId
app.patch('/api/:tenantId/tasks/:taskId', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;
        const updates = req.body;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const task = db.update(taskId, updates);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[Server] Updated task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[Server] Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Выполнить задачу
// POST /api/:tenantId/tasks/:taskId/complete
app.post('/api/:tenantId/tasks/:taskId/complete', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;
        const { completedById, completedByName } = req.body;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const task = db.complete(taskId, completedById || '', completedByName || '');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[Server] Completed task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[Server] Error completing task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
});

// Вернуть задачу в работу
// POST /api/:tenantId/tasks/:taskId/reopen
app.post('/api/:tenantId/tasks/:taskId/reopen', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const task = db.update(taskId, {
            status: 'pending',
            completedById: null,
            completedByName: null,
            completedAt: null
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[Server] Reopened task:', taskId);
        res.json(task);
    } catch (error) {
        console.error('[Server] Error reopening task:', error);
        res.status(500).json({ error: 'Failed to reopen task' });
    }
});

// Удалить задачу (soft delete)
// DELETE /api/:tenantId/tasks/:taskId
app.delete('/api/:tenantId/tasks/:taskId', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const deleted = db.softDelete(taskId);

        if (!deleted) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[Server] Deleted task:', taskId);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Архивировать задачу
// POST /api/:tenantId/tasks/:taskId/archive
app.post('/api/:tenantId/tasks/:taskId/archive', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId, taskId } = req.params;

        const db = TaskDatabase.getTaskDatabase(tenantId);
        const archived = db.archive(taskId);

        if (!archived) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('[Server] Archived task:', taskId);
        res.json({ success: true });
    } catch (error) {
        console.error('[Server] Error archiving task:', error);
        res.status(500).json({ error: 'Failed to archive task' });
    }
});

// Получить статистику по задачам
// GET /api/:tenantId/tasks-stats
app.get('/api/:tenantId/tasks-stats', (req, res) => {
    if (!TaskDatabase) {
        return res.status(503).json({ error: 'Task database not available' });
    }

    try {
        const { tenantId } = req.params;
        const db = TaskDatabase.getTaskDatabase(tenantId);
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('[Server] Error getting task stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// =============================================
// LEGACY CODE REMOVED: customRules.json endpoints
// Все правила теперь хранятся в SQLite (см. ниже)
// =============================================

// =============================================
// --- ПРАВИЛА ЗАДАЧ (SQLite) ---
// =============================================

let RulesDatabase = null;
let RulesMigration = null;

try {
    RulesDatabase = require('./database/rulesDatabase');
    RulesMigration = require('./database/rulesMigration');
    console.log('[Server] RulesDatabase module loaded');

    // Выполняем миграцию правил при старте сервера
    const result = RulesMigration.migrateSystemRulesToMasterDb();
    console.log(`[Server] Rules migration: ${result.inserted} inserted, ${result.skipped} skipped`);
} catch (e) {
    console.warn('[Server] RulesDatabase not available:', e.message);
}

// Получить все правила (Master + Tenant синхронизация)
// GET /api/:tenantId/rules/sync
app.get('/api/:tenantId/rules/sync', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId } = req.params;

        // 1. Получить системные правила из Master DB
        const masterDb = RulesDatabase.getMasterRulesDatabase();
        const systemRules = masterDb.getBySource('system');

        // 2. Получить правила из Tenant DB (копии system + custom)
        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);
        const tenantRules = tenantDb.getAll();

        // 3. Синхронизировать: добавить новые системные правила к тенанту
        let synced = 0;
        for (const sysRule of systemRules) {
            const exists = tenantDb.exists(sysRule.id);
            if (!exists) {
                // Новое системное правило — копируем в Tenant DB
                tenantDb.create(sysRule);
                synced++;
            } else {
                // Проверяем версию и обновляем если нужно
                const tenantRule = tenantDb.getById(sysRule.id);
                if (tenantRule && tenantRule.version < sysRule.version) {
                    tenantDb.update(sysRule.id, sysRule);
                    synced++;
                }
            }
        }

        if (synced > 0) {
            console.log(`[Server] Synced ${synced} rules to tenant ${tenantId}`);
        }

        // 4. Возвращаем объединённый список актуальных правил тенанта
        const allRules = tenantDb.getAll();

        res.json({
            rules: allRules,
            synced,
            total: allRules.length
        });
    } catch (error) {
        console.error('[Server] Error syncing rules:', error);
        res.status(500).json({ error: 'Failed to sync rules' });
    }
});

// Получить все правила тенанта
// GET /api/:tenantId/rules
app.get('/api/:tenantId/rules', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId } = req.params;
        const { source, category } = req.query;

        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);
        let rules;

        if (source) {
            rules = tenantDb.getBySource(source);
        } else if (category) {
            rules = tenantDb.getByCategory(category);
        } else {
            rules = tenantDb.getAll();
        }

        res.json(rules);
    } catch (error) {
        console.error('[Server] Error getting rules:', error);
        res.status(500).json({ error: 'Failed to get rules' });
    }
});

// Получить правило по ID
// GET /api/:tenantId/rules/:ruleId
app.get('/api/:tenantId/rules/:ruleId', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId, ruleId } = req.params;
        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);
        const rule = tenantDb.getById(ruleId);

        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json(rule);
    } catch (error) {
        console.error('[Server] Error getting rule:', error);
        res.status(500).json({ error: 'Failed to get rule' });
    }
});

// Создать правило (только custom)
// POST /api/:tenantId/rules
app.post('/api/:tenantId/rules', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId } = req.params;
        const ruleData = req.body;

        if (!ruleData.shortTitle || !ruleData.taskType) {
            return res.status(400).json({ error: 'Missing required fields: shortTitle, taskType' });
        }

        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);

        const newRule = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...ruleData
        };

        const created = tenantDb.create(newRule);

        console.log('[Server] Created rule:', created.id);
        res.status(201).json(created);
    } catch (error) {
        console.error('[Server] Error creating rule:', error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
});

// Обновить правило
// PUT /api/:tenantId/rules/:ruleId
app.put('/api/:tenantId/rules/:ruleId', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId, ruleId } = req.params;
        const updates = req.body;

        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);
        const existing = tenantDb.getById(ruleId);

        if (!existing) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        // Системные правила нельзя редактировать
        if (existing.source === 'system') {
            return res.status(403).json({ error: 'Cannot modify system rules' });
        }

        const updated = tenantDb.update(ruleId, updates);

        console.log('[Server] Updated rule:', ruleId);
        res.json(updated);
    } catch (error) {
        console.error('[Server] Error updating rule:', error);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

// Удалить правило (только custom)
// DELETE /api/:tenantId/rules/:ruleId
app.delete('/api/:tenantId/rules/:ruleId', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { tenantId, ruleId } = req.params;

        const tenantDb = RulesDatabase.getTenantRulesDatabase(tenantId);
        const existing = tenantDb.getById(ruleId);

        if (!existing) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        // Системные правила нельзя удалять
        if (existing.source === 'system') {
            return res.status(403).json({ error: 'Cannot delete system rules' });
        }

        const deleted = tenantDb.delete(ruleId);

        console.log('[Server] Deleted rule:', ruleId);
        res.json({ success: deleted });
    } catch (error) {
        console.error('[Server] Error deleting rule:', error);
        res.status(500).json({ error: 'Failed to delete rule' });
    }
});

// Получить системные правила (из Master DB) — для SuperAdmin
// GET /api/master/rules
app.get('/api/master/rules', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const masterDb = RulesDatabase.getMasterRulesDatabase();
        const rules = masterDb.getAll();
        res.json(rules);
    } catch (error) {
        console.error('[Server] Error getting master rules:', error);
        res.status(500).json({ error: 'Failed to get master rules' });
    }
});

// Обновить системное правило (только SuperAdmin)
// PUT /api/master/rules/:ruleId
app.put('/api/master/rules/:ruleId', (req, res) => {
    if (!RulesDatabase) {
        return res.status(503).json({ error: 'Rules database not available' });
    }

    try {
        const { ruleId } = req.params;
        const updates = req.body;

        // TODO: Проверка прав SuperAdmin

        const masterDb = RulesDatabase.getMasterRulesDatabase();
        const updated = masterDb.update(ruleId, updates);

        if (!updated) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        console.log('[Server] Updated master rule:', ruleId);
        res.json(updated);
    } catch (error) {
        console.error('[Server] Error updating master rule:', error);
        res.status(500).json({ error: 'Failed to update master rule' });
    }
});

// =============================================
// ARCHIVE API — Архивация с перемещением папок
// =============================================

// Вспомогательная функция для получения пути к архиву
const getArchivePath = (tenantId, type) => {
    return path.join(getTenantPath(tenantId), 'archive', type);
};

// Создать структуру архива если её нет
const ensureArchiveStructure = (tenantId) => {
    const archiveBase = path.join(getTenantPath(tenantId), 'archive');
    const types = ['clients', 'employees', 'rules'];

    if (!fs.existsSync(archiveBase)) {
        fs.mkdirSync(archiveBase, { recursive: true });
    }

    types.forEach(type => {
        const typePath = path.join(archiveBase, type);
        if (!fs.existsSync(typePath)) {
            fs.mkdirSync(typePath, { recursive: true });
        }
    });
};

// Функция для перемещения папки (копирование + удаление)
const moveDirectory = (source, destination) => {
    if (!fs.existsSync(source)) {
        return false;
    }

    // Создаём целевую директорию
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    // Копируем все файлы
    const copyRecursive = (src, dest) => {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            fs.readdirSync(src).forEach(child => {
                copyRecursive(path.join(src, child), path.join(dest, child));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    };

    copyRecursive(source, destination);

    // Удаляем исходную директорию
    fs.rmSync(source, { recursive: true, force: true });

    return true;
};

// GET /api/:tenantId/archive/:archiveType — Получить список архивированных элементов
app.get('/api/:tenantId/archive/:archiveType', (req, res) => {
    const { tenantId, archiveType } = req.params;
    ensureArchiveStructure(tenantId);

    const archivePath = getArchivePath(tenantId, archiveType);

    if (!fs.existsSync(archivePath)) {
        return res.json([]);
    }

    const items = [];
    const entries = fs.readdirSync(archivePath);

    entries.forEach(entry => {
        const entryPath = path.join(archivePath, entry);
        const stats = fs.statSync(entryPath);

        if (stats.isDirectory()) {
            // Папка — ищем profile.json внутри
            const profilePath = path.join(entryPath, 'profile.json');
            if (fs.existsSync(profilePath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
                    items.push(data);
                } catch (e) {
                    console.error(`Error reading ${profilePath}:`, e);
                }
            }
        } else if (entry.endsWith('.json')) {
            // JSON файл напрямую (для правил)
            try {
                const data = JSON.parse(fs.readFileSync(entryPath, 'utf-8'));
                items.push(data);
            } catch (e) {
                console.error(`Error reading ${entryPath}:`, e);
            }
        }
    });

    console.log(`[Archive] Loaded ${items.length} items from ${archiveType}`);
    res.json(items);
});

// POST /api/:tenantId/archive/:archiveType — Архивировать элемент (перемещает ВСЮ папку)
app.post('/api/:tenantId/archive/:archiveType', (req, res) => {
    const { tenantId, archiveType } = req.params;
    const item = req.body;

    if (!item || !item.id) {
        return res.status(400).json({ error: 'Missing item or item.id' });
    }

    ensureArchiveStructure(tenantId);

    // Добавляем timestamp архивации
    item.archivedAt = new Date().toISOString();

    const archivePath = getArchivePath(tenantId, archiveType);
    const tenantPath = getTenantPath(tenantId);

    if (archiveType === 'clients' || archiveType === 'employees') {
        // Для клиентов и сотрудников — перемещаем ВСЮ папку с документами
        const sourceDir = path.join(tenantPath, archiveType, item.id);
        const destDir = path.join(archivePath, item.id);

        if (fs.existsSync(sourceDir)) {
            moveDirectory(sourceDir, destDir);
            // Обновляем profile.json с archivedAt
            const profilePath = path.join(destDir, 'profile.json');
            fs.writeFileSync(profilePath, JSON.stringify(item, null, 2));
            console.log(`[Archive] Moved folder ${item.id} to archive (${archiveType})`);
        } else {
            // Папки нет — создаём в архиве с profile.json
            fs.mkdirSync(destDir, { recursive: true });
            fs.writeFileSync(path.join(destDir, 'profile.json'), JSON.stringify(item, null, 2));
            console.log(`[Archive] Created ${item.id} in archive (${archiveType})`);
        }
    } else {
        // Для правил — просто JSON файл
        const archiveFilePath = path.join(archivePath, `${item.id}.json`);
        fs.writeFileSync(archiveFilePath, JSON.stringify(item, null, 2));
        console.log(`[Archive] Saved ${item.id} to archive (${archiveType})`);
    }

    res.json({ success: true, archivedAt: item.archivedAt });
});

// POST /api/:tenantId/archive/:archiveType/:itemId/restore — Восстановить элемент
app.post('/api/:tenantId/archive/:archiveType/:itemId/restore', (req, res) => {
    const { tenantId, archiveType, itemId } = req.params;

    const archivePath = getArchivePath(tenantId, archiveType);
    const tenantPath = getTenantPath(tenantId);

    if (archiveType === 'clients' || archiveType === 'employees') {
        const sourceDir = path.join(archivePath, itemId);
        const destDir = path.join(tenantPath, archiveType, itemId);
        const profilePath = path.join(sourceDir, 'profile.json');

        if (!fs.existsSync(sourceDir) || !fs.existsSync(profilePath)) {
            return res.status(404).json({ error: 'Item not found in archive' });
        }

        // Читаем данные
        const item = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
        delete item.archivedAt;

        // Перемещаем ВСЮ папку обратно
        moveDirectory(sourceDir, destDir);

        // Обновляем profile.json без archivedAt
        fs.writeFileSync(path.join(destDir, 'profile.json'), JSON.stringify(item, null, 2));

        console.log(`[Archive] Restored folder ${itemId} from archive (${archiveType})`);
        res.json(item);
    } else {
        // Для правил
        const archiveFilePath = path.join(archivePath, `${itemId}.json`);

        if (!fs.existsSync(archiveFilePath)) {
            return res.status(404).json({ error: 'Item not found in archive' });
        }

        const item = JSON.parse(fs.readFileSync(archiveFilePath, 'utf-8'));
        delete item.archivedAt;

        // Удаляем из архива
        fs.unlinkSync(archiveFilePath);

        // TODO: Добавить правило обратно в rules.db если нужно

        console.log(`[Archive] Restored ${itemId} from archive (${archiveType})`);
        res.json(item);
    }
});

// DELETE /api/:tenantId/archive/:archiveType/:itemId — Удалить навсегда из архива
app.delete('/api/:tenantId/archive/:archiveType/:itemId', (req, res) => {
    const { tenantId, archiveType, itemId } = req.params;

    const archivePath = getArchivePath(tenantId, archiveType);

    if (archiveType === 'clients' || archiveType === 'employees') {
        const itemDir = path.join(archivePath, itemId);

        if (fs.existsSync(itemDir)) {
            fs.rmSync(itemDir, { recursive: true, force: true });
            console.log(`[Archive] Permanently deleted folder ${itemId} (${archiveType})`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Item not found in archive' });
        }
    } else {
        const itemPath = path.join(archivePath, `${itemId}.json`);

        if (fs.existsSync(itemPath)) {
            fs.unlinkSync(itemPath);
            console.log(`[Archive] Permanently deleted ${itemId} (${archiveType})`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Item not found in archive' });
        }
    }
});

// =============================================
// RULES API (справочник правил)
// =============================================

const { getTenantRulesDatabase } = require('./database/rulesDatabase');

// Получить все правила
// GET /api/:tenantId/rules
app.get('/api/:tenantId/rules', (req, res) => {
    try {
        const { tenantId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rules = db.getAll();
        res.json(rules);
    } catch (error) {
        console.error('[Rules] Error getting rules:', error);
        res.status(500).json({ error: 'Failed to get rules' });
    }
});

// Получить правило по ID
// GET /api/:tenantId/rules/:ruleId
app.get('/api/:tenantId/rules/:ruleId', (req, res) => {
    try {
        const { tenantId, ruleId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rule = db.getById(ruleId);

        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json(rule);
    } catch (error) {
        console.error('[Rules] Error getting rule:', error);
        res.status(500).json({ error: 'Failed to get rule' });
    }
});

// Создать правило
// POST /api/:tenantId/rules
app.post('/api/:tenantId/rules', (req, res) => {
    try {
        const { tenantId } = req.params;
        const ruleData = req.body;

        if (!ruleData.id || !ruleData.shortTitle) {
            return res.status(400).json({ error: 'Rule ID and shortTitle are required' });
        }

        const db = getTenantRulesDatabase(tenantId);
        const rule = db.create(ruleData);

        console.log(`[Rules] Rule created: ${rule.id}`);
        res.status(201).json(rule);
    } catch (error) {
        console.error('[Rules] Error creating rule:', error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
});

// Массовое создание правил (начальная загрузка)
// POST /api/:tenantId/rules/bulk
app.post('/api/:tenantId/rules/bulk', (req, res) => {
    try {
        const { tenantId } = req.params;
        const { rules } = req.body;

        if (!Array.isArray(rules)) {
            return res.status(400).json({ error: 'Rules must be an array' });
        }

        const db = getTenantRulesDatabase(tenantId);
        let count = 0;

        for (const rule of rules) {
            try {
                const existing = db.getById(rule.id);
                if (!existing) {
                    db.create(rule);
                    count++;
                }
            } catch (e) {
                console.error(`[Rules] Error creating rule ${rule.id}:`, e);
            }
        }

        console.log(`[Rules] Bulk created ${count} rules for tenant ${tenantId}`);
        res.status(201).json({ created: count });
    } catch (error) {
        console.error('[Rules] Error bulk creating rules:', error);
        res.status(500).json({ error: 'Failed to create rules' });
    }
});

// Обновить правило
// PUT /api/:tenantId/rules/:ruleId
app.put('/api/:tenantId/rules/:ruleId', (req, res) => {
    try {
        const { tenantId, ruleId } = req.params;
        const updates = req.body;

        const db = getTenantRulesDatabase(tenantId);
        const rule = db.update(ruleId, updates);

        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        console.log(`[Rules] Rule updated: ${ruleId}`);
        res.json(rule);
    } catch (error) {
        console.error('[Rules] Error updating rule:', error);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

// Удалить правило (soft delete)
// DELETE /api/:tenantId/rules/:ruleId
app.delete('/api/:tenantId/rules/:ruleId', (req, res) => {
    try {
        const { tenantId, ruleId } = req.params;

        const db = getTenantRulesDatabase(tenantId);
        const success = db.delete(ruleId);

        if (!success) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        console.log(`[Rules] Rule deleted: ${ruleId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[Rules] Error deleting rule:', error);
        res.status(500).json({ error: 'Failed to delete rule' });
    }
});

// Синхронизация правил (загрузка системных + объединение с tenant)
// POST /api/:tenantId/rules/sync
app.post('/api/:tenantId/rules/sync', (req, res) => {
    try {
        const { tenantId } = req.params;
        const db = getTenantRulesDatabase(tenantId);
        const rules = db.getAll();

        res.json({
            rules,
            synced: rules.length,
            total: rules.length
        });
    } catch (error) {
        console.error('[Rules] Error syncing rules:', error);
        res.status(500).json({ error: 'Failed to sync rules' });
    }
});

// --- УСЛУГИ И КОМПЛЕКСЫ ---
try {
    const servicesRoutes = require('./routes/servicesRoutes');
    app.use(servicesRoutes);
    console.log('[Server] Services routes loaded');
} catch (e) {
    console.warn('[Server] Services routes not available:', e.message);
}

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   TeamBuh Local Server                                ║
║   Порт: ${PORT}                                          ║
║   Данные: ${DATA_DIR.padEnd(40)}║
║   Tenant: ${DEFAULT_TENANT.padEnd(40)}║
║                                                       ║
║   ⚠️  Это эмуляция сервера для разработки!           ║
║   TODO: Заменить на production сервер                 ║
╚═══════════════════════════════════════════════════════╝

API Endpoints:
  GET    /api/:tenantId/clients
  POST   /api/:tenantId/clients
  GET    /api/:tenantId/clients/:id
  DELETE /api/:tenantId/clients/:id
  
  GET    /api/:tenantId/employees
  POST   /api/:tenantId/employees
  DELETE /api/:tenantId/employees/:id
  
  POST   /api/:tenantId/:type/:id/documents
  GET    /api/:tenantId/:type/:id/documents
  DELETE /api/:tenantId/:type/:id/documents/:file

  --- ЗАДАЧИ (SQLite) ---
  GET    /api/:tenantId/tasks
  POST   /api/:tenantId/tasks
  POST   /api/:tenantId/tasks/bulk
  GET    /api/:tenantId/tasks/:id
  PATCH  /api/:tenantId/tasks/:id
  DELETE /api/:tenantId/tasks/:id
  POST   /api/:tenantId/tasks/:id/complete
  POST   /api/:tenantId/tasks/:id/reopen
  POST   /api/:tenantId/tasks/:id/archive
  GET    /api/:tenantId/tasks-stats

  --- АРХИВ ---
  GET    /api/:tenantId/archive/:type
  POST   /api/:tenantId/archive/:type
  POST   /api/:tenantId/archive/:type/:id/restore
  DELETE /api/:tenantId/archive/:type/:id
    `);
});

// SPA fallback — в production все не-API маршруты → index.html
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
}

