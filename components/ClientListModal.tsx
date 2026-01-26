// components/ClientListModal.tsx
// Модальное окно со списком клиентов задачи

import React from 'react';

interface ClientItem {
    id: string;
    name: string;
}

interface ClientListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientClick: (clientId: string) => void;
    clients: ClientItem[];
    taskTitle: string;
}

export const ClientListModal: React.FC<ClientListModalProps> = ({
    isOpen,
    onClose,
    onClientClick,
    clients,
    taskTitle
}) => {
    if (!isOpen) return null;

    const handleClientClick = (clientId: string) => {
        onClientClick(clientId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">Клиенты</h3>
                    <p className="text-sm text-slate-500 mt-1 truncate">{taskTitle}</p>
                </div>

                {/* Список клиентов */}
                <div className="px-5 py-3">
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                        <div className="divide-y divide-slate-100">
                            {clients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleClientClick(client.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left group"
                                >
                                    {/* Иконка клиента */}
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm flex-shrink-0">
                                        🏢
                                    </div>
                                    {/* Название */}
                                    <span className="text-sm text-slate-700 flex-1 truncate group-hover:text-primary transition-colors">
                                        {client.name}
                                    </span>
                                    {/* Стрелка */}
                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientListModal;
