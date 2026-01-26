import React from 'react';
import { useAuth } from '../contexts/AuthContext';

type View = 'dashboard' | 'calendar' | 'tasks' | 'clients' | 'staff' | 'archive' | 'settings';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
    label: string;
    view?: View;
    activeView?: View;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, view, activeView, onClick, children }) => {
    const isActive = view && activeView === view;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${isActive
                ? 'bg-sidebar-active text-white shadow-md'
                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                }`}
        >
            {children}
            <span className="font-medium">{label}</span>
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    const { logout, user } = useAuth();

    return (
        <aside className="w-64 bg-[linear-gradient(135deg,#1E1E3F_0%,#312e81_50%,#1E1E3F_100%)] text-white p-4 flex flex-col flex-shrink-0 h-screen">
            {/* Логотип */}
            <div className="mb-8 px-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">TeamBuh</h1>
                {user && (
                    <p className="text-white/60 text-sm mt-1 truncate">{user.email}</p>
                )}
            </div>

            {/* Основная навигация */}
            <nav className="flex flex-col gap-1 flex-1">
                <NavItem label="Главная" view="dashboard" activeView={activeView} onClick={() => setActiveView('dashboard')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </NavItem>
                <NavItem label="Календарь" view="calendar" activeView={activeView} onClick={() => setActiveView('calendar')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </NavItem>
                <NavItem label="Задачи" view="tasks" activeView={activeView} onClick={() => setActiveView('tasks')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </NavItem>
                <NavItem label="Клиенты" view="clients" activeView={activeView} onClick={() => setActiveView('clients')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </NavItem>
                <NavItem label="Персонал" view="staff" activeView={activeView} onClick={() => setActiveView('staff')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </NavItem>
                <NavItem label="Архив" view="archive" activeView={activeView} onClick={() => setActiveView('archive')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                </NavItem>
            </nav>

            {/* Нижняя секция */}
            <div className="border-t border-white/10 pt-4 mt-4 flex flex-col gap-1">
                <NavItem label="Настройки" view="settings" activeView={activeView} onClick={() => setActiveView('settings')}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </NavItem>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-red-400 hover:bg-red-500/20 hover:text-red-300"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Выйти</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;