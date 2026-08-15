import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  LoaderCircle,
  RefreshCw,
  Search,
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
  ARCHIVED: 'Архивланган',
  CANCELLED: 'Бекор қилинган',
};

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

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

      const data = await apiRequest(`/cases?${params.toString()}`);

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

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setServiceType('');
    setPage(1);
  };

  return (
    <>
      <section className="cases-toolbar">
        <form className="cases-search" onSubmit={submitSearch}>
          <Search size={19} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ID, Ф.И.Ш., телефон, ЖШШИР ёки паспорт..."
          />
          <button type="submit">Қидириш</button>
        </form>

        <div className="case-filter">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Барча ҳолатлар</option>
            <option value="ARCHIVED">Архивланган</option>
            <option value="CANCELLED">Бекор қилинган</option>
          </select>
        </div>

        <div className="case-filter">
          <select
            value={serviceType}
            onChange={(event) => {
              setServiceType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Барча хизматлар</option>
            {Object.entries(SERVICE_NAMES).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={load}
          disabled={loading}
          title="Янгилаш"
        >
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>

        {(search || status || serviceType) ? (
          <button
            type="button"
            className="clear-filter-button"
            onClick={clearFilters}
          >
            Тозалаш
          </button>
        ) : null}
      </section>

      <section className="panel cases-panel">
        <div className="panel-head cases-panel-head">
          <div>
            <span
              style={{
                color: '#e1252d',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              АРХИВ
            </span>
            <h2>Архивланган ва бекор қилинган ишлар</h2>
            <p>
              Жами {pagination.total || 0} та иш топилди.
            </p>
          </div>

          <Archive size={22} />
        </div>

        {error ? (
          <div className="page-error">
            <strong>Архивни юклаб бўлмади</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>
              Қайта уриниш
            </button>
          </div>
        ) : loading ? (
          <div className="table-loader">
            <LoaderCircle className="spin" size={34} />
            <strong>Архив юкланмоқда...</strong>
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <Archive size={34} />
            <strong>Архив бўш</strong>
            <span>
              Архивланган ёки бекор қилинган ишлар ҳали йўқ.
            </span>
          </div>
        ) : (
          <div className="cases-table-wrap">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>МИЖОЗ</th>
                  <th>ХИЗМАТ ТУРИ</th>
                  <th>СУММА</th>
                  <th>ҲОЛАТИ</th>
                  <th>МАСЪУЛ ХОДИМ</th>
                  <th>САНА</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#e1252d' }}>
                        {item.displayId}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {item.applicant?.fullName || '—'}
                      </strong>
                      <small
                        style={{
                          display: 'block',
                          color: '#7b818a',
                        }}
                      >
                        {item.applicant?.phone || '—'}
                      </small>
                    </td>

                    <td>
                      {SERVICE_NAMES[item.serviceType] ||
                        item.serviceType}
                    </td>

                    <td>{formatAmount(item.requestedAmount)}</td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '5px 9px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background:
                            item.status === 'CANCELLED'
                              ? '#ffe6e8'
                              : '#eef0f3',
                          color:
                            item.status === 'CANCELLED'
                              ? '#b71c24'
                              : '#59616d',
                        }}
                      >
                        {STATUS_NAMES[item.status] ||
                          item.status}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {item.executor?.fullName ||
                          item.receptionManager?.fullName ||
                          'Бириктирилмаган'}
                      </strong>
                    </td>

                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
          }}
        >
          <span style={{ color: '#7b818a', fontSize: 12 }}>
            {pagination.total || 0} та архив иши
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
            >
              Олдинги
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                page >= (pagination.totalPages || 1)
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Кейинги
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
