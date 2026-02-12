import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Service, ServicePackage, TargetEntityType, ServicePeriodicity } from '../types';

const API_BASE = 'http://localhost:3001/api/org_default';

type FilterMode = 'all' | 'services' | 'packages';

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

const TARGET_LABELS: Record<TargetEntityType, string> = {
    IP: 'ИП',
    OOO: 'ООО',
    AO: 'АО',
    all: 'Все',
};

const PERIODICITY_LABELS: Record<ServicePeriodicity, string> = {
    once: 'Разовая',
    monthly: 'Ежемесячная',
    quarterly: 'Ежеквартальная',
    yearly: 'Ежегодная',
};

const formatPrice = (price: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(price);

// ============================================
// ФОРМА УСЛУГИ
// ============================================

interface ServiceFormProps {
    service?: Service | null;
    onSave: (data: Partial<Service>) => void;
    onCancel: () => void;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ service, onSave, onCancel }) => {
    const [name, setName] = useState(service?.name || '');
    const [description, setDescription] = useState(service?.description || '');
    const [price, setPrice] = useState(service?.price?.toString() || '');
    const [unit, setUnit] = useState(service?.unit || '');
    const [periodicity, setPeriodicity] = useState<ServicePeriodicity>(service?.periodicity || 'once');
    const [targetEntityType, setTargetEntityType] = useState<TargetEntityType>(service?.targetEntityType || 'all');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            ...(service?.id && { id: service.id }),
            name: name.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price) || 0,
            unit: unit.trim() || undefined,
            category: 'accounting',
            periodicity,
            targetEntityType,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Например: Сдача НДС" autoFocus required />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Описание услуги..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Цена (₽)</label>
                    <input type="text" inputMode="decimal" value={price} onChange={e => { if (/^\d*\.?\d{0,2}$/.test(e.target.value) || e.target.value === '') setPrice(e.target.value); }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Единица измерения</label>
                    <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="документы, человек..." />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Периодичность</label>
                    <select value={periodicity} onChange={e => setPeriodicity(e.target.value as ServicePeriodicity)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {Object.entries(PERIODICITY_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Для кого</label>
                    <select value={targetEntityType} onChange={e => setTargetEntityType(e.target.value as TargetEntityType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {Object.entries(TARGET_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    {service?.id ? 'Сохранить' : 'Добавить'}
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    Отмена
                </button>
            </div>
        </form>
    );
};

// ============================================
// ФОРМА КОМПЛЕКСА
// ============================================

interface PackageFormProps {
    pkg?: ServicePackage | null;
    onSave: (data: Partial<ServicePackage>) => void;
    onCancel: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({ pkg, onSave, onCancel }) => {
    const [name, setName] = useState(pkg?.name || '');
    const [description, setDescription] = useState(pkg?.description || '');
    const [price, setPrice] = useState(pkg?.price?.toString() || '');
    const [targetEntityType, setTargetEntityType] = useState<TargetEntityType>(pkg?.targetEntityType || 'all');
    const [includedItems, setIncludedItems] = useState<string[]>(pkg?.includedItems || []);
    const [newItem, setNewItem] = useState('');

    const addItem = () => {
        if (newItem.trim()) {
            setIncludedItems(prev => [...prev, newItem.trim()]);
            setNewItem('');
        }
    };

    const removeItem = (index: number) => {
        setIncludedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            ...(pkg?.id && { id: pkg.id }),
            name: name.trim(),
            description: description.trim() || undefined,
            price: parseFloat(price) || 0,
            targetEntityType,
            includedItems,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название комплекса *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Например: Стандарт для ИП" autoFocus required />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Описание комплекса..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Абонентская цена (₽/мес)</label>
                    <input type="text" inputMode="decimal" value={price} onChange={e => { if (/^\d*\.?\d{0,2}$/.test(e.target.value) || e.target.value === '') setPrice(e.target.value); }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Для кого</label>
                    <select value={targetEntityType} onChange={e => setTargetEntityType(e.target.value as TargetEntityType)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {Object.entries(TARGET_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Перечень включённых позиций */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Что входит в комплекс</label>
                <div className="space-y-2">
                    {includedItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="flex-1 text-sm text-slate-700">{item}</span>
                            <button type="button" onClick={() => removeItem(i)}
                                className="text-red-400 hover:text-red-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="Добавить позицию..." />
                        <button type="button" onClick={addItem}
                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm">
                            +
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    {pkg?.id ? 'Сохранить' : 'Добавить'}
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    Отмена
                </button>
            </div>
        </form>
    );
};

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

export const ServicesView: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Фильтр справа: услуги / комплексы / все
    const [filterMode, setFilterMode] = useState<FilterMode>('all');

    // Модалки
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<'service' | 'package' | null>(null);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

    // Просмотр деталей
    const [viewingService, setViewingService] = useState<Service | null>(null);
    const [viewingPackage, setViewingPackage] = useState<ServicePackage | null>(null);

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [svcRes, pkgRes] = await Promise.all([
                fetch(`${API_BASE}/services`),
                fetch(`${API_BASE}/packages`),
            ]);
            if (!svcRes.ok || !pkgRes.ok) throw new Error('Failed to load data');
            setServices(await svcRes.json());
            setPackages(await pkgRes.json());
        } catch (err: any) {
            setError(err.message);
            console.error('[ServicesView] Load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ============================================
    // CRUD
    // ============================================

    const saveService = useCallback(async (data: Partial<Service>) => {
        try {
            const res = await fetch(`${API_BASE}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to save service');
            await loadData();
            setAddType(null);
            setShowAddModal(false);
            setEditingService(null);
        } catch (err: any) {
            console.error('[ServicesView] Save service error:', err);
        }
    }, [loadData]);

    const savePackage = useCallback(async (data: Partial<ServicePackage>) => {
        try {
            const res = await fetch(`${API_BASE}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to save package');
            await loadData();
            setAddType(null);
            setShowAddModal(false);
            setEditingPackage(null);
        } catch (err: any) {
            console.error('[ServicesView] Save package error:', err);
        }
    }, [loadData]);

    const archiveService = useCallback(async (id: string) => {
        if (!confirm('Архивировать услугу?')) return;
        try {
            await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
            await loadData();
        } catch (err: any) {
            console.error('[ServicesView] Archive error:', err);
        }
    }, [loadData]);

    const archivePackage = useCallback(async (id: string) => {
        if (!confirm('Архивировать комплекс?')) return;
        try {
            await fetch(`${API_BASE}/packages/${id}`, { method: 'DELETE' });
            await loadData();
        } catch (err: any) {
            console.error('[ServicesView] Archive error:', err);
        }
    }, [loadData]);

    // ============================================
    // РЕНДЕР КАРТОЧКИ УСЛУГИ
    // ============================================

    const renderServiceCard = (service: Service) => (
        <div key={service.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <h3 className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setViewingService(service)}>{service.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                            {TARGET_LABELS[service.targetEntityType]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {PERIODICITY_LABELS[service.periodicity]}
                        </span>
                    </div>
                    {service.description && (
                        <p className="text-sm text-slate-500 ml-4 mb-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 ml-4 text-sm">
                        <span className="font-semibold text-emerald-600">{formatPrice(service.price)}</span>
                        {service.unit && <span className="text-slate-400">/ {service.unit}</span>}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingService(service); setAddType('service'); setShowAddModal(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Редактировать">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button onClick={() => archiveService(service.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="В архив">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    // ============================================
    // РЕНДЕР КАРТОЧКИ КОМПЛЕКСА
    // ============================================

    const renderPackageCard = (pkg: ServicePackage) => (
        <div key={pkg.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <h3 className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setViewingPackage(pkg)}>{pkg.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                            {TARGET_LABELS[pkg.targetEntityType]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                            Абонентский
                        </span>
                    </div>
                    {pkg.description && (
                        <p className="text-sm text-slate-500 ml-4 mb-1">{pkg.description}</p>
                    )}
                    <div className="ml-4 mb-2">
                        <span className="font-semibold text-emerald-600">{formatPrice(pkg.price)}</span>
                        <span className="text-slate-400 text-sm"> / мес</span>
                    </div>
                    {pkg.includedItems.length > 0 && (
                        <div className="ml-4 flex flex-wrap gap-1.5">
                            {pkg.includedItems.map((item, i) => (
                                <span key={i} className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-100">
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingPackage(pkg); setAddType('package'); setShowAddModal(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Редактировать">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button onClick={() => archivePackage(pkg.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="В архив">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    // ============================================
    // СОБИРАЕМ ВСЕ ЭЛЕМЕНТЫ ДЛЯ СПИСКА
    // ============================================

    const items = useMemo(() => {
        const result: React.ReactNode[] = [];
        if (filterMode === 'all' || filterMode === 'services') {
            services.forEach(s => result.push(renderServiceCard(s)));
        }
        if (filterMode === 'all' || filterMode === 'packages') {
            packages.forEach(p => result.push(renderPackageCard(p)));
        }
        return result;
    }, [services, packages, filterMode, editingService, editingPackage]);

    // ============================================
    // РЕНДЕР
    // ============================================

    return (
        <div className="flex gap-6 h-full">
            {/* Основная область — своя рамка */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-6 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48 text-slate-400">
                        <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Загрузка...
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-lg font-medium text-slate-600">Услуг пока нет</p>
                        <p className="text-sm mt-1">Нажмите «Добавить» справа, чтобы создать первую услугу или комплекс</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items}
                    </div>
                )}
            </div>

            {/* Правая панель — своя рамка */}
            <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-0 space-y-4">
                    {/* Кнопка добавить */}
                    <button
                        onClick={() => { setEditingService(null); setEditingPackage(null); setShowAddModal(true); setAddType(null); }}
                        className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Добавить
                    </button>

                    {/* Фильтр */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Показать</p>
                        <div className="space-y-1">
                            {([
                                { value: 'all' as FilterMode, label: 'Показать все' },
                                { value: 'services' as FilterMode, label: 'Услуги' },
                                { value: 'packages' as FilterMode, label: 'Комплексы' },
                            ]).map(opt => (
                                <button key={opt.value}
                                    onClick={() => setFilterMode(opt.value)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterMode === opt.value
                                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модалка */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowAddModal(false); setAddType(null); setEditingService(null); setEditingPackage(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            {addType === null && !editingService && !editingPackage ? (
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 mb-4">Что добавить?</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setAddType('service')}
                                            className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center group">
                                            <svg className="w-10 h-10 mx-auto mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <span className="font-semibold text-slate-700">Услуга</span>
                                        </button>
                                        <button onClick={() => setAddType('package')}
                                            className="p-6 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-center group">
                                            <svg className="w-10 h-10 mx-auto mb-2 text-slate-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <span className="font-semibold text-slate-700">Комплекс</span>
                                        </button>
                                    </div>
                                    <button onClick={() => { setShowAddModal(false); setAddType(null); }}
                                        className="w-full mt-4 px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
                                        Отмена
                                    </button>
                                </div>
                            ) : addType === 'service' ? (
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 mb-4">
                                        {editingService ? 'Редактировать услугу' : 'Новая услуга'}
                                    </h2>
                                    <ServiceForm
                                        service={editingService}
                                        onSave={saveService}
                                        onCancel={() => { setShowAddModal(false); setAddType(null); setEditingService(null); }}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 mb-4">
                                        {editingPackage ? 'Редактировать комплекс' : 'Новый комплекс'}
                                    </h2>
                                    <PackageForm
                                        pkg={editingPackage}
                                        onSave={savePackage}
                                        onCancel={() => { setShowAddModal(false); setAddType(null); setEditingPackage(null); }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка просмотра услуги */}
            {viewingService && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewingService(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                                <h2 className="text-xl font-bold text-slate-800">{viewingService.name}</h2>
                            </div>
                            <div className="space-y-3">
                                {viewingService.description && (
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Описание</p>
                                        <p className="text-sm text-slate-700">{viewingService.description}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Цена</p>
                                        <p className="text-lg font-semibold text-emerald-600">{formatPrice(viewingService.price)}</p>
                                    </div>
                                    {viewingService.unit && (
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Единица измерения</p>
                                            <p className="text-sm text-slate-700">{viewingService.unit}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Периодичность</p>
                                        <p className="text-sm text-slate-700">{PERIODICITY_LABELS[viewingService.periodicity]}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Для кого</p>
                                        <p className="text-sm text-slate-700">{TARGET_LABELS[viewingService.targetEntityType]}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { const s = viewingService; setViewingService(null); setEditingService(s); setAddType('service'); setShowAddModal(true); }}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                    Редактировать
                                </button>
                                <button onClick={() => setViewingService(null)}
                                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка просмотра комплекса */}
            {viewingPackage && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewingPackage(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 rounded-full bg-amber-500" />
                                <h2 className="text-xl font-bold text-slate-800">{viewingPackage.name}</h2>
                            </div>
                            <div className="space-y-3">
                                {viewingPackage.description && (
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Описание</p>
                                        <p className="text-sm text-slate-700">{viewingPackage.description}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Абонентская цена</p>
                                        <p className="text-lg font-semibold text-emerald-600">{formatPrice(viewingPackage.price)} <span className="text-sm font-normal text-slate-400">/ мес</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Для кого</p>
                                        <p className="text-sm text-slate-700">{TARGET_LABELS[viewingPackage.targetEntityType]}</p>
                                    </div>
                                </div>
                                {viewingPackage.includedItems.length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Что входит в комплекс</p>
                                        <ul className="space-y-1">
                                            {viewingPackage.includedItems.map((item, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { const p = viewingPackage; setViewingPackage(null); setEditingPackage(p); setAddType('package'); setShowAddModal(true); }}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                    Редактировать
                                </button>
                                <button onClick={() => setViewingPackage(null)}
                                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServicesView;
