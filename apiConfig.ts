// apiConfig.ts
// Единая точка конфигурации API URL
// В dev: VITE_API_URL=http://localhost:3001 (из .env.local)
// В production: пусто (фронт и бэк на одном домене/порте)

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Хелпер для удобства
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;
