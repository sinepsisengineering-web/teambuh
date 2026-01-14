// components/LegalEntityForm.tsx

import React, { useState } from 'react';
import { LegalEntity, Credential, TaxSystem, LegalForm, Patent } from '../types';

// Вспомогательные функции для работы с датами
const toInputDateString = (date?: Date | string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};
const getMaxDateString = (): string => `${new Date().getFullYear() + 10}-12-31`;

// Функция для форматирования телефона в формат +7 (XXX) XXX-XX-XX
const formatPhoneNumber = (value: string): string => {
  // Извлекаем только цифры
  const digits = value.replace(/\D/g, '');

  // Убираем лидирующую 8 или 7, если есть
  let cleanDigits = digits;
  if (cleanDigits.startsWith('8') || cleanDigits.startsWith('7')) {
    cleanDigits = cleanDigits.slice(1);
  }

  // Ограничиваем до 10 цифр
  cleanDigits = cleanDigits.slice(0, 10);

  // Форматируем
  if (cleanDigits.length === 0) return '';
  if (cleanDigits.length <= 3) return `+7 (${cleanDigits}`;
  if (cleanDigits.length <= 6) return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3)}`;
  if (cleanDigits.length <= 8) return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6)}`;
  return `+7 (${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6, 8)}-${cleanDigits.slice(8, 10)}`;
};

// Функция для фильтрации только цифр
const onlyDigits = (value: string): string => value.replace(/\D/g, '');

interface LegalEntityFormProps {
  legalEntity: LegalEntity;
  onChange: (updatedLegalEntity: LegalEntity) => void;
  onRemove?: () => void;
}

