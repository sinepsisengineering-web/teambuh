// server/database/migrateClientsToSQLite.js
// Скрипт миграции данных клиентов из JSON в SQLite

const fs = require('fs');
const path = require('path');
const { getClientsDatabase } = require('./clientsDatabase');

const migrateClients = (tenantId = 'org_default') => {
    console.log(`[Migration] Starting migration for tenant: ${tenantId}`);

    const clientsDir = path.join(process.cwd(), 'data', 'tenants', tenantId, 'clients');

    if (!fs.existsSync(clientsDir)) {
        console.log('[Migration] No clients directory found, nothing to migrate');
        return { migrated: 0, errors: [] };
    }

    const db = getClientsDatabase(tenantId);
    const entries = fs.readdirSync(clientsDir, { withFileTypes: true });

    let migrated = 0;
    const errors = [];

    for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('cli_')) {
            continue;
        }

        const profilePath = path.join(clientsDir, entry.name, 'profile.json');

        if (!fs.existsSync(profilePath)) {
            console.log(`[Migration] No profile.json for ${entry.name}, skipping`);
            continue;
        }

        try {
            const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

            // Проверяем, не существует ли уже клиент в БД
            const existing = db.getClientById(profileData.id);
            if (existing) {
                console.log(`[Migration] Client ${profileData.id} already exists in DB, skipping`);
                continue;
            }

            // Создаём клиента
            const client = {
                id: profileData.id,
                name: profileData.name,
                legalForm: profileData.legalForm,
                inn: profileData.inn,
                kpp: profileData.kpp,
                ogrn: profileData.ogrn,
                taxSystem: profileData.taxSystem,
                isNdsPayer: profileData.isNdsPayer,
                ndsValue: profileData.ndsValue,
                profitAdvancePeriodicity: profileData.profitAdvancePeriodicity,
                hasEmployees: profileData.hasEmployees,
                employeeCount: profileData.employeeCount,
                isNdflAgent: profileData.isNdflAgent,
                paysNdflSelf: profileData.paysNdflSelf,
                legalAddress: profileData.legalAddress,
                actualAddress: profileData.actualAddress,
                bankName: profileData.bankName,
                bankAccount: profileData.bankAccount,
                bik: profileData.bik,
                corrAccount: profileData.corrAccount,
                accountantId: profileData.accountantId,
                accountantName: profileData.accountantName,
                clientStatus: profileData.clientStatus || 'permanent',
                tariffName: profileData.tariffName,
                tariffPrice: profileData.tariffPrice,
                // Обратная совместимость: маппим legacy поля в новые
                packageName: profileData.packageName || profileData.tariffName,
                servicePrice: profileData.servicePrice || profileData.tariffPrice,
                servicePriceManual: profileData.servicePriceManual || false,
                packageId: profileData.packageId || null,
                isEshn: profileData.isEshn,
                hasPatents: profileData.hasPatents || (profileData.patents && profileData.patents.length > 0),
                isArchived: profileData.isArchived
            };

            db.createClient(client);
            console.log(`[Migration] Created client: ${client.name} (${client.id})`);

            // Мигрируем контакты
            if (profileData.contacts && Array.isArray(profileData.contacts)) {
                for (let i = 0; i < profileData.contacts.length; i++) {
                    const contact = profileData.contacts[i];
                    // Генерируем уникальный ID включая clientId
                    const contactId = `cnt_${client.id}_${i}_${Date.now()}`;
                    db.addContact({
                        id: contactId,
                        clientId: client.id,
                        role: contact.role || 'Контактное лицо',
                        name: contact.name,
                        phone: contact.phone,
                        email: contact.email,
                        isPrimary: contact.id === 'main' || i === 0
                    });
                }
                console.log(`[Migration]   + ${profileData.contacts.length} contacts`);
            }

            // Мигрируем патенты
            if (profileData.patents && Array.isArray(profileData.patents)) {
                for (const patent of profileData.patents) {
                    db.addPatent({
                        id: patent.id || `pat_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`,
                        clientId: client.id,
                        name: patent.name,
                        startDate: patent.startDate,
                        endDate: patent.endDate,
                        autoRenew: patent.autoRenew
                    });
                }
                console.log(`[Migration]   + ${profileData.patents.length} patents`);
            }

            // Мигрируем доступы
            if (profileData.credentials && Array.isArray(profileData.credentials)) {
                for (const cred of profileData.credentials) {
                    db.addCredential({
                        id: cred.id || `cred_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`,
                        clientId: client.id,
                        serviceName: cred.service || cred.serviceName,
                        login: cred.login,
                        password: cred.password
                    });
                }
                console.log(`[Migration]   + ${profileData.credentials.length} credentials`);
            }

            // Мигрируем заметки
            if (profileData.notes && Array.isArray(profileData.notes)) {
                for (const note of profileData.notes) {
                    if (typeof note === 'string' && note.trim()) {
                        db.addNote({
                            id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`,
                            clientId: client.id,
                            text: note,
                            authorName: 'Система (миграция)'
                        });
                    } else if (note.text) {
                        db.addNote({
                            id: note.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`,
                            clientId: client.id,
                            text: note.text,
                            authorId: note.authorId,
                            authorName: note.authorName
                        });
                    }
                }
                console.log(`[Migration]   + ${profileData.notes.length} notes`);
            }

            migrated++;
        } catch (error) {
            console.error(`[Migration] Error migrating ${entry.name}:`, error.message);
            errors.push({ clientDir: entry.name, error: error.message });
        }
    }

    console.log(`[Migration] Complete: ${migrated} clients migrated, ${errors.length} errors`);

    return { migrated, errors };
};

// Экспорт для использования из API
module.exports = { migrateClients };

// Запуск напрямую: node migrateClientsToSQLite.js
if (require.main === module) {
    const tenantId = process.argv[2] || 'org_default';
    const result = migrateClients(tenantId);
    console.log('\nMigration result:', JSON.stringify(result, null, 2));
}
