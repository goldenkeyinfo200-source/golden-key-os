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
  LoaderCircle,
  Phone,
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

function formatAmount(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return '0 сўм';
  }

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

function nowInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 16);
}

export function DebtorsPage() {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState({
    debtorsCount: 0,
    totalServiceFee: 0,
    totalPaid: 0,
    totalDebt: 0,
  });
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
  const [serviceType, setServiceType] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paymentItem, setPaymentItem] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Нақд',
    reference: '',
    paidAt: nowInputValue(),
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
      if (serviceType) {
        params.set('serviceType', serviceType);
      }

      const data = await apiRequest(
        `/debtors?${params.toString()}`
      );

      setItems(
        Array.isArray(data.items) ? data.items : []
      );
      setBranches(
        Array.isArray(data.branches)
          ? data.branches
          : []
      );
      setSummary(data.summary || {});
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
          'Қарздорлар маълумотини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, branchId, serviceType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!paymentItem) return undefined;

    const close = (event) => {
      if (event.key === 'Escape') {
        setPaymentItem(null);
        setPaymentError('');
      }
    };

    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = '';
    };
  }, [paymentItem]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openPayment = (item) => {
    setPaymentItem(item);
    setPaymentError('');
    setPaymentForm({
      amount: String(item.remainingAmount || ''),
      method: 'Нақд',
      reference: '',
      paidAt: nowInputValue(),
    });
  };

  const savePayment = async (event) => {
    event.preventDefault();

    if (!paymentItem) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError(
        'Тўлов суммасини тўғри киритинг.'
      );
      return;
    }

    setPaymentSaving(true);
    setPaymentError('');

    try {
      await apiRequest(
        `/debtors/${paymentItem.id}/payment`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount,
            method: paymentForm.method,
            reference: paymentForm.reference,
            paidAt: paymentForm.paidAt
              ? new Date(
                  paymentForm.paidAt
                ).toISOString()
              : undefined,
          }),
        }
      );

      setPaymentItem(null);
      await load();
    } catch (requestError) {
      setPaymentError(
        requestError.message ||
          'Тўловни сақлаб бўлмади.'
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        label: 'Қарздорлар',
        value: String(summary.debtorsCount || 0),
        icon: UserRound,
      },
      {
        label: 'Жами хизмат ҳақи',
        value: formatAmount(
          summary.totalServiceFee
        ),
        icon: CircleDollarSign,
      },
      {
        label: 'Тўланган',
        value: formatAmount(summary.totalPaid),
        icon: CheckCircle2,
      },
      {
        label: 'Жами қарз',
        value: formatAmount(summary.totalDebt),
        icon: Clock3,
      },
    ],
    [summary]
  );

  return (
    <>
      <section className="panel debtors-page">
        <div className="debtors-head">
          <div>
            <span className="debtors-kicker">
              ҚАРЗДОРЛАР
            </span>
            <h2>Тўлови кутилаётган мижозлар</h2>
            <p>
              Мижоз маблағни олган, лекин хизмат ҳақини
              тўлиқ тўламаган мурожаатлар.
            </p>
          </div>

          <button
            type="button"
            className="debtors-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Янгилаш
          </button>
        </div>

        <div className="debtors-summary">
          {summaryCards.map(
            ({ label, value, icon: Icon }) => (
              <div key={label}>
                <Icon size={21} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            )
          )}
        </div>

        <div className="debtors-toolbar">
          <form
            className="debtors-search"
            onSubmit={submitSearch}
          >
            <Search size={18} />

            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="ID, Ф.И.Ш., телефон ёки ЖШШИР"
            />

            <button type="submit">
              Қидириш
            </button>
          </form>

          <select
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">
              Барча филиаллар
            </option>

            {branches.map((branch) => (
              <option
                value={branch.id}
                key={branch.id}
              >
                {branch.name}
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
            <option value="">
              Барча хизматлар
            </option>

            {Object.entries(
              SERVICE_LABELS
            ).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="debtors-state">
            <LoaderCircle
              className="spin"
              size={36}
            />
            <strong>
              Қарздорлар юкланмоқда...
            </strong>
          </div>
        ) : error ? (
          <div className="debtors-state debtors-error">
            <strong>
              Маълумотларни юклаб бўлмади
            </strong>
            <span>{error}</span>

            <button type="button" onClick={load}>
              Қайта уриниш
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="debtors-state">
            <CheckCircle2 size={42} />
            <strong>
              Ҳозирча қарздорлар йўқ
            </strong>
            <span>
              Хизмат ҳақи тўлиқ тўланмаган
              мурожаатлар шу ерда пайдо бўлади.
            </span>
          </div>
        ) : (
          <div className="debtors-list">
            {items.map((item) => (
              <article
                className="debtor-card"
                key={item.id}
              >
                <div className="debtor-card-head">
                  <div>
                    <span className="debtor-id">
                      {item.displayId}
                    </span>

                    <h3>
                      {item.applicant?.fullName ||
                        'Мижоз номи йўқ'}
                    </h3>

                    <small>
                      {item.applicant?.phone ||
                        '—'}
                    </small>
                  </div>

                  <span className="debtor-badge">
                    Қарздор
                  </span>
                </div>

                <div className="debtor-grid">
                  <div>
                    <WalletCards size={17} />
                    <span>Хизмат</span>
                    <strong>
                      {SERVICE_LABELS[
                        item.serviceType
                      ] ||
                        item.serviceType ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <Building2 size={17} />
                    <span>Филиал</span>
                    <strong>
                      {item.branch?.name || '—'}
                    </strong>
                  </div>

                  <div>
                    <UserRound size={17} />
                    <span>Масъул ходим</span>
                    <strong>
                      {item.executor?.fullName ||
                        item.receptionManager
                          ?.fullName ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <CircleDollarSign size={17} />
                    <span>Хизмат ҳақи</span>
                    <strong>
                      {formatAmount(
                        item.serviceFee
                      )}
                    </strong>
                  </div>

                  <div>
                    <CheckCircle2 size={17} />
                    <span>Тўланган</span>
                    <strong>
                      {formatAmount(
                        item.paidAmount
                      )}
                    </strong>
                  </div>

                  <div>
                    <Clock3 size={17} />
                    <span>Қолдиқ</span>
                    <strong className="debtor-remaining">
                      {formatAmount(
                        item.remainingAmount
                      )}
                    </strong>
                  </div>

                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Маблағни олган сана
                    </span>
                    <strong>
                      {formatDate(
                        item.clientReceivedAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <Banknote size={17} />
                    <span>Банк</span>
                    <strong>
                      {item.bankName || '—'}
                    </strong>
                  </div>

                  <div>
                    <Phone size={17} />
                    <span>Телефон</span>
                    <strong>
                      {item.applicant?.phone ||
                        '—'}
                    </strong>
                  </div>
                </div>

                <div className="debtor-card-footer">
                  <span>
                    Қисман тўловда қарздорлар
                    рўйхатида қолади. Қарз тўлиқ
                    ёпилса архивга ўтади.
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      openPayment(item)
                    }
                  >
                    <Banknote size={16} />
                    Тўлов қабул қилиш
                  </button>
                </div>

                {item.payments?.length ? (
                  <details className="debtor-history">
                    <summary>
                      Тўловлар тарихи (
                      {item.payments.length})
                    </summary>

                    {item.payments.map(
                      (payment) => (
                        <div
                          key={payment.id}
                          className="debtor-history-row"
                        >
                          <strong>
                            {formatAmount(
                              payment.amount
                            )}
                          </strong>
                          <span>
                            {payment.method ||
                              'Усул йўқ'}
                          </span>
                          <span>
                            {formatDate(
                              payment.paidAt ||
                                payment.createdAt
                            )}
                          </span>
                          <span>
                            {payment.reference ||
                              '—'}
                          </span>
                        </div>
                      )
                    )}
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}

        {!loading &&
        !error &&
        pagination.totalPages > 1 ? (
          <div className="debtors-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((value) =>
                  Math.max(1, value - 1)
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
              disabled={
                page >= pagination.totalPages
              }
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

      {paymentItem ? (
        <div
          className="debtor-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPaymentItem(null);
              setPaymentError('');
            }
          }}
        >
          <div className="debtor-modal">
            <div className="debtor-modal-head">
              <div>
                <span className="debtors-kicker">
                  ҚАРЗ ТЎЛОВИ
                </span>
                <h3>
                  {paymentItem.displayId}
                </h3>
                <p>
                  {paymentItem.applicant
                    ?.fullName || 'Мижоз'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaymentItem(null);
                  setPaymentError('');
                }}
              >
                <X size={21} />
              </button>
            </div>

            <div className="debtor-modal-summary">
              <div>
                <span>Хизмат ҳақи</span>
                <strong>
                  {formatAmount(
                    paymentItem.serviceFee
                  )}
                </strong>
              </div>

              <div>
                <span>Тўланган</span>
                <strong>
                  {formatAmount(
                    paymentItem.paidAmount
                  )}
                </strong>
              </div>

              <div>
                <span>Қолдиқ</span>
                <strong>
                  {formatAmount(
                    paymentItem.remainingAmount
                  )}
                </strong>
              </div>
            </div>

            <form
              className="debtor-payment-form"
              onSubmit={savePayment}
            >
              <label>
                <span>Тўлов суммаси</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max={Number(
                    paymentItem.remainingAmount ||
                      0
                  )}
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm(
                      (current) => ({
                        ...current,
                        amount:
                          event.target.value,
                      })
                    )
                  }
                  required
                  disabled={paymentSaving}
                />
              </label>

              <label>
                <span>Тўлов усули</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm(
                      (current) => ({
                        ...current,
                        method:
                          event.target.value,
                      })
                    )
                  }
                  disabled={paymentSaving}
                >
                  <option value="Нақд">
                    Нақд
                  </option>
                  <option value="Банк ўтказмаси">
                    Банк ўтказмаси
                  </option>
                  <option value="Click">
                    Click
                  </option>
                  <option value="Payme">
                    Payme
                  </option>
                  <option value="Терминал">
                    Терминал
                  </option>
                  <option value="Бошқа">
                    Бошқа
                  </option>
                </select>
              </label>

              <label>
                <span>Тўлов санаси</span>
                <input
                  type="datetime-local"
                  value={paymentForm.paidAt}
                  onChange={(event) =>
                    setPaymentForm(
                      (current) => ({
                        ...current,
                        paidAt:
                          event.target.value,
                      })
                    )
                  }
                  disabled={paymentSaving}
                />
              </label>

              <label>
                <span>
                  Чек / транзакция рақами
                </span>
                <input
                  value={
                    paymentForm.reference
                  }
                  onChange={(event) =>
                    setPaymentForm(
                      (current) => ({
                        ...current,
                        reference:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ихтиёрий"
                  disabled={paymentSaving}
                />
              </label>

              {paymentError ? (
                <div className="debtor-payment-error">
                  {paymentError}
                </div>
              ) : null}

              <div className="debtor-payment-note">
                Агар қолдиқ тўлиқ ёпилса,
                мурожаат автоматик равишда
                «Архив» бўлимига ўтади.
              </div>

              <button
                type="submit"
                className="debtor-save-payment"
                disabled={paymentSaving}
              >
                {paymentSaving ? (
                  <>
                    <LoaderCircle
                      className="spin"
                      size={17}
                    />
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
        .debtors-page {
          overflow: hidden;
        }

        .debtors-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 18px;
        }

        .debtors-kicker {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .debtors-head h2,
        .debtor-modal-head h3 {
          margin: 5px 0;
        }

        .debtors-head p,
        .debtor-modal-head p {
          margin: 0;
          color: #7f8590;
          font-size: 13px;
        }

        .debtors-refresh {
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

        .debtors-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 0 18px 14px;
        }

        .debtors-summary > div {
          display: grid;
          grid-template-columns: 28px 1fr;
          column-gap: 8px;
          border: 1px solid #e4e7eb;
          border-radius: 12px;
          padding: 13px;
          background: #fff;
        }

        .debtors-summary svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .debtors-summary span {
          color: #858b94;
          font-size: 10px;
        }

        .debtors-summary strong {
          margin-top: 3px;
          font-size: 17px;
        }

        .debtors-toolbar {
          display: grid;
          grid-template-columns:
            minmax(320px, 1fr)
            210px
            220px;
          gap: 10px;
          padding: 14px 18px;
          border-top: 1px solid #edf0f3;
          border-bottom: 1px solid #edf0f3;
        }

        .debtors-search {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding-left: 11px;
          background: #fff;
        }

        .debtors-search input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          padding: 11px 0;
          font: inherit;
        }

        .debtors-search button {
          align-self: stretch;
          border: 0;
          border-radius: 0 9px 9px 0;
          padding: 0 15px;
          background: #ef233c;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .debtors-toolbar select {
          min-height: 43px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          padding: 0 11px;
          background: #fff;
          font: inherit;
        }

        .debtors-list {
          display: grid;
          gap: 12px;
          padding: 18px;
        }

        .debtor-card {
          border: 1px solid #e4e7eb;
          border-radius: 14px;
          padding: 16px;
          background: #fff;
        }

        .debtor-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding-bottom: 13px;
          border-bottom: 1px solid #eef0f2;
        }

        .debtor-id {
          color: #ef233c;
          font-size: 11px;
          font-weight: 900;
        }

        .debtor-card h3 {
          margin: 4px 0 2px;
          font-size: 16px;
        }

        .debtor-card small {
          color: #858b94;
        }

        .debtor-badge {
          border-radius: 999px;
          padding: 7px 10px;
          background: #fff2dc;
          color: #a36700;
          font-size: 10px;
          font-weight: 900;
        }

        .debtor-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 13px;
          padding: 14px 0;
        }

        .debtor-grid > div {
          display: grid;
          grid-template-columns: 22px 1fr;
          column-gap: 7px;
        }

        .debtor-grid svg {
          grid-row: 1 / span 2;
          color: #ef233c;
        }

        .debtor-grid span {
          color: #8a9098;
          font-size: 10px;
        }

        .debtor-grid strong {
          margin-top: 2px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .debtor-remaining {
          color: #d21f2b;
        }

        .debtor-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding-top: 12px;
          border-top: 1px solid #eef0f2;
        }

        .debtor-card-footer > span {
          color: #858b94;
          font-size: 10px;
        }

        .debtor-card-footer button,
        .debtor-save-payment {
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

        .debtor-history {
          margin-top: 12px;
          border-radius: 10px;
          padding: 10px 12px;
          background: #f8f9fa;
        }

        .debtor-history summary {
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .debtor-history-row {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 10px;
          padding: 9px 0;
          border-top: 1px solid #e8ebee;
          font-size: 10px;
        }

        .debtors-state {
          min-height: 290px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 20px;
          text-align: center;
          color: #858b94;
        }

        .debtors-error {
          color: #c9212c;
        }

        .debtors-state button {
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 9px 12px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .debtors-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          padding: 0 18px 20px;
        }

        .debtors-pagination button {
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

        .debtors-pagination button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .debtor-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1400;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, .56);
        }

        .debtor-modal {
          width: min(570px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 25px 70px
            rgba(0, 0, 0, .22);
        }

        .debtor-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 18px;
          border-bottom: 1px solid #edf0f3;
        }

        .debtor-modal-head button {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          border: 1px solid #e1e5e9;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .debtor-modal-summary {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
          padding: 15px 18px 0;
        }

        .debtor-modal-summary > div {
          display: grid;
          gap: 4px;
          border-radius: 10px;
          padding: 11px;
          background: #f7f8fa;
        }

        .debtor-modal-summary span {
          color: #858b94;
          font-size: 10px;
        }

        .debtor-modal-summary strong {
          font-size: 13px;
        }

        .debtor-payment-form {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 18px;
        }

        .debtor-payment-form label {
          display: grid;
          gap: 6px;
        }

        .debtor-payment-form label > span {
          font-size: 11px;
          font-weight: 800;
        }

        .debtor-payment-form input,
        .debtor-payment-form select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          padding: 10px 11px;
          background: #fff;
          font: inherit;
        }

        .debtor-payment-error,
        .debtor-payment-note {
          grid-column: 1 / -1;
          border-radius: 9px;
          padding: 10px 11px;
          font-size: 11px;
        }

        .debtor-payment-error {
          background: #fff0f1;
          color: #c9212c;
          font-weight: 800;
        }

        .debtor-payment-note {
          background: #eef8ff;
          color: #315b76;
        }

        .debtor-save-payment {
          grid-column: 1 / -1;
          min-height: 43px;
        }

        @media (max-width: 1000px) {
          .debtors-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .debtors-toolbar {
            grid-template-columns: 1fr 1fr;
          }

          .debtors-search {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 650px) {
          .debtors-head,
          .debtor-card-head,
          .debtor-card-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .debtors-summary,
          .debtors-toolbar,
          .debtor-grid,
          .debtor-modal-summary,
          .debtor-payment-form {
            grid-template-columns: 1fr;
          }

          .debtors-search,
          .debtor-payment-error,
          .debtor-payment-note,
          .debtor-save-payment {
            grid-column: auto;
          }

          .debtor-history-row {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}
