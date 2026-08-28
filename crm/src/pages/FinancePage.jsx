import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LoaderCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const SERVICE_LABELS = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

const FINANCE_STATUS_LABELS = {
  PAID: 'Тўланган',
  PARTIAL: 'Қисман тўланган',
  UNPAID: 'Кутилмоқда',
};

function formatAmount(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return '0 сўм';

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

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}


function escapeReceiptHtml(value) {
  return String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printPaymentReceipt(item, payment) {
  const receiptWindow = window.open('', '_blank', 'width=420,height=760');

  if (!receiptWindow) {
    window.alert('Квитанция ойнасини очиб бўлмади. Браузерда popup ойнага рухсат беринг.');
    return;
  }

  const receiptNo = `GK-${String(payment.id || '').slice(-8).toUpperCase() || 'RECEIPT'}`;
  const clientName = item.applicant?.fullName || 'Мижоз';
  const clientPhone = item.applicant?.phone || '—';
  const service = SERVICE_LABELS[item.serviceType] || item.serviceType || '—';
  const branch = item.branch?.name || '—';
  const paidAt = formatDate(payment.paidAt || payment.createdAt);
  const method = payment.method || '—';
  const reference = payment.reference || '—';
  const amount = formatAmount(payment.amount);

  receiptWindow.document.write(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeReceiptHtml(receiptNo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f2f2f2;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      display: flex;
      gap: 8px;
      justify-content: center;
      padding: 12px;
      background: #fff;
      border-bottom: 1px solid #ddd;
    }
    .toolbar button {
      border: 0;
      border-radius: 8px;
      padding: 10px 16px;
      font-weight: 700;
      cursor: pointer;
    }
    .print { background: #ef233c; color: #fff; }
    .close { background: #eee; color: #111; }
    .receipt {
      width: 80mm;
      margin: 16px auto;
      padding: 5mm;
      background: #fff;
      box-shadow: 0 2px 16px rgba(0,0,0,.12);
      font-size: 12px;
      line-height: 1.35;
    }
    .brand { text-align: center; margin-bottom: 10px; }
    .brand strong { display: block; font-size: 18px; }
    .brand span { font-size: 10px; }
    .dash { border-top: 1px dashed #111; margin: 9px 0; }
    .title { text-align: center; font-size: 14px; font-weight: 800; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 10px; margin: 5px 0; }
    .row span:first-child { color: #555; }
    .row strong, .row span:last-child { text-align: right; overflow-wrap: anywhere; }
    .amount {
      text-align: center;
      font-size: 18px;
      font-weight: 900;
      margin: 10px 0;
    }
    .footer { text-align: center; font-size: 10px; margin-top: 12px; }
    @page { size: 80mm auto; margin: 0; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .receipt {
        width: 80mm;
        margin: 0;
        padding: 4mm;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print" onclick="window.print()">Чоп этиш</button>
    <button class="close" onclick="window.close()">Ёпиш</button>
  </div>
  <main class="receipt">
    <div class="brand">
      <strong>GOLDEN KEY INFO</strong>
      <span>ТЎЛОВ КВИТАНЦИЯСИ</span>
    </div>
    <div class="dash"></div>
    <div class="title">${escapeReceiptHtml(receiptNo)}</div>
    <div class="row"><span>Мурожаат:</span><strong>${escapeReceiptHtml(item.displayId)}</strong></div>
    <div class="row"><span>Мижоз:</span><strong>${escapeReceiptHtml(clientName)}</strong></div>
    <div class="row"><span>Телефон:</span><strong>${escapeReceiptHtml(clientPhone)}</strong></div>
    <div class="row"><span>Филиал:</span><strong>${escapeReceiptHtml(branch)}</strong></div>
    <div class="row"><span>Хизмат:</span><strong>${escapeReceiptHtml(service)}</strong></div>
    <div class="dash"></div>
    <div class="row"><span>Тўлов санаси:</span><strong>${escapeReceiptHtml(paidAt)}</strong></div>
    <div class="row"><span>Тўлов усули:</span><strong>${escapeReceiptHtml(method)}</strong></div>
    <div class="row"><span>Чек / транзакция:</span><strong>${escapeReceiptHtml(reference)}</strong></div>
    <div class="amount">${escapeReceiptHtml(amount)}</div>
    <div class="dash"></div>
    <div class="footer">
      Golden Key OS орқали шакллантирилди.<br/>
      Квитанцияни сақлаб қўйинг.
    </div>
  </main>
</body>
</html>`);
  receiptWindow.document.close();
  receiptWindow.focus();
}

export function FinancePage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalDue: 0,
    totalPaid: 0,
    totalRemaining: 0,
    casesCount: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
  });
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentCase, setPaymentCase] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Нақд',
    reference: '',
    paidAt: todayInputValue(),
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (search) params.set('search', search);
      if (branchId) params.set('branchId', branchId);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const data = await apiRequest(
        `/finance?${params.toString()}`
      );

      setItems(Array.isArray(data.items) ? data.items : []);
      setSummary(data.summary || {});
      setBranches(Array.isArray(data.branches) ? data.branches : []);
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
          'Молия маълумотларини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, branchId, status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!paymentCase) return undefined;

    const close = (event) => {
      if (event.key === 'Escape') {
        setPaymentCase(null);
        setPaymentError('');
      }
    };

    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = '';
    };
  }, [paymentCase]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openPayment = (item) => {
    const remaining = Number(item.remainingAmount || 0);

    setPaymentCase(item);
    setPaymentError('');
    setPaymentForm({
      amount: remaining > 0 ? String(remaining) : '',
      method: 'Нақд',
      reference: '',
      paidAt: todayInputValue(),
    });
  };

  const savePayment = async (event) => {
    event.preventDefault();

    if (!paymentCase) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Тўлов суммасини тўғри киритинг.');
      return;
    }

    setPaymentSaving(true);
    setPaymentError('');

    try {
      await apiRequest('/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          caseId: paymentCase.id,
          amount,
          method: paymentForm.method,
          reference: paymentForm.reference,
          paidAt: paymentForm.paidAt
            ? new Date(paymentForm.paidAt).toISOString()
            : undefined,
        }),
      });

      setPaymentCase(null);
      await load();
    } catch (requestError) {
      setPaymentError(
        requestError.message || 'Тўловни сақлаб бўлмади.'
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        label: 'Жами хизмат ҳақи',
        value: summary.totalDue,
        icon: CircleDollarSign,
      },
      {
        label: 'Тўланган',
        value: summary.totalPaid,
        icon: CheckCircle2,
      },
      {
        label: 'Қолдиқ',
        value: summary.totalRemaining,
        icon: Clock3,
      },
    ],
    [summary]
  );

  return (
    <>
      <section className="panel finance-page">
        <div className="finance-head">
          <div>
            <span className="finance-kicker">МОЛИЯ</span>
            <h2>Хизмат ҳақи ва тўловлар</h2>
            <p>
              Мурожаатлар бўйича хизмат ҳақи, тушум ва қолдиқни
              назорат қилинг.
            </p>
          </div>

          <button
            type="button"
            className="finance-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Янгилаш
          </button>
        </div>

        <div className="finance-summary">
          {cards.map(({ label, value, icon: Icon }) => (
            <div className="finance-summary-card" key={label}>
              <div>
                <span>{label}</span>
                <strong>{formatAmount(value)}</strong>
              </div>
              <Icon size={22} />
            </div>
          ))}

          <div className="finance-summary-card">
            <div>
              <span>Мурожаатлар</span>
              <strong>{summary.casesCount || 0}</strong>
            </div>
            <WalletCards size={22} />
          </div>
        </div>

        <div className="finance-substats">
          <span>
            Тўланган: <strong>{summary.paidCount || 0}</strong>
          </span>
          <span>
            Қисман: <strong>{summary.partialCount || 0}</strong>
          </span>
          <span>
            Кутилмоқда: <strong>{summary.unpaidCount || 0}</strong>
          </span>
        </div>

        <div className="finance-filters">
          <form className="finance-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Мурожаат ID, Ф.И.Ш. ёки телефон"
            />
            <button type="submit">Қидириш</button>
          </form>

          <select
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Барча филиаллар</option>
            {branches.map((branch) => (
              <option value={branch.id} key={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Барча ҳолатлар</option>
            <option value="paid">Тўланган</option>
            <option value="partial">Қисман тўланган</option>
            <option value="unpaid">Кутилмоқда</option>
          </select>

          <label className="finance-date">
            <span>Дан</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="finance-date">
            <span>Гача</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {loading ? (
          <div className="finance-state">
            <LoaderCircle className="spin" size={34} />
            <strong>Молия маълумотлари юкланмоқда...</strong>
          </div>
        ) : error ? (
          <div className="finance-state finance-error">
            <strong>Маълумотларни юклаб бўлмади</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>
              Қайта уриниш
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="finance-state">
            <Banknote size={40} />
            <strong>Молиявий маълумотлар топилмади</strong>
            <span>
              Хизмат ҳақи белгиланган мурожаатлар шу ерда
              кўринади.
            </span>
          </div>
        ) : (
          <div className="finance-list">
            {items.map((item) => (
              <article className="finance-row" key={item.id}>
                <div className="finance-row-head">
                  <div>
                    <span className="finance-case-id">
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
                    className={`finance-badge badge-${item.financeStatus}`}
                  >
                    {FINANCE_STATUS_LABELS[item.financeStatus] ||
                      item.financeStatus}
                  </span>
                </div>

                <div className="finance-row-grid">
                  <div>
                    <Building2 size={17} />
                    <span>Филиал</span>
                    <strong>{item.branch?.name || '—'}</strong>
                  </div>

                  <div>
                    <CreditCard size={17} />
                    <span>Хизмат</span>
                    <strong>
                      {SERVICE_LABELS[item.serviceType] ||
                        item.serviceType}
                    </strong>
                  </div>

                  <div>
                    <Banknote size={17} />
                    <span>Тасдиқланган кредит</span>
                    <strong>
                      {formatAmount(item.approvedAmount)}
                    </strong>
                  </div>

                  <div>
                    <CircleDollarSign size={17} />
                    <span>Хизмат ҳақи</span>
                    <strong>
                      {formatAmount(item.serviceFee)}
                    </strong>
                  </div>

                  <div>
                    <CheckCircle2 size={17} />
                    <span>Тўланган</span>
                    <strong>
                      {formatAmount(item.paidAmount)}
                    </strong>
                  </div>

                  <div>
                    <Clock3 size={17} />
                    <span>Қолдиқ</span>
                    <strong>
                      {formatAmount(item.remainingAmount)}
                    </strong>
                  </div>
                </div>

                <div className="finance-row-bottom">
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(item.updatedAt)}
                  </span>

                  {item.remainingAmount > 0 ? (
                    <button
                      type="button"
                      className="finance-payment-button"
                      onClick={() => openPayment(item)}
                    >
                      <Plus size={16} />
                      Тўлов қабул қилиш
                    </button>
                  ) : (
                    <span className="finance-paid-note">
                      <CheckCircle2 size={16} />
                      Тўлиқ тўланган
                    </span>
                  )}
                </div>

                {item.payments?.length ? (
                  <details className="finance-payment-history">
                    <summary>
                      Тўловлар тарихи ({item.payments.length})
                    </summary>

                    <div>
                      {item.payments.map((payment) => (
                        <div
                          className="finance-payment-history-row"
                          key={payment.id}
                        >
                          <strong>
                            {formatAmount(payment.amount)}
                          </strong>
                          <span>
                            {payment.method || 'Усул йўқ'}
                          </span>
                          <span>
                            {formatDate(
                              payment.paidAt ||
                                payment.createdAt
                            )}
                          </span>
                          <span>{payment.reference || '—'}</span>
                          <button
                            type="button"
                            className="finance-receipt-button"
                            onClick={() => printPaymentReceipt(item, payment)}
                            title="Квитанцияни очиш ва чоп этиш"
                          >
                            <Printer size={14} />
                            Квитанция
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}

        {!loading &&
        !error &&
        pagination.totalPages > 1 ? (
          <div className="finance-pagination">
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
      </section>

      {paymentCase ? (
        <div
          className="finance-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPaymentCase(null);
              setPaymentError('');
            }
          }}
        >
          <div className="finance-modal">
            <div className="finance-modal-head">
              <div>
                <span className="finance-kicker">ТЎЛОВ</span>
                <h3>Хизмат ҳақини қабул қилиш</h3>
                <p>
                  {paymentCase.displayId} ·{' '}
                  {paymentCase.applicant?.fullName || 'Мижоз'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaymentCase(null);
                  setPaymentError('');
                }}
              >
                <X size={21} />
              </button>
            </div>

            <div className="finance-modal-summary">
              <div>
                <span>Хизмат ҳақи</span>
                <strong>
                  {formatAmount(paymentCase.serviceFee)}
                </strong>
              </div>
              <div>
                <span>Тўланган</span>
                <strong>
                  {formatAmount(paymentCase.paidAmount)}
                </strong>
              </div>
              <div>
                <span>Қолдиқ</span>
                <strong>
                  {formatAmount(paymentCase.remainingAmount)}
                </strong>
              </div>
            </div>

            <form
              className="finance-payment-form"
              onSubmit={savePayment}
            >
              <label>
                <span>Тўлов суммаси</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max={Number(paymentCase.remainingAmount || 0)}
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  disabled={paymentSaving}
                  required
                />
              </label>

              <label>
                <span>Тўлов усули</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                  disabled={paymentSaving}
                >
                  <option value="Нақд">Нақд</option>
                  <option value="Банк ўтказмаси">
                    Банк ўтказмаси
                  </option>
                  <option value="Click">Click</option>
                  <option value="Payme">Payme</option>
                  <option value="Терминал">Терминал</option>
                  <option value="Бошқа">Бошқа</option>
                </select>
              </label>

              <label>
                <span>Тўлов санаси</span>
                <input
                  type="datetime-local"
                  value={paymentForm.paidAt}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paidAt: event.target.value,
                    }))
                  }
                  disabled={paymentSaving}
                />
              </label>

              <label>
                <span>Транзакция / чек рақами</span>
                <input
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Ихтиёрий"
                  disabled={paymentSaving}
                />
              </label>

              {paymentError ? (
                <div className="finance-payment-error">
                  {paymentError}
                </div>
              ) : null}

              <button
                type="submit"
                className="finance-save-payment"
                disabled={paymentSaving}
              >
                {paymentSaving ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Сақланмоқда...
                  </>
                ) : (
                  <>
                    <Banknote size={17} />
                    Тўловни сақлаш
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <style>{`
        .finance-page {
          overflow: hidden;
        }

        .finance-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
        }

        .finance-kicker {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .finance-head h2,
        .finance-modal-head h3 {
          margin: 5px 0;
        }

        .finance-head p,
        .finance-modal-head p {
          margin: 0;
          color: #7f8590;
          font-size: 13px;
        }

        .finance-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding: 10px 13px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .finance-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 0 18px 12px;
        }

        .finance-summary-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #e5e8ec;
          border-radius: 13px;
          padding: 15px;
          background: #fff;
        }

        .finance-summary-card div {
          display: grid;
          gap: 5px;
        }

        .finance-summary-card span {
          color: #858b94;
          font-size: 11px;
        }

        .finance-summary-card strong {
          font-size: 17px;
        }

        .finance-summary-card svg {
          color: #ef233c;
        }

        .finance-substats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          padding: 0 18px 14px;
          color: #777e88;
          font-size: 12px;
        }

        .finance-filters {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) 190px 170px 150px 150px;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid #edf0f3;
          border-bottom: 1px solid #edf0f3;
        }

        .finance-search {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding-left: 11px;
          background: #fff;
        }

        .finance-search input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          padding: 11px 0;
          font: inherit;
        }

        .finance-search button {
          align-self: stretch;
          border: 0;
          border-radius: 0 9px 9px 0;
          padding: 0 14px;
          background: #ef233c;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .finance-filters > select,
        .finance-date input {
          width: 100%;
          min-height: 43px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding: 0 10px;
          background: #fff;
          font: inherit;
        }

        .finance-date {
          display: grid;
          gap: 4px;
        }

        .finance-date span {
          font-size: 10px;
          color: #858b94;
        }

        .finance-list {
          display: grid;
          gap: 12px;
          padding: 18px;
        }

        .finance-row {
          border: 1px solid #e4e7eb;
          border-radius: 14px;
          padding: 16px;
          background: #fff;
        }

        .finance-row-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 13px;
          border-bottom: 1px solid #eef0f2;
        }

        .finance-case-id {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
        }

        .finance-row-head h3 {
          margin: 4px 0 2px;
          font-size: 16px;
        }

        .finance-row-head small {
          color: #858b94;
        }

        .finance-badge {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 900;
        }

        .badge-PAID {
          background: #ddf8e8;
          color: #087742;
        }

        .badge-PARTIAL {
          background: #fff5d9;
          color: #8a6300;
        }

        .badge-UNPAID {
          background: #fff0f1;
          color: #c9212c;
        }

        .finance-row-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
          padding: 14px 0;
        }

        .finance-row-grid > div {
          display: grid;
          grid-template-columns: 22px 1fr;
          column-gap: 7px;
        }

        .finance-row-grid svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .finance-row-grid span {
          color: #8a9098;
          font-size: 10px;
        }

        .finance-row-grid strong {
          margin-top: 2px;
          font-size: 13px;
        }

        .finance-row-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid #eef0f2;
        }

        .finance-row-bottom > span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #858b94;
          font-size: 11px;
        }

        .finance-payment-button,
        .finance-save-payment {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 9px;
          padding: 9px 12px;
          background: #ef233c;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .finance-paid-note {
          color: #087742 !important;
          font-weight: 800;
        }

        .finance-payment-history {
          margin-top: 12px;
          border-radius: 10px;
          background: #f8f9fa;
          padding: 10px 12px;
        }

        .finance-payment-history summary {
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .finance-payment-history-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 9px 0;
          border-top: 1px solid #e8ebee;
          font-size: 11px;
        }

        .finance-receipt-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid #dfe3e8;
          border-radius: 8px;
          padding: 7px 9px;
          background: #fff;
          color: #111827;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .finance-receipt-button:hover {
          border-color: #ef233c;
          color: #ef233c;
        }

        .finance-state {
          min-height: 280px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          color: #878e98;
          text-align: center;
        }

        .finance-error {
          color: #c9212c;
        }

        .finance-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 18px 20px;
        }

        .finance-pagination button {
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

        .finance-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(17, 24, 39, .56);
        }

        .finance-modal {
          width: min(560px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 25px 70px rgba(0,0,0,.22);
        }

        .finance-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 18px;
          border-bottom: 1px solid #edf0f3;
        }

        .finance-modal-head button {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border: 1px solid #e1e5e9;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .finance-modal-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 15px 18px 0;
        }

        .finance-modal-summary > div {
          display: grid;
          gap: 4px;
          border-radius: 10px;
          padding: 11px;
          background: #f7f8fa;
        }

        .finance-modal-summary span {
          color: #858b94;
          font-size: 10px;
        }

        .finance-modal-summary strong {
          font-size: 13px;
        }

        .finance-payment-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 18px;
        }

        .finance-payment-form label {
          display: grid;
          gap: 6px;
        }

        .finance-payment-form label > span {
          font-size: 11px;
          font-weight: 800;
        }

        .finance-payment-form input,
        .finance-payment-form select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 10px 11px;
          background: #fff;
          font: inherit;
        }

        .finance-payment-error {
          grid-column: 1 / -1;
          border-radius: 9px;
          padding: 10px 11px;
          background: #fff0f1;
          color: #c9212c;
          font-size: 12px;
          font-weight: 700;
        }

        .finance-save-payment {
          grid-column: 1 / -1;
          min-height: 43px;
        }

        @media (max-width: 1100px) {
          .finance-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .finance-filters {
            grid-template-columns: 1fr 1fr;
          }

          .finance-search {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 700px) {
          .finance-head,
          .finance-row-head,
          .finance-row-bottom {
            align-items: stretch;
            flex-direction: column;
          }

          .finance-summary,
          .finance-filters,
          .finance-row-grid,
          .finance-modal-summary,
          .finance-payment-form {
            grid-template-columns: 1fr;
          }

          .finance-search,
          .finance-payment-error,
          .finance-save-payment {
            grid-column: auto;
          }

          .finance-payment-history-row {
            grid-template-columns: 1fr 1fr;
          }

          .finance-receipt-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
