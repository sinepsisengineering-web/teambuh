// components/LegalEntityEditForm.tsx

import React, { useState } from 'react';
import { LegalEntity, Credential, TaxSystem, LegalForm, Patent } from '../types';
import { PROFIT_ADVANCE_OPTIONS } from '../constants/dictionaries';

const toInputDateString = (date?: Date | string): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

interface LegalEntityEditFormProps {
    legalEntity: LegalEntity;
    onSave: (updatedLegalEntity: LegalEntity) => void;
    onCancel: () => void;
}

export const LegalEntityEditForm: React.FC<LegalEntityEditFormProps> = ({ legalEntity, onSave, onCancel }) => {
    const [formData, setFormData] = useState<LegalEntity>(legalEntity);
    // Состояние для переключения видимости паролей: { [credentialId]: boolean }
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    const availableTaxSystems = formData.legalForm === LegalForm.IP
        ? [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY, TaxSystem.PATENT]
        : [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        if (name === "legalForm") {
            if (value !== LegalForm.IP) newFormData.patents = [];
            const currentTaxSystemIsValid = value === LegalForm.IP ? true : newFormData.taxSystem !== TaxSystem.PATENT;
            if (!currentTaxSystemIsValid) newFormData.taxSystem = TaxSystem.OSNO;
        }
        if (name === "taxSystem") {
            if (value === TaxSystem.OSNO) newFormData.isNdsPayer = true;
            else if (formData.taxSystem === TaxSystem.OSNO) {
                newFormData.isNdsPayer = false;
                newFormData.ndsValue = '';
            }
        }
        setFormData(newFormData);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        const updatedEntity = { ...formData, [name]: checked };
        if (name === 'isNdsPayer' && !checked) updatedEntity.ndsValue = '';
        setFormData(updatedEntity);
    };

    // --- Logic for Patents ---
    const handlePatentChange = (index: number, field: keyof Omit<Patent, 'id'>, value: string | boolean) => {
        const newPatents = [...(formData.patents || [])];
        const patentToUpdate = { ...newPatents[index] };
        (patentToUpdate as any)[field] = value;
        newPatents[index] = patentToUpdate;
        setFormData(prev => ({ ...prev, patents: newPatents }));
    };

    const addPatent = () => {
        const newPatent: Patent = { id: `patent-${Date.now()}`, name: '', startDate: '', endDate: '', autoRenew: false };
        setFormData(prev => ({ ...prev, patents: [...(prev.patents || []), newPatent] }));
    };

    const removePatent = (index: number) => {
        const newPatents = (formData.patents || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, patents: newPatents }));
    };

    // --- Logic for Credentials ---
    const handleCredentialChange = (index: number, field: keyof Credential, value: string) => {
        const newCredentials = [...(formData.credentials || [])];
        newCredentials[index] = { ...newCredentials[index], [field]: value };
        setFormData(prev => ({ ...prev, credentials: newCredentials }));
    };

    const addCredential = () => {
        const newCredential: Credential = { id: `cred-${Date.now()}`, service: '', login: '', password: '' };
        setFormData(prev => ({ ...prev, credentials: [...(prev.credentials || []), newCredential] }));
    };

    const removeCredential = (index: number) => {
        const newCredentials = (formData.credentials || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, credentials: newCredentials }));
    };

    // Переключение видимости пароля
    const togglePasswordVisibility = (credId: string) => {
        setVisiblePasswords(prev => ({ ...prev, [credId]: !prev[credId] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const showNdsCheckbox = formData.taxSystem !== TaxSystem.OSNO;
    const showNdsValueInput = formData.isNdsPayer;
    const showPatentsBlock = formData.legalForm === LegalForm.IP;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700">Тип</label>
                    <select name="legalForm" value={formData.legalForm} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                        {Object.values(LegalForm).map(form => <option key={form} value={form}>{form}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Наименование / ФИО (без типа)</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-slate-700">ИНН</label><input name="inn" value={formData.inn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700">КПП</label><input name="kpp" value={formData.kpp || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700">ОГРН / ОГРНИП</label><input name="ogrn" value={formData.ogrn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700">Дата ОГРН</label><input type="date" name="ogrnDate" value={toInputDateString(formData.ogrnDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Юридический адрес</label><input name="legalAddress" value={formData.legalAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Фактический адрес</label><input name="actualAddress" value={formData.actualAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700">Контактное лицо</label><input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div><label className="block text-sm font-medium text-slate-700">Телефон</label><input name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Email</label><input name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900" /></div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">Основная система налогообложения</label>
                <select name="taxSystem" value={formData.taxSystem} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                    {availableTaxSystems.map(system => <option key={system} value={system}>{system}</option>)}
                </select>
            </div>

            {/* Налоговые настройки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showNdsCheckbox && (
                    <div className="flex items-center">
                        <input id={`isNdsPayer-${formData.id}`} name="isNdsPayer" type="checkbox" checked={formData.isNdsPayer} onChange={handleCheckboxChange} className="h-4 w-4 rounded" />
                        <label htmlFor={`isNdsPayer-${formData.id}`} className="ml-2 block text-sm">Плательщик НДС</label>
                    </div>
                )}
                {formData.isNdsPayer && (
                    <div className="flex items-center">
                        <input id={`isNdsExempt-${formData.id}`} name="isNdsExempt" type="checkbox" checked={formData.isNdsExempt || false} onChange={handleCheckboxChange} className="h-4 w-4 rounded" />
                        <label htmlFor={`isNdsExempt-${formData.id}`} className="ml-2 block text-sm text-amber-700">Освобождён от НДС (ст.145)</label>
                    </div>
                )}
                {showNdsValueInput && (
                    <div>
                        <label htmlFor={`ndsValue-${formData.id}`} className="text-sm">Ставка НДС</label>
                        <input id={`ndsValue-${formData.id}`} name="ndsValue" type="text" value={formData.ndsValue || ''} onChange={handleChange} placeholder="10 или 20" className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                )}
            </div>

            {/* Сотрудники */}
            <div className="flex items-center gap-6">
                <div className="flex items-center">
                    <input id={`hasEmployees-${formData.id}`} name="hasEmployees" type="checkbox" checked={formData.hasEmployees} onChange={handleCheckboxChange} className="h-4 w-4 rounded" />
                    <label htmlFor={`hasEmployees-${formData.id}`} className="ml-2 block text-sm">Есть наемные сотрудники</label>
                </div>
                {formData.hasEmployees && (
                    <div>
                        <input name="employeeCount" type="number" min="1" value={formData.employeeCount || ''} onChange={handleChange} placeholder="Кол-во" className="w-24 px-3 py-2 border rounded-md text-sm" />
                    </div>
                )}
            </div>

            {/* Авансы по прибыли (для ООО/АО на ОСНО) */}
            {(formData.legalForm !== LegalForm.IP && formData.taxSystem === TaxSystem.OSNO) && (
                <div>
                    <label className="block text-sm font-medium text-slate-700">Авансы по налогу на прибыль</label>
                    <select name="profitAdvancePeriodicity" value={formData.profitAdvancePeriodicity || 'quarterly'} onChange={handleChange} className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                        {PROFIT_ADVANCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )}

            {/* Совмещение режимов (только ИП) */}
            {formData.legalForm === LegalForm.IP && (
                <div className="border rounded-md p-4 bg-slate-50">
                    <div className="flex items-center mb-3">
                        <input id={`hasCombinedRegime-${formData.id}`} name="hasCombinedRegime" type="checkbox" checked={formData.hasCombinedRegime || false} onChange={handleCheckboxChange} className="h-4 w-4 rounded" />
                        <label htmlFor={`hasCombinedRegime-${formData.id}`} className="ml-2 block text-sm font-medium">Совмещает режимы налогообложения</label>
                    </div>
                    {formData.hasCombinedRegime && (
                        <div>
                            <label className="block text-sm text-slate-600 mb-2">Совмещает с:</label>
                            <div className="flex flex-wrap gap-3">
                                {COMBINED_REGIME_OPTIONS.filter(r => r.value !== formData.taxSystem).map(regime => (
                                    <label key={regime.value} className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            checked={(formData.combinedWith || []).includes(regime.value)}
                                            onChange={(e) => {
                                                const current = formData.combinedWith || [];
                                                setFormData(prev => ({
                                                    ...prev,
                                                    combinedWith: e.target.checked
                                                        ? [...current, regime.value]
                                                        : current.filter(v => v !== regime.value)
                                                }));
                                            }}
                                            className="h-4 w-4 rounded mr-2"
                                        />
                                        {regime.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Секция Патентов */}
            {showPatentsBlock && (
                <div className="border-t pt-4 mt-6">
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Патенты</h3>
                    <div className="space-y-4">
                        {formData.patents && formData.patents.map((patent, index) => (
                            <div key={patent.id || index} className="p-4 bg-slate-50 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700">Название патента</label>
                                    <input type="text" value={patent.name} onChange={(e) => handlePatentChange(index, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Дата начала</label>
                                    <input type="date" value={toInputDateString(patent.startDate)} onChange={(e) => handlePatentChange(index, 'startDate', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Дата окончания</label>
                                    <input type="date" value={toInputDateString(patent.endDate)} onChange={(e) => handlePatentChange(index, 'endDate', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <button type="button" onClick={() => removePatent(index)} className="text-sm text-red-600 hover:text-red-800">Удалить патент</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addPatent} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Добавить патент</button>
                    </div>
                </div>
            )}

            {/* Секция Учетных данных (Credentials) */}
            <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Учетные данные</h3>
                <div className="space-y-4">
                    {formData.credentials && formData.credentials.map((cred, index) => (
                        <div key={cred.id || index} className="p-4 bg-slate-50 border rounded-md space-y-3 relative">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Сервис / Сайт</label>
                                <input type="text" value={cred.service} onChange={(e) => handleCredentialChange(index, 'service', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Например: СБИС" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Логин</label>
                                    <input type="text" value={cred.login} onChange={(e) => handleCredentialChange(index, 'login', e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Пароль</label>
                                    <div className="relative mt-1">
                                        <input
                                            type={visiblePasswords[cred.id] ? "text" : "password"}
                                            value={cred.password}
                                            onChange={(e) => handleCredentialChange(index, 'password', e.target.value)}
                                            className="block w-full px-3 py-2 border rounded-md pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility(cred.id)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                                            tabIndex={-1} // Чтобы не фокусироваться при переходе Tab-ом
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
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => removeCredential(index)} className="text-sm text-red-600 hover:text-red-800">Удалить</button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addCredential} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Добавить учетные данные</button>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
            </div>
        </form>
    );
};