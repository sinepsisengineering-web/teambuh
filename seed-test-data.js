// Скрипт для создания тестовых данных
const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost', port: 3001,
            path: `/api/org_default${path}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { console.log(`  ${res.statusCode} ${path} -> ${d.substring(0, 60)}`); resolve(d); });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

(async () => {
    console.log('Creating services...');
    await post('/services', { name: 'Сдача НДС', price: 3000, unit: 'декларация', periodicity: 'quarterly', targetEntityType: 'OOO', category: 'accounting' });
    await post('/services', { name: 'Расчёт зарплаты', price: 500, unit: 'сотрудник', periodicity: 'monthly', targetEntityType: 'all', category: 'accounting' });
    await post('/services', { name: 'Сдача 6-НДФЛ', price: 2000, unit: 'отчёт', periodicity: 'quarterly', targetEntityType: 'all', category: 'accounting' });
    await post('/services', { name: 'Регистрация ИП', price: 5000, unit: 'шт', periodicity: 'once', targetEntityType: 'IP', category: 'accounting' });
    await post('/services', { name: 'Годовая отчётность', price: 15000, unit: 'комплект', periodicity: 'yearly', targetEntityType: 'OOO', category: 'accounting' });

    console.log('Creating packages...');
    await post('/packages', { name: 'Стандарт для ИП', price: 10000, targetEntityType: 'IP', includedItems: ['КУДиР', '6-НДФЛ', 'Расчёт зарплаты'] });
    await post('/packages', { name: 'Стандарт для ООО', price: 25000, targetEntityType: 'OOO', includedItems: ['НДС', '6-НДФЛ', 'Расчёт зарплаты', 'Бухотчётность'] });
    await post('/packages', { name: 'Премиум', price: 50000, targetEntityType: 'all', includedItems: ['Все виды отчётности', 'Зарплата', 'Кадры', 'Консультации'] });

    console.log('Done! 5 services + 3 packages created.');
})();
