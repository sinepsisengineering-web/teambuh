// styles/theme.ts
// Дизайн-система TeamBuh — основные переменные
// Режим: light (с заделом для dark)

export type ThemeMode = 'light' | 'dark';

// ==================== ЦВЕТА ====================

export const colors = {
    // Основные / Акценты
    primary: '#4f46e5',        // Индиго
    primaryHover: '#4338ca',
    primaryLight: '#818cf8',

    // Градиенты
    gradientStart: '#0f172a',  // slate-900
    gradientMiddle: '#312e81', // indigo-900
    gradientEnd: '#0f172a',

    // Фоны
    sidebar: '#0f172a',
    sidebarGradient: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #0f172a 100%)',
    content: '#f1f5f9',        // slate-100
    card: '#ffffff',
    cardHover: '#f8fafc',      // slate-50
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Текст
    textPrimary: '#1e293b',    // slate-800
    textSecondary: '#64748b',  // slate-500
    textMuted: '#94a3b8',      // slate-400
    textLight: '#ffffff',
    textOnPrimary: '#ffffff',

    // Рамки
    border: '#e2e8f0',         // slate-200
    borderLight: 'rgba(255, 255, 255, 0.1)',

    // Состояния
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    success: '#22c55e',
    successBg: 'rgba(34, 197, 94, 0.1)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.1)',

    // Интерактивные
    inputBg: 'rgba(255, 255, 255, 0.05)',
    inputBgLight: '#ffffff',
    inputFocus: '#4f46e5',
};

// ==================== РАЗМЕРЫ ====================

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
};

export const borderRadius = {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
};

// ==================== ТИПОГРАФИКА ====================

export const typography = {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

    fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        xxl: '24px',
        heading: '28px',
        display: '36px',
    },

    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },

    lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
    },
};

// ==================== ТЕНИ ====================

export const shadows = {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    glow: '0 10px 40px rgba(79, 70, 229, 0.3)',
    card: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
};

// ==================== ПЕРЕХОДЫ ====================

export const transitions = {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
};

// ==================== РАЗМЕРЫ КОМПОНЕНТОВ ====================

export const sizes = {
    sidebarWidth: '280px',
    sidebarCollapsed: '80px',
    headerHeight: '64px',
    inputHeight: '44px',
    buttonHeight: '44px',
    iconSize: '20px',
};

// ==================== ЭКСПОРТ ТЕМЫ ====================

export const theme = {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
    transitions,
    sizes,
};

export default theme;
