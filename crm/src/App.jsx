import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const SERVICE_OPTIONS = [
  ['PRIMARY_MORTGAGE', 'Бирламчи ипотека'],
  ['SECONDARY_MORTGAGE', 'Иккиламчи ипотека'],
  ['MICROLOAN', 'Микроқарз'],
  ['REALTOR_SERVICE', 'Риэлторлик хизмати'],
  ['SALE_PURCHASE', 'Олди-сотди'],
  ['CADASTRE_SERVICE', 'Кадастр хизмати'],
  ['OTHER', 'Бошқа'],
];

const STATUS_OPTIONS = [
  ['', 'Барча ҳолатлар'],
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

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  pinfl: '',
  passportSeries: '',
  passportNumber: '',
  birthDate: '',
  address: '',
  serviceType: 'SECONDARY_MORTGAGE',
  requestedAmount: '',
  bankName: '',
  nextAction: '',
};

const serviceNames = Object.fromEntries(SERVICE_OPTIONS);
const statusNames = Object.fromEntries(STATUS_OPTIONS);

function formatAmount(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

function formatDate(value) {
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusClass(status) {
  if (status === 'COMPLETED') return 'status-completed';
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'status-rejected';
  }

  if (
    status === 'IN_EXECUTION' ||
    status === 'ASSIGNED_TO_EXECUTOR' ||
    status === 'PROPERTY_MONITORING'
  ) {
    return 'status-progress';
  }

  if (
    status === 'BANK_REVIEW' ||
    status === 'CLIENT_PREAPPROVED' ||
    status === 'CREDIT_APPROVED'
  ) {
    return 'status-review';
  }

  if (status === 'ARCHIVED') return 'status-archived';

  return 'status-new';
}

function NewCaseModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setError('');
      setFieldErrors({});
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setFieldErrors({});

    try {
      const payload = {
        ...form,
        requestedAmount: form.requestedAmount
          ? form.requestedAmount.replace(/\s/g, '')
          : null,
      };

      const data = await apiRequest('/cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onCreated(data.item);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.details || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="case-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Янги маълумот</span>
            <h2>Янги мурожаат қўшиш</h2>
            <p>Мижоз ва хизмат маълумотларини киритинг.</p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Ойнани ёпиш"
          >
            <X size={21} />
          </button>
        </div>

        <form className="case-form" onSubmit={submit}>
          <div className="form-section">
            <div className="form-section-title">
              <strong>Мижоз маълумотлари</strong>
              <span>Асосий шахсий маълумотлар</span>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Ф.И.Ш. *</span>
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField('fullName', event.target.value)
                  }
                  placeholder="Масалан: Каримов Муҳаммаджон"
                  disabled={saving}
                />
                {fieldErrors.fullName ? (
                  <small>{fieldErrors.fullName[0]}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Телефон рақами *</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateField('phone', event.target.value)
                  }
                  placeholder="+998 90 123 45 67"
                  disabled={saving}
                />
                {fieldErrors.phone ? (
                  <small>{fieldErrors.phone[0]}</small>
                ) : null}
              </label>

              <label className="field">
                <span>ЖШШИР</span>
                <input
                  value={form.pinfl}
                  onChange={(event) =>
                    updateField(
                      'pinfl',
                      event.target.value.replace(/\D/g, '').slice(0, 14)
                    )
                  }
                  placeholder="14 та рақам"
                  inputMode="numeric"
                  disabled={saving}
                />
                {fieldErrors.pinfl ? (
                  <small>{fieldErrors.pinfl[0]}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Паспорт серияси</span>
                <input
                  value={form.passportSeries}
                  onChange={(event) =>
                    updateField(
                      'passportSeries',
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="AA"
                  disabled={saving}
                />
              </label>

              <label className="field">
                <span>Паспорт рақами</span>
                <input
                  value={form.passportNumber}
                  onChange={(event) =>
                    updateField('passportNumber', event.target.value)
                  }
                  placeholder="1234567"
                  disabled={saving}
                />
              </label>

              <label className="field">
                <span>Туғилган сана</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    updateField('birthDate', event.target.value)
                  }
                  disabled={saving}
                />
              </label>

              <label className="field field-wide">
                <span>Яшаш манзили</span>
                <input
                  value={form.address}
                  onChange={(event) =>
                    updateField('address', event.target.value)
                  }
                  placeholder="Вилоят, шаҳар, кўча ва уй рақами"
                  disabled={saving}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <strong>Хизмат маълумотлари</strong>
              <span>Мурожаат мақсади ва сўралаётган маблағ</span>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Хизмат тури *</span>
                <select
                  value={form.serviceType}
                  onChange={(event) =>
                    updateField('serviceType', event.target.value)
                  }
                  disabled={saving}
                >
                  {SERVICE_OPTIONS.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Сўралаётган сумма</span>
                <input
                  value={form.requestedAmount}
                  onChange={(event) =>
                    updateField(
                      'requestedAmount',
                      event.target.value.replace(/[^\d]/g, '')
                    )
                  }
                  placeholder="Масалан: 300000000"
                  inputMode="numeric"
                  disabled={saving}
                />
              </label>

              <label className="field">
                <span>Танланган банк</span>
                <input
                  value={form.bankName}
                  onChange={(event) =>
                    updateField('bankName', event.target.value)
                  }
                  placeholder="Ҳозирча танланмаган"
                  disabled={saving}
                />
              </label>

              <label className="field field-wide">
                <span>Кейинги ҳаракат</span>
                <textarea
                  value={form.nextAction}
                  onChange={(event) =>
                    updateField('nextAction', event.target.value)
                  }
                  placeholder="Масалан: паспорт маълумотларини текшириш"
                  rows={3}
                  disabled={saving}
                />
              </label>
            </div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Бекор қилиш
            </button>

            <button
              type="submit"
              className="primary modal-save"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  Сақланмоқда...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Мурожаатни сақлаш
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CasesPage({ openCreateSignal = 0, onStatsChange }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setModalOpen(true);
    }
  }, [openCreateSignal]);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (serviceType) params.set('serviceType', serviceType);

      const data = await apiRequest(`/cases?${params.toString()}`);

      setItems(data.items || []);
      setPagination((current) => ({
        ...current,
        ...(data.pagination || {}),
      }));
    } catch (requestError) {
      setPageError(requestError.message);

      if (requestError.status === 401) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    status,
    serviceType,
  ]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiRequest('/cases/stats');
      onStatsChange?.(data.stats);
    } catch {
      // Статистика ишламаса, рўйхатдан фойдаланиш давом этади.
    }
  }, [onStatsChange]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const applySearch = (event) => {
    event.preventDefault();
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setServiceType('');
    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const handleCreated = async () => {
    setPagination((current) => ({
      ...current,
      page: 1,
    }));

    await Promise.all([loadCases(), loadStats()]);
  };

  return (
    <>
      <section className="cases-toolbar">
        <form className="cases-search" onSubmit={applySearch}>
          <Search size={19} />

          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ID, Ф.И.Ш., телефон, ЖШШИР ёки паспорт..."
          />

          <button type="submit">Қидириш</button>
        </form>

        <div className="case-filter">
          <Filter size={17} />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPagination((current) => ({
                ...current,
                page: 1,
              }));
            }}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option value={value} key={value || 'all'}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="case-filter">
          <select
            value={serviceType}
            onChange={(event) => {
              setServiceType(event.target.value);
              setPagination((current) => ({
                ...current,
                page: 1,
              }));
            }}
          >
            <option value="">Барча хизматлар</option>

            {SERVICE_OPTIONS.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => {
            loadCases();
            loadStats();
          }}
          title="Янгилаш"
        >
          <RefreshCw size={18} />
        </button>

        {(search || status || serviceType) && (
          <button
            type="button"
            className="clear-filter-button"
            onClick={clearFilters}
          >
            Тозалаш
          </button>
        )}
      </section>

      <section className="panel cases-panel">
        <div className="panel-head cases-panel-head">
          <div>
            <h2>Мурожаатлар рўйхати</h2>
            <p>
              Жами {pagination.total || 0} та мурожаат топилди.
            </p>
          </div>

          <button
            type="button"
            className="primary inline-create-button"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={17} />
            Янги мурожаат
          </button>
        </div>

        {pageError ? (
          <div className="page-error">
            <strong>Маълумотларни олиб бўлмади</strong>
            <span>{pageError}</span>
            <button type="button" onClick={loadCases}>
              Қайта уриниш
            </button>
          </div>
        ) : loading ? (
          <div className="table-loader">
            <LoaderCircle className="spin" size={34} />
            <strong>Мурожаатлар юкланмоқда...</strong>
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <FileText size={40} />
            <strong>Мурожаатлар топилмади</strong>
            <span>
              Янги мурожаат қўшинг ёки қидирув фильтрларини ўзгартиринг.
            </span>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="cases-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Мижоз</th>
                    <th>Хизмат тури</th>
                    <th>Сумма</th>
                    <th>Ҳолати</th>
                    <th>Масъул ходим</th>
                    <th>Сана</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="case-display-id">
                          {item.displayId}
                        </strong>
                      </td>

                      <td>
                        <div className="client-cell">
                          <strong>{item.applicant?.fullName || '—'}</strong>
                          <span>{item.applicant?.phone || 'Телефон йўқ'}</span>
                        </div>
                      </td>

                      <td>
                        {serviceNames[item.serviceType] || item.serviceType}
                      </td>

                      <td>{formatAmount(item.requestedAmount)}</td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {statusNames[item.status] || item.status}
                        </span>
                      </td>

                      <td>
                        <div className="manager-cell">
                          <strong>
                            {item.executor?.fullName ||
                              item.receptionManager?.fullName ||
                              'Бириктирилмаган'}
                          </strong>

                          <span>
                            {item.executor
                              ? 'Ижрочи'
                              : item.receptionManager
                                ? 'Қабул менежери'
                                : '—'}
                          </span>
                        </div>
                      </td>

                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                {pagination.page}-саҳифа, жами {pagination.totalPages} саҳифа
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                >
                  <ChevronLeft size={17} />
                  Олдинги
                </button>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                >
                  Кейинги
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <NewCaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}