import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Landmark,
  LoaderCircle,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserRound,
  WalletCards,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';
import { BankOffersSection } from '../components/bank-offers/BankOffersSection.jsx';
import { DocumentsSection } from '../components/documents/DocumentsSection.jsx';
import { ContractsSection } from '../components/contracts/ContractsSection.jsx';
import { MultiBankAssignmentsSection } from '../components/banks/MultiBankAssignmentsSection.jsx';
import { ParticipantsSection } from '../components/cases/ParticipantsSection.jsx';

const SERVICE_NAMES = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

const STATUS_NAMES = {
  NEW: 'Янги',
  DATA_COLLECTION: 'Маълумот тўпланмоқда',
  BANK_REVIEW: 'Банк текширувида',
  CLIENT_PREAPPROVED: 'Дастлабки тасдиқ',
  OFFICE_VISIT: 'Офисга таклиф қилинган',
  CONTRACT_PENDING: 'Шартнома тайёрланмоқда',
  CONTRACT_SIGNED: 'Шартнома имзоланган',
  ASSIGNED_TO_EXECUTOR: 'Ижрочига бириктирилган',
  IN_EXECUTION: 'Ижрода',
  PROPERTY_MONITORING: 'Объект кузатувида',
  CREDIT_APPROVED: 'Кредит тасдиқланган',
  CREDIT_ISSUED: 'Кредит ажратилган',
  CLIENT_RECEIVED_FUNDS: 'Мижоз маблағни олган',
  SERVICE_FEE_PAID: 'Хизмат ҳақи тўланган',
  COMPLETED: 'Якунланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
  ARCHIVED: 'Архивланган',
};

const MAIN_TIMELINE = [
  'NEW',
  'DATA_COLLECTION',
  'BANK_REVIEW',
  'CLIENT_PREAPPROVED',
  'OFFICE_VISIT',
  'CONTRACT_PENDING',
  'CONTRACT_SIGNED',
  'ASSIGNED_TO_EXECUTOR',
  'IN_EXECUTION',
  'CREDIT_APPROVED',
  'CREDIT_ISSUED',
  'CLIENT_RECEIVED_FUNDS',
  'SERVICE_FEE_PAID',
  'COMPLETED',
];

const ALL_STATUS_OPTIONS = [
  ['NEW', 'Янги'],
  ['DATA_COLLECTION', 'Маълумот тўпланмоқда'],
  ['BANK_REVIEW', 'Банк текширувида'],
  ['CLIENT_PREAPPROVED', 'Дастлабки тасдиқ'],
  ['OFFICE_VISIT', 'Офисга таклиф қилинган'],
  ['CONTRACT_PENDING', 'Шартнома тайёрланмоқда'],
  ['CONTRACT_SIGNED', 'Шартнома имзоланган'],
  ['ASSIGNED_TO_EXECUTOR', 'Ижрочига бириктирилган'],
  ['IN_EXECUTION', 'Ижрода'],
  ['PROPERTY_MONITORING', 'Объект кузатувида'],
  ['CREDIT_APPROVED', 'Кредит тасдиқланган'],
  ['CREDIT_ISSUED', 'Кредит ажратилган'],
  ['CLIENT_RECEIVED_FUNDS', 'Мижоз маблағни олган'],
  ['SERVICE_FEE_PAID', 'Хизмат ҳақи тўланган'],
  ['COMPLETED', 'Якунланган'],
  ['REJECTED', 'Рад этилган'],
  ['CANCELLED', 'Бекор қилинган'],
  ['ARCHIVED', 'Архивланган'],
];

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

function parseNumericInput(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function formatDate(value, withTime = false) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(date);
}

function getStatusClass(status) {
  if (status === 'COMPLETED') {
    return 'status-completed';
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'status-rejected';
  }

  if (status === 'ARCHIVED') {
    return 'status-archived';
  }

  if (
    status === 'BANK_REVIEW' ||
    status === 'CLIENT_PREAPPROVED' ||
    status === 'CREDIT_APPROVED'
  ) {
    return 'status-review';
  }

  if (
    status === 'ASSIGNED_TO_EXECUTOR' ||
    status === 'IN_EXECUTION' ||
    status === 'PROPERTY_MONITORING' ||
    status === 'CREDIT_ISSUED' ||
    status === 'CLIENT_RECEIVED_FUNDS' ||
    status === 'SERVICE_FEE_PAID'
  ) {
    return 'status-progress';
  }

  return 'status-new';
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="case-info-item">
      <div className="case-info-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value || '—'}</strong>
      </div>
    </div>
  );
}

