// components/ClientForm.tsx

import React, { useState, useEffect } from 'react';
import { LegalEntity, LegalForm, TaxSystem } from '../types';
import { LegalEntityForm } from './LegalEntityForm';

interface ClientFormProps {
  legalEntity: LegalEntity | null;
  onSave: (entity: LegalEntity) => void;
  onCancel: () => void;
}

const createNewLegalEntity = (): LegalEntity => ({
  id: `le-${Date.now()}-${Math.random()}`,
  name: '',
  legalForm: LegalForm.OOO,
  inn: '',
  kpp: '',
  ogrn: '',
  ogrnDate: undefined,
  legalAddress: '',
  actualAddress: '',
  contactPerson: '',
  phone: '',
  email: '',
  taxSystem: TaxSystem.USN_DOHODY,
  isNdsPayer: false,
  ndsValue: '',
  hasEmployees: false,
  // ==================== ИСПРАВЛЕНИЕ ТИПА ====================
  notes: [], // Было: '', Стало: [] (пустой массив)
  // =========================================================
  credentials: [],
  patents: [],
});

export const ClientForm: React.FC<ClientFormProps> = ({ legalEntity, onSave, onCancel }) => {
  const [formData, setFormData] = useState<LegalEntity>(createNewLegalEntity());

  useEffect(() => {
    if (legalEntity) {
      setFormData(legalEntity);
    } else {
      setFormData(createNewLegalEntity());
    }
  }, [legalEntity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.inn.trim()) {
        window.electronAPI.showNotification(
          'Ошибка валидации', 
          'Пожалуйста, введите наименование и ИНН.'
        );
        return;
    }

    onSave({ ...formData, id: legalEntity?.id || formData.id });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <LegalEntityForm
            legalEntity={formData}
            onChange={(updated) => setFormData(updated)}
        />
      </div>
        
      <div className="pt-4 flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
      </div>
    </form>
  );
};