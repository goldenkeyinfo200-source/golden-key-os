import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Landmark,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

import { apiRequest, USER_KEY } from '../../services/api.js';

const CREATE = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'BANK_EMPLOYEE',
];

const UPDATE = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
  'BANK_EMPLOYEE',
];

const SELECT = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
  'RECEPTION_MANAGER',
];

const DELETE = [
  'SUPER_ADMIN',
  'DIRECTOR',
  'BRANCH_MANAGER',
];

const EMPTY_FORM = {
  bankName: '',
  status: 'SUBMITTED',
  interestRate: '',
  termMonths: '',
  approvedAmount: '',
  initialPayment: '',
  monthlyPayment: '',
  insuranceAmount: '',
  commissionAmount: '',
  validUntil: '',
  conditions: '',
  rejectionReason: '',
};

const STATUS_LABELS = {
  DRAFT: 'Қоралама',
  SUBMITTED: 'Тақдим этилган',
  SELECTED: 'Танланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
};

function currentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

function formatTerm(months) {
  const value = Number(months);

  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }

  if (value % 12 === 0) {
    return `${value / 12} йил`;
  }

  return `${value} ой`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}


function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function bestOfferIds(offers) {
  const active = offers.filter(
    (offer) =>
      !['REJECTED', 'CANCELLED'].includes(offer.status) &&
      numericValue(offer.approvedAmount) !== null
  );

  if (!active.length) {
    return {
      maxAmount: '',
      minRate: '',
      minMonthly: '',
      minInitial: '',
    };
  }

  const pick = (field, mode) => {
    const candidates = active.filter(
      (offer) => numericValue(offer[field]) !== null
    );

    if (!candidates.length) return '';

    return candidates.reduce((best, current) => {
      const bestValue = numericValue(best[field]);
      const currentValue = numericValue(current[field]);

      if (mode === 'max') {
        return currentValue > bestValue ? current : best;
      }

      return currentValue < bestValue ? current : best;
    }).id;
  };

  return {
    maxAmount: pick('approvedAmount', 'max'),
    minRate: pick('interestRate', 'min'),
    minMonthly: pick('monthlyPayment', 'min'),
    minInitial: pick('initialPayment', 'min'),
  };
}

function makePayload(form) {
  const data = {
    ...form,
    bankName: form.bankName.trim(),
    conditions: form.conditions.trim(),
    rejectionReason: form.rejectionReason.trim(),
  };

  for (const key of [
    'interestRate',
    'termMonths',
    'approvedAmount',
    'initialPayment',
    'monthlyPayment',
    'insuranceAmount',
    'commissionAmount',
    'validUntil',
    'conditions',
    'rejectionReason',
  ]) {
    if (data[key] === '') {
      data[key] = null;
    }
  }

  return data;
}

