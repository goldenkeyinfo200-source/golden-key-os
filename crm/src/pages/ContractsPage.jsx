import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  UserRound,
  CalendarDays,
  BriefcaseBusiness,
  Building2,
  Download,
  ExternalLink,
  Trash2,
  LoaderCircle,
} from 'lucide-react';
import { apiRequest, USER_KEY } from '../services/api.js';

const STATUS_LABELS = {
  DRAFT: 'Қоралама',
  MANAGER_REVIEW: 'Менежер кўриб чиқмоқда',
  READY_TO_SIGN: 'Тасдиқлашга тайёр',
  SIGNED: 'Тасдиқланган',
  CANCELLED: 'Бекор қилинган',
  ARCHIVED: 'Архивланган',
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

function formatDate(value, withTime = false) {
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


function readCurrentUserRole() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    return user?.role || null;
  } catch {
    return null;
  }
}

export function ContractsPage() {
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
  const [deletingId, setDeletingId] = useState(null);

  const currentRole = useMemo(() => readCurrentUserRole(), []);
  const canDelete = ['SUPER_ADMIN', 'DIRECTOR'].includes(currentRole);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const data = await apiRequest(
        `/contracts?${params.toString()}`
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
          'Шартномаларни юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: pagination.total || 0,
      signed: items.filter((item) => item.status === 'SIGNED')
        .length,
      pending: items.filter((item) =>
        ['DRAFT', 'MANAGER_REVIEW', 'READY_TO_SIGN'].includes(
          item.status
        )
      ).length,
    };
  }, [items, pagination.total]);


  const deleteContract = async (contract) => {
    if (!canDelete || deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `${contract.displayId} шартномасини бутунлай ўчиришни тасдиқлайсизми?\n\nБу амални орқага қайтариб бўлмайди.`
    );

    if (!confirmed) {
      return;
    }

    const typed = window.prompt(
      `Хавфсизлик учун шартнома рақамини қайта киритинг:\n${contract.displayId}`
    );

    if (typed === null) {
      return;
    }

    if (typed.trim() !== contract.displayId) {
      window.alert(
        'Шартнома рақами мос келмади. Ўчириш бекор қилинди.'
      );
      return;
    }

    setDeletingId(contract.id);
    setError('');

    try {
      const result = await apiRequest(
        `/contracts/${contract.id}`,
        {
          method: 'DELETE',
        }
      );

      if (result.storageWarning) {
        window.alert(
          `Шартнома базадан ўчирилди, лекин PDF файл Storage дан ўчирилмади:\n${result.storageWarning}`
        );
      }

      const nextPage =
        items.length === 1 && page > 1
          ? page - 1
          : page;

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await load();
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          'Шартномани ўчиришда хато юз берди.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <section className="panel contracts-page">
      <div className="panel-head contracts-page-head">
        <div>
          <span className="contracts-page-kicker">
            ШАРТНОМАЛАР
          </span>
          <h2>Барча шартномалар</h2>
          <p>
            Мижозлар билан тузилган шартномалар ва уларнинг
            ҳолати.
          </p>
        </div>

        <button
          type="button"
          className="contracts-page-refresh"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={18} />
          Янгилаш
        </button>
      </div>

      <div className="contracts-page-toolbar">
        <form
          className="contracts-page-search"
          onSubmit={submitSearch}
        >
          <Search size={18} />
          <input
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Шартнома ID, мурожаат ID, Ф.И.Ш. ёки телефон"
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
          <option value="">Барча ҳолатлар</option>
          <option value="READY_TO_SIGN">
            Тасдиқлашга тайёр
          </option>
          <option value="SIGNED">Тасдиқланган</option>
          <option value="CANCELLED">Бекор қилинган</option>
        </select>
      </div>

      <div className="contracts-page-summary">
        <div>
          <FileText size={18} />
          <span>Жами</span>
          <strong>{stats.total}</strong>
        </div>

        <div>
          <BriefcaseBusiness size={18} />
          <span>Ушбу саҳифада тасдиқланган</span>
          <strong>{stats.signed}</strong>
        </div>

        <div>
          <CalendarDays size={18} />
          <span>Кутилаётган</span>
          <strong>{stats.pending}</strong>
        </div>
      </div>

      {loading ? (
        <div className="contracts-page-state">
          <RefreshCw size={34} />
          <strong>Шартномалар юкланмоқда...</strong>
        </div>
      ) : error ? (
        <div className="contracts-page-state error">
          <strong>Маълумотларни юклаб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={load}>
            Қайта уриниш
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="contracts-page-state">
          <FileText size={40} />
          <strong>Шартномалар топилмади</strong>
          <span>
            Мурожаат карточкасида яратилган шартномалар шу ерда
            кўринади.
          </span>
        </div>
      ) : (
        <div className="contracts-page-list">
          {items.map((contract) => (
            <article
              className="contracts-page-card"
              key={contract.id}
            >
              <div className="contracts-page-card-top">
                <div>
                  <span className="contracts-page-id">
                    {contract.displayId}
                  </span>
                  <h3>
                    {contract.case?.applicant?.fullName ||
                      'Мижоз номи йўқ'}
                  </h3>
                </div>

                <span
                  className={`contracts-page-status status-${
                    contract.status || 'unknown'
                  }`}
                >
                  {STATUS_LABELS[contract.status] ||
                    contract.status ||
                    '—'}
                </span>
              </div>

              <div className="contracts-page-grid">
                <div>
                  <FileText size={17} />
                  <span>Мурожаат</span>
                  <strong>
                    {contract.case?.displayId || '—'}
                  </strong>
                </div>

                <div>
                  <BriefcaseBusiness size={17} />
                  <span>Хизмат</span>
                  <strong>
                    {SERVICE_LABELS[
                      contract.case?.serviceType
                    ] ||
                      contract.case?.serviceType ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <UserRound size={17} />
                  <span>Мижоз</span>
                  <strong>
                    {contract.case?.applicant?.phone || '—'}
                  </strong>
                </div>

                <div>
                  <Building2 size={17} />
                  <span>Филиал</span>
                  <strong>
                    {contract.case?.branch?.name || '—'}
                  </strong>
                </div>

                <div>
                  <CalendarDays size={17} />
                  <span>Яратилган</span>
                  <strong>
                    {formatDate(contract.createdAt, true)}
                  </strong>
                </div>

                <div>
                  <CalendarDays size={17} />
                  <span>Тасдиқланган</span>
                  <strong>
                    {formatDate(contract.signedAt, true)}
                  </strong>
                </div>
              </div>

              <div className="contracts-page-actions">
                {contract.pdfUrl ? (
                  <>
                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={16} />
                      PDF кўриш
                    </a>

                    <a
                      href={contract.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={`${contract.displayId}.pdf`}
                      title="PDF юклаб олиш"
                    >
                      <Download size={16} />
                    </a>
                  </>
                ) : (
                  <span className="contracts-page-muted">
                    PDF ҳали тайёр эмас
                  </span>
                )}

                {canDelete ? (
                  <button
                    type="button"
                    className="contracts-page-delete"
                    onClick={() => deleteContract(contract)}
                    disabled={deletingId === contract.id}
                    title="Тест ёки нотўғри шартномани ўчириш"
                  >
                    {deletingId === contract.id ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Ўчириш
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading &&
      !error &&
      pagination.totalPages > 1 ? (
        <div className="contracts-page-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((value) => Math.max(1, value - 1))
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
              setPage((value) => value + 1)
            }
          >
            Кейинги
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}

      <style>{`
        .contracts-page {
          overflow: hidden;
        }

        .contracts-page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .contracts-page-kicker {
          display: block;
          margin-bottom: 6px;
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .contracts-page-head h2 {
          margin: 0 0 5px;
        }

        .contracts-page-head p {
          margin: 0;
          color: #7b8190;
        }

        .contracts-page-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e1e5e9;
          border-radius: 10px;
          padding: 10px 14px;
          background: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .contracts-page-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 240px;
          gap: 12px;
          padding: 18px;
          border-top: 1px solid #edf0f3;
          border-bottom: 1px solid #edf0f3;
        }

        .contracts-page-search {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #dfe3e8;
          border-radius: 11px;
          padding-left: 12px;
          background: #fff;
        }

        .contracts-page-search input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          padding: 12px 0;
          font: inherit;
        }

        .contracts-page-search button {
          align-self: stretch;
          border: 0;
          border-radius: 0 10px 10px 0;
          padding: 0 18px;
          background: #ef233c;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .contracts-page-toolbar select {
          border: 1px solid #dfe3e8;
          border-radius: 11px;
          padding: 0 12px;
          background: #fff;
          font: inherit;
        }

        .contracts-page-summary {
          display: flex;
          gap: 12px;
          padding: 16px 18px 0;
          flex-wrap: wrap;
        }

        .contracts-page-summary > div {
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 10px;
          padding: 10px 12px;
          background: #f7f8fa;
        }

        .contracts-page-summary span {
          color: #7b8190;
          font-size: 12px;
        }

        .contracts-page-list {
          display: grid;
          gap: 12px;
          padding: 18px;
        }

        .contracts-page-card {
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          padding: 17px;
          background: #fff;
        }

        .contracts-page-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid #eef0f2;
        }

        .contracts-page-id {
          color: #ef233c;
          font-size: 12px;
          font-weight: 900;
        }

        .contracts-page-card h3 {
          margin: 5px 0 0;
          font-size: 17px;
        }

        .contracts-page-status {
          border-radius: 999px;
          padding: 7px 10px;
          background: #f0f2f4;
          color: #555b63;
          font-size: 11px;
          font-weight: 900;
        }

        .status-SIGNED {
          background: #dcf8e8;
          color: #087742;
        }

        .status-CANCELLED {
          background: #fff0f1;
          color: #cf1f2a;
        }

        .contracts-page-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding-top: 14px;
        }

        .contracts-page-grid > div {
          display: grid;
          grid-template-columns: 22px 1fr;
          column-gap: 7px;
        }

        .contracts-page-grid svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .contracts-page-grid span {
          color: #8a909d;
          font-size: 11px;
        }

        .contracts-page-grid strong {
          margin-top: 2px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .contracts-page-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }

        .contracts-page-actions a {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 9px 11px;
          color: #25282c;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .contracts-page-delete {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          padding: 9px 11px;
          background: #fff;
          color: #dc2626;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .contracts-page-delete:hover:not(:disabled) {
          border-color: #fca5a5;
          background: #fff5f5;
        }

        .contracts-page-delete:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .contracts-page-muted {
          color: #8a909d;
          font-size: 12px;
        }

        .contracts-page-state {
          min-height: 260px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 20px;
          text-align: center;
          color: #8c939c;
        }

        .contracts-page-state.error {
          color: #c9212c;
        }

        .contracts-page-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          padding: 0 18px 20px;
        }

        .contracts-page-pagination button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 9px 12px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .contracts-page-pagination button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .contracts-page-toolbar {
            grid-template-columns: 1fr;
          }

          .contracts-page-toolbar select {
            min-height: 44px;
          }

          .contracts-page-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .contracts-page-head,
          .contracts-page-card-top {
            flex-direction: column;
          }

          .contracts-page-grid {
            grid-template-columns: 1fr;
          }

          .contracts-page-search button {
            padding: 0 12px;
          }
        }
      `}</style>
    </section>
  );
}
