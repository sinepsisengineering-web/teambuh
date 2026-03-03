import React, { useEffect, useMemo, useState } from 'react';

type Section = 'tenants' | 'archive' | 'rules' | 'audit' | 'settings' | 'updates';

type TenantStatus = 'active' | 'archived' | 'suspended';

interface TenantRow {
    tenantId: string;
    companyName: string;
    domain: string;
    status: TenantStatus;
    createdAt: string;
    users: number | null;
}

interface RuleRow {
    id: string;
    title: string;
    shortDescription: string;
    periodicity: string;
    source: string;
    updatedAt?: string;
}

interface TenantsApiRow {
    id: string;
    name?: string;
    status?: string;
    created_at?: string;
    admin_email?: string;
}

const sections: { id: Section; label: string; hint: string }[] = [
    { id: 'tenants', hint: 'Список клиентов', label: 'Клиенты' },
    { id: 'archive', hint: 'Корзина клиентов', label: 'Архив' },
    { id: 'rules', hint: 'Системные правила', label: 'Налоговые правила' },
    { id: 'audit', hint: 'История действий', label: 'Журнал' },
    { id: 'settings', hint: 'Параметры панели', label: 'Настройки' },
    { id: 'updates', hint: 'Код и пересборка клиентов', label: 'Обновления' },
];

const statusBadge: Record<TenantStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-amber-100 text-amber-700',
    suspended: 'bg-rose-100 text-rose-700',
};

const statusLabel: Record<TenantStatus, string> = {
    active: 'Активен',
    archived: 'В архиве',
    suspended: 'Приостановлен',
};

const normalizeStatus = (value?: string): TenantStatus => {
    if (value === 'archived') return 'archived';
    if (value === 'suspended') return 'suspended';
    return 'active';
};

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('ru-RU');
};

const splitOutput = (output: string) =>
    output
        .split(/\r?\n/)
        .map(s => s.trimEnd())
        .filter(Boolean);

