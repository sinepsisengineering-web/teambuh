// components/DashboardView.tsx
// Панель директора — Главная (без Персонал и Клиенты — они в сайдбаре)

import React, { useState } from 'react';
import { RulesView } from './RulesView';
import { ServicesView } from './ServicesView';

type DashboardTab = 'main' | 'finance' | 'references' | 'services';

interface TabConfig {
    id: DashboardTab;
    label: string;
    icon: React.ReactNode;
}

const tabs: TabConfig[] = [
    {
        id: 'main',
        label: 'Основное',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        )
    },
    {
        id: 'finance',
        label: 'Финансы',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        id: 'references',
        label: 'Справочники',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        )
    },
    {
        id: 'services',
        label: 'Услуги',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        )
    },
];

// Заглушка для контента
const TabPlaceholder: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">{title}</h2>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-sm rounded-full border border-amber-200">
            🚧 В разработке
        </span>
    </div>
);

const tabContent: Record<DashboardTab, string> = {
    main: 'Обзор',
    finance: 'Финансы',
    references: 'Справочники',
    services: 'Услуги',
};

export const DashboardView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<DashboardTab>('main');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'references':
                return <RulesView isSuperAdmin={true} isAdmin={true} />;
            case 'services':
                return <ServicesView />;
            default:
                return <TabPlaceholder title={tabContent[activeTab]} />;
        }
    };

    return (
        <div className="h-full flex flex-col -m-8">
            {/* Верхняя панель с вкладками */}
            <div className="bg-[linear-gradient(135deg,#1E1E3F_0%,#312e81_50%,#1E1E3F_100%)] px-6 py-3">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                                ${activeTab === tab.id
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:text-white hover:bg-white/10'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Контент */}
            <div className="flex-1 p-6 bg-slate-50 overflow-auto">
                {activeTab === 'references' || activeTab === 'services' ? (
                    // Справочники и Услуги — без общей рамки (свои рамки внутри)
                    <div className="h-full">
                        {renderTabContent()}
                    </div>
                ) : (
                    // Остальные вкладки — с общей рамкой
                    <div className="h-full bg-white rounded-xl border border-slate-200 p-6">
                        {renderTabContent()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardView;
