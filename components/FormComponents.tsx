// components/FormComponents.tsx
// Переиспользуемые компоненты форм для всего приложения

import React, { useRef, useState } from 'react';

// =============================================
// СТИЛИ (из CSS переменных)
// =============================================

const inputBaseClass = `
    w-full px-3 py-2 text-sm 
    border border-[var(--color-border,#e2e8f0)] 
    rounded-lg
    bg-[var(--color-card-bg,#fff)]
    text-[var(--color-text-primary,#1e293b)]
    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
    transition-colors
`;

const inputReadonlyClass = `
    w-full px-3 py-2 text-sm
    border border-[var(--color-border-light,#f1f5f9)]
    rounded-lg
    bg-[var(--color-bg-muted,#f8fafc)]
    text-[var(--color-text-muted,#94a3b8)]
    cursor-not-allowed
`;

const inputErrorClass = `
    border-[var(--color-error,#ef4444)] 
    focus:ring-[var(--color-error,#ef4444)]/20
`;

const labelClass = "block text-xs font-medium text-[var(--color-text-secondary,#64748b)] mb-1";
const errorClass = "text-xs text-[var(--color-error,#ef4444)] mt-1";
const requiredMark = " *";

// =============================================
// LABEL
// =============================================

interface LabelProps {
    children: React.ReactNode;
    htmlFor?: string;
    required?: boolean;
    className?: string;
}

export const Label: React.FC<LabelProps> = ({ children, htmlFor, required, className = '' }) => (
    <label htmlFor={htmlFor} className={`${labelClass} ${className}`}>
        {children}
        {required && <span className="text-[var(--color-error,#ef4444)]">{requiredMark}</span>}
    </label>
);

// =============================================
// INPUT
// =============================================

interface InputProps {
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password';
    placeholder?: string;
    readOnly?: boolean;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    id?: string;
    className?: string;
    autoFocus?: boolean;
}