// Тасдиқланган сумма — кредитнинг асосий қарзи. Бошланғич тўлов қайта айирилмайди.
// Банкнинг индивидуал ҳисоблаш/яхлитлаш қоидалари натижани ўзгартириши мумкин.
const GRACE_TAG = '[GK_GRACE_V1]';
function readGrace(conditions = '') {
  const raw = String(conditions || '');
  // Илгариги ва янги таклифларда тег икки хил ёзилган бўлиши мумкин.
  // JSON матнини мижозга кўрсатмасдан, алоҳида маълумот сифатида ажратамиз.
  const match = raw.match(/\[?GK_GRACE_V1\]?\s*(\{[^\r\n]*\})/);
  let settings = {
    enabled: false, months: '12', timing: 'WITHIN',
    payment: 'INTEREST_ONLY', interestHandling: 'ACCRUE',
  };
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        settings = { ...settings, ...data };
      }
    } catch { /* Нотўғри форматдаги эски маълумот ўзгартирилмайди */ }
  }
  const plain = match ? raw.replace(match[0], '') : raw;
  return { settings, text: plain.replace(/^(?:\s*\\n|\s*\n)+|(?:\s*\\n|\s*\n)+$/g, '').trim(), hasGrace: Boolean(match) };
}
function writeGrace(conditions, settings, paymentType) {
  const plain = readGrace(conditions).text;
  const meta = `${GRACE_TAG}${JSON.stringify({ ...settings, paymentType })}`;
  return [plain, meta].filter(Boolean).join('\n');
}
function GraceConditions({ conditions }) {
  const { settings, text, hasGrace } = readGrace(conditions);
  if (!text && !hasGrace) return null;
  const paymentType = settings.paymentType === 'DIFFERENTIATED'
    ? 'Дифференциал' : 'Аннуитет';
  return (
    <div className="gk-bank-conditions">
      <strong>Шартлар</strong>
      {text ? <p>{text}</p> : null}
      {hasGrace ? (
        <div className="gk-grace-summary">
          <strong>Имтиёзли давр: {settings.enabled ? `${settings.months} ой` : 'Мавжуд эмас'}</strong>
          {settings.enabled ? (
            <>
              <p>Муддат: {settings.timing === 'EXTRA' ? 'Кредит муддатига қўшимча' : 'Умумий муддат ичида'}</p>
              <p>Имтиёзли даврда: {settings.payment === 'NO_PAYMENT' ? 'Тўлов амалга оширилмайди' : 'Фақат фоиз тўланади'}</p>
              {settings.payment === 'NO_PAYMENT' ? (
                <p>Фоиз ҳисоби: {settings.interestHandling === 'CAPITALIZE' ? 'Асосий қарзга қўшилади' : 'Алоҳида ҳисобланади (банк жадвали талаб)'}</p>
              ) : null}
            </>
          ) : null}
          <p>Тўлов тури: {paymentType}</p>
        </div>
      ) : null}
    </div>
  );
}
function calculateLoanPayments(amountInput, annualRateInput, monthsInput, grace) {
  const principal = Number(amountInput);
  const annualRate = Number(String(annualRateInput).replace(',', '.'));
  const months = Number(monthsInput);
  const g = grace.enabled ? Number(grace.months) : 0;
  if (
    amountInput === '' || annualRateInput === '' || monthsInput === '' ||
    !Number.isFinite(principal) || principal <= 0 ||
    !Number.isFinite(annualRate) || annualRate < 0 ||
    !Number.isInteger(months) || months < 1 || months > 600 ||
    !Number.isInteger(g) || g < 0 || g > 600 ||
    (grace.enabled && (g < 1 || (grace.timing === 'WITHIN' && g >= months))) ||
    months + (grace.timing === 'EXTRA' ? g : 0) > 600
  ) return null;
  const rate = annualRate / 1200;
  const repaymentMonths = grace.timing === 'WITHIN' ? months - g : months;
  const totalMonths = g + repaymentMonths;
  let balance = principal;
  let graceMonthly = 0;
  if (g > 0) {
    if (grace.payment === 'INTEREST_ONLY') {
      graceMonthly = principal * rate;
    } else if (grace.interestHandling === 'CAPITALIZE') {
      balance = principal * Math.pow(1 + rate, g);
    } // ACCRUE: фоиз алоҳида қарз сифатида қолади, бу ҳисобда капитализация қилинмайди.
  }
  const annuity = rate === 0
    ? balance / repaymentMonths
    : balance * rate / (1 - Math.pow(1 + rate, -repaymentMonths));
  const part = balance / repaymentMonths;
  const differentiatedFirst = part + balance * rate;
  const differentiatedLast = part + part * rate;
  if (![balance, annuity, differentiatedFirst, differentiatedLast, graceMonthly].every(Number.isFinite)) return null;
  return {
    annuity: Math.round(annuity),
    differentiatedFirst: Math.round(differentiatedFirst),
    differentiatedLast: Math.round(differentiatedLast),
    graceMonthly: Math.round(graceMonthly),
    repaymentMonths, totalMonths,
    outstandingInterest: g > 0 && grace.payment === 'NO_PAYMENT' && grace.interestHandling === 'ACCRUE'
      ? Math.round(principal * rate * g) : 0,
  };
}