function EmptyBlock({ icon: Icon, title, text }) {
  return (
    <div className="details-empty-block">
      <Icon size={31} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function CaseDetails({ caseId, onBack, onChanged }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');

  const [financeForm, setFinanceForm] = useState({
    collateralType: '',
    collateralAddress: '',
    collateralCadastreNumber: '',
    collateralOwnerFullName: '',
    collateralOwnerPinfl: '',
    collateralArea: '',
    collateralEstimatedValue: '',
    collateralNotes: '',
  });
  const [savingFinance, setSavingFinance] = useState(false);
  const [financeError, setFinanceError] = useState('');
  const [financeSuccess, setFinanceSuccess] = useState('');

  const [bankOfferState, setBankOfferState] = useState({
    offers: [],
    selectedOffer: null,
    loading: true,
  });

  const [executors, setExecutors] = useState([]);
  const [executorId, setExecutorId] = useState('');
  const [executorsLoading, setExecutorsLoading] = useState(false);
  const [executorSaving, setExecutorSaving] = useState(false);
  const [executorError, setExecutorError] = useState('');
  const [executorSuccess, setExecutorSuccess] = useState('');
  const [canAssignExecutor, setCanAssignExecutor] = useState(true);

  const loadCase = useCallback(async () => {
    if (!caseId) {
      return;
    }

    setLoading(true);
    setPageError('');

    try {
      const data = await apiRequest(`/cases/${caseId}`);
      const loadedItem = data.item || null;

      setItem(loadedItem);
      setStatusValue(loadedItem?.status || '');

      if (loadedItem) {
        const selectedOffer =
          loadedItem.bankOffers?.find(
            (offer) => offer.status === 'SELECTED'
          ) ||
          loadedItem.bankOffers?.[0] ||
          null;

        setFinanceForm({
          collateralType: loadedItem.collateralType || '',
          collateralAddress:
            loadedItem.collateralAddress || '',
          collateralCadastreNumber:
            loadedItem.collateralCadastreNumber || '',
          collateralOwnerFullName:
            loadedItem.collateralOwnerFullName || '',
          collateralOwnerPinfl:
            loadedItem.collateralOwnerPinfl || '',
          collateralArea: loadedItem.collateralArea ?? '',
          collateralEstimatedValue:
            loadedItem.collateralEstimatedValue ?? '',
          collateralNotes: loadedItem.collateralNotes || '',
        });
      }
    } catch (error) {
      setPageError(error.message || 'Мурожаат маълумотларини олиб бўлмади.');

      if (error.status === 401) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const loadExecutors = useCallback(async (branchId = '') => {
    setExecutorsLoading(true);
    setExecutorError('');

    try {
      const query = branchId
        ? `?${new URLSearchParams({ branchId }).toString()}`
        : '';

      const data = await apiRequest(`/users/executors${query}`);
      let items = Array.isArray(data.items) ? data.items : [];

      // Агар филиал бўйича ҳеч ким чиқмаса, барча фаол ижрочиларни оламиз.
      if (items.length === 0 && branchId) {
        const fallbackData = await apiRequest('/users/executors');
        items = Array.isArray(fallbackData.items)
          ? fallbackData.items
          : [];
      }

      setExecutors(items);
      setCanAssignExecutor(true);
    } catch (error) {
      if (error.status === 403) {
        setCanAssignExecutor(false);
        setExecutors([]);
      } else {
        setExecutors([]);
        setExecutorError(
          error.message || 'Ижрочилар рўйхатини юклаб бўлмади.'
        );
      }
    } finally {
      setExecutorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!item) {
      return;
    }

    const effectiveBranchId =
      item.branchId ||
      item.branch?.id ||
      item.branch?.branchId ||
      '';

    setExecutorId(item.executor?.id || '');
    setExecutorSuccess('');
    loadExecutors(effectiveBranchId);
  }, [
    item,
    item?.branchId,
    item?.branch?.id,
    item?.executor?.id,
    loadExecutors,
  ]);

  const currentTimelineIndex = useMemo(() => {
    if (!item) {
      return -1;
    }

    return MAIN_TIMELINE.indexOf(item.status);
  }, [item]);

  const changeStatus = async (event) => {
    event.preventDefault();

    if (!statusValue || !item) {
      return;
    }

    setSavingStatus(true);
    setStatusError('');
    setStatusSuccess('');

    try {
      const data = await apiRequest(`/cases/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: statusValue,
          note: statusNote.trim(),
        }),
      });

      setItem(data.item);
      setStatusValue(data.item.status);
      setStatusNote('');
      setStatusSuccess('Мурожаат ҳолати муваффақиятли ўзгартирилди.');

      onChanged?.(data.item);
    } catch (error) {
      setStatusError(error.message || 'Статусни ўзгартириб бўлмади.');
    } finally {
      setSavingStatus(false);
    }
  };

  const assignExecutor = async (event) => {
    event.preventDefault();

    if (!item || !executorId) {
      setExecutorError('Ижрочини танланг.');
      return;
    }

    setExecutorSaving(true);
    setExecutorError('');
    setExecutorSuccess('');

    try {
      const data = await apiRequest(
        `/cases/${item.id}/assign-executor`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            executorId,
          }),
        }
      );

      setItem(data.item);
      setStatusValue(data.item.status);
      setExecutorId(data.item.executor?.id || '');
      setExecutorSuccess(
        `${data.item.executor?.fullName || 'Ижрочи'}га иш муваффақиятли бириктирилди.`
      );

      onChanged?.(data.item);
    } catch (error) {
      setExecutorError(
        error.message || 'Ишни ижрочига бириктириб бўлмади.'
      );
    } finally {
      setExecutorSaving(false);
    }
  };

  const updateFinanceField = (field, value) => {
    setFinanceForm((current) => ({
      ...current,
      [field]: value,
    }));
  };


  const saveFinanceCollateral = async (event) => {
    event.preventDefault();

    if (!item) {
      return;
    }

    setSavingFinance(true);
    setFinanceError('');
    setFinanceSuccess('');

    try {
      const data = await apiRequest(
        `/cases/${item.id}/finance-collateral`,
        {
          method: 'PATCH',
          body: JSON.stringify(financeForm),
        }
      );

      setItem(data.item);

      setFinanceForm((current) => ({
        ...current,
      }));

      setFinanceSuccess(
        'Гаров мулки маълумотлари сақланди. Энди мурожаатни банкка юбориш мумкин.'
      );

      onChanged?.(data.item);
    } catch (error) {
      setFinanceError(
        error.message ||
          'Гаров мулки маълумотларини сақлаб бўлмади.'
      );
    } finally {
      setSavingFinance(false);
    }
  };

  if (loading) {
    return (
      <section className="panel case-details-loading">
        <LoaderCircle className="spin" size={38} />
        <strong>Мурожаат карточкаси юкланмоқда...</strong>
      </section>
    );
  }

  if (pageError || !item) {
    return (
      <section className="panel page-error case-details-error">
        <strong>Мурожаат карточкасини очиб бўлмади</strong>
        <span>{pageError || 'Мурожаат топилмади.'}</span>

        <div className="details-error-actions">
          <button type="button" onClick={onBack}>
            Орқага қайтиш
          </button>

          <button type="button" onClick={loadCase}>
            Қайта уриниш
          </button>
        </div>
      </section>
    );
  }

  const applicant = item.applicant || {};
  const selectedBankOffer =
    bankOfferState.selectedOffer ||
    item.bankOffers?.find((offer) => offer.status === 'SELECTED') ||
    null;

  const displayedBankName =
    selectedBankOffer?.bankName ||
    item.bankName ||
    'Танланмаган';

  const displayedApprovedAmount =
    selectedBankOffer?.approvedAmount ??
    item.approvedAmount ??
    null;

  return (
    <div className="case-details-page">

      <style>{`
        .finance-collateral-form label {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .finance-collateral-form label > span {
          color: #5f6670;
          font-size: 12px;
          font-weight: 700;
        }

        .finance-collateral-form input,
        .finance-collateral-form select,
        .finance-collateral-form textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: #fff;
          color: #15171a;
          font: inherit;
          font-size: 14px;
          padding: 11px 12px;
          outline: none;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .finance-collateral-form input:focus,
        .finance-collateral-form select:focus,
        .finance-collateral-form textarea:focus {
          border-color: #e5232f;
          box-shadow: 0 0 0 3px rgba(229, 35, 47, 0.1);
        }

        .finance-collateral-form textarea {
          resize: vertical;
        }

        .finance-collateral-form button.primary {
          justify-self: start;
          min-height: 42px;
          border: 0;
          border-radius: 10px;
          padding: 0 18px;
          background: #e5232f;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .finance-collateral-form button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .executor-assign-panel {
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          background: #fff;
        }

        .executor-current {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          border-radius: 10px;
          padding: 11px 12px;
          background: #f6f8fa;
        }

        .executor-current-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 9px;
          background: #fff1f2;
          color: #e5232f;
        }

        .executor-current > div {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .executor-current span {
          color: #7d838b;
          font-size: 11px;
        }

        .executor-assign-form {
          display: grid;
          gap: 11px;
        }

        .executor-assign-form label {
          display: grid;
          gap: 6px;
        }

        .executor-assign-form label > span {
          color: #555c65;
          font-size: 12px;
          font-weight: 700;
        }

        .executor-assign-form select {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: #fff;
          color: #15171a;
          font: inherit;
          font-size: 13px;
          padding: 11px 12px;
          outline: none;
        }

        .executor-assign-form select:focus {
          border-color: #e5232f;
          box-shadow: 0 0 0 3px rgba(229, 35, 47, 0.1);
        }

        .executor-assign-button {
          min-height: 40px;
          border: 0;
          border-radius: 10px;
          background: #e5232f;
          color: #fff;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          cursor: pointer;
        }

        .executor-assign-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .executor-note {
          margin: 0;
          color: #7d838b;
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .finance-collateral-form button.primary {
            width: 100%;
          }
        }
      `}</style>

      <section className="case-details-top">
        <button type="button" className="details-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Мурожаатлар рўйхати
        </button>

        <button
          type="button"
          className="details-refresh-button"
          onClick={loadCase}
          title="Маълумотларни янгилаш"
        >
          <RefreshCw size={18} />
        </button>
      </section>

      <section className="panel case-hero">
        <div className="case-hero-main">
          <div>
            <span className="case-hero-kicker">Мурожаат карточкаси</span>

            <div className="case-hero-title">
              <h2>{item.displayId}</h2>

              <span
                className={`status-badge ${getStatusClass(item.status)}`}
              >
                {STATUS_NAMES[item.status] || item.status}
              </span>
            </div>

            <p>
              {applicant.fullName || 'Мижоз номи киритилмаган'} ·{' '}
              {SERVICE_NAMES[item.serviceType] || item.serviceType}
            </p>
          </div>

          <div className="case-hero-amount">
            <span>Сўралаётган сумма</span>
            <strong>{formatAmount(item.requestedAmount)}</strong>
          </div>
        </div>

        <div className="case-hero-meta">
          <div>
            <CalendarDays size={16} />
            <span>Яратилган сана</span>
            <strong>{formatDate(item.createdAt, true)}</strong>
          </div>

          <div>
            <BriefcaseBusiness size={16} />
            <span>Қабул менежери</span>
            <strong>
              {item.receptionManager?.fullName || 'Бириктирилмаган'}
            </strong>
          </div>

          <div>
            <UserRound size={16} />
            <span>Ижрочи</span>
            <strong>{item.executor?.fullName || 'Бириктирилмаган'}</strong>
          </div>

          <div>
            <Landmark size={16} />
            <span>Банк</span>
            <strong>{displayedBankName}</strong>
          </div>
        </div>
      </section>

      <div className="case-details-grid">
        <div className="case-details-main-column">
          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Мижоз</span>
                <h3>Шахсий маълумотлар</h3>
              </div>

              <UserRound size={22} />
            </div>

            <div className="case-info-grid">
              <InfoItem
                icon={UserRound}
                label="Ф.И.Ш."
                value={applicant.fullName}
              />

              <InfoItem
                icon={Phone}
                label="Телефон рақами"
                value={applicant.phone}
              />

              <InfoItem
                icon={ShieldCheck}
                label="ЖШШИР"
                value={applicant.pinfl}
              />

              <InfoItem
                icon={FileText}
                label="Паспорт"
                value={
                  applicant.passportSeries || applicant.passportNumber
                    ? `${applicant.passportSeries || ''} ${
                        applicant.passportNumber || ''
                      }`.trim()
                    : '—'
                }
              />

              <InfoItem
                icon={CalendarDays}
                label="Туғилган сана"
                value={formatDate(applicant.birthDate)}
              />

              <InfoItem
                icon={MapPin}
                label="Яшаш манзили"
                value={applicant.address}
              />
            </div>
          </section>

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Жараён</span>
                <h3>Мурожаат босқичлари</h3>
              </div>

              <Clock3 size={22} />
            </div>

            {item.status === 'REJECTED' ||
            item.status === 'CANCELLED' ||
            item.status === 'ARCHIVED' ? (
              <div
                className={`special-status-message ${getStatusClass(
                  item.status
                )}`}
              >
                <strong>{STATUS_NAMES[item.status]}</strong>
                <span>
                  Ушбу мурожаат асосий иш жараёнидан чиқарилган.
                </span>
              </div>
            ) : (
              <div className="case-timeline">
                {MAIN_TIMELINE.map((status, index) => {
                  const completed = index < currentTimelineIndex;
                  const active = index === currentTimelineIndex;

                  return (
                    <div
                      className={`timeline-step ${
                        completed ? 'timeline-completed' : ''
                      } ${active ? 'timeline-active' : ''}`}
                      key={status}
                    >
                      <div className="timeline-marker">
                        {completed ? (
                          <CheckCircle2 size={22} />
                        ) : active ? (
                          <Clock3 size={22} />
                        ) : (
                          <Circle size={22} />
                        )}
                      </div>

                      <div>
                        <strong>{STATUS_NAMES[status]}</strong>
                        <span>
                          {completed
                            ? 'Босқич якунланган'
                            : active
                              ? 'Жорий босқич'
                              : 'Кутилаётган босқич'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <ParticipantsSection
            caseItem={item}
            onChanged={async () => {
              await loadCase();
              await onChanged?.();
            }}
          />

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Гаров</span>
                <h3>Гаровга олинаётган мулк маълумотлари</h3>
                <p>
                  Аввал гаров маълумотларини сақланг. Банк КАТМ ва мулк
                  ҳужжатларини текширгандан кейин кредит таклифини киритади.
                </p>
              </div>

              <WalletCards size={21} />
            </div>

            <form
              onSubmit={saveFinanceCollateral}
              className="finance-collateral-form"
              style={{
                display: 'grid',
                gap: 18,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                <label>
                  <span>Мулк тури</span>
                  <select
                    value={financeForm.collateralType}
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralType',
                        event.target.value
                      )
                    }
                    disabled={savingFinance}
                  >
                    <option value="">Танланг</option>
                    <option value="Квартира">Квартира</option>
                    <option value="Ҳовли уй">Ҳовли уй</option>
                    <option value="Нотурар жой">Нотурар жой</option>
                    <option value="Ер участкаси">Ер участкаси</option>
                    <option value="Бошқа">Бошқа</option>
                  </select>
                </label>

                <label>
                  <span>Кадастр рақами</span>
                  <input
                    value={financeForm.collateralCadastreNumber}
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralCadastreNumber',
                        event.target.value
                      )
                    }
                    placeholder="Кадастр рақами"
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Мулкдор Ф.И.Ш.</span>
                  <input
                    value={financeForm.collateralOwnerFullName}
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralOwnerFullName',
                        event.target.value
                      )
                    }
                    placeholder="Мулкдорнинг тўлиқ Ф.И.Ш."
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Мулкдор ЖШШИРи</span>
                  <input
                    value={financeForm.collateralOwnerPinfl}
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralOwnerPinfl',
                        event.target.value
                      )
                    }
                    placeholder="14 хонали ЖШШИР"
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Умумий майдони, м²</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={financeForm.collateralArea}
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralArea',
                        event.target.value
                      )
                    }
                    placeholder="71.17"
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Тахминий баҳоланган қиймати</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      financeForm.collateralEstimatedValue
                    }
                    onChange={(event) =>
                      updateFinanceField(
                        'collateralEstimatedValue',
                        event.target.value
                      )
                    }
                    placeholder="500000000"
                    disabled={savingFinance}
                  />
                </label>
              </div>

              <label>
                <span>Мулк манзили</span>
                <textarea
                  rows={2}
                  value={financeForm.collateralAddress}
                  onChange={(event) =>
                    updateFinanceField(
                      'collateralAddress',
                      event.target.value
                    )
                  }
                  placeholder="Вилоят, шаҳар/туман, маҳалла, кўча ва уй"
                  disabled={savingFinance}
                />
              </label>

              <label>
                <span>Гаров мулки ҳақида қўшимча маълумот</span>
                <textarea
                  rows={3}
                  value={financeForm.collateralNotes}
                  onChange={(event) =>
                    updateFinanceField(
                      'collateralNotes',
                      event.target.value
                    )
                  }
                  placeholder="Мулк ҳолати, таъқиқ, улушдорлар ва бошқа изоҳлар"
                  disabled={savingFinance}
                />
              </label>

              {financeError ? (
                <div className="form-error">{financeError}</div>
              ) : null}

              {financeSuccess ? (
                <div className="form-success">{financeSuccess}</div>
              ) : null}

              <button
                type="submit"
                className="primary"
                disabled={savingFinance}
              >
                {savingFinance ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Сақланмоқда...
                  </>
                ) : (
                  'Гаров маълумотларини сақлаш'
                )}
              </button>
            </form>
          </section>

          <MultiBankAssignmentsSection
            caseId={item.id}
            onChanged={loadCase}
          />

          <BankOffersSection
            caseId={item.id}
            onCaseChanged={loadCase}
            onOfferStateChange={setBankOfferState}
          />

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Хизмат ҳақи</span>
                <h3>Танланган банк таклифи бўйича ҳисоб</h3>
              </div>

              <Banknote size={21} />
            </div>

            {selectedBankOffer || (item.bankName && item.approvedAmount) ? (
              <div className="financial-summary">
                <div>
                  <span>Танланган банк</span>
                  <strong>{displayedBankName}</strong>
                </div>

                <div>
                  <span>Тасдиқланган кредит</span>
                  <strong>
                    {formatAmount(displayedApprovedAmount)}
                  </strong>
                </div>

                <div>
                  <span>Хизмат ҳақи ставкаси</span>
                  <strong>
                    {item.serviceFeePercent ?? 4.5}%
                  </strong>
                </div>

                <div>
                  <span>Автоматик хизмат ҳақи</span>
                  <strong>
                    {formatAmount(item.serviceFeeAutoAmount)}
                  </strong>
                </div>

                <div>
                  <span>Якуний хизмат ҳақи</span>
                  <strong>{formatAmount(item.serviceFee)}</strong>
                </div>
              </div>
            ) : (
              <EmptyBlock
                icon={Landmark}
                title="Банк жавоби кутилмоқда"
                text="КАТМ ва гаров мулки текширилиб, банк таклифи танлангандан кейин тасдиқланган сумма ва 4,5% хизмат ҳақи автоматик чиқади."
              />
            )}
          </section>

          <DocumentsSection
            caseId={item.id}
            applicantClientId={item.applicantClientId}
            onChanged={loadCase}
          />

          <ContractsSection
            caseId={item.id}
            onChanged={loadCase}
          />
        </div>

        <aside className="case-details-side-column">
          {canAssignExecutor ? (
            <section className="panel details-section executor-assign-panel">
              <div className="details-section-head">
                <div>
                  <span className="section-kicker">Ижро</span>
                  <h3>Ижрочига бириктириш</h3>
                  <p>
                    Шартнома тасдиқлангандан кейин ишни филиал ижрочисига
                    бириктиринг.
                  </p>
                </div>

                <UserCheck size={21} />
              </div>

              <div className="executor-current">
                <div className="executor-current-icon">
                  <UserRound size={18} />
                </div>

                <div>
                  <span>Ҳозирги ижрочи</span>
                  <strong>
                    {item.executor?.fullName || 'Ҳали бириктирилмаган'}
                  </strong>
                </div>
              </div>

              <form
                className="executor-assign-form"
                onSubmit={assignExecutor}
              >
                <label>
                  <span>Ижрочини танланг</span>

                  <select
                    value={executorId}
                    onChange={(event) => {
                      setExecutorId(event.target.value);
                      setExecutorError('');
                      setExecutorSuccess('');
                    }}
                    disabled={executorsLoading || executorSaving}
                  >
                    <option value="">
                      {executorsLoading
                        ? 'Ижрочилар юкланмоқда...'
                        : '— Ижрочини танланг —'}
                    </option>

                    {executors.map((executor) => (
                      <option value={executor.id} key={executor.id}>
                        {executor.fullName}
                        {executor.branch?.name
                          ? ` — ${executor.branch.name}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {executors.length === 0 && !executorsLoading ? (
                  <p className="executor-note">
                    Фаол ижрочи топилмади. «Ходимлар» бўлимида EXECUTOR
                    роли ва «Фаол» ҳолатини текширинг.
                  </p>
                ) : null}

                {executorError ? (
                  <div className="form-error">{executorError}</div>
                ) : null}

                {executorSuccess ? (
                  <div className="form-success">{executorSuccess}</div>
                ) : null}

                <button
                  type="submit"
                  className="executor-assign-button"
                  disabled={
                    executorSaving ||
                    executorsLoading ||
                    !executorId ||
                    executorId === item.executor?.id
                  }
                >
                  {executorSaving ? (
                    <>
                      <LoaderCircle className="spin" size={17} />
                      Бириктирилмоқда...
                    </>
                  ) : (
                    <>
                      <UserCheck size={17} />
                      {item.executor
                        ? 'Ижрочини алмаштириш'
                        : 'Ижрочига бириктириш'}
                    </>
                  )}
                </button>
              </form>
            </section>
          ) : null}

          <section className="panel details-section status-control-panel">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Бошқарув</span>
                <h3>Ҳолатни ўзгартириш</h3>
              </div>

              <RefreshCw size={21} />
            </div>

            <form className="status-change-form" onSubmit={changeStatus}>
              <label>
                <span>Янги ҳолат</span>

                <select
                  value={statusValue}
                  onChange={(event) => {
                    setStatusValue(event.target.value);
                    setStatusError('');
                    setStatusSuccess('');
                  }}
                  disabled={savingStatus}
                >
                  {ALL_STATUS_OPTIONS.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Изоҳ</span>

                <textarea
                  rows={4}
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  placeholder="Статус ўзгариши сабабини ёзинг..."
                  disabled={savingStatus}
                />
              </label>

              {statusError ? (
                <div className="form-error">{statusError}</div>
              ) : null}

              {statusSuccess ? (
                <div className="form-success">{statusSuccess}</div>
              ) : null}

              <button
                type="submit"
                className="primary status-save-button"
                disabled={
                  savingStatus ||
                  !statusValue ||
                  statusValue === item.status
                }
              >
                {savingStatus ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Сақланмоқда...
                  </>
                ) : (
                  'Ҳолатни сақлаш'
                )}
              </button>
            </form>
          </section>

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Тўловлар</span>
                <h3>Молиявий ҳаракатлар</h3>
              </div>

              <Banknote size={21} />
            </div>

            {item.payments?.length ? (
              <div className="details-card-list">
                {item.payments.map((payment) => (
                  <div className="payment-card" key={payment.id}>
                    <div>
                      <strong>{formatAmount(payment.amount)}</strong>
                      <span>
                        {payment.method || 'Усул киритилмаган'} ·{' '}
                        {formatDate(payment.createdAt)}
                      </span>
                    </div>

                    <span className="payment-status">
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={Banknote}
                title="Тўловлар мавжуд эмас"
                text="Хизмат ҳақи ва бошқа тўловлар кейин шу ерда кўринади."
              />
            )}
          </section>

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Тарих</span>
                <h3>Охирги ҳаракатлар</h3>
              </div>

              <Clock3 size={21} />
            </div>

            {item.history?.length ? (
              <div className="history-list">
                {item.history.map((historyItem) => (
                  <div className="history-item" key={historyItem.id}>
                    <div className="history-dot" />

                    <div>
                      <strong>
                        {STATUS_NAMES[historyItem.toStatus] ||
                          historyItem.toStatus}
                      </strong>

                      <span>
                        {historyItem.note || 'Статус ўзгартирилди'}
                      </span>

                      <small>
                        {formatDate(historyItem.createdAt, true)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={Clock3}
                title="Тарих мавжуд эмас"
                text="Статуслар ўзгарганда ҳаракатлар тарихи шу ерда сақланади."
              />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}