export const Input: React.FC<InputProps> = ({
    value,
    onChange,
    type = 'text',
    placeholder,
    readOnly = false,
    disabled = false,
    required = false,
    error,
    id,
    className = '',
    autoFocus = false
}) => {
    const baseClass = readOnly || disabled ? inputReadonlyClass : inputBaseClass;
    const errorStyle = error ? inputErrorClass : '';

    return (
        <div className="w-full">
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                disabled={disabled}
                required={required}
                autoFocus={autoFocus}
                className={`${baseClass} ${errorStyle} ${className}`}
            />
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// SELECT
// =============================================

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    id?: string;
    className?: string;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
    required = false,
    error,
    id,
    className = ''
}) => {
    const errorStyle = error ? inputErrorClass : '';

    return (
        <div className="w-full">
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required}
                className={`${inputBaseClass} ${errorStyle} ${className}`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// PHOTO UPLOAD
// =============================================

interface PhotoUploadProps {
    currentPhoto?: string;
    onUpload: (file: File) => void;
    onRemove?: () => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
    currentPhoto,
    onUpload,
    onRemove,
    size = 'md',
    className = ''
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // Синхронизация с currentPhoto prop (для загрузки из сервера)
    React.useEffect(() => {
        setPreview(currentPhoto || null);
    }, [currentPhoto]);

    const sizeClasses = {
        sm: 'w-16 h-20',
        md: 'w-20 h-24',
        lg: 'w-24 h-28'
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
            onUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setPreview(URL.createObjectURL(file));
            onUpload(file);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
        if (onRemove) onRemove();
    };

    return (
        <div
            className={`
                ${sizeClasses[size]} 
                ${className}
                relative group rounded-lg overflow-hidden cursor-pointer flex-shrink-0
                ${dragOver ? 'ring-2 ring-primary' : ''}
                ${preview ? '' : 'border-2 border-dashed border-[var(--color-border,#cbd5e1)] hover:border-primary bg-[var(--color-bg-muted,#f8fafc)] hover:bg-[var(--color-bg-muted,#f1f5f9)]'}
                transition-all
            `}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {preview ? (
                <>
                    <img src={preview} alt="Фото" className="w-full h-full object-cover" />
                    {onRemove && (
                        <button
                            onClick={handleRemove}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                        >
                            ×
                        </button>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-2">
                    <svg className="w-6 h-6 text-[var(--color-text-muted,#94a3b8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] text-[var(--color-text-muted,#94a3b8)] mt-1">Фото</span>
                </div>
            )}
        </div>
    );
};

// =============================================
// FORM FIELD (Label + Input комбо)
// =============================================

interface FormFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password';
    placeholder?: string;
    readOnly?: boolean;
    required?: boolean;
    error?: string;
    className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    readOnly = false,
    required = false,
    error,
    className = ''
}) => {
    const id = `field-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className={className}>
            <Label htmlFor={id} required={required}>{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                required={required}
                error={error}
            />
        </div>
    );
};

// =============================================
// FORM SECTION (группировка полей)
// =============================================

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, className = '' }) => (
    <div className={className}>
        <h3 className="text-xs font-semibold text-[var(--color-text-primary,#1e293b)] mb-2 pb-1 border-b border-[var(--color-border-light,#f1f5f9)]">
            {title}
        </h3>
        {children}
    </div>
);

// =============================================
// PHONE INPUT (с форматированием +7)
// =============================================

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '+7 (___) ___-__-__'
}) => {
    // Форматирование телефона: +7 (XXX) XXX-XX-XX
    const formatPhone = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 11);
        if (digits.length === 0) return '';

        let formatted = '+7';
        if (digits.length > 1) {
            formatted += ` (${digits.slice(1, 4)}`;
        }
        if (digits.length >= 4) {
            formatted += `) ${digits.slice(4, 7)}`;
        }
        if (digits.length >= 7) {
            formatted += `-${digits.slice(7, 9)}`;
        }
        if (digits.length >= 9) {
            formatted += `-${digits.slice(9, 11)}`;
        }
        return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        onChange(formatted);
    };

    return (
        <div className="w-full">
            <input
                type="tel"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className={`${inputBaseClass} ${error ? inputErrorClass : ''}`}
            />
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// EMAIL INPUT (с валидацией)
// =============================================

interface EmailInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const EmailInput: React.FC<EmailInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = 'email@example.com'
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const validateEmail = (email: string): boolean => {
        if (!email) return true; // Пустое значение валидно (проверяется required)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleBlur = () => {
        if (value && !validateEmail(value)) {
            setLocalError('Неверный формат email');
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="email"
                value={value}
                onChange={(e) => onChange(e.target.value.toLowerCase())}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// INN INPUT (только цифры, 10-12 символов)
// =============================================

interface INNInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    length?: 10 | 12; // ИП = 12, Юр.лица = 10
    placeholder?: string;
}

export const INNInput: React.FC<INNInputProps> = ({
    value,
    onChange,
    error,
    length = 12,
    placeholder
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, length);
        onChange(digits);
        setLocalError(null);
    };

    const handleBlur = () => {
        if (value && value.length !== length && value.length !== 10 && value.length !== 12) {
            setLocalError(`ИНН должен содержать ${length} цифр`);
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder || `ИНН (${length} цифр)`}
                maxLength={length}
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// PERCENT INPUT (0-100, без стрелок)
// =============================================

interface PercentInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    min?: number;
    max?: number;
}

export const PercentInput: React.FC<PercentInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    min = 0,
    max = 100
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
        const num = parseInt(val, 10);

        if (val === '' || (num >= min && num <= max)) {
            onChange(val);
        } else if (num > max) {
            onChange(max.toString());
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    value={value}
                    onChange={handleChange}
                    placeholder="0"
                    required={required}
                    maxLength={3}
                    className={`w-16 px-2 py-2 text-sm text-center border border-[var(--color-border,#e2e8f0)] rounded-lg bg-[var(--color-card-bg,#fff)] text-[var(--color-text-primary,#1e293b)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${error ? inputErrorClass : ''}`}
                    style={{ MozAppearance: 'textfield' }}
                />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium">%</span>
            </div>
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// SNILS INPUT (только цифры, формат XXX-XXX-XXX XX)
// =============================================

interface SNILSInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
}

export const SNILSInput: React.FC<SNILSInputProps> = ({
    value,
    onChange,
    error,
    placeholder = '___-___-___ __'
}) => {
    const formatSNILS = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 11);
        if (digits.length === 0) return '';

        let formatted = digits.slice(0, 3);
        if (digits.length > 3) formatted += `-${digits.slice(3, 6)}`;
        if (digits.length > 6) formatted += `-${digits.slice(6, 9)}`;
        if (digits.length > 9) formatted += ` ${digits.slice(9, 11)}`;
        return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatSNILS(e.target.value);
        onChange(formatted);
    };

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={`${inputBaseClass} ${error ? inputErrorClass : ''}`}
            />
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// PASSPORT INPUT (серия и номер: XXXX XXXXXX)
// =============================================

interface PassportInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
}

export const PassportInput: React.FC<PassportInputProps> = ({
    value,
    onChange,
    error,
    placeholder = '____ ______'
}) => {
    const formatPassport = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 10);
        if (digits.length === 0) return '';

        if (digits.length <= 4) return digits;
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPassport(e.target.value);
        onChange(formatted);
    };

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={`${inputBaseClass} ${error ? inputErrorClass : ''}`}
            />
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};