function OfferModal({
  open,
  offer,
  saving,
  error,
  onClose,
  onSubmit,
  banks,
  banksLoading,
  user,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentType, setPaymentType] = useState('ANNUITY');
  const [grace, setGrace] = useState({
    enabled: false, months: '12', timing: 'WITHIN',
    payment: 'INTEREST_ONLY', interestHandling: 'ACCRUE',
  });
  const calculated = useMemo(
    () => calculateLoanPayments(form.approvedAmount, form.interestRate, form.termMonths, grace),
    [form.approvedAmount, form.interestRate, form.termMonths, grace]
  );
  const calculatedMonthly = calculated
    ? (paymentType === 'ANNUITY' ? calculated.annuity : calculated.differentiatedFirst)
    : null;
  const updateGrace = (field, value) => setGrace((current) => ({ ...current, [field]: value }));

  const requiresBankSchedule = grace.enabled && grace.payment === 'NO_PAYMENT' && grace.interestHandling === 'ACCRUE' && Number(String(form.interestRate).replace(',', '.')) > 0;
  const isBankEmployee = user?.role === 'BANK_EMPLOYEE';

  const ownBankName =
    user?.bank?.name ||
    banks.find((bank) => bank.id === user?.bankId)?.name ||
    '';

  useEffect(() => {
    if (!open) return;

    const stored = readGrace(offer?.conditions);
    setGrace(stored.settings);
    setPaymentType(stored.settings.paymentType || 'ANNUITY');
    setForm(
      offer
        ? {
            bankName: offer.bankName || '',
            status:
              offer.status === 'SELECTED'
                ? 'SUBMITTED'
                : offer.status || 'SUBMITTED',
            interestRate: offer.interestRate ?? '',
            termMonths: offer.termMonths ?? '',
            approvedAmount: offer.approvedAmount ?? '',
            initialPayment: offer.initialPayment ?? '',
            monthlyPayment: offer.monthlyPayment ?? '',
            insuranceAmount: offer.insuranceAmount ?? '',
            commissionAmount: offer.commissionAmount ?? '',
            validUntil: offer.validUntil
              ? String(offer.validUntil).slice(0, 10)
              : '',
            conditions: stored.text,
            rejectionReason: offer.rejectionReason || '',
          }
        : EMPTY_FORM
    );
  }, [open, offer]);

  useEffect(() => {
    if (!open || !isBankEmployee || !ownBankName) {
      return;
    }

    setForm((current) => ({
      ...current,
      bankName: ownBankName,
    }));
  }, [open, isBankEmployee, ownBankName]);

  if (!open) return null;

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="gk-bank-modal-backdrop" onMouseDown={onClose}>
      <div
        className="gk-bank-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="gk-bank-modal-head">
          <div>
            <span>{offer ? 'Банк таклифини таҳрирлаш' : 'Янги банк таклифи'}</span>
            <h3>Таклиф маълумотларини киритинг</h3>
          </div>

          <button type="button" onClick={onClose} disabled={saving}>
            <X size={20} />
          </button>
        </div>

        <form
          className="gk-bank-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.status !== 'REJECTED' && form.status !== 'CANCELLED' && (!calculated || requiresBankSchedule)) return;
            onSubmit({
              ...form,
              conditions: writeGrace(form.conditions, grace, paymentType),
              monthlyPayment: calculatedMonthly ?? (form.status === 'REJECTED' || form.status === 'CANCELLED' ? '' : form.monthlyPayment),
            });
          }}
        >
          <div className="gk-bank-form-grid">
            <label className="gk-bank-span-2">
              <span>Банк номи *</span>

              <select
                value={form.bankName}
                onChange={(event) => update('bankName', event.target.value)}
                required
                disabled={saving || banksLoading || isBankEmployee}
              >
                <option value="">
                  {banksLoading
                    ? 'Банклар юкланмоқда...'
                    : '— Банкни танланг —'}
                </option>

                {form.bankName &&
                !banks.some((bank) => bank.name === form.bankName) ? (
                  <option value={form.bankName}>{form.bankName}</option>
                ) : null}

                {banks
                  .filter((bank) => bank.isActive !== false)
                  .map((bank) => (
                    <option key={bank.id} value={bank.name}>
                      {bank.shortName
                        ? `${bank.shortName} — ${bank.name}`
                        : bank.name}
                    </option>
                  ))}
              </select>

              {isBankEmployee ? (
                <small className="gk-bank-field-note">
                  Сизнинг банкингиз автоматик танланади.
                </small>
              ) : null}
            </label>

            <label>
              <span>Ҳолати</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
                disabled={saving}
              >
                <option value="SUBMITTED">Тақдим этилган</option>
                <option value="DRAFT">Қоралама</option>
                <option value="REJECTED">Рад этилган</option>
                <option value="CANCELLED">Бекор қилинган</option>
              </select>
            </label>

            <label>
              <span>Фоиз ставкаси, %</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.interestRate}
                onChange={(event) => update('interestRate', event.target.value)}
                placeholder="26"
                disabled={saving}
              />
            </label>

            <label>
              <span>Муддат, ой</span>
              <input
                type="number"
                min="1"
                max="600"
                value={form.termMonths}
                onChange={(event) => update('termMonths', event.target.value)}
                placeholder="120"
                disabled={saving}
              />
            </label>

            <label>
              <span>Тасдиқланган сумма</span>
              <input
                type="number"
                min="0"
                value={form.approvedAmount}
                onChange={(event) => update('approvedAmount', event.target.value)}
                placeholder="300000000"
                disabled={saving}
              />
            </label>

            <label>
              <span>Бошланғич тўлов</span>
              <input
                type="number"
                min="0"
                value={form.initialPayment}
                onChange={(event) => update('initialPayment', event.target.value)}
                placeholder="60000000"
                disabled={saving}
              />
            </label>

            <label>
              <span>Тўлов тури</span>
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value)}
                disabled={saving}
              >
                <option value="ANNUITY">Аннуитет — ҳар ой бир хил</option>
                <option value="DIFFERENTIATED">Дифференциал — камайиб боради</option>
              </select>
            </label>

            <div className="gk-bank-span-2 gk-grace-fields">
              <strong>Имтиёзли давр</strong>
              <label>
                <span>Имтиёзли давр мавжудми?</span>
                <select value={grace.enabled ? 'YES' : 'NO'}
                  onChange={(event) => updateGrace('enabled', event.target.value === 'YES')} disabled={saving}>
                  <option value="NO">Йўқ</option>
                  <option value="YES">Ҳа</option>
                </select>
              </label>
              {grace.enabled ? (
                <>
                  <label>
                    <span>Имтиёзли давр (ой)</span>
                    <input type="number" min="1" max="600" value={grace.months}
                      onChange={(event) => updateGrace('months', event.target.value)} disabled={saving} />
                  </label>
                  <label>
                    <span>Кредит муддатига нисбатан</span>
                    <select value={grace.timing}
                      onChange={(event) => updateGrace('timing', event.target.value)} disabled={saving}>
                      <option value="WITHIN">Умумий муддат ичида</option>
                      <option value="EXTRA">Муддатга қўшимча</option>
                    </select>
                  </label>
                  <label>
                    <span>Имтиёзли даврдаги тўлов</span>
                    <select value={grace.payment}
                      onChange={(event) => updateGrace('payment', event.target.value)} disabled={saving}>
                      <option value="INTEREST_ONLY">Фақат фоиз тўланади</option>
                      <option value="NO_PAYMENT">Тўлов амалга оширилмайди</option>
                    </select>
                  </label>
                  {grace.payment === 'NO_PAYMENT' ? (
                    <label>
                      <span>Тўланмаган фоиз ҳисоби</span>
                      <select value={grace.interestHandling}
                        onChange={(event) => updateGrace('interestHandling', event.target.value)} disabled={saving}>
                        <option value="ACCRUE">Алоҳида ҳисобланади (банк жадвали талаб)</option>
                        <option value="CAPITALIZE">Ҳар ой асосий қарзга қўшилади</option>
                      </select>
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>

            <label>
              <span>Ойлик тўлов (автоматик)</span>
              <input
                type="text"
                value={calculatedMonthly === null ? '' : formatAmount(calculatedMonthly)}
                placeholder="Сумма, фоиз ва муддатни киритинг"
                readOnly
              />
            </label>

            <div className="gk-bank-span-2 gk-loan-preview" aria-live="polite">
              <strong>Кредит тўловлари ҳисоб-китоби</strong>
              {calculated ? (
                <div className="gk-loan-preview-grid">
                  {grace.enabled ? <div><span>Имтиёзли давр — ойлик тўлов</span><b>{formatAmount(calculated.graceMonthly)}</b></div> : null}
                  <div><span>Аннуитет — асосий тўлов даври</span><b>{formatAmount(calculated.annuity)}</b></div>
                  <div><span>Дифференциал — биринчи ой</span><b>{formatAmount(calculated.differentiatedFirst)}</b></div>
                  <div><span>Дифференциал — охирги ой</span><b>{formatAmount(calculated.differentiatedLast)}</b></div>
                </div>
              ) : (
                <p>Ҳисоблаш учун тасдиқланган сумма, йиллик фоиз ва муддатни тўлдиринг.</p>
              )}
              {requiresBankSchedule ? <small style={{ color: '#b91c1c' }}>Тўланмаган фоиз алоҳида ҳисобланганда банкнинг аниқ қайтариш жадвали керак. Нотўғри ойлик тўлов сақланмаслиги учун ушбу вариантда сақлаш вақтинча чекланган.</small> : null}
              {calculated && grace.enabled ? (
                <small>Имтиёзли давр: {grace.months} ой. Асосий қарз қайтариш: {calculated.repaymentMonths} ой.
                  Умумий муддат: {calculated.totalMonths} ой.
                  {calculated.outstandingInterest > 0
                    ? ` Алоҳида ҳисобланган фоиз: ${formatAmount(calculated.outstandingInterest)} — банк жадвалида тўлаш тартиби аниқланиши шарт.`
                    : ''}
                </small>
              ) : null}
              <small>Тасдиқланган сумма кредитнинг асосий қарзи ҳисобланади. Бошланғич тўлов қайта айирилмайди. Суғурта ва комиссия ойлик тўловга киритилмаган. Дифференциал турда сақланадиган «Ойлик тўлов» — биринчи ой тўлови.</small>
            </div>

            <label>
              <span>Суғурта суммаси</span>
              <input
                type="number"
                min="0"
                value={form.insuranceAmount}
                onChange={(event) => update('insuranceAmount', event.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </label>

            <label>
              <span>Комиссия суммаси</span>
              <input
                type="number"
                min="0"
                value={form.commissionAmount}
                onChange={(event) => update('commissionAmount', event.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </label>

            <label>
              <span>Амал қилиш санаси</span>
              <input
                type="date"
                value={form.validUntil}
                onChange={(event) => update('validUntil', event.target.value)}
                disabled={saving}
              />
            </label>

            <label className="gk-bank-span-2">
              <span>Шартлар</span>
              <textarea
                rows={4}
                value={form.conditions}
                onChange={(event) => update('conditions', event.target.value)}
                placeholder="Кредит тарихи, даромад, гаров ва бошқа шартлар"
                disabled={saving}
              />
            </label>

            {form.status === 'REJECTED' ? (
              <label className="gk-bank-span-2">
                <span>Рад этиш сабаби</span>
                <textarea
                  rows={3}
                  value={form.rejectionReason}
                  onChange={(event) =>
                    update('rejectionReason', event.target.value)
                  }
                  placeholder="Рад этиш сабабини киритинг"
                  disabled={saving}
                />
              </label>
            ) : null}
          </div>

          {error ? <div className="gk-bank-error">{error}</div> : null}

          <div className="gk-bank-modal-actions">
            <button
              type="button"
              className="gk-bank-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Бекор қилиш
            </button>

            <button
              type="submit"
              className="gk-bank-primary"
              disabled={saving || (form.status !== 'REJECTED' && form.status !== 'CANCELLED' && (!calculated || requiresBankSchedule))}
            >
              {saving ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  Сақланмоқда...
                </>
              ) : (
                'Сақлаш'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  busy,
  canManage,
  canSelect,
  canDelete,
  onEdit,
  onSelect,
  onDelete,
}) {
  const selected = offer.status === 'SELECTED';
  const graceInfo = readGrace(offer.conditions);
  const graceSettings = graceInfo.settings;
  const hasGrace = graceInfo.hasGrace && graceSettings.enabled === true;
  const paymentEstimate = hasGrace
    ? calculateLoanPayments(offer.approvedAmount, offer.interestRate, offer.termMonths, graceSettings)
    : null;
  const needsBankSchedule = hasGrace && graceSettings.payment === 'NO_PAYMENT'
    && graceSettings.interestHandling === 'ACCRUE';
  const differentiated = graceSettings.paymentType === 'DIFFERENTIATED';

  return (
    <article className={`gk-bank-card ${selected ? 'is-selected' : ''}`}>
      <div className="gk-bank-card-head">
        <div className="gk-bank-logo-box">
          <Landmark size={22} />
        </div>

        <div className="gk-bank-card-title">
          <strong>{offer.bankName}</strong>
          <span>
            {offer.bankEmployee?.fullName || 'Банк ходими кўрсатилмаган'}
          </span>
        </div>

        <span className={`gk-bank-status status-${offer.status.toLowerCase()}`}>
          {selected ? <CheckCircle2 size={14} /> : null}
          {STATUS_LABELS[offer.status] || offer.status}
        </span>
      </div>

      <div className="gk-bank-main-values">
        <div>
          <span>Тасдиқланган сумма</span>
          <strong>{formatAmount(offer.approvedAmount)}</strong>
        </div>

        <div>
          <span>Фоиз ставкаси</span>
          <strong>
            {offer.interestRate !== null && offer.interestRate !== undefined
              ? `${offer.interestRate}%`
              : '—'}
          </strong>
        </div>

        <div>
          <span>Муддат</span>
          <strong>{formatTerm(offer.termMonths)}</strong>
        </div>
      </div>

      <div className="gk-bank-extra-values">
        <div>
          <span>Бошланғич тўлов</span>
          <strong>{formatAmount(offer.initialPayment)}</strong>
        </div>

        {hasGrace ? (
          <>
            <div>
              <span>Имтиёзли даврда — ойлик тўлов</span>
              <strong>{paymentEstimate ? formatAmount(paymentEstimate.graceMonthly) : '—'}</strong>
            </div>
            <div>
              <span>Имтиёзли даврдан кейин — {differentiated ? 'биринчи ой тўлови' : 'ойлик тўлов'}</span>
              <strong>{needsBankSchedule ? 'Банк жадвали бўйича' : formatAmount(offer.monthlyPayment)}</strong>
            </div>
          </>
        ) : (
          <div>
            <span>Ойлик тўлов</span>
            <strong>{formatAmount(offer.monthlyPayment)}</strong>
          </div>
        )}

        <div>
          <span>Комиссия</span>
          <strong>{formatAmount(offer.commissionAmount)}</strong>
        </div>

        <div>
          <span>Амал қилиш санаси</span>
          <strong>{formatDate(offer.validUntil)}</strong>
        </div>
      </div>

      <GraceConditions conditions={offer.conditions} />

      {offer.rejectionReason ? (
        <div className="gk-bank-rejection">
          <strong>Рад этиш сабаби</strong>
          <p>{offer.rejectionReason}</p>
        </div>
      ) : null}

      <div className="gk-bank-card-actions">
        {canManage ? (
          <button
            type="button"
            className="gk-bank-secondary"
            onClick={() => onEdit(offer)}
            disabled={busy}
          >
            <Edit3 size={16} />
            Таҳрирлаш
          </button>
        ) : null}

        {canSelect && !selected && !['REJECTED', 'CANCELLED'].includes(offer.status) ? (
          <button
            type="button"
            className="gk-bank-select"
            onClick={() => onSelect(offer)}
            disabled={busy || !offer.approvedAmount}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
            Мижоз танлади
          </button>
        ) : null}

        {canDelete && !selected ? (
          <button
            type="button"
            className="gk-bank-delete"
            onClick={() => onDelete(offer)}
            disabled={busy}
          >
            <Trash2 size={16} />
            Ўчириш
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function BankOffersSection({
  caseId,
  onCaseChanged,
  onOfferStateChange,
}) {
  const user = useMemo(() => currentUser(), []);
  const role = user?.role || '';

  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [compareMode, setCompareMode] = useState(false);

  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState('');

  const comparison = useMemo(() => bestOfferIds(offers), [offers]);

  const comparableOffers = useMemo(
    () =>
      offers.filter(
        (offer) => !['REJECTED', 'CANCELLED'].includes(offer.status)
      ),
    [offers]
  );

  const publishState = useCallback(
    (nextOffers, nextSelectedOffer, nextLoading = false) => {
      onOfferStateChange?.({
        offers: nextOffers,
        selectedOffer: nextSelectedOffer,
        loading: nextLoading,
      });
    },
    [onOfferStateChange]
  );

  const loadBanks = useCallback(async () => {
    setBanksLoading(true);
    setBanksError('');

    try {
      const data = await apiRequest('/banks');
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

      setBanks(items);
    } catch (error) {
      setBanks([]);
      setBanksError(
        error.message || 'Банклар рўйхатини юклаб бўлмади.'
      );
    } finally {
      setBanksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError('');
    publishState(offers, selectedOffer, true);

    try {
      const data = await apiRequest(`/bank-offers/case/${caseId}`);
      const nextOffers = Array.isArray(data.items) ? data.items : [];
      const nextSelected =
        data.selectedOffer ||
        nextOffers.find((offer) => offer.status === 'SELECTED') ||
        null;

      setOffers(nextOffers);
      setSelectedOffer(nextSelected);
      publishState(nextOffers, nextSelected, false);
    } catch (error) {
      const message =
        error.message || 'Банк таклифларини юклаб бўлмади.';
      setPageError(message);
      publishState([], null, false);
    } finally {
      setLoading(false);
    }
  }, [caseId, publishState]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    if (
      role === 'BANK_EMPLOYEE' &&
      !user?.bank?.name &&
      !banks.some((bank) => bank.id === user?.bankId)
    ) {
      setPageError(
        'Сизнинг аккаунтингизга банк бириктирилмаган. Администраторга мурожаат қилинг.'
      );
      return;
    }

    setEditingOffer(null);
    setModalError('');
    setModalOpen(true);
  };

  const save = async (form) => {
    setSaving(true);
    setModalError('');

    try {
      if (editingOffer) {
        await apiRequest(`/bank-offers/${editingOffer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(makePayload(form)),
        });
      } else {
        await apiRequest(`/bank-offers/case/${caseId}`, {
          method: 'POST',
          body: JSON.stringify(makePayload(form)),
        });
      }

      setModalOpen(false);
      setEditingOffer(null);
      await load();
      await onCaseChanged?.();
    } catch (error) {
      setModalError(error.message || 'Таклифни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const choose = async (offer) => {
    if (
      !window.confirm(
        `${offer.bankName} банк таклифини танлашни тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setBusyId(offer.id);
    setPageError('');

    try {
      await apiRequest(`/bank-offers/${offer.id}/select`, {
        method: 'POST',
      });

      await load();
      await onCaseChanged?.();
    } catch (error) {
      setPageError(error.message || 'Таклифни танлаб бўлмади.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (offer) => {
    if (
      !window.confirm(
        `${offer.bankName} банк таклифини ўчиришни тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setBusyId(offer.id);
    setPageError('');

    try {
      await apiRequest(`/bank-offers/${offer.id}`, {
        method: 'DELETE',
      });

      await load();
      await onCaseChanged?.();
    } catch (error) {
      setPageError(error.message || 'Таклифни ўчириб бўлмади.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <style>{`
        .gk-bank-section {
          overflow: visible;
        }

        .gk-bank-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .gk-bank-head h3 {
          margin: 3px 0 4px;
        }

        .gk-bank-head p {
          margin: 0;
          color: #7b818a;
          font-size: 12px;
        }

        .gk-bank-head-actions,
        .gk-bank-card-actions,

        .gk-bank-field-note {
          display: block;
          margin-top: 6px;
          color: #7b818a;
          font-size: 11px;
          line-height: 1.4;
        }

        .gk-bank-modal-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .gk-bank-icon-button,
        .gk-bank-primary,
        .gk-bank-secondary,
        .gk-bank-select,
        .gk-bank-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          border-radius: 9px;
          padding: 0 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .gk-bank-icon-button {
          width: 38px;
          padding: 0;
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #24272b;
        }

        .gk-bank-primary,
        .gk-bank-select {
          border: 1px solid #e5232f;
          background: #e5232f;
          color: #fff;
        }

        .gk-bank-secondary {
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #24272b;
        }

        .gk-bank-delete {
          border: 1px solid #ffd2d5;
          background: #fff7f7;
          color: #d31d28;
        }

        .gk-bank-icon-button:disabled,
        .gk-bank-primary:disabled,
        .gk-bank-secondary:disabled,
        .gk-bank-select:disabled,
        .gk-bank-delete:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .gk-bank-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
          gap: 16px;
        }

        .gk-bank-card {
          border: 1px solid #e2e5e9;
          border-radius: 14px;
          background: #fff;
          padding: 16px;
          min-width: 0;
        }

        .gk-bank-card.is-selected {
          border-color: #62c992;
          background: #f4fff8;
          box-shadow: 0 0 0 2px rgba(73, 190, 128, 0.08);
        }

        .gk-bank-card-head {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
        }

        .gk-bank-logo-box {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: #fff1f2;
          color: #e5232f;
        }

        .gk-bank-card-title {
          display: grid;
          gap: 3px;
          min-width: 0;
          flex: 1;
        }

        .gk-bank-card-title strong {
          font-size: 15px;
        }

        .gk-bank-card-title span {
          color: #8a9098;
          font-size: 11px;
        }

        .gk-bank-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          background: #f0f2f4;
          color: #555b63;
        }

        .gk-bank-status.status-selected {
          background: #dcf8e8;
          color: #087742;
        }

        .gk-bank-status.status-rejected,
        .gk-bank-status.status-cancelled {
          background: #fff0f1;
          color: #cf1f2a;
        }

        .gk-bank-main-values,
        .gk-bank-extra-values {
          display: grid;
          gap: 1px;
          overflow: hidden;
          border: 1px solid #eceef1;
          border-radius: 11px;
          background: #eceef1;
        }

        .gk-bank-main-values {
          grid-template-columns: 1.35fr 0.8fr 0.8fr;
          margin-bottom: 12px;
        }

        .gk-bank-extra-values {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-bottom: 12px;
        }

        .gk-bank-main-values > div,
        .gk-bank-extra-values > div {
          display: grid;
          gap: 5px;
          min-width: 0;
          padding: 11px;
          background: #fff;
        }

        .gk-bank-main-values span,
        .gk-bank-extra-values span {
          color: #888e96;
          font-size: 10px;
        }

        .gk-bank-main-values strong,
        .gk-bank-extra-values strong {
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .gk-bank-conditions,
        .gk-bank-rejection {
          border-radius: 10px;
          padding: 11px 12px;
          margin-bottom: 12px;
        }

        .gk-bank-conditions {
          background: #f6f7f8;
        }

        .gk-bank-rejection {
          background: #fff0f1;
          color: #b81822;
        }

        .gk-grace-summary { margin-top: 10px; padding-top: 9px; border-top: 1px solid #dfe3e8; }
        .gk-grace-summary p { margin: 5px 0 0; }
        .gk-bank-conditions strong,
        .gk-bank-rejection strong {
          font-size: 12px;
        }

        .gk-bank-conditions p,
        .gk-bank-rejection p {
          margin: 5px 0 0;
          font-size: 11px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .gk-bank-loading,
        .gk-bank-empty,
        .gk-bank-error {
          min-height: 190px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          text-align: center;
          color: #8c939c;
        }

        .gk-bank-error {
          color: #c9212c;
        }

        .gk-bank-empty span,
        .gk-bank-loading span,
        .gk-bank-error span {
          font-size: 12px;
        }

        .gk-grace-fields {
          display: grid; gap: 12px; padding: 14px;
          border: 1px solid #dce5ed; border-radius: 12px; background: #f7fafc;
        }
        .gk-grace-fields > strong { font-size: 14px; }
        .gk-loan-preview {
          border: 1px solid #dce5ed;
          border-radius: 12px;
          padding: 14px;
          background: #f7fafc;
          display: grid;
          gap: 10px;
        }
        .gk-loan-preview > strong { font-size: 14px; }
        .gk-loan-preview-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 9px; }
        .gk-loan-preview-grid > div { display: grid; gap: 6px; padding: 10px; border-radius: 9px; background: #fff; }
        .gk-loan-preview-grid span, .gk-loan-preview small, .gk-loan-preview p { color: #606a76; font-size: 11px; line-height: 1.5; }
        .gk-loan-preview-grid b { font-size: 13px; overflow-wrap: anywhere; }
        @media (max-width: 700px) { .gk-loan-preview-grid { grid-template-columns: 1fr; } }

        .gk-bank-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(10, 13, 17, 0.58);
          backdrop-filter: blur(3px);
        }

        .gk-bank-modal {
          width: min(900px, 100%);
          max-height: calc(100vh - 48px);
          overflow: auto;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.24);
        }

        .gk-bank-modal-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #eceef1;
          background: #fff;
        }

        .gk-bank-modal-head span {
          color: #e5232f;
          font-size: 11px;
          font-weight: 800;
        }

        .gk-bank-modal-head h3 {
          margin: 4px 0 0;
          font-size: 19px;
        }

        .gk-bank-modal-head > button {
          width: 36px;
          height: 36px;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .gk-bank-modal-form {
          padding: 20px;
        }

        .gk-bank-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .gk-bank-form-grid label {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .gk-bank-form-grid label > span {
          color: #555c65;
          font-size: 12px;
          font-weight: 700;
        }

        .gk-bank-form-grid input,
        .gk-bank-form-grid select,
        .gk-bank-form-grid textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: #fff;
          color: #15171a;
          font: inherit;
          padding: 11px 12px;
          outline: none;
        }

        .gk-bank-form-grid input:focus,
        .gk-bank-form-grid select:focus,
        .gk-bank-form-grid textarea:focus {
          border-color: #e5232f;
          box-shadow: 0 0 0 3px rgba(229, 35, 47, 0.1);
        }

        .gk-bank-span-2 {
          grid-column: span 2;
        }

        .gk-bank-modal-actions {
          justify-content: flex-end;
          margin-top: 18px;
        }

        .gk-bank-error {
          border-radius: 10px;
          min-height: auto;
          margin-top: 14px;
          padding: 11px 12px;
          background: #fff0f1;
          text-align: left;
        }


        .gk-bank-compare {
          margin-bottom: 18px;
          overflow-x: auto;
          border: 1px solid #e2e5e9;
          border-radius: 14px;
          background: #fff;
        }

        .gk-bank-compare table {
          width: 100%;
          min-width: 780px;
          border-collapse: collapse;
        }

        .gk-bank-compare th,
        .gk-bank-compare td {
          padding: 11px 12px;
          border-right: 1px solid #eceef1;
          border-bottom: 1px solid #eceef1;
          text-align: left;
          vertical-align: middle;
          font-size: 12px;
        }

        .gk-bank-compare th {
          background: #f7f8f9;
          font-size: 11px;
          color: #555c65;
        }

        .gk-bank-compare tr:last-child td {
          border-bottom: 0;
        }

        .gk-bank-compare td:last-child,
        .gk-bank-compare th:last-child {
          border-right: 0;
        }

        .gk-bank-best {
          background: #f1fff6;
          color: #087742;
          font-weight: 900;
        }

        .gk-bank-compare-bank {
          display: grid;
          gap: 3px;
        }

        .gk-bank-compare-bank strong {
          font-size: 13px;
        }

        .gk-bank-compare-bank span {
          color: #8a9098;
          font-size: 10px;
        }

        .gk-bank-client-choice {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #087742;
          font-size: 10px;
          font-weight: 900;
        }

        @media (max-width: 700px) {
          .gk-bank-head {
            align-items: stretch;
            flex-direction: column;
          }

          .gk-bank-head-actions {
            justify-content: flex-end;
          }

          .gk-bank-grid,
          .gk-bank-form-grid {
            grid-template-columns: 1fr;
          }

          .gk-bank-main-values,
          .gk-bank-extra-values {
            grid-template-columns: 1fr;
          }

          .gk-bank-span-2 {
            grid-column: span 1;
          }

          .gk-bank-modal-backdrop {
            padding: 10px;
          }
        }
      `}</style>

      <section className="panel details-section gk-bank-section">
        <div className="gk-bank-head">
          <div>
            <span className="section-kicker">Банклар</span>
            <h3>Банк таклифлари</h3>
            <p>
              Жами {offers.length} та таклиф
              {selectedOffer
                ? ` · Танланган: ${selectedOffer.bankName}`
                : ' · Ҳали танланмаган'}
            </p>
          </div>

          <div className="gk-bank-head-actions">
            {offers.length > 1 ? (
              <button
                type="button"
                className="gk-bank-secondary"
                onClick={() => setCompareMode((value) => !value)}
              >
                <Landmark size={16} />
                {compareMode ? 'Карточкалар' : 'Таклифларни солиштириш'}
              </button>
            ) : null}

            <button
              type="button"
              className="gk-bank-icon-button"
              onClick={load}
              disabled={loading}
              title="Янгилаш"
            >
              <RefreshCw
                size={17}
                className={loading ? 'spin' : ''}
              />
            </button>

            {CREATE.includes(role) ? (
              <button
                type="button"
                className="gk-bank-primary"
                onClick={openCreate}
              >
                <Plus size={17} />
                Таклиф қўшиш
              </button>
            ) : null}
          </div>
        </div>


        {compareMode && comparableOffers.length > 1 ? (
          <div className="gk-bank-compare">
            <table>
              <thead>
                <tr>
                  <th>Банк</th>
                  <th>Тасдиқланган сумма</th>
                  <th>Фоиз</th>
                  <th>Муддат</th>
                  <th>Бошланғич тўлов</th>
                  <th>Ойлик тўлов</th>
                  <th>Ҳолат</th>
                  {SELECT.includes(role) ? <th>Танлов</th> : null}
                </tr>
              </thead>
              <tbody>
                {comparableOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <div className="gk-bank-compare-bank">
                        <strong>{offer.bankName}</strong>
                        <span>
                          {offer.bankEmployee?.fullName ||
                            'Банк ходими кўрсатилмаган'}
                        </span>
                        {offer.status === 'SELECTED' ? (
                          <span className="gk-bank-client-choice">
                            <CheckCircle2 size={12} />
                            Мижоз танлади
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td
                      className={
                        comparison.maxAmount === offer.id
                          ? 'gk-bank-best'
                          : ''
                      }
                    >
                      {formatAmount(offer.approvedAmount)}
                    </td>
                    <td
                      className={
                        comparison.minRate === offer.id
                          ? 'gk-bank-best'
                          : ''
                      }
                    >
                      {offer.interestRate !== null &&
                      offer.interestRate !== undefined
                        ? `${offer.interestRate}%`
                        : '—'}
                    </td>
                    <td>{formatTerm(offer.termMonths)}</td>
                    <td
                      className={
                        comparison.minInitial === offer.id
                          ? 'gk-bank-best'
                          : ''
                      }
                    >
                      {formatAmount(offer.initialPayment)}
                    </td>
                    <td
                      className={
                        comparison.minMonthly === offer.id
                          ? 'gk-bank-best'
                          : ''
                      }
                    >
                      {formatAmount(offer.monthlyPayment)}
                    </td>
                    <td>{STATUS_LABELS[offer.status] || offer.status}</td>
                    {SELECT.includes(role) ? (
                      <td>
                        {offer.status === 'SELECTED' ? (
                          <span className="gk-bank-client-choice">
                            <CheckCircle2 size={14} />
                            Танланган
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="gk-bank-select"
                            onClick={() => choose(offer)}
                            disabled={
                              busyId === offer.id || !offer.approvedAmount
                            }
                          >
                            {busyId === offer.id ? (
                              <LoaderCircle className="spin" size={15} />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                            Мижоз танлади
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pageError ? (
          <div className="gk-bank-error">
            <strong>Хато</strong>
            <span>{pageError}</span>
            <button
              type="button"
              className="gk-bank-secondary"
              onClick={load}
            >
              Қайта уриниш
            </button>
          </div>
        ) : loading ? (
          <div className="gk-bank-loading">
            <LoaderCircle className="spin" size={32} />
            <strong>Банк таклифлари юкланмоқда...</strong>
          </div>
        ) : offers.length === 0 ? (
          <div className="gk-bank-empty">
            <Landmark size={38} />
            <strong>Банк таклифлари ҳали йўқ</strong>
            <span>
              Банк КАТМ ва гаров мулкини текширгандан кейин
              таклиф киритади.
            </span>

            {CREATE.includes(role) ? (
              <button
                type="button"
                className="gk-bank-primary"
                onClick={openCreate}
              >
                <Plus size={17} />
                Биринчи таклифни қўшиш
              </button>
            ) : null}
          </div>
        ) : (
          <div className="gk-bank-grid">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                busy={busyId === offer.id}
                canManage={
                  UPDATE.includes(role) &&
                  (role !== 'BANK_EMPLOYEE' ||
                    offer.bankEmployeeId === user?.id)
                }
                canSelect={SELECT.includes(role)}
                canDelete={DELETE.includes(role)}
                onEdit={(value) => {
                  setEditingOffer(value);
                  setModalError('');
                  setModalOpen(true);
                }}
                onSelect={choose}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </section>

      <OfferModal
        open={modalOpen}
        offer={editingOffer}
        saving={saving}
        error={modalError}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingOffer(null);
            setModalError('');
          }
        }}
        onSubmit={save}
      
          banks={banks}
          banksLoading={banksLoading}
          user={user}
        />
    </>
  );
}
