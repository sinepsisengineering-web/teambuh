/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Основные цвета TeamBuh
                primary: {
                    DEFAULT: 'var(--color-primary)',
                    hover: 'var(--color-primary-hover)',
                    light: 'var(--color-primary-light)',
                },
                sidebar: {
                    DEFAULT: 'var(--color-sidebar-bg)',
                    text: 'var(--color-sidebar-text)',
                    active: 'var(--color-sidebar-item-active)',
                    hover: 'var(--color-sidebar-item-hover)',
                },
                content: 'var(--color-content-bg)',
                card: {
                    DEFAULT: 'var(--color-card-bg)',
                    border: 'var(--color-card-border)',
                },
                text: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-muted)',
                },
                state: {
                    error: 'var(--color-error)',
                    success: 'var(--color-success)',
                    warning: 'var(--color-warning)',
                }
            },
        },
    },
    plugins: [],
}
