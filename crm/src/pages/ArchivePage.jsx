import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  FileText,
  LoaderCircle,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const STATUS_OPTIONS = [
  ['', 'Барча якунланган ишлар'],
  ['COMPLETED', 'Якунланган'],
  ['ARCHIVED', 'Архивланган'],
  ['REJECTED', 'Рад этилган'],
  ['CANCELLED', 'Бекор қилинган'],
];

const STATUS_LABELS = {
  COMPLETED: 'Якунланган',
  ARCHIVED: 'Архивланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
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
};

const SERVICE_LABELS = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

function formatDate(value, withTime = true) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

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

function statusClass(status) {
  if (status === 'COMPLETED') return 'archive-status-completed';
  if (status === 'ARCHIVED') return 'archive-status-archived';
  return 'archive-status-cancelled';
}

function finalDate(item) {
  if (item.status === 'COMPLETED' && item.completedAt) {
    return item.completedAt;
  }

  return item.updatedAt || item.createdAt;
}

function ArchiveDetails({ caseId, onClose }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError('');

    try {
      const data = await apiRequest(`/cases/${caseId}`);
      setItem(data.item || null);
    } catch (requestError) {
      setError(
        requestError.message ||
          'Архив карточкасини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeWithEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', closeWithEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const paidAmount = useMemo(() => {
    if (!item?.payments?.length) return 0;

    return item.payments
      .filter((payment) =>
        ['PAID', 'PARTIAL'].includes(payment.status)
      )
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );
  }, [item]);

  return (
    <div
      className="archive-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="archive-modal">
        <div className="archive-modal-head">
          <div>
            <span>АРХИВ КАРТОЧКАСИ</span>
            <h3>{item?.displayId || 'Юкланмоқда...'}</h3>
          </div>

          <button type="button" onClick={onClose}>
            <X size={21} />
          </button>
        </div>

        {loading ? (
          <div className="archive-modal-state">
            <LoaderCircle className="spin" size={34} />
            <strong>Маълумотлар юкланмоқда...</strong>
          </div>
        ) : error ? (
          <div className="archive-modal-state archive-error">
            <CircleX size={34} />
            <strong>{error}</strong>
            <button type="button" onClick={load}>
              Қайта уриниш
            </button>
          </div>
        ) : !item ? (
          <div className="archive-modal-state">
            <Archive size={36} />
            <strong>Мурожаат топилмади</strong>
          </div>
        ) : (
          <div className="archive-modal-content">
            <div className="archive-detail-status-row">
              <span className={`archive-status ${statusClass(item.status)}`}>
                {STATUS_LABELS[item.status] || item.status}
              </span>
              <span>
                Якунланган сана: {formatDate(finalDate(item))}
              </span>
            </div>

            <section className="archive-detail-section">
              <h4>Асосий маълумотлар</h4>

              <div className="archive-detail-grid">
                <div>
                  <UserRound size={18} />
                  <span>Мижоз</span>
                  <strong>{item.applicant?.fullName || '—'}</strong>
                </div>

                <div>
                  <Phone size={18} />
                  <span>Телефон</span>
                  <strong>{item.applicant?.phone || '—'}</strong>
                </div>

                <div>
                  <FileText size={18} />
                  <span>Хизмат</span>
                  <strong>
                    {SERVICE_LABELS[item.serviceType] ||
                      item.serviceType ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <Building2 size={18} />
                  <span>Филиал</span>
                  <strong>{item.branch?.name || '—'}</strong>
                </div>

                <div>
                  <UserRound size={18} />
                  <span>Қабул менежери</span>
                  <strong>
                    {item.receptionManager?.fullName || '—'}
                  </strong>
                </div>

                <div>
                  <UserRound size={18} />
                  <span>Ижрочи</span>
                  <strong>{item.executor?.fullName || '—'}</strong>
                </div>
              </div>
            </section>

            <section className="archive-detail-section">
              <h4>Молиявий маълумотлар</h4>

              <div className="archive-detail-grid">
                <div>
                  <Banknote size={18} />
                  <span>Сўралган сумма</span>
                  <strong>{formatAmount(item.requestedAmount)}</strong>
                </div>

                <div>
                  <Banknote size={18} />
                  <span>Тасдиқланган сумма</span>
                  <strong>{formatAmount(item.approvedAmount)}</strong>
                </div>

                <div>
                  <Banknote size={18} />
                  <span>Хизмат ҳақи</span>
                  <strong>{formatAmount(item.serviceFee)}</strong>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>Тўланган</span>
                  <strong>{formatAmount(paidAmount)}</strong>
                </div>

                <div>
                  <Building2 size={18} />
                  <span>Банк</span>
                  <strong>{item.bankName || '—'}</strong>
                </div>

                <div>
                  <CalendarDays size={18} />
                  <span>Мижоз маблағни олган</span>
                  <strong>{formatDate(item.clientReceivedAt)}</strong>
                </div>
              </div>
            </section>

            <section className="archive-detail-section">
              <h4>Шартномалар</h4>

              {item.contracts?.length ? (
                <div className="archive-contract-list">
                  {item.contracts.map((contract) => (
                    <div key={contract.id}>
                      <div>
                        <strong>{contract.displayId}</strong>
                        <span>
                          {contract.status} ·{' '}
                          {formatDate(contract.signedAt || contract.createdAt)}
                        </span>
                      </div>

                      {contract.pdfUrl ? (
                        <a
                          href={contract.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="archive-muted">
                  Шартнома мавжуд эмас.
                </p>
              )}
            </section>

            <section className="archive-detail-section">
              <h4>Жараён тарихи</h4>

              {item.history?.length ? (
                <div className="archive-history">
                  {item.history.map((historyItem) => (
                    <div key={historyItem.id}>
                      <span>{formatDate(historyItem.createdAt)}</span>

                      <div>
                        <strong>
                          {STATUS_LABELS[historyItem.toStatus] ||
                            historyItem.toStatus}
                        </strong>
                        <p>
                          {historyItem.note ||
                            'Статус ўзгартирилди'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="archive-muted">
                  Жараён тарихи мавжуд эмас.
                </p>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

export function ArchivePage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        scope: 'archive',
        page: String(page),
        limit: '20',
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (serviceType) params.set('serviceType', serviceType);

      const data = await apiRequest(
        `/cases?${params.toString()}`
      );

      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(
        data.pagination || {
          page,
          limit: 20,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          'Архив маълумотларини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, serviceType]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const counts = useMemo(() => {
    return {
      visible: items.length,
      total: pagination.total || 0,
      completed: items.filter(
        (item) => item.status === 'COMPLETED'
      ).length,
      stopped: items.filter((item) =>
        ['REJECTED', 'CANCELLED'].includes(item.status)
      ).length,
    };
  }, [items, pagination.total]);

  return (
    <>
      <section className="panel archive-page">
        <div className="archive-head">
          <div>
            <span className="archive-kicker">АРХИВ</span>
            <h2>Якунланган ишлар</h2>
            <p>
              Якунланган, архивланган, рад этилган ва бекор
              қилинган мурожаатларни кўринг.
            </p>
          </div>

          <button
            type="button"
            className="archive-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Янгилаш
          </button>
        </div>

        <div className="archive-stats">
          <div>
            <Archive size={20} />
            <span>Жами архив</span>
            <strong>{counts.total}</strong>
          </div>

          <div>
            <CheckCircle2 size={20} />
            <span>Ушбу саҳифада якунланган</span>
            <strong>{counts.completed}</strong>
          </div>

          <div>
            <CircleX size={20} />
            <span>Рад / бекор</span>
            <strong>{counts.stopped}</strong>
          </div>
        </div>

        <div className="archive-toolbar">
          <form className="archive-search" onSubmit={submitSearch}>
            <Search size={18} />

            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="ID, Ф.И.Ш., телефон, ЖШШИР ёки паспорт"
            />

            <button type="submit">Қидириш</button>
          </form>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value || 'all'} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={serviceType}
            onChange={(event) => {
              setServiceType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Барча хизматлар</option>
            {Object.entries(SERVICE_LABELS).map(
              ([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>

        {loading ? (
          <div className="archive-state">
            <LoaderCircle className="spin" size={36} />
            <strong>Архив юкланмоқда...</strong>
          </div>
        ) : error ? (
          <div className="archive-state archive-error">
            <CircleX size={38} />
            <strong>Архивни юклаб бўлмади</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>
              Қайта уриниш
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="archive-state">
            <Archive size={42} />
            <strong>Архивда маълумот топилмади</strong>
            <span>
              Якунланган ишлар автоматик равишда ушбу рўйхатда
              кўринади.
            </span>
          </div>
        ) : (
          <div className="archive-list">
            {items.map((item) => (
              <button
                type="button"
                className="archive-card"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="archive-card-top">
                  <div>
                    <span className="archive-case-id">
                      {item.displayId}
                    </span>

                    <h3>
                      {item.applicant?.fullName ||
                        'Мижоз номи кўрсатилмаган'}
                    </h3>

                    <small>
                      {item.applicant?.phone || '—'}
                    </small>
                  </div>

                  <span
                    className={`archive-status ${statusClass(
                      item.status
                    )}`}
                  >
                    {STATUS_LABELS[item.status] ||
                      item.status}
                  </span>
                </div>

                <div className="archive-card-grid">
                  <div>
                    <FileText size={17} />
                    <span>Хизмат</span>
                    <strong>
                      {SERVICE_LABELS[item.serviceType] ||
                        item.serviceType}
                    </strong>
                  </div>

                  <div>
                    <Building2 size={17} />
                    <span>Филиал</span>
                    <strong>{item.branch?.name || '—'}</strong>
                  </div>

                  <div>
                    <UserRound size={17} />
                    <span>Ижрочи</span>
                    <strong>
                      {item.executor?.fullName || '—'}
                    </strong>
                  </div>

                  <div>
                    <Banknote size={17} />
                    <span>Сўралган сумма</span>
                    <strong>
                      {formatAmount(item.requestedAmount)}
                    </strong>
                  </div>

                  <div>
                    <CalendarDays size={17} />
                    <span>Якунланган</span>
                    <strong>
                      {formatDate(finalDate(item), false)}
                    </strong>
                  </div>

                  <div>
                    <FileText size={17} />
                    <span>Ҳужжатлар</span>
                    <strong>
                      {item._count?.contracts || 0} шартнома ·{' '}
                      {item._count?.documents || 0} ҳужжат
                    </strong>
                  </div>
                </div>

                <div className="archive-card-footer">
                  <span>Карточкани очиш</span>
                  <ChevronRight size={18} />
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading &&
        !error &&
        pagination.totalPages > 1 ? (
          <div className="archive-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
            >
              <ChevronLeft size={18} />
              Олдинги
            </button>

            <span>
              {pagination.page || page} /{' '}
              {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Кейинги
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </section>

      {selectedId ? (
        <ArchiveDetails
          caseId={selectedId}
          onClose={() => setSelectedId('')}
        />
      ) : null}

      <style>{`
        .archive-page {
          overflow: hidden;
        }

        .archive-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
        }

        .archive-kicker {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .archive-head h2 {
          margin: 5px 0;
        }

        .archive-head p {
          margin: 0;
          color: #7f8590;
          font-size: 13px;
        }

        .archive-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding: 10px 13px;
          background: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .archive-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 0 18px 14px;
        }

        .archive-stats > div {
          display: grid;
          grid-template-columns: 28px 1fr;
          column-gap: 8px;
          border: 1px solid #e4e7eb;
          border-radius: 12px;
          padding: 13px;
          background: #fff;
        }

        .archive-stats svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .archive-stats span {
          color: #858b94;
          font-size: 11px;
        }

        .archive-stats strong {
          margin-top: 3px;
          font-size: 20px;
        }

        .archive-toolbar {
          display: grid;
          grid-template-columns: minmax(300px, 1fr) 210px 220px;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid #edf0f3;
          border-bottom: 1px solid #edf0f3;
        }

        .archive-search {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding-left: 11px;
          background: #fff;
        }

        .archive-search input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          padding: 11px 0;
          font: inherit;
        }

        .archive-search button {
          align-self: stretch;
          border: 0;
          border-radius: 0 9px 9px 0;
          padding: 0 15px;
          background: #ef233c;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .archive-toolbar select {
          min-height: 43px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding: 0 11px;
          background: #fff;
          font: inherit;
        }

        .archive-list {
          display: grid;
          gap: 12px;
          padding: 18px;
        }

        .archive-card {
          width: 100%;
          border: 1px solid #e4e7eb;
          border-radius: 14px;
          padding: 16px;
          background: #fff;
          color: inherit;
          text-align: left;
          font: inherit;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .archive-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 9px 24px rgba(16, 24, 40, .07);
        }

        .archive-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 13px;
          border-bottom: 1px solid #eef0f2;
        }

        .archive-case-id {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
        }

        .archive-card h3 {
          margin: 4px 0 2px;
          font-size: 16px;
        }

        .archive-card small {
          color: #858b94;
        }

        .archive-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .archive-status-completed {
          background: #ddf8e8;
          color: #087742;
        }

        .archive-status-archived {
          background: #eef0f3;
          color: #515861;
        }

        .archive-status-cancelled {
          background: #fff0f1;
          color: #c9212c;
        }

        .archive-card-grid,
        .archive-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
          padding-top: 14px;
        }

        .archive-card-grid > div,
        .archive-detail-grid > div {
          display: grid;
          grid-template-columns: 22px 1fr;
          column-gap: 7px;
        }

        .archive-card-grid svg,
        .archive-detail-grid svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .archive-card-grid span,
        .archive-detail-grid span {
          color: #8a9098;
          font-size: 10px;
        }

        .archive-card-grid strong,
        .archive-detail-grid strong {
          margin-top: 2px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .archive-card-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid #eef0f2;
          color: #ef233c;
          font-size: 11px;
          font-weight: 800;
        }

        .archive-state {
          min-height: 290px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 20px;
          color: #858b94;
          text-align: center;
        }

        .archive-error {
          color: #c9212c;
        }

        .archive-state button,
        .archive-modal-state button {
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 9px 12px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .archive-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          padding: 0 18px 20px;
        }

        .archive-pagination button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 9px 11px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .archive-pagination button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .archive-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: flex;
          justify-content: flex-end;
          background: rgba(15, 23, 42, .56);
        }

        .archive-modal {
          width: min(720px, 100%);
          height: 100%;
          overflow: auto;
          background: #fff;
          box-shadow: -18px 0 45px rgba(0, 0, 0, .16);
        }

        .archive-modal-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 18px;
          border-bottom: 1px solid #edf0f3;
          background: #fff;
        }

        .archive-modal-head span {
          color: #ef233c;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .archive-modal-head h3 {
          margin: 4px 0 0;
          font-size: 20px;
        }

        .archive-modal-head button {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          border: 1px solid #e1e5e9;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .archive-modal-state {
          min-height: 400px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          text-align: center;
          color: #858b94;
        }

        .archive-modal-content {
          padding: 18px;
        }

        .archive-detail-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .archive-detail-status-row > span:last-child {
          color: #858b94;
          font-size: 11px;
        }

        .archive-detail-section {
          margin-top: 14px;
          border: 1px solid #e4e7eb;
          border-radius: 13px;
          padding: 14px;
        }

        .archive-detail-section h4 {
          margin: 0 0 5px;
        }

        .archive-detail-grid {
          padding-top: 10px;
        }

        .archive-contract-list {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }

        .archive-contract-list > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 9px;
          padding: 10px 11px;
          background: #f7f8fa;
        }

        .archive-contract-list > div > div {
          display: grid;
          gap: 2px;
        }

        .archive-contract-list span {
          color: #858b94;
          font-size: 10px;
        }

        .archive-contract-list a {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .archive-history {
          display: grid;
          gap: 0;
          margin-top: 8px;
        }

        .archive-history > div {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #eef0f2;
        }

        .archive-history > div:last-child {
          border-bottom: 0;
        }

        .archive-history > div > span {
          color: #858b94;
          font-size: 10px;
        }

        .archive-history strong {
          font-size: 12px;
        }

        .archive-history p {
          margin: 3px 0 0;
          color: #727983;
          font-size: 11px;
        }

        .archive-muted {
          color: #858b94;
          font-size: 12px;
        }

        @media (max-width: 950px) {
          .archive-toolbar {
            grid-template-columns: 1fr 1fr;
          }

          .archive-search {
            grid-column: 1 / -1;
          }

          .archive-card-grid,
          .archive-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .archive-head,
          .archive-card-top,
          .archive-detail-status-row {
            align-items: stretch;
            flex-direction: column;
          }

          .archive-stats,
          .archive-toolbar,
          .archive-card-grid,
          .archive-detail-grid {
            grid-template-columns: 1fr;
          }

          .archive-search {
            grid-column: auto;
          }

          .archive-history > div {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </>
  );
}