// =============================================
// BANK ACCOUNT INPUT (Расчётный счёт — 20 цифр)
// =============================================

interface BankAccountInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const BankAccountInput: React.FC<BankAccountInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '40702810...'
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 20);
        onChange(digits);
        setLocalError(null);
    };

    const handleBlur = () => {
        if (value && value.length !== 20) {
            setLocalError('Расчётный счёт должен содержать 20 цифр');
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                maxLength={20}
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// BIK INPUT (БИК — 9 цифр)
// =============================================

interface BIKInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const BIKInput: React.FC<BIKInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '044525225'
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
        onChange(digits);
        setLocalError(null);
    };

    const handleBlur = () => {
        if (value && value.length !== 9) {
            setLocalError('БИК должен содержать 9 цифр');
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                maxLength={9}
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// CORR ACCOUNT INPUT (Корр. счёт — 20 цифр)
// =============================================

interface CorrAccountInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const CorrAccountInput: React.FC<CorrAccountInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '30101810...'
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 20);
        onChange(digits);
        setLocalError(null);
    };

    const handleBlur = () => {
        if (value && value.length !== 20) {
            setLocalError('Корр. счёт должен содержать 20 цифр');
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                maxLength={20}
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// CARD NUMBER INPUT (Номер карты — 16 цифр, формат XXXX XXXX XXXX XXXX)
// =============================================

interface CardNumberInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const CardNumberInput: React.FC<CardNumberInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '____ ____ ____ ____'
}) => {
    const [localError, setLocalError] = useState<string | null>(null);

    const formatCardNumber = (input: string): string => {
        const digits = input.replace(/\D/g, '').slice(0, 16);
        if (digits.length === 0) return '';

        // Формат: XXXX XXXX XXXX XXXX
        const groups = [];
        for (let i = 0; i < digits.length; i += 4) {
            groups.push(digits.slice(i, i + 4));
        }
        return groups.join(' ');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCardNumber(e.target.value);
        onChange(formatted);
        setLocalError(null);
    };

    const handleBlur = () => {
        const digits = value.replace(/\D/g, '');
        if (digits && digits.length !== 16) {
            setLocalError('Номер карты должен содержать 16 цифр');
        } else {
            setLocalError(null);
        }
    };

    const displayError = error || localError;

    return (
        <div className="w-full">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                maxLength={19} // 16 цифр + 3 пробела
                className={`${inputBaseClass} ${displayError ? inputErrorClass : ''}`}
            />
            {displayError && <p className={errorClass}>{displayError}</p>}
        </div>
    );
};

// =============================================
// SALARY INPUT (Оклад — число с разделителями тысяч)
// =============================================

interface SalaryInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
}

export const SalaryInput: React.FC<SalaryInputProps> = ({
    value,
    onChange,
    error,
    required = false,
    placeholder = '50 000'
}) => {
    const formatSalary = (input: string): string => {
        const digits = input.replace(/\D/g, '');
        if (digits.length === 0) return '';

        // Формат с разделителями тысяч: 1 000 000
        return parseInt(digits, 10).toLocaleString('ru-RU');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatSalary(e.target.value);
        onChange(formatted);
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    required={required}
                    className={`${inputBaseClass} ${error ? inputErrorClass : ''}`}
                />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium">₽</span>
            </div>
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
};
