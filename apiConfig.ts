// apiConfig.ts
// Единая точка конфигурации API URL + авторизация
// В dev: VITE_API_URL=http://localhost:3001 (из .env.local)
// В production: пусто (фронт и бэк на одном домене/порте)

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Хелпер для удобства
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// ============================================
// АВТОРИЗАЦИЯ
// ============================================

/**
 * Получить заголовки с JWT-токеном
 */
export const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

/**
 * Обёртка над fetch с автоматической подстановкой JWT-токена.
 * При 401 — очищает авторизацию и перезагружает страницу.
 */
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('auth_token');

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    // Не ставим Content-Type для FormData (multer)
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });

    // Если токен истёк или невалидный — выкидываем на логин
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.reload();
    }

    return response;
};