export const LegalEntityForm: React.FC<LegalEntityFormProps> = ({ legalEntity, onChange, onRemove }) => {
  // === НОВОЕ СОСТОЯНИЕ: Видимость паролей ===
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const availableTaxSystems = legalEntity.legalForm === LegalForm.IP
    ? [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY, TaxSystem.PATENT]
    : [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newLegalEntity = { ...legalEntity, [name]: value };

    if (name === "legalForm") {
      if (value !== LegalForm.IP) {
        newLegalEntity.patents = [];
      }
      const currentTaxSystemIsValid = value === LegalForm.IP ? true : newLegalEntity.taxSystem !== TaxSystem.PATENT;
      if (!currentTaxSystemIsValid) {
        newLegalEntity.taxSystem = TaxSystem.OSNO;
      }
    }

    if (name === "taxSystem") {
      if (value === TaxSystem.OSNO) {
        newLegalEntity.isNdsPayer = true;
      } else if (legalEntity.taxSystem === TaxSystem.OSNO) {
        newLegalEntity.isNdsPayer = false;
        newLegalEntity.ndsValue = '';
      }
    }

    onChange(newLegalEntity);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const updatedEntity = { ...legalEntity, [name]: checked };
    if (name === 'isNdsPayer' && !checked) {
      updatedEntity.ndsValue = '';
    }
    onChange(updatedEntity);
  };

  const handlePatentChange = (index: number, field: keyof Omit<Patent, 'id'>, value: string | boolean) => {
    const newPatents = [...(legalEntity.patents || [])];
    const patentToUpdate = { ...newPatents[index] };
    (patentToUpdate as any)[field] = value;
    newPatents[index] = patentToUpdate;
    onChange({ ...legalEntity, patents: newPatents });
  };

  const addPatent = () => {
    const newPatent: Patent = { id: `patent-${Date.now()}`, name: '', startDate: '', endDate: '', autoRenew: false };
    onChange({ ...legalEntity, patents: [...(legalEntity.patents || []), newPatent] });
  };

  const removePatent = (index: number) => {
    const newPatents = (legalEntity.patents || []).filter((_, i) => i !== index);
    onChange({ ...legalEntity, patents: newPatents });
  };

  const handleCredentialChange = (index: number, field: keyof Credential, value: string) => {
    const newCredentials = [...(legalEntity.credentials || [])];
    newCredentials[index] = { ...newCredentials[index], [field]: value };
    onChange({ ...legalEntity, credentials: newCredentials });
  };

  const addCredential = () => {
    const newCredential: Credential = { id: `cred-${Date.now()}`, service: '', login: '', password: '' };
    onChange({ ...legalEntity, credentials: [...(legalEntity.credentials || []), newCredential] });
  };

  const removeCredential = (index: number) => {
    const newCredentials = (legalEntity.credentials || []).filter((_, i) => i !== index);
    onChange({ ...legalEntity, credentials: newCredentials });
  };

  // === НОВАЯ ФУНКЦИЯ: Переключение видимости пароля ===
  const togglePasswordVisibility = (credId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [credId]: !prev[credId] }));
  };

  const showNdsCheckbox = legalEntity.taxSystem !== TaxSystem.OSNO;
  const showNdsValueInput = legalEntity.isNdsPayer;
  const showPatentsBlock = legalEntity.legalForm === LegalForm.IP;

  return (
    <div className="space-y-6 p-6 border border-slate-200 rounded-lg bg-slate-50 relative shadow-sm">
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 transition-colors" title="Удалить это юрлицо">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-slate-700">Тип</label>
          <select name="legalForm" value={legalEntity.legalForm} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
            {Object.values(LegalForm).map(form => <option key={form} value={form}>{form}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Наименование / ФИО (без типа)</label>
          <input type="text" name="name" value={legalEntity.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">ИНН</label>
          <input
            name="inn"
            value={legalEntity.inn}
            onChange={(e) => onChange({ ...legalEntity, inn: onlyDigits(e.target.value).slice(0, 12) })}
            maxLength={12}
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">КПП</label>
          <input
            name="kpp"
            value={legalEntity.kpp || ''}
            onChange={(e) => onChange({ ...legalEntity, kpp: onlyDigits(e.target.value).slice(0, 9) })}
            maxLength={9}
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">ОГРН / ОГРНИП</label>
          <input
            name="ogrn"
            value={legalEntity.ogrn}
            onChange={(e) => onChange({ ...legalEntity, ogrn: onlyDigits(e.target.value).slice(0, 15) })}
            maxLength={15}
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
          />
        </div>
        <div><label className="block text-sm font-medium text-slate-700">Дата ОГРН</label><input type="date" name="ogrnDate" value={toInputDateString(legalEntity.ogrnDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Юридический адрес</label><input name="legalAddress" value={legalEntity.legalAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Фактический адрес</label><input name="actualAddress" value={legalEntity.actualAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
        <div><label className="block text-sm font-medium text-slate-700">Контактное лицо</label><input name="contactPerson" value={legalEntity.contactPerson} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Телефон</label>
          <input
            name="phone"
            value={legalEntity.phone}
            onChange={(e) => onChange({ ...legalEntity, phone: formatPhoneNumber(e.target.value) })}
            placeholder="+7 (___) ___-__-__"
            inputMode="tel"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            value={legalEntity.email}
            onChange={handleChange}
            pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            title="Введите корректный email (например: example@mail.ru)"
            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md text-slate-900 ${legalEntity.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(legalEntity.email)
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300'
              }`}
          />
          {legalEntity.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(legalEntity.email) && (
            <p className="mt-1 text-sm text-red-600">Некорректный формат email (должен быть: example@mail.ru)</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Основная система налогообложения</label>
        <select name="taxSystem" value={legalEntity.taxSystem} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
          {availableTaxSystems.map(system => <option key={system} value={system}>{system}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-6">
        {showNdsCheckbox && (
          <div className="flex items-center">
            <input id={`isNdsPayer-${legalEntity.id}`} name="isNdsPayer" type="checkbox" checked={legalEntity.isNdsPayer} onChange={handleCheckboxChange} className="h-4 w-4 bg-white text-slate-900 rounded border-slate-400 focus:ring-slate-500" />
            <label htmlFor={`isNdsPayer-${legalEntity.id}`} className="ml-2 block text-sm text-slate-900">Плательщик НДС</label>
          </div>
        )}
        {showNdsValueInput && (
          <div>
            <label htmlFor={`ndsValue-${legalEntity.id}`} className="text-sm font-medium text-slate-700">Ставка НДС (если требуется)</label>
            <input id={`ndsValue-${legalEntity.id}`} name="ndsValue" type="text" value={legalEntity.ndsValue || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" />
          </div>
        )}
      </div>

      <div className="flex items-center">
        <input id={`hasEmployees-${legalEntity.id}`} name="hasEmployees" type="checkbox" checked={legalEntity.hasEmployees} onChange={handleCheckboxChange} className="h-4 w-4 bg-white text-slate-900 rounded border-slate-400 focus:ring-slate-500" />
        <label htmlFor={`hasEmployees-${legalEntity.id}`} className="ml-2 block text-sm text-slate-900">Есть наемные сотрудники</label>
      </div>

      {showPatentsBlock && (
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Патенты</h3>
          <div className="space-y-3">
            {(legalEntity.patents || []).map((patent, index) => (
              <div key={patent.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-100 rounded-md">
                <div className="col-span-12 sm:col-span-4"><label className="text-xs text-slate-500">Название</label><input type="text" value={patent.name} onChange={(e) => handlePatentChange(index, 'name', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="col-span-6 sm:col-span-3"><label className="text-xs text-slate-500">Дата начала</label><input type="date" value={toInputDateString(patent.startDate)} max={getMaxDateString()} onChange={(e) => handlePatentChange(index, 'startDate', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="col-span-6 sm:col-span-3"><label className="text-xs text-slate-500">Дата окончания</label><input type="date" value={toInputDateString(patent.endDate)} max={getMaxDateString()} onChange={(e) => handlePatentChange(index, 'endDate', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="col-span-10 sm:col-span-1 flex items-center justify-center pt-5"><input type="checkbox" checked={patent.autoRenew} onChange={(e) => handlePatentChange(index, 'autoRenew', e.target.checked)} title="Автопродление" className="h-5 w-5 bg-white rounded border-slate-400" /></div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-center pt-5">
                  <button type="button" onClick={() => removePatent(index)} className="p-2 text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPatent} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Добавить патент</button>
        </div>
      )}

      {/* === ОБНОВЛЕННЫЙ БЛОК CREDENTIALS === */}
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Логины и пароли</h3>
        <div className="space-y-2">
          {(legalEntity.credentials || []).map((cred, index) => (
            <div key={cred.id} className="grid grid-cols-10 gap-2 items-center">
              <input type="text" placeholder="Сервис (ФНС, Госуслуги...)" value={cred.service} onChange={(e) => handleCredentialChange(index, 'service', e.target.value)} className="col-span-3 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" />
              <input type="text" placeholder="Логин" value={cred.login} onChange={(e) => handleCredentialChange(index, 'login', e.target.value)} className="col-span-3 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" />

              <div className="col-span-3 relative">
                <input
                  type={visiblePasswords[cred.id] ? "text" : "password"}
                  placeholder="Пароль"
                  value={cred.password || ''}
                  onChange={(e) => handleCredentialChange(index, 'password', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(cred.id)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {visiblePasswords[cred.id] ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <button type="button" onClick={() => removeCredential(index)} className="p-2 text-red-500 hover:text-red-700 justify-self-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCredential} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Добавить доступ</button>
      </div>
    </div>
  );
};