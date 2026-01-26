// components/EmployeeAvatar.tsx
// Переиспользуемый компонент аватара сотрудника с автозагрузкой по ID

import React, { useRef, useState, useEffect } from 'react';

const SERVER_URL = 'http://localhost:3001';

// =============================================
// ТИПЫ
// =============================================

interface EmployeeAvatarProps {
    employeeId?: string;          // ID сотрудника для авто-загрузки фото
    photoUrl?: string;            // Прямой URL фото (если нет employeeId)
    name?: string;                // Имя для инициалов (fallback)
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    editable?: boolean;           // Режим редактирования (с загрузкой)
    onPhotoChange?: (file: File, compressedBlob: Blob) => void;  // Callback при смене фото
    className?: string;
}

// =============================================
// РАЗМЕРЫ
// =============================================

const sizeClasses = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-lg',
    xl: 'w-28 h-28 text-2xl'
};

// =============================================
// СЖАТИЕ ИЗОБРАЖЕНИЯ
// =============================================

const compressImage = async (file: File, maxSize = 150, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Создаем canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not supported'));
                    return;
                }

                // Вычисляем размеры для кропа (квадрат по центру)
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                // Устанавливаем размер canvas
                canvas.width = maxSize;
                canvas.height = maxSize;

                // Рисуем сжатое изображение
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);

                // Конвертируем в WebP (или JPEG как fallback)
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            // Fallback на JPEG
                            canvas.toBlob(
                                (jpegBlob) => {
                                    if (jpegBlob) resolve(jpegBlob);
                                    else reject(new Error('Failed to compress image'));
                                },
                                'image/jpeg',
                                quality
                            );
                        }
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

// =============================================
// КОМПОНЕНТ
// =============================================

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
    employeeId,
    photoUrl: externalPhotoUrl,
    name = '',
    size = 'md',
    editable = false,
    onPhotoChange,
    className = ''
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Получаем инициалы из имени
    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

    // Загружаем фото по employeeId
    useEffect(() => {
        if (employeeId) {
            const url = `${SERVER_URL}/api/org_default/employees/${employeeId}/photo`;
            // Проверяем существует ли фото
            fetch(url, { method: 'HEAD' })
                .then(res => {
                    if (res.ok) {
                        setPhotoUrl(`${url}?t=${Date.now()}`); // Cache bust
                    } else {
                        setPhotoUrl(null);
                    }
                })
                .catch(() => setPhotoUrl(null));
        } else if (externalPhotoUrl) {
            setPhotoUrl(externalPhotoUrl);
        }
    }, [employeeId, externalPhotoUrl]);

    // Обработка загрузки файла
    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        setIsLoading(true);
        try {
            // Сжимаем изображение
            const compressedBlob = await compressImage(file, 150, 0.7);

            // Показываем превью
            const previewUrl = URL.createObjectURL(compressedBlob);
            setPhotoUrl(previewUrl);

            // Если есть employeeId — загружаем на сервер
            if (employeeId) {
                const formData = new FormData();
                formData.append('photo', compressedBlob, 'avatar.webp');

                const response = await fetch(
                    `${SERVER_URL}/api/org_default/employees/${employeeId}/photo`,
                    { method: 'POST', body: formData }
                );

                if (response.ok) {
                    console.log('[Avatar] Uploaded compressed photo for', employeeId);
                }
            }

            // Вызываем callback
            if (onPhotoChange) {
                onPhotoChange(file, compressedBlob);
            }
        } catch (error) {
            console.error('Failed to process image:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleClick = () => {
        if (editable) inputRef.current?.click();
    };

    return (
        <div
            className={`
                ${sizeClasses[size]}
                relative rounded-full overflow-hidden flex-shrink-0
                flex items-center justify-center
                ${photoUrl ? '' : 'bg-primary/10 text-primary font-semibold'}
                ${editable ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}
                ${dragOver ? 'ring-2 ring-primary' : ''}
                ${isLoading ? 'opacity-50' : ''}
                ${className}
            `}
            onClick={handleClick}
            onDragOver={(e) => { e.preventDefault(); if (editable) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={editable ? handleDrop : undefined}
        >
            {editable && (
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            )}

            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt={name || 'Avatar'}
                    className="w-full h-full object-cover"
                    onError={() => setPhotoUrl(null)}
                />
            ) : (
                <span>{initials}</span>
            )}

            {/* Overlay при наведении в editable режиме */}
            {editable && !isLoading && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full">
                    <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            )}
        </div>
    );
};

export default EmployeeAvatar;
