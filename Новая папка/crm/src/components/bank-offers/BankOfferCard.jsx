import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, Landmark, Pencil, Trash2, WalletCards } from 'lucide-react';

const STATUS_LABELS = {
  DRAFT: 'Қоралама',
  SUBMITTED: 'Тақдим этилган',
  SELECTED: 'Танланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
};

function amount(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`
    : String(value);
}

function term(months) {
  const value = Number(months);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const years = Math.floor(value / 12);
  const rest = value % 12;
  if (years && rest) return `${years} йил ${rest} ой`;
  return years ? `${years} йил` : `${rest} ой`;
}

function date(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
}

function statusClass(status) {
  if (status === 'SELECTED') return 'bank-offer-status-selected';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bank-offer-status-danger';
  if (status === 'DRAFT') return 'bank-offer-status-draft';
  return 'bank-offer-status-submitted';
}

export function BankOfferCard({ offer, busy, canManage, canSelect, canDelete, onEdit, onSelect, onDelete }) {
  const selected = offer.status === 'SELECTED';

  return (
    <article className={`bank-offer-card ${selected ? 'is-selected' : ''}`}>
      <div className="bank-offer-card-head">
        <div className="bank-offer-bank">
          <div className="bank-offer-icon"><Landmark size={21} /></div>
          <div>
            <strong>{offer.bankName}</strong>
            <span>{offer.bankEmployee?.fullName ? `Банк ходими: ${offer.bankEmployee.fullName}` : 'Банк ходими кўрсатилмаган'}</span>
          </div>
        </div>

        <span className={`bank-offer-status ${statusClass(offer.status)}`}>
          {selected ? <CheckCircle2 size={14} /> : null}
          {STATUS_LABELS[offer.status] || offer.status}
        </span>
      </div>

      <div className="bank-offer-primary">
        <div><span>Фоиз ставкаси</span><strong>{offer.interestRate ? `${Number(offer.interestRate)}%` : '—'}</strong></div>
        <div><span>Муддат</span><strong>{term(offer.termMonths)}</strong></div>
        <div><span>Тасдиқланган сумма</span><strong>{amount(offer.approvedAmount)}</strong></div>
      </div>

      <div className="bank-offer-secondary">
        <div><WalletCards size={16} /><span>Бошланғич тўлов</span><strong>{amount(offer.initialPayment)}</strong></div>
        <div><WalletCards size={16} /><span>Ойлик тўлов</span><strong>{amount(offer.monthlyPayment)}</strong></div>
        <div><Clock3 size={16} /><span>Комиссия</span><strong>{amount(offer.commissionAmount)}</strong></div>
        <div><CalendarDays size={16} /><span>Амал қилиш санаси</span><strong>{date(offer.validUntil)}</strong></div>
      </div>

      {offer.conditions ? <div className="bank-offer-note"><strong>Шартлар</strong><span>{offer.conditions}</span></div> : null}
      {offer.rejectionReason ? <div className="bank-offer-rejection"><strong>Рад этиш сабаби</strong><span>{offer.rejectionReason}</span></div> : null}

      <div className="bank-offer-actions">
        {canManage ? <button type="button" className="bank-offer-action secondary" onClick={() => onEdit(offer)} disabled={busy}><Pencil size={15} />Таҳрирлаш</button> : null}
        {canSelect && !selected && !['REJECTED', 'CANCELLED'].includes(offer.status) ? (
          <button type="button" className="bank-offer-action primary-action" onClick={() => onSelect(offer)} disabled={busy || !offer.approvedAmount}>
            <CheckCircle2 size={15} />Танлаш
          </button>
        ) : null}
        {canDelete && !selected ? <button type="button" className="bank-offer-action danger" onClick={() => onDelete(offer)} disabled={busy}><Trash2 size={15} />Ўчириш</button> : null}
      </div>
    </article>
  );
}
