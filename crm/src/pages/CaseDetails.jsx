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
  UserRound,
  WalletCards,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

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
    approvedAmount: '',
    serviceFeePercent: '4.5',
    serviceFeeOverride: '',
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
        setFinanceForm({
          approvedAmount: loadedItem.approvedAmount ?? '',
          serviceFeePercent:
            loadedItem.serviceFeePercent ?? '4.5',
          serviceFeeOverride:
            loadedItem.serviceFee !== null &&
            loadedItem.serviceFee !== undefined &&
            Number(loadedItem.serviceFee) !==
              Number(loadedItem.serviceFeeAutoAmount)
              ? loadedItem.serviceFee
              : '',
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

  const updateFinanceField = (field, value) => {
    setFinanceForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const calculatedFee = useMemo(() => {
    const amount = Number(
      String(financeForm.approvedAmount)
        .replace(/\s/g, '')
        .replace(',', '.')
    );
    const percent = Number(
      String(financeForm.serviceFeePercent)
        .replace(/\s/g, '')
        .replace(',', '.')
    );

    if (!Number.isFinite(amount) || !Number.isFinite(percent)) {
      return null;
    }

    return Math.round((amount * percent) / 100);
  }, [
    financeForm.approvedAmount,
    financeForm.serviceFeePercent,
  ]);

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
        approvedAmount: data.item.approvedAmount ?? '',
        serviceFeePercent:
          data.item.serviceFeePercent ?? '4.5',
        serviceFeeOverride:
          Number(data.item.serviceFee) !==
          Number(data.item.serviceFeeAutoAmount)
            ? data.item.serviceFee ?? ''
            : '',
      }));

      setFinanceSuccess(
        'Хизмат ҳақи ва гаров мулки маълумотлари сақланди.'
      );

      onChanged?.(data.item);
    } catch (error) {
      setFinanceError(
        error.message ||
          'Молиявий ва гаров маълумотларини сақлаб бўлмади.'
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

  return (
    <div className="case-details-page">
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
            <strong>{item.bankName || 'Танланмаган'}</strong>
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

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Ҳужжатлар</span>
                <h3>Юкланган файллар</h3>
              </div>

              <FileText size={22} />
            </div>

            {item.documents?.length ? (
              <div className="case-document-list">
                {item.documents.map((document) => (
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="case-document-item"
                    key={document.id}
                  >
                    <FileText size={19} />

                    <div>
                      <strong>{document.fileName || document.type}</strong>
                      <span>{document.mimeType || 'Файл'}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={FileText}
                title="Ҳужжатлар юкланмаган"
                text="Паспорт, кадастр ва бошқа файллар кейинги босқичда шу ерга юкланади."
              />
            )}
          </section>

          <section className="panel details-section">
            <div className="details-section-head">
              <div>
                <span className="section-kicker">Шартномалар</span>
                <h3>Мижоз билан тузилган шартномалар</h3>
              </div>

              <BriefcaseBusiness size={22} />
            </div>

            {item.contracts?.length ? (
              <div className="details-card-list">
                {item.contracts.map((contract) => (
                  <div className="details-list-card" key={contract.id}>
                    <div>
                      <strong>{contract.displayId}</strong>
                      <span>
                        {contract.status} · {formatDate(contract.createdAt)}
                      </span>
                    </div>

                    {contract.pdfUrl ? (
                      <a
                        href={contract.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF очиш
                      </a>
                    ) : (
                      <span className="details-muted">PDF тайёр эмас</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={BriefcaseBusiness}
                title="Шартнома ҳали яратилмаган"
                text="Мижоз қарор қабул қилгандан кейин шартнома шу ерда пайдо бўлади."
              />
            )}
          </section>
        </div>

        <aside className="case-details-side-column">
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
                <span className="section-kicker">Хизмат ва гаров</span>
                <h3>Молиявий ҳамда мулк маълумотлари</h3>
              </div>

              <WalletCards size={21} />
            </div>

            <div className="financial-summary">
              <div>
                <span>Сўралган сумма</span>
                <strong>{formatAmount(item.requestedAmount)}</strong>
              </div>

              <div>
                <span>Тасдиқланган сумма</span>
                <strong>{formatAmount(item.approvedAmount)}</strong>
              </div>

              <div>
                <span>Хизмат ҳақи</span>
                <strong>{formatAmount(item.serviceFee)}</strong>
              </div>
            </div>

            <form
              onSubmit={saveFinanceCollateral}
              style={{
                display: 'grid',
                gap: 14,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 12,
                }}
              >
                <label>
                  <span>Тасдиқланган кредит суммаси</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={financeForm.approvedAmount}
                    onChange={(event) =>
                      updateFinanceField(
                        'approvedAmount',
                        event.target.value
                      )
                    }
                    placeholder="300000000"
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Хизмат ҳақи фоизи</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={financeForm.serviceFeePercent}
                    onChange={(event) =>
                      updateFinanceField(
                        'serviceFeePercent',
                        event.target.value
                      )
                    }
                    disabled={savingFinance}
                  />
                </label>

                <label>
                  <span>Автоматик ҳисоб</span>
                  <input
                    type="text"
                    value={formatAmount(calculatedFee)}
                    readOnly
                  />
                </label>

                <label>
                  <span>Якуний хизмат ҳақи — қўлда ўзгартириш</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={financeForm.serviceFeeOverride}
                    onChange={(event) =>
                      updateFinanceField(
                        'serviceFeeOverride',
                        event.target.value
                      )
                    }
                    placeholder="Бўш қолса 4,5% автоматик"
                    disabled={savingFinance}
                  />
                </label>
              </div>

              <div
                style={{
                  paddingTop: 6,
                  borderTop: '1px solid #ececec',
                }}
              >
                <strong>Гаровга олинаётган мулк</strong>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 12,
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
                  <span>Баҳоланган қиймати</span>
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
                  'Молиявий ва гаров маълумотларини сақлаш'
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