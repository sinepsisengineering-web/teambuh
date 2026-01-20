// styles/components.ts
// Готовые стили для переиспользуемых компонентов

import React from 'react';
import { colors, borderRadius, typography, shadows, transitions, spacing, sizes } from './theme';

// ==================== КНОПКИ ====================

export const buttonBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: sizes.buttonHeight,
    padding: `0 ${spacing.lg}`,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily,
    borderRadius: borderRadius.lg,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.normal,
    outline: 'none',
};

export const buttonPrimary: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: colors.primary,
    color: colors.textOnPrimary,
    boxShadow: shadows.glow,
};

export const buttonPrimaryHover: React.CSSProperties = {
    backgroundColor: colors.primaryHover,
};

export const buttonSecondary: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
};

export const buttonDanger: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: colors.error,
    color: colors.textLight,
};

export const buttonDisabled: React.CSSProperties = {
    opacity: 0.6,
    cursor: 'not-allowed',
};

// ==================== ПОЛЯ ВВОДА ====================

export const inputBase: React.CSSProperties = {
    width: '100%',
    height: sizes.inputHeight,
    padding: `0 ${spacing.md}`,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.inputBgLight,
    color: colors.textPrimary,
    outline: 'none',
    transition: transitions.fast,
    boxSizing: 'border-box',
};

export const inputDark: React.CSSProperties = {
    ...inputBase,
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.borderLight}`,
    color: colors.textLight,
};

export const inputFocus: React.CSSProperties = {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.infoBg}`,
};

export const label: React.CSSProperties = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
};

export const labelDark: React.CSSProperties = {
    ...label,
    color: colors.textMuted,
};

// ==================== КАРТОЧКИ ====================

export const card: React.CSSProperties = {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: shadows.card,
    border: `1px solid ${colors.border}`,
};

export const cardGlass: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    border: `1px solid ${colors.borderLight}`,
    boxShadow: shadows.xl,
};

// ==================== САЙДБАР ====================

export const sidebar: React.CSSProperties = {
    width: sizes.sidebarWidth,
    minHeight: '100vh',
    background: colors.sidebarGradient,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
};

export const sidebarHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.md,
};

export const sidebarNavItem: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: borderRadius.lg,
    color: colors.textMuted,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.fast,
    textDecoration: 'none',
};

export const sidebarNavItemActive: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.textLight,
};

export const sidebarNavItemHover: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: colors.textLight,
};

// ==================== КОНТЕЙНЕРЫ ====================

export const pageContainer: React.CSSProperties = {
    flex: 1,
    backgroundColor: colors.content,
    padding: spacing.xl,
    overflowY: 'auto',
};

export const mainLayout: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: typography.fontFamily,
};

// ==================== АЛЕРТЫ ====================

export const alertBase: React.CSSProperties = {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
};

export const alertError: React.CSSProperties = {
    ...alertBase,
    backgroundColor: colors.errorBg,
    border: `1px solid ${colors.error}`,
    color: colors.error,
};

export const alertSuccess: React.CSSProperties = {
    ...alertBase,
    backgroundColor: colors.successBg,
    border: `1px solid ${colors.success}`,
    color: colors.success,
};

export const alertWarning: React.CSSProperties = {
    ...alertBase,
    backgroundColor: colors.warningBg,
    border: `1px solid ${colors.warning}`,
    color: colors.warning,
};

// ==================== ЗАГОЛОВКИ ====================

export const heading1: React.CSSProperties = {
    fontSize: typography.fontSize.heading,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    margin: 0,
};

export const heading2: React.CSSProperties = {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    margin: 0,
};

export const heading3: React.CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    margin: 0,
};

// ==================== ТЕКСТ ====================

export const textMuted: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: typography.fontSize.sm,
};

export const textSecondary: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
};

// ==================== ИКОНКА-ОБЁРТКА ====================

export const iconWrapper: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.glow,
};

// ==================== ЭКСПОРТ ВСЕГО ====================

export const components = {
    // Кнопки
    buttonBase,
    buttonPrimary,
    buttonPrimaryHover,
    buttonSecondary,
    buttonDanger,
    buttonDisabled,

    // Инпуты
    inputBase,
    inputDark,
    inputFocus,
    label,
    labelDark,

    // Карточки
    card,
    cardGlass,

    // Сайдбар
    sidebar,
    sidebarHeader,
    sidebarNavItem,
    sidebarNavItemActive,
    sidebarNavItemHover,

    // Контейнеры
    pageContainer,
    mainLayout,

    // Алерты
    alertError,
    alertSuccess,
    alertWarning,

    // Заголовки
    heading1,
    heading2,
    heading3,

    // Текст
    textMuted,
    textSecondary,

    // Иконки
    iconWrapper,
};

export default components;
