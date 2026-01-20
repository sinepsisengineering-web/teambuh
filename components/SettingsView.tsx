import React from 'react';

export const SettingsView: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Настройки</h1>

      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="text-center text-slate-500">
          <svg
            className="w-16 h-16 mx-auto text-slate-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>

          <h2 className="text-lg font-medium text-slate-700 mb-2">
            Настройки в разработке
          </h2>

          <p className="text-slate-400">
            Здесь будут настройки синхронизации, профиля и уведомлений
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;