#!/usr/bin/env node
// scripts/create-admin.js
// Создание администратора (директора) в существующей auth.db
//
// Использование:
//   node scripts/create-admin.js <email> <name> <password>
//
// Пример:
//   node scripts/create-admin.js petrov@romashka.ru "Петров Иван" mypassword123

const path = require('path');
const crypto = require('crypto');

// Подключаем модули проекта
const { AuthDatabase } = require('../server/database/authDatabase');

// В production bcryptjs вместо auth.js, чтобы не тянуть весь модуль
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('');
        console.log('Использование:');
        console.log('  node scripts/create-admin.js <email> <name> <password>');
        console.log('');
        console.log('Пример:');
        console.log('  node scripts/create-admin.js petrov@romashka.ru "Петров Иван" mypassword123');
        console.log('');
        process.exit(1);
    }

    const [email, name, password] = args;

    if (password.length < 6) {
        console.error('[Ошибка] Пароль должен быть не менее 6 символов');
        process.exit(1);
    }

    console.log(`[create-admin] Создание администратора: ${email}`);

    try {
        // Открываем auth.db текущего тенанта
        const authDb = new AuthDatabase('org_default');

        // Проверяем, нет ли уже такого пользователя
        const existing = authDb.findByEmail(email);
        if (existing) {
            console.log(`[create-admin] Пользователь ${email} уже существует (id: ${existing.id})`);
            authDb.close();
            process.exit(0);
        }

        // Хэшируем пароль
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Создаём пользователя
        const userId = `admin-${crypto.randomUUID().substring(0, 8)}`;
        const user = authDb.createUser({
            id: userId,
            email: email,
            name: name,
            role: 'admin',
            passwordHash: passwordHash,
            mustChangePassword: false,
        });

        console.log(`[create-admin] ✅ Администратор создан:`);
        console.log(`  ID:    ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Имя:   ${user.name}`);
        console.log(`  Роль:  ${user.role}`);

        authDb.close();
    } catch (error) {
        console.error('[create-admin] Ошибка:', error.message);
        process.exit(1);
    }
}

main();
