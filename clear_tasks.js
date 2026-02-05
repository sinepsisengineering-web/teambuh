// Скрипт для очистки и пересинхронизации задач
// Запускать когда сервер ОСТАНОВЛЕН

const db = require('better-sqlite3')('./data/tenants/org_default/db/tasks.db');
console.log('Очистка всех задач...');
const result = db.prepare('DELETE FROM tasks').run();
console.log(`Удалено задач: ${result.changes}`);
db.close();
console.log('Готово! Теперь запустите сервер (npm run dev:all) — задачи пересоздадутся автоматически.');