export const SuperAdminPreview: React.FC = () => {
    const isAdminHost = typeof window !== 'undefined' && window.location.hostname === 'admin-oleg.teambuh.ru';
    const apiBase = isAdminHost ? 'https://teambuh.ru' : '';
    const [section, setSection] = useState<Section>('tenants');
    const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
    const [isUpdateRunning, setIsUpdateRunning] = useState(false);
    const [showUpdateLog, setShowUpdateLog] = useState(true);
    const [updateLogLines, setUpdateLogLines] = useState<string[]>([]);

    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [rules, setRules] = useState<RuleRow[]>([]);
    const [isLoadingTenants, setIsLoadingTenants] = useState(true);
    const [isLoadingRules, setIsLoadingRules] = useState(true);

    const pageTitle = useMemo(() => {
        return sections.find(s => s.id === section)?.label || 'SuperAdmin';
    }, [section]);

    const activeTenants = useMemo(
        () => tenants.filter(t => t.status === 'active'),
        [tenants]
    );

    const archivedTenants = useMemo(
        () => tenants.filter(t => t.status === 'archived'),
        [tenants]
    );

    const appendLog = (line: string) => {
        const now = new Date();
        const ts = now.toLocaleTimeString('ru-RU');
        setUpdateLogLines(prev => [...prev, `[${ts}] ${line}`]);
    };

    const loadTenants = async () => {
        setIsLoadingTenants(true);
        try {
            const response = await fetch(`${apiBase}/api/tenants`);
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || 'Не удалось загрузить клиентов');
            }

            const rows: TenantRow[] = (payload.tenants as TenantsApiRow[]).map(t => ({
                tenantId: t.id,
                companyName: t.name || t.id,
                domain: `${t.id}.teambuh.ru`,
                status: normalizeStatus(t.status),
                createdAt: formatDate(t.created_at),
                users: null,
            }));

            setTenants(rows);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка загрузки клиентов';
            appendLog(`❌ ${message}`);
            setTenants([]);
        } finally {
            setIsLoadingTenants(false);
        }
    };

    const loadSystemRules = async () => {
        setIsLoadingRules(true);
        try {
            const response = await fetch(`${apiBase}/api/system-rules`);
            const payload = await response.json();
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || 'Не удалось загрузить системные правила');
            }
            setRules((payload.rules || []) as RuleRow[]);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка загрузки правил';
            appendLog(`❌ ${message}`);
            setRules([]);
        } finally {
            setIsLoadingRules(false);
        }
    };

    useEffect(() => {
        void loadTenants();
        void loadSystemRules();
    }, []);

    const handleSelectTenant = (tenantId: string) => {
        setSelectedTenantIds(prev =>
            prev.includes(tenantId) ? prev.filter(id => id !== tenantId) : [...prev, tenantId]
        );
    };

    const handleSelectAll = () => {
        setSelectedTenantIds(activeTenants.map(t => t.tenantId));
    };

    const handleClearSelection = () => {
        setSelectedTenantIds([]);
    };

    const handlePullCode = async () => {
        setShowUpdateLog(true);
        setIsUpdateRunning(true);
        appendLog('=== Подтянуть код из Git ===');
        try {
            const response = await fetch(`${apiBase}/api/deploy/pull-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const payload = await response.json();
            const lines = splitOutput(payload?.output || 'Нет вывода');
            lines.forEach(appendLog);
            if (!response.ok || !payload?.success) {
                appendLog('❌ Подтянуть код не удалось');
            } else {
                appendLog('✅ Код обновлён');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка запроса';
            appendLog(`❌ ${message}`);
        } finally {
            setIsUpdateRunning(false);
        }
    };

    const handleUpdateSelected = async () => {
        if (selectedTenantIds.length === 0) return;
        setShowUpdateLog(true);
        setIsUpdateRunning(true);
        appendLog(`=== Обновление клиентов (${selectedTenantIds.length}) ===`);
        appendLog('Режим: код + серверные правила + пересборка');

        try {
            const response = await fetch(`${apiBase}/api/deploy/update-tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantIds: selectedTenantIds }),
            });
            const payload = await response.json();
            const lines = splitOutput(payload?.output || 'Нет вывода');
            lines.forEach(appendLog);
            if (!response.ok || !payload?.success) {
                appendLog('❌ Обновление завершилось с ошибкой');
            } else {
                appendLog('✅ Обновление завершено');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка запроса';
            appendLog(`❌ ${message}`);
        } finally {
            setIsUpdateRunning(false);
        }
    };

    const renderTenantTable = (rows: TenantRow[], isArchive: boolean) => (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1.3fr_1.4fr_1.7fr_0.9fr_1fr_0.7fr_2fr] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                <div>Tenant ID</div>
                <div>Компания</div>
                <div>Домен</div>
                <div>Статус</div>
                <div>Создан</div>
                <div>Польз.</div>
                <div>Действия</div>
            </div>
            {rows.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500">Список пуст.</div>
            )}
            {rows.map(row => (
                <div
                    key={row.tenantId}
                    className="grid grid-cols-[1.3fr_1.4fr_1.7fr_0.9fr_1fr_0.7fr_2fr] px-4 py-3 border-t border-slate-100 text-sm items-center"
                >
                    <div className="font-semibold text-slate-800">{row.tenantId}</div>
                    <div className="text-slate-700">{row.companyName}</div>
                    <div className="text-indigo-700">{row.domain}</div>
                    <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge[row.status]}`}>
                            {statusLabel[row.status]}
                        </span>
                    </div>
                    <div className="text-slate-600">{row.createdAt}</div>
                    <div className="text-slate-700">{row.users ?? '—'}</div>
                    <div className="flex gap-2 flex-wrap">
                        {!isArchive && (
                            <button
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                                onClick={() => {
                                    window.location.href = `https://${row.tenantId}.teambuh.ru/?superadmin_mode=1&superadmin_tenant=${encodeURIComponent(row.tenantId)}`;
                                }}
                            >
                                Войти
                            </button>
                        )}
                        {isArchive && (
                            <div className="text-xs text-slate-500">Действия в разработке</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderRules = () => (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold text-slate-800">Системные налоговые правила</div>
                    <div className="text-sm text-slate-500">Список загружается из серверной эталонной БД template/data/global_data/rules.db.</div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                    + Добавить правило
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-500">Всего правил: {rules.length}</div>
                    <button
                        onClick={() => void loadSystemRules()}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                        Обновить список
                    </button>
                </div>
                {isLoadingRules && <div className="text-sm text-slate-500">Загрузка...</div>}
                {!isLoadingRules && rules.length === 0 && (
                    <div className="text-sm text-slate-500">Правила не найдены.</div>
                )}
                <div className="space-y-3">
                    {rules.map(rule => (
                        <div key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800">{rule.title || rule.id}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{rule.shortDescription || 'Без описания'}</p>
                                </div>
                                <button className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200">
                                    ✏️ Редактировать
                                </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{rule.periodicity || 'Без периода'}</span>
                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">source: {rule.source || 'system'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderUpdates = () => (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-base font-semibold text-slate-800">Код (эталон)</div>
                <div className="text-sm text-slate-500 mt-1">Запускает реальную попытку `git pull` на сервере.</div>
                <button
                    onClick={handlePullCode}
                    disabled={isUpdateRunning}
                    className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold ${
                        isUpdateRunning ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    Подтянуть код из Git в эталон
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-base font-semibold text-slate-800">Обновление клиентов (пересборка)</div>
                        <div className="text-sm text-slate-500 mt-1">
                            Обновляет выбранных активных клиентов: код + серверные правила + пересборка.
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSelectAll}
                            disabled={isUpdateRunning}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
                        >
                            Выбрать всех
                        </button>
                        <button
                            onClick={handleClearSelection}
                            disabled={isUpdateRunning}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
                        >
                            Снять выбор
                        </button>
                    </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-[0.4fr_1.2fr_1.6fr_0.8fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                        <div></div>
                        <div>Tenant ID</div>
                        <div>Домен</div>
                        <div>Статус</div>
                    </div>
                    {isLoadingTenants && <div className="px-3 py-3 text-sm text-slate-500">Загрузка...</div>}
                    {!isLoadingTenants && activeTenants.length === 0 && (
                        <div className="px-3 py-3 text-sm text-slate-500">Нет активных клиентов.</div>
                    )}
                    {activeTenants.map(t => (
                        <label
                            key={t.tenantId}
                            className="grid grid-cols-[0.4fr_1.2fr_1.6fr_0.8fr] px-3 py-2 border-t border-slate-100 text-sm items-center cursor-pointer"
                        >
                            <div>
                                <input
                                    type="checkbox"
                                    checked={selectedTenantIds.includes(t.tenantId)}
                                    onChange={() => handleSelectTenant(t.tenantId)}
                                    disabled={isUpdateRunning}
                                    className="accent-indigo-600"
                                />
                            </div>
                            <div className="font-medium text-slate-800">{t.tenantId}</div>
                            <div className="text-indigo-700">{t.domain}</div>
                            <div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge[t.status]}`}>
                                    {statusLabel[t.status]}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>

                <button
                    onClick={handleUpdateSelected}
                    disabled={isUpdateRunning || selectedTenantIds.length === 0}
                    className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold ${
                        isUpdateRunning || selectedTenantIds.length === 0
                            ? 'bg-slate-200 text-slate-400'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                    Обновить выбранных (код+правила+пересборка)
                </button>
            </div>

            {showUpdateLog && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                        <div className="text-sm font-semibold">Лог обновления</div>
                        <button
                            onClick={() => setShowUpdateLog(false)}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-xs font-semibold hover:bg-slate-600"
                        >
                            Закрыть
                        </button>
                    </div>
                    <div className="max-h-64 overflow-auto p-4 font-mono text-xs leading-5">
                        {updateLogLines.length === 0 && <div className="text-slate-400">Лог пуст.</div>}
                        {updateLogLines.map((line, idx) => (
                            <div key={`${line}-${idx}`}>{line}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSection = () => {
        if (section === 'tenants') return isLoadingTenants
            ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Загрузка...</div>
            : renderTenantTable(activeTenants, false);
        if (section === 'archive') return isLoadingTenants
            ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Загрузка...</div>
            : renderTenantTable(archivedTenants, true);
        if (section === 'rules') return renderRules();
        if (section === 'updates') return renderUpdates();
        if (section === 'audit') {
            return (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="text-lg font-semibold text-slate-800">Журнал действий</div>
                    <div className="text-sm text-slate-500 mt-1">Здесь будет аудит: входы, архивирование, удаление, сброс паролей, правки правил.</div>
                </div>
            );
        }
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-lg font-semibold text-slate-800">Настройки SuperAdmin</div>
                <div className="text-sm text-slate-500 mt-1">Здесь будут параметры сессии, 2FA, безопасность и лимиты.</div>
            </div>
        );
    };

    return (
        <div className="h-screen bg-slate-100 text-slate-900">
            <style>{`
                @keyframes saFadeSlide {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="h-full grid grid-cols-[290px_1fr]">
                <aside className="bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_50%,#0f172a_100%)] text-white p-5 flex flex-col">
                    <div className="mb-6">
                        <div className="text-2xl font-bold">TeamBuh</div>
                        <div className="text-indigo-200 text-sm">SuperAdmin</div>
                    </div>
                    <nav className="space-y-1">
                        {sections.map(s => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setSection(s.id);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                                    section === s.id
                                        ? 'bg-indigo-500 text-white'
                                        : 'text-indigo-100 hover:bg-white/10'
                                }`}
                            >
                                <div className="font-semibold">{s.label}</div>
                                <div className="text-xs opacity-80">{s.hint}</div>
                            </button>
                        ))}
                    </nav>
                    <div className="mt-auto text-xs text-indigo-200/80">
                        Данные подгружаются с сервера, без заглушек.
                    </div>
                </aside>

                <main className="p-6 overflow-auto">
                    <header className="mb-5">
                        <div className="text-2xl font-bold text-slate-800">{pageTitle}</div>
                        <div className="text-sm text-slate-500">Нажмите «Войти», чтобы открыть обычный интерфейс клиента в режиме SuperAdmin</div>
                    </header>

                    <section key={section} style={{ animation: 'saFadeSlide .22s ease' }}>
                        {renderSection()}
                    </section>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminPreview;
