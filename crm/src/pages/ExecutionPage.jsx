import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  UserRound,
  Building2,
  CalendarDays,
  Banknote,
  Phone,
} from 'lucide-react';
import { apiRequest } from '../services/api.js';

const serviceNames = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

const statusNames = {
  ASSIGNED_TO_EXECUTOR: 'Ижрочига бириктирилган',
  IN_EXECUTION: 'Ижрода',
  PROPERTY_MONITORING: 'Объект кузатувида',
  CREDIT_APPROVED: 'Кредит тасдиқланган',
  CREDIT_ISSUED: 'Кредит ажратилган',
  CLIENT_RECEIVED_FUNDS: 'Мижоз маблағни олган',
  SERVICE_FEE_PAID: 'Хизмат ҳақи тўланган',
};

const executionStatuses = Object.keys(statusNames);

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

export function ExecutionPage({ user }) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        scope: 'execution',
        page: String(page),
        limit: '20',
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const data = await apiRequest(`/cases?${params.toString()}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(
        data.pagination || { page, limit: 20, total: 0, totalPages: 1 }
      );
    } catch (err) {
      setError(err.message || 'Ижродаги ишларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const subtitle = useMemo(() => {
    if (user?.role === 'EXECUTOR') {
      return 'Сизга бириктирилган ижродаги ишлар';
    }
    if (user?.role === 'BRANCH_MANAGER') {
      return 'Филиалингиздаги ижродаги ишлар';
    }
    return 'Барча ижрочиларга бириктирилган ишлар';
  }, [user]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openCase = (id) => {
    // CasesPage/CaseDetails ишлатаётган SPA ҳолатига таъсир қилмаслик учун
    // янги табда тўғридан-тўғри URL очмаймиз.
    // Ҳозир карточкада барча асосий маълумотлар кўринади.
    // Кейинги босқичда onOpenCase проп орқали CaseDetails'га уланади.
    console.log('Execution case:', id);
  };

  return (
    <section className="panel execution-page">
      <div className="panel-head execution-head">
        <div>
          <span className="execution-kicker">ИЖРО НАЗОРАТИ</span>
          <h2>Ижродаги ишлар</h2>
          <p>{subtitle}</p>
        </div>

        <button type="button" className="execution-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={18} />
          Янгилаш
        </button>
      </div>

      <div className="execution-toolbar">
        <form className="execution-search" onSubmit={submitSearch}>
          <Search size={18} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ID, Ф.И.Ш., телефон ёки ЖШШИР бўйича қидириш"
          />
          <button type="submit">Қидириш</button>
        </form>

        <select
          className="execution-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Барча ижро ҳолатлари</option>
          {executionStatuses.map((key) => (
            <option key={key} value={key}>
              {statusNames[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="execution-summary">
        <div>
          <BriefcaseBusiness size={19} />
          <span>Жами</span>
          <strong>{pagination.total || 0}</strong>
        </div>
        {user?.role === 'EXECUTOR' ? (
          <div>
            <UserRound size={19} />
            <span>Ижрочи</span>
            <strong>{user?.fullName || '—'}</strong>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="empty execution-empty">
          <RefreshCw size={34} />
          <strong>Ижродаги ишлар юкланмоқда...</strong>
        </div>
      ) : error ? (
        <div className="page-error execution-error">
          <strong>Маълумотларни юклаб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={load}>Қайта уриниш</button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty execution-empty">
          <BriefcaseBusiness size={40} />
          <strong>Ижродаги ишлар топилмади</strong>
          <span>Ижрочига бириктирилган мурожаатлар шу ерда кўринади.</span>
        </div>
      ) : (
        <div className="execution-list">
          {items.map((item) => (
            <article
              className="execution-card"
              key={item.id}
              onClick={() => openCase(item.id)}
            >
              <div className="execution-card-top">
                <div>
                  <span className="execution-id">{item.displayId || item.id}</span>
                  <h3>{item.applicant?.fullName || 'Мижоз номи киритилмаган'}</h3>
                </div>
                <span className={`execution-status status-${item.status || 'unknown'}`}>
                  {statusNames[item.status] || item.status || '—'}
                </span>
              </div>

              <div className="execution-card-grid">
                <div>
                  <BriefcaseBusiness size={17} />
                  <span>Хизмат</span>
                  <strong>{serviceNames[item.serviceType] || item.serviceType || '—'}</strong>
                </div>
                <div>
                  <UserRound size={17} />
                  <span>Ижрочи</span>
                  <strong>{item.executor?.fullName || 'Бириктирилмаган'}</strong>
                </div>
                <div>
                  <Building2 size={17} />
                  <span>Филиал</span>
                  <strong>{item.branch?.name || '—'}</strong>
                </div>
                <div>
                  <Banknote size={17} />
                  <span>Сўралаётган сумма</span>
                  <strong>{formatMoney(item.requestedAmount)}</strong>
                </div>
                <div>
                  <Phone size={17} />
                  <span>Телефон</span>
                  <strong>{item.applicant?.phone || '—'}</strong>
                </div>
                <div>
                  <CalendarDays size={17} />
                  <span>Яратилган сана</span>
                  <strong>{formatDate(item.createdAt)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && pagination.totalPages > 1 ? (
        <div className="execution-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} />
            Олдинги
          </button>

          <span>
            {pagination.page || page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Кейинги
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}

      <style>{`
        .execution-page { overflow: hidden; }
        .execution-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
        .execution-kicker { display:block; margin-bottom:6px; color:#ef233c; font-size:11px; font-weight:800; letter-spacing:.08em; }
        .execution-head h2 { margin:0 0 5px; }
        .execution-head p { margin:0; color:#7b8190; }
        .execution-refresh { display:flex; align-items:center; gap:8px; border:1px solid #e2e5ea; background:#fff; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .execution-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:12px; padding:18px; border-top:1px solid #edf0f3; border-bottom:1px solid #edf0f3; }
        .execution-search { display:flex; align-items:center; gap:10px; border:1px solid #dfe3e8; border-radius:11px; padding-left:12px; background:#fff; }
        .execution-search input { min-width:0; flex:1; border:0; outline:0; padding:12px 0; font:inherit; }
        .execution-search button { align-self:stretch; border:0; border-radius:0 10px 10px 0; padding:0 18px; background:#ef233c; color:#fff; font-weight:700; cursor:pointer; }
        .execution-status-filter { border:1px solid #dfe3e8; border-radius:11px; padding:0 12px; background:#fff; font:inherit; }
        .execution-summary { display:flex; gap:12px; padding:16px 18px 0; }
        .execution-summary > div { display:flex; align-items:center; gap:8px; background:#f7f8fa; border-radius:10px; padding:10px 12px; }
        .execution-summary span { color:#7b8190; font-size:12px; }
        .execution-summary strong { font-size:13px; }
        .execution-list { display:grid; gap:12px; padding:18px; }
        .execution-card { border:1px solid #e3e6ea; border-radius:14px; padding:17px; background:#fff; transition:.15s ease; }
        .execution-card:hover { border-color:#ef9aa5; box-shadow:0 6px 22px rgba(20,25,35,.06); }
        .execution-card-top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding-bottom:14px; border-bottom:1px solid #eef0f2; }
        .execution-id { color:#ef233c; font-size:12px; font-weight:800; }
        .execution-card h3 { margin:5px 0 0; font-size:17px; }
        .execution-status { flex:none; padding:7px 10px; border-radius:999px; background:#fff4f5; color:#d71932; font-size:11px; font-weight:800; }
        .execution-card-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; padding-top:14px; }
        .execution-card-grid > div { display:grid; grid-template-columns:22px 1fr; column-gap:7px; align-items:start; }
        .execution-card-grid svg { grid-row:1 / span 2; color:#ef233c; margin-top:2px; }
        .execution-card-grid span { color:#8a909d; font-size:11px; }
        .execution-card-grid strong { margin-top:2px; font-size:13px; overflow-wrap:anywhere; }
        .execution-empty { min-height:260px; }
        .execution-pagination { display:flex; justify-content:center; align-items:center; gap:14px; padding:0 18px 20px; }
        .execution-pagination button { display:flex; align-items:center; gap:6px; border:1px solid #dfe3e8; background:#fff; border-radius:9px; padding:9px 12px; font-weight:700; cursor:pointer; }
        .execution-pagination button:disabled { opacity:.45; cursor:not-allowed; }
        .execution-pagination span { font-weight:800; }
        @media (max-width: 900px) {
          .execution-toolbar { grid-template-columns:1fr; }
          .execution-status-filter { min-height:44px; }
          .execution-card-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media (max-width: 620px) {
          .execution-head, .execution-card-top { flex-direction:column; }
          .execution-card-grid { grid-template-columns:1fr; }
          .execution-search button { padding:0 12px; }
          .execution-summary { flex-direction:column; }
        }
      `}</style>
    </section>
  );
}
