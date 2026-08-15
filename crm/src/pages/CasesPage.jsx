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
import { CaseDetails } from './CaseDetails.jsx';

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
  realtorDirection: 'SELL',
  propertyType: 'APARTMENT',
  propertyAddress: '',
  cadastralNumber: '',
  propertyPrice: '',
  realtorServiceFee: '',
};

const REALTOR_DIRECTION_OPTIONS = [
  ['SELL', 'Уй сотиш'],
  ['BUY', 'Уй сотиб олиш'],
  ['RENT_OUT', 'Ижарага бериш'],
  ['RENT_IN', 'Ижарага олиш'],
];

const PROPERTY_TYPE_OPTIONS = [
  ['APARTMENT', 'Квартира'],
  ['HOUSE', 'Ҳовли'],
  ['LAND', 'Ер'],
  ['COMMERCIAL', 'Нотурар жой'],
];

const serviceNames = Object.fromEntries(SERVICE_OPTIONS);
const statusNames = Object.fromEntries(STATUS_OPTIONS);

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
  if (status === 'COMPLETED') {
    return 'status-completed';
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'status-rejected';
  }

  if (
    status === 'IN_EXECUTION' ||
    status === 'ASSIGNED_TO_EXECUTOR' ||
    status === 'PROPERTY_MONITORING' ||
    status === 'CREDIT_ISSUED' ||
    status === 'CLIENT_RECEIVED_FUNDS' ||
    status === 'SERVICE_FEE_PAID'
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

  if (status === 'ARCHIVED') {
    return 'status-archived';
  }

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

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, saving, onClose]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setForm((current) => {
      if (field === 'serviceType') {
        const next = {
          ...current,
          serviceType: value,
        };

        if (value === 'REALTOR_SERVICE') {
          next.bankName = '';
          next.requestedAmount = '';
          next.nextAction = '';
        }

        return next;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setFieldErrors({});

    try {
      const isRealtorService = form.serviceType === 'REALTOR_SERVICE';

      const realtorDetails = isRealtorService
        ? [
            `Риэлторлик йўналиши: ${
              Object.fromEntries(REALTOR_DIRECTION_OPTIONS)[form.realtorDirection]
            }`,
            `Кўчмас мулк тури: ${
              Object.fromEntries(PROPERTY_TYPE_OPTIONS)[form.propertyType]
            }`,
            `Объект манзили: ${form.propertyAddress.trim() || '—'}`,
            `Кадастр рақами: ${form.cadastralNumber.trim() || '—'}`,
            `Объект нархи: ${
              form.propertyPrice
                ? `${form.propertyPrice.replace(/\s/g, '')} сўм`
                : '—'
            }`,
            `Риэлторлик хизмати ҳақи: ${
              form.realtorServiceFee
                ? `${form.realtorServiceFee.replace(/\s/g, '')} сўм`
                : '—'
            }`,
          ].join('\n')
        : form.nextAction.trim();

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        pinfl: form.pinfl.trim(),
        passportSeries: form.passportSeries.trim(),
        passportNumber: form.passportNumber.trim(),
        birthDate: form.birthDate || null,
        address: form.address.trim(),
        serviceType: form.serviceType,
        bankName: isRealtorService ? '' : form.bankName.trim(),
        nextAction: realtorDetails,

        requestedAmount: isRealtorService
          ? form.propertyPrice
            ? form.propertyPrice.replace(/\s/g, '')
            : null
          : form.requestedAmount
            ? form.requestedAmount.replace(/\s/g, '')
            : null,

        serviceFee: isRealtorService
          ? form.realtorServiceFee
            ? form.realtorServiceFee.replace(/\s/g, '')
            : null
          : null,
      };

      const data = await apiRequest('/cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await onCreated?.(data.item);
      onClose();
    } catch (requestError) {
      setError(
        requestError.message || 'Мурожаатни сақлашда хато юз берди.'
      );

      setFieldErrors(requestError.details || {});
    } finally {
      setSaving(false);
    }
  };

  const closeFromBackdrop = (event) => {
    if (event.target === event.currentTarget && !saving) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={closeFromBackdrop}
    >
      <section
        className="case-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-case-title"
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">Янги маълумот</span>

            <h2 id="new-case-title">Янги мурожаат қўшиш</h2>

            <p>
              Мижоз ва хизмат маълумотларини тўлиқ киритинг.
            </p>
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
                  autoFocus
                  disabled={saving}
                />

                {fieldErrors.fullName?.[0] ? (
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
                  inputMode="tel"
                  disabled={saving}
                />

                {fieldErrors.phone?.[0] ? (
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

                {fieldErrors.pinfl?.[0] ? (
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
                      event.target.value
                        .replace(/[^a-zA-Z]/g, '')
                        .toUpperCase()
                        .slice(0, 3)
                    )
                  }
                  placeholder="AA"
                  disabled={saving}
                />

                {fieldErrors.passportSeries?.[0] ? (
                  <small>{fieldErrors.passportSeries[0]}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Паспорт рақами</span>

                <input
                  value={form.passportNumber}
                  onChange={(event) =>
                    updateField(
                      'passportNumber',
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 12)
                    )
                  }
                  placeholder="1234567"
                  inputMode="numeric"
                  disabled={saving}
                />

                {fieldErrors.passportNumber?.[0] ? (
                  <small>{fieldErrors.passportNumber[0]}</small>
                ) : null}
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

                {fieldErrors.birthDate?.[0] ? (
                  <small>{fieldErrors.birthDate[0]}</small>
                ) : null}
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

                {fieldErrors.address?.[0] ? (
                  <small>{fieldErrors.address[0]}</small>
                ) : null}
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <strong>Хизмат маълумотлари</strong>
              <span>
                {form.serviceType === 'REALTOR_SERVICE'
                  ? 'Риэлторлик хизмати ва объект маълумотлари'
                  : 'Мурожаат мақсади ва сўралаётган маблағ'}
              </span>
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

                {fieldErrors.serviceType?.[0] ? (
                  <small>{fieldErrors.serviceType[0]}</small>
                ) : null}
              </label>

              {form.serviceType === 'REALTOR_SERVICE' ? (
                <>
                  <label className="field">
                    <span>Риэлторлик йўналиши *</span>
                    <select
                      value={form.realtorDirection}
                      onChange={(event) =>
                        updateField('realtorDirection', event.target.value)
                      }
                      disabled={saving}
                    >
                      {REALTOR_DIRECTION_OPTIONS.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Кўчмас мулк тури *</span>
                    <select
                      value={form.propertyType}
                      onChange={(event) =>
                        updateField('propertyType', event.target.value)
                      }
                      disabled={saving}
                    >
                      {PROPERTY_TYPE_OPTIONS.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field field-wide">
                    <span>Объект манзили</span>
                    <input
                      value={form.propertyAddress}
                      onChange={(event) =>
                        updateField('propertyAddress', event.target.value)
                      }
                      placeholder="Вилоят, шаҳар, туман, кўча ва уй рақами"
                      disabled={saving}
                    />
                  </label>

                  <label className="field">
                    <span>Кадастр рақами</span>
                    <input
                      value={form.cadastralNumber}
                      onChange={(event) =>
                        updateField('cadastralNumber', event.target.value)
                      }
                      placeholder="Масалан: 15:16:..."
                      disabled={saving}
                    />
                  </label>

                  <label className="field">
                    <span>Объект нархи</span>
                    <input
                      value={form.propertyPrice}
                      onChange={(event) =>
                        updateField(
                          'propertyPrice',
                          event.target.value.replace(/[^\d]/g, '')
                        )
                      }
                      placeholder="Масалан: 500000000"
                      inputMode="numeric"
                      disabled={saving}
                    />
                  </label>

                  <label className="field">
                    <span>Риэлторлик хизмати ҳақи</span>
                    <input
                      value={form.realtorServiceFee}
                      onChange={(event) =>
                        updateField(
                          'realtorServiceFee',
                          event.target.value.replace(/[^\d]/g, '')
                        )
                      }
                      placeholder="Масалан: 5000000"
                      inputMode="numeric"
                      disabled={saving}
                    />
                  </label>

                  <label className="field field-wide">
                    <span>Қўшимча маълумот</span>
                    <textarea
                      value={form.nextAction}
                      onChange={(event) =>
                        updateField('nextAction', event.target.value)
                      }
                      placeholder="Объект ёки мижоз талаби ҳақида қўшимча маълумот"
                      rows={3}
                      disabled={saving}
                    />
                  </label>
                </>
              ) : (
                <>
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
                </>
              )}
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

export function CasesPage({
  openCreateSignal = 0,
  onStatsChange,
}) {
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
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setSelectedCaseId(null);
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

      if (search) {
        params.set('search', search);
      }

      if (status) {
        params.set('status', status);
      }

      if (serviceType) {
        params.set('serviceType', serviceType);
      }

      const data = await apiRequest(`/cases?${params.toString()}`);

      setItems(Array.isArray(data.items) ? data.items : []);

      setPagination((current) => ({
        ...current,
        ...(data.pagination || {}),
      }));
    } catch (requestError) {
      setPageError(
        requestError.message || 'Мурожаатларни юклаб бўлмади.'
      );

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
      onStatsChange?.(data.stats || {});
    } catch {
      // Статистикада хато бўлса ҳам мурожаатлар рўйхати ишлайверади.
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

  const handleCaseChanged = async () => {
    await Promise.all([loadCases(), loadStats()]);
  };

  const openCase = (caseId) => {
    setSelectedCaseId(caseId);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (selectedCaseId) {
    return (
      <CaseDetails
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
        onChanged={handleCaseChanged}
      />
    );
  }

  return (
    <>
      <section className="cases-toolbar">
        <form className="cases-search" onSubmit={applySearch}>
          <Search size={19} />

          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ID, Ф.И.Ш., телефон, ЖШШИР ёки паспорт..."
            aria-label="Мурожаатларни қидириш"
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
            aria-label="Ҳолат бўйича фильтр"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option value={value} key={value || 'all-statuses'}>
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
            aria-label="Хизмат тури бўйича фильтр"
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
          title="Маълумотларни янгилаш"
          aria-label="Маълумотларни янгилаш"
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
              Янги мурожаат қўшинг ёки қидирув фильтрларини
              ўзгартиринг.
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
                    <tr
                      key={item.id}
                      className="clickable-case-row"
                      onClick={() => openCase(item.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${item.displayId} мурожаатини очиш`}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' ||
                          event.key === ' '
                        ) {
                          event.preventDefault();
                          openCase(item.id);
                        }
                      }}
                    >
                      <td>
                        <strong className="case-display-id">
                          {item.displayId}
                        </strong>
                      </td>

                      <td>
                        <div className="client-cell">
                          <strong>
                            {item.applicant?.fullName || '—'}
                          </strong>

                          <span>
                            {item.applicant?.phone || 'Телефон йўқ'}
                          </span>
                        </div>
                      </td>

                      <td>
                        {serviceNames[item.serviceType] ||
                          item.serviceType ||
                          '—'}
                      </td>

                      <td>
                        {formatAmount(item.requestedAmount)}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {statusNames[item.status] ||
                            item.status ||
                            '—'}
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
                {pagination.page}-саҳифа, жами{' '}
                {pagination.totalPages || 1} саҳифа
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: Math.max(current.page - 1, 1),
                    }))
                  }
                >
                  <ChevronLeft size={17} />
                  Олдинги
                </button>

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    (pagination.totalPages || 1)
                  }
                  onClick={() =>
                    setPagination((current) => ({
                      ...current,
                      page: Math.min(
                        current.page + 1,
                        current.totalPages || 1
                      ),
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