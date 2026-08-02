import React, { useEffect, useState } from 'react';
import { LoaderCircle, Save, X } from 'lucide-react';

const EMPTY = {
  bankName: '', status: 'SUBMITTED', interestRate: '', termMonths: '',
  approvedAmount: '', initialPayment: '', monthlyPayment: '',
  insuranceAmount: '', commissionAmount: '', validUntil: '',
  conditions: '', rejectionReason: '',
};

function toForm(offer) {
  if (!offer) return EMPTY;
  return {
    bankName: offer.bankName || '',
    status: offer.status === 'SELECTED' ? 'SUBMITTED' : offer.status || 'SUBMITTED',
    interestRate: offer.interestRate ?? '',
    termMonths: offer.termMonths ?? '',
    approvedAmount: offer.approvedAmount ?? '',
    initialPayment: offer.initialPayment ?? '',
    monthlyPayment: offer.monthlyPayment ?? '',
    insuranceAmount: offer.insuranceAmount ?? '',
    commissionAmount: offer.commissionAmount ?? '',
    validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 10) : '',
    conditions: offer.conditions || '',
    rejectionReason: offer.rejectionReason || '',
  };
}

export function BankOfferModal({ open, offer, saving, error, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { if (open) setForm(toForm(offer)); }, [open, offer]);
  useEffect(() => {
    if (!open) return;
    const esc = (event) => { if (event.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, saving, onClose]);

  if (!open) return null;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="bank-offer-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="bank-offer-modal" role="dialog" aria-modal="true">
        <div className="bank-offer-modal-head">
          <div><span>{offer ? 'Банк таклифини таҳрирлаш' : 'Янги банк таклифи'}</span><h3>{offer ? offer.bankName : 'Таклиф маълумотларини киритинг'}</h3></div>
          <button type="button" onClick={onClose} disabled={saving}><X size={20} /></button>
        </div>

        <form className="bank-offer-form" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <div className="bank-offer-form-grid">
            <label className="bank-offer-field bank-offer-field-wide"><span>Банк номи *</span><input value={form.bankName} onChange={(e) => update('bankName', e.target.value)} required autoFocus disabled={saving} /></label>
            <label className="bank-offer-field"><span>Ҳолати</span><select value={form.status} onChange={(e) => update('status', e.target.value)} disabled={saving}><option value="DRAFT">Қоралама</option><option value="SUBMITTED">Тақдим этилган</option><option value="REJECTED">Рад этилган</option><option value="CANCELLED">Бекор қилинган</option></select></label>
            <label className="bank-offer-field"><span>Фоиз ставкаси</span><input value={form.interestRate} onChange={(e) => update('interestRate', e.target.value)} inputMode="decimal" /></label>
            <label className="bank-offer-field"><span>Муддат, ой</span><input value={form.termMonths} onChange={(e) => update('termMonths', e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Тасдиқланган сумма</span><input value={form.approvedAmount} onChange={(e) => update('approvedAmount', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Бошланғич тўлов</span><input value={form.initialPayment} onChange={(e) => update('initialPayment', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Ойлик тўлов</span><input value={form.monthlyPayment} onChange={(e) => update('monthlyPayment', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Суғурта суммаси</span><input value={form.insuranceAmount} onChange={(e) => update('insuranceAmount', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Комиссия суммаси</span><input value={form.commissionAmount} onChange={(e) => update('commissionAmount', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" /></label>
            <label className="bank-offer-field"><span>Амал қилиш санаси</span><input type="date" value={form.validUntil} onChange={(e) => update('validUntil', e.target.value)} /></label>
            <label className="bank-offer-field bank-offer-field-wide"><span>Шартлар</span><textarea rows={3} value={form.conditions} onChange={(e) => update('conditions', e.target.value)} /></label>
            {form.status === 'REJECTED' ? <label className="bank-offer-field bank-offer-field-wide"><span>Рад этиш сабаби</span><textarea rows={3} value={form.rejectionReason} onChange={(e) => update('rejectionReason', e.target.value)} /></label> : null}
          </div>

          {error ? <div className="bank-offer-form-error">{error}</div> : null}

          <div className="bank-offer-modal-actions">
            <button type="button" className="bank-offer-cancel" onClick={onClose} disabled={saving}>Бекор қилиш</button>
            <button type="submit" className="bank-offer-save" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} />Сақланмоқда...</> : <><Save size={16} />Сақлаш</>}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
