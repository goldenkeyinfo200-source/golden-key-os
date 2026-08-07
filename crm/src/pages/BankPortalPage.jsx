import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  FileSearch,
  FileText,
  Landmark,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { BankOffersSection } from '../components/bank-offers/BankOffersSection.jsx';
import { DocumentsSection } from '../components/documents/DocumentsSection.jsx';
import {
  API_URL,
  TOKEN_KEY,
  USER_KEY,
  apiRequest,
} from '../services/api.js';

const STATUS_LABELS = {
  BANK_REVIEW: 'Банк текширувида',
  CLIENT_PREAPPROVED: 'Дастлабки тасдиқ',
};

const REVIEW_STATUS_LABELS = {
  SENT: 'Банкка юборилган',
  VIEWED: 'Кўрилган',
  UNDER_REVIEW: 'Текширилмоқда',
  NEEDS_DOCUMENTS: 'Қўшимча ҳужжат керак',
  OFFER_SUBMITTED: 'Таклиф юборилган',
  REJECTED: 'Рад этилган',
  SELECTED: 'Таклиф танланган',
  CLOSED: 'Ёпилган',
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

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  return `${new Intl.NumberFormat('uz-UZ').format(number)} сўм`;
}

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

function InfoBox({ label, value }) {
  return (
    <div className="bank-portal-info-box">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}


function BankReviewSection({ caseId, onChanged }) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    status: 'UNDER_REVIEW',
    katmStatus: '',
    katmNote: '',
    collateralStatus: '',
    collateralNote: '',
  });

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest(`/banks/cases/${caseId}/assignments`);
      const item = Array.isArray(data.items) ? data.items[0] || null : null;
      setAssignment(item);

      if (item) {
        setForm({
          status:
            ['VIEWED', 'UNDER_REVIEW', 'NEEDS_DOCUMENTS', 'REJECTED'].includes(
              item.status
            )
              ? item.status
              : 'UNDER_REVIEW',
          katmStatus: item.katmStatus || '',
          katmNote: item.katmNote || '',
          collateralStatus: item.collateralStatus || '',
          collateralNote: item.collateralNote || '',
        });
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          'Банк текшируви топшириғини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!assignment?.id) {
      setError('Ушбу мурожаат учун банк топшириғи топилмади.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiRequest(
        `/banks/assignments/${assignment.id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: form.status,
            katmStatus: form.katmStatus.trim(),
            katmNote: form.katmNote.trim(),
            collateralStatus: form.collateralStatus.trim(),
            collateralNote: form.collateralNote.trim(),
          }),
        }
      );

      setAssignment(data.item || assignment);
      setSuccess('Банк текшируви маълумотлари сақланди.');
      await onChanged?.();
    } catch (requestError) {
      setError(
        requestError.message ||
          'Банк текшируви маълумотларини сақлаб бўлмади.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bank-portal-card bank-review-section">
      <div className="bank-portal-section-head">
        <div>
          <span className="bank-portal-kicker">Текширув</span>
          <h3>КАТМ ва гаров натижаси</h3>
          <p>
            Текширув натижаларини сақланг. Кейин пастда банк таклифини
            киритиш мумкин.
          </p>
        </div>
        <ShieldCheck size={21} />
      </div>

      {loading ? (
        <div className="bank-review-loading">
          <LoaderCircle className="spin" size={24} />
          <span>Банк топшириғи юкланмоқда...</span>
        </div>
      ) : !assignment ? (
        <div className="bank-review-warning">
          Ушбу банкка бириктирилган топшириқ топилмади.
        </div>
      ) : (
        <>
          <div className="bank-review-current">
            <span>Жорий ҳолат</span>
            <strong>
              {REVIEW_STATUS_LABELS[assignment.status] ||
                assignment.status ||
                '—'}
            </strong>
            {assignment.assignedBankEmployee?.fullName ? (
              <small>
                Масъул: {assignment.assignedBankEmployee.fullName}
              </small>
            ) : null}
          </div>

          <form className="bank-review-form" onSubmit={submit}>
            <label>
              <span>Текширув ҳолати</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField('status', event.target.value)
                }
                disabled={saving}
              >
                <option value="VIEWED">Кўрилган</option>
                <option value="UNDER_REVIEW">Текширилмоқда</option>
                <option value="NEEDS_DOCUMENTS">
                  Қўшимча ҳужжат керак
                </option>
                <option value="REJECTED">Рад этилган</option>
              </select>
            </label>

            <label>
              <span>КАТМ натижаси</span>
              <input
                value={form.katmStatus}
                onChange={(event) =>
                  updateField('katmStatus', event.target.value)
                }
                placeholder="Масалан: ижобий / салбий / қўшимча текширув"
                disabled={saving}
              />
            </label>

            <label className="bank-review-wide">
              <span>КАТМ бўйича изоҳ</span>
              <textarea
                rows={3}
                value={form.katmNote}
                onChange={(event) =>
                  updateField('katmNote', event.target.value)
                }
                placeholder="Кредит тарихи, қарздорлик ёки бошқа изоҳ..."
                disabled={saving}
              />
            </label>

            <label>
              <span>Гаров текшируви</span>
              <input
                value={form.collateralStatus}
                onChange={(event) =>
                  updateField('collateralStatus', event.target.value)
                }
                placeholder="Масалан: мос / мос эмас / текширилмоқда"
                disabled={saving}
              />
            </label>

            <label className="bank-review-wide">
              <span>Гаров бўйича изоҳ</span>
              <textarea
                rows={3}
                value={form.collateralNote}
                onChange={(event) =>
                  updateField('collateralNote', event.target.value)
                }
                placeholder="Кадастр, таъқиқ, баҳолаш ёки бошқа изоҳ..."
                disabled={saving}
              />
            </label>

            {error ? <div className="bank-review-error">{error}</div> : null}
            {success ? (
              <div className="bank-review-success">{success}</div>
            ) : null}

            <button
              type="submit"
              className="bank-review-submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  Сақланмоқда...
                </>
              ) : (
                <>
                  <ShieldCheck size={17} />
                  Текширув натижасини сақлаш
                </>
              )}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function BankCaseDetails({ caseId, onBack, onReloadList }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest(`/cases/${caseId}`);
      setItem(data.item || null);
    } catch (requestError) {
      setError(
        requestError.message ||
          'Мурожаат маълумотларини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="bank-portal-state">
        <LoaderCircle className="spin" size={34} />
        <strong>Мурожаат юкланмоқда...</strong>
      </section>
    );
  }

  if (error || !item) {
    return (
      <section className="bank-portal-state error">
        <strong>Мурожаатни очиб бўлмади</strong>
        <span>{error || 'Мурожаат топилмади.'}</span>
        <button type="button" onClick={onBack}>
          Орқага қайтиш
        </button>
      </section>
    );
  }

  const applicant = item.applicant || {};

  return (
    <div className="bank-case-details">
      <div className="bank-case-toolbar">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Рўйхатга қайтиш
        </button>

        <button type="button" onClick={load}>
          <RefreshCw size={17} />
          Янгилаш
        </button>
      </div>

      <section className="bank-portal-card bank-case-hero">
        <div>
          <span className="bank-portal-kicker">Банк текшируви</span>
          <h2>{item.displayId}</h2>
          <p>
            {applicant.fullName || 'Мижоз номи йўқ'} ·{' '}
            {SERVICE_LABELS[item.serviceType] || item.serviceType}
          </p>
        </div>

        <div className="bank-case-hero-right">
          <span>{STATUS_LABELS[item.status] || item.status}</span>
          <strong>{formatMoney(item.requestedAmount)}</strong>
        </div>
      </section>

      <section className="bank-portal-card">
        <div className="bank-portal-section-head">
          <div>
            <span className="bank-portal-kicker">Мижоз</span>
            <h3>КАТМ текшируви учун маълумотлар</h3>
          </div>
          <UserRound size={21} />
        </div>

        <div className="bank-portal-info-grid">
          <InfoBox label="Ф.И.Ш." value={applicant.fullName} />
          <InfoBox label="Телефон" value={applicant.phone} />
          <InfoBox label="ЖШШИР" value={applicant.pinfl} />
          <InfoBox
            label="Паспорт"
            value={
              [applicant.passportSeries, applicant.passportNumber]
                .filter(Boolean)
                .join(' ') || '—'
            }
          />
          <InfoBox
            label="Туғилган сана"
            value={formatDate(applicant.birthDate)}
          />
          <InfoBox label="Манзил" value={applicant.address} />
        </div>
      </section>

      <section className="bank-portal-card">
        <div className="bank-portal-section-head">
          <div>
            <span className="bank-portal-kicker">Гаров</span>
            <h3>Гаровга олинаётган мулк</h3>
          </div>
          <Building2 size={21} />
        </div>

        <div className="bank-portal-info-grid">
          <InfoBox label="Мулк тури" value={item.collateralType} />
          <InfoBox
            label="Кадастр рақами"
            value={item.collateralCadastreNumber}
          />
          <InfoBox
            label="Мулкдор Ф.И.Ш."
            value={item.collateralOwnerFullName}
          />
          <InfoBox
            label="Мулкдор ЖШШИРи"
            value={item.collateralOwnerPinfl}
          />
          <InfoBox
            label="Умумий майдон"
            value={
              item.collateralArea
                ? `${item.collateralArea} м²`
                : '—'
            }
          />
          <InfoBox
            label="Тахминий қиймат"
            value={formatMoney(item.collateralEstimatedValue)}
          />
          <InfoBox
            label="Мулк манзили"
            value={item.collateralAddress}
          />
          <InfoBox
            label="Қўшимча маълумот"
            value={item.collateralNotes}
          />
        </div>
      </section>

      <BankReviewSection
        caseId={item.id}
        onChanged={async () => {
          await load();
          await onReloadList?.();
        }}
      />

      <DocumentsSection
        caseId={item.id}
        applicantClientId={item.applicantClientId}
        onChanged={load}
      />

      <BankOffersSection
        caseId={item.id}
        onCaseChanged={async () => {
          await load();
          await onReloadList?.();
        }}
      />
    </div>
  );
}

export function BankPortalPage({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('BANK_REVIEW');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (status) {
        params.set('status', status);
      }

      const data = await apiRequest(`/cases?${params.toString()}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (requestError) {
      setError(
        requestError.message ||
          'Банк текширувидаги мурожаатларни юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Сервер жавоб бермаса ҳам маҳаллий сеанс ёпилади.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      onLogout();
    }
  };

  if (selectedCaseId) {
    return (
      <div className="bank-portal-app">
        <BankPortalStyles />

        <aside className={`bank-portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="bank-portal-brand">
            <img src="/golden-key-logo.png" alt="Golden Key Info" />
            <div>
              <strong>Bank Portal</strong>
              <span>Golden Key OS</span>
            </div>
          </div>

          <nav>
            <button type="button" className="active">
              <FileSearch size={19} />
              Банк текшируви
            </button>
          </nav>

          <div className="bank-portal-user">
            <div>
              <strong>{user?.fullName || 'Банк ходими'}</strong>
              <span>{user?.bank?.shortName || user?.bank?.name || 'Банк ходими'}</span>
            </div>
            <button type="button" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        <main className="bank-portal-main">
          <header className="bank-portal-topbar">
            <button
              type="button"
              className="bank-portal-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div>
              <strong>Банк текшируви</strong>
              <span>КАТМ, гаров ва банк таклифлари</span>
            </div>
          </header>

          <div className="bank-portal-content">
            <BankCaseDetails
              caseId={selectedCaseId}
              onBack={() => setSelectedCaseId('')}
              onReloadList={load}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bank-portal-app">
      <BankPortalStyles />

      <aside className={`bank-portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="bank-portal-brand">
          <img src="/golden-key-logo.png" alt="Golden Key Info" />
          <div>
            <strong>Bank Portal</strong>
            <span>Golden Key OS</span>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav>
          <button type="button" className="active">
            <Landmark size={19} />
            Банк текшируви
          </button>
        </nav>

        <div className="bank-portal-user">
          <div>
            <strong>{user?.fullName || 'Банк ходими'}</strong>
            <span>{user?.bank?.shortName || user?.bank?.name || 'Банк ходими'}</span>
          </div>
          <button type="button" onClick={logout} title="Тизимдан чиқиш">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="bank-portal-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <main className="bank-portal-main">
        <header className="bank-portal-topbar">
          <button
            type="button"
            className="bank-portal-menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>

          <div>
            <strong>Банк ходими кабинети</strong>
            <span>Фақат банк текширувидаги мурожаатлар</span>
          </div>

          <div className="bank-portal-security">
            <ShieldCheck size={17} />
            Ролга асосланган кириш
          </div>
        </header>

        <div className="bank-portal-content">
          <section className="bank-portal-card bank-portal-list-head">
            <div>
              <span className="bank-portal-kicker">Мурожаатлар</span>
              <h2>Банк текшируви</h2>
              <p>КАТМ ва гаров мулкини текшириш учун юборилган ишлар.</p>
            </div>

            <button type="button" onClick={load} disabled={loading}>
              <RefreshCw
                size={17}
                className={loading ? 'spin' : ''}
              />
              Янгилаш
            </button>
          </section>

          <section className="bank-portal-filters">
            <label>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ID, Ф.И.Ш., телефон ёки ЖШШИР"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="BANK_REVIEW">Банк текширувида</option>
              <option value="CLIENT_PREAPPROVED">Дастлабки тасдиқ</option>
              <option value="">Ҳар икки ҳолат</option>
            </select>
          </section>

          {error ? (
            <section className="bank-portal-state error">
              <strong>Маълумотларни юклаб бўлмади</strong>
              <span>{error}</span>
              <button type="button" onClick={load}>
                Қайта уриниш
              </button>
            </section>
          ) : loading ? (
            <section className="bank-portal-state">
              <LoaderCircle className="spin" size={34} />
              <strong>Мурожаатлар юкланмоқда...</strong>
            </section>
          ) : items.length === 0 ? (
            <section className="bank-portal-state">
              <FileText size={38} />
              <strong>Банкка юборилган мурожаат йўқ</strong>
              <span>
                Менежер мурожаатни «Банк текширувида» ҳолатига
                ўтказганда шу ерда кўринади.
              </span>
            </section>
          ) : (
            <section className="bank-portal-case-grid">
              {items.map((item) => (
                <button
                  type="button"
                  className="bank-portal-case-card"
                  key={item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                >
                  <div className="bank-portal-case-card-head">
                    <div>
                      <span>{item.displayId}</span>
                      <strong>
                        {item.applicant?.fullName || 'Мижоз номи йўқ'}
                      </strong>
                    </div>

                    <span className="bank-portal-status">
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>

                  <div className="bank-portal-case-card-body">
                    <InfoBox
                      label="Хизмат"
                      value={
                        SERVICE_LABELS[item.serviceType] ||
                        item.serviceType
                      }
                    />
                    <InfoBox
                      label="Сўралган сумма"
                      value={formatMoney(item.requestedAmount)}
                    />
                    <InfoBox
                      label="Телефон"
                      value={item.applicant?.phone}
                    />
                    <InfoBox
                      label="Яратилган"
                      value={formatDate(item.createdAt, true)}
                    />
                  </div>
                </button>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function BankPortalStyles() {
  return (
    <style>{`
      .bank-portal-app {
        min-height: 100vh;
        background: #f3f5f7;
        color: #16191d;
      }

      .bank-portal-sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 60;
        width: 258px;
        display: flex;
        flex-direction: column;
        background: #151515;
        color: #fff;
      }

      .bank-portal-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 22px 18px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .bank-portal-brand img {
        width: 43px;
        height: 43px;
        border-radius: 10px;
        object-fit: contain;
        background: #fff;
      }

      .bank-portal-brand div {
        display: grid;
        gap: 3px;
        flex: 1;
      }

      .bank-portal-brand span,
      .bank-portal-user span {
        color: #9ea3aa;
        font-size: 11px;
      }

      .bank-portal-brand > button {
        display: none;
        border: 0;
        background: transparent;
        color: #fff;
      }

      .bank-portal-sidebar nav {
        display: grid;
        gap: 7px;
        padding: 18px 12px;
      }

      .bank-portal-sidebar nav button {
        min-height: 46px;
        display: flex;
        align-items: center;
        gap: 11px;
        border: 0;
        border-radius: 10px;
        padding: 0 13px;
        background: transparent;
        color: #d6d9dd;
        font: inherit;
        font-weight: 700;
        text-align: left;
      }

      .bank-portal-sidebar nav button.active {
        background: #2b2b2b;
        color: #fff;
      }

      .bank-portal-user {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px;
        border-top: 1px solid rgba(255,255,255,.08);
      }

      .bank-portal-user div {
        display: grid;
        gap: 3px;
        min-width: 0;
        flex: 1;
      }

      .bank-portal-user strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }

      .bank-portal-user button {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 9px;
        background: #e5232f;
        color: #fff;
        cursor: pointer;
      }

      .bank-portal-main {
        min-height: 100vh;
        margin-left: 258px;
      }

      .bank-portal-topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        min-height: 72px;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 24px;
        border-bottom: 1px solid #e2e5e9;
        background: rgba(255,255,255,.96);
        backdrop-filter: blur(8px);
      }

      .bank-portal-topbar > div {
        display: grid;
        gap: 3px;
        flex: 1;
      }

      .bank-portal-topbar span {
        color: #858b93;
        font-size: 11px;
      }

      .bank-portal-menu {
        display: none;
        width: 39px;
        height: 39px;
        place-items: center;
        border: 1px solid #dfe3e8;
        border-radius: 9px;
        background: #fff;
      }

      .bank-portal-security {
        display: inline-flex !important;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        color: #087742;
        font-size: 11px;
        font-weight: 800;
      }

      .bank-portal-content {
        width: min(1180px, calc(100% - 40px));
        margin: 0 auto;
        padding: 24px 0 50px;
      }

      .bank-portal-card,
      .bank-portal-state {
        border: 1px solid #e1e5e9;
        border-radius: 15px;
        background: #fff;
        padding: 20px;
        box-shadow: 0 6px 18px rgba(24,31,39,.035);
      }

      .bank-portal-list-head,
      .bank-portal-section-head,
      .bank-case-hero,
      .bank-case-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .bank-portal-list-head h2,
      .bank-portal-section-head h3,
      .bank-case-hero h2 {
        margin: 4px 0 5px;
      }

      .bank-portal-list-head p,
      .bank-case-hero p {
        margin: 0;
        color: #7d838b;
        font-size: 12px;
      }

      .bank-portal-kicker {
        color: #e5232f;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .bank-portal-list-head button,
      .bank-case-toolbar button,
      .bank-portal-state button {
        min-height: 39px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid #dfe3e8;
        border-radius: 9px;
        padding: 0 13px;
        background: #fff;
        color: #25282c;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .bank-portal-filters {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 220px;
        gap: 12px;
        margin: 15px 0;
      }

      .bank-portal-filters label {
        display: flex;
        align-items: center;
        gap: 9px;
        border: 1px solid #dfe3e8;
        border-radius: 10px;
        background: #fff;
        padding: 0 12px;
      }

      .bank-portal-filters input,
      .bank-portal-filters select {
        width: 100%;
        min-height: 43px;
        border: 0;
        outline: none;
        background: transparent;
        font: inherit;
      }

      .bank-portal-filters select {
        border: 1px solid #dfe3e8;
        border-radius: 10px;
        background: #fff;
        padding: 0 12px;
      }

      .bank-portal-case-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        gap: 14px;
      }

      .bank-portal-case-card {
        display: grid;
        gap: 14px;
        border: 1px solid #e1e5e9;
        border-radius: 14px;
        background: #fff;
        padding: 16px;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
      }

      .bank-portal-case-card:hover {
        transform: translateY(-2px);
        border-color: #ef9ba1;
        box-shadow: 0 10px 26px rgba(24,31,39,.08);
      }

      .bank-portal-case-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .bank-portal-case-card-head > div {
        display: grid;
        gap: 4px;
      }

      .bank-portal-case-card-head > div > span {
        color: #e5232f;
        font-size: 10px;
        font-weight: 900;
      }

      .bank-portal-status {
        border-radius: 999px;
        padding: 6px 9px;
        background: #fff5e8;
        color: #a96500;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
      }

      .bank-portal-case-card-body,
      .bank-portal-info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        overflow: hidden;
        border: 1px solid #eceef1;
        border-radius: 11px;
        background: #eceef1;
      }

      .bank-portal-info-box {
        display: grid;
        gap: 5px;
        min-width: 0;
        padding: 11px;
        background: #fff;
      }

      .bank-portal-info-box span {
        color: #888e96;
        font-size: 10px;
      }

      .bank-portal-info-box strong {
        font-size: 12px;
        overflow-wrap: anywhere;
      }

      .bank-portal-state {
        min-height: 240px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 9px;
        text-align: center;
        color: #8c939c;
      }

      .bank-portal-state.error {
        color: #c9212c;
      }

      .bank-portal-state span {
        max-width: 520px;
        font-size: 12px;
        line-height: 1.5;
      }

      .bank-case-details {
        display: grid;
        gap: 15px;
      }

      .bank-case-toolbar {
        align-items: center;
      }

      .bank-case-hero-right {
        display: grid;
        justify-items: end;
        gap: 8px;
      }

      .bank-case-hero-right span {
        border-radius: 999px;
        padding: 6px 9px;
        background: #fff5e8;
        color: #a96500;
        font-size: 10px;
        font-weight: 800;
      }

      .bank-portal-section-head {
        margin-bottom: 15px;
      }

      .bank-portal-overlay {
        display: none;
      }


      .bank-review-section .bank-portal-section-head p {
        margin: 5px 0 0;
        color: #7f858c;
        font-size: 13px;
      }

      .bank-review-loading {
        min-height: 90px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        color: #777d85;
      }

      .bank-review-warning {
        padding: 14px;
        border: 1px solid #f1c6cb;
        border-radius: 10px;
        background: #fff5f6;
        color: #a52333;
        font-size: 13px;
        font-weight: 700;
      }

      .bank-review-current {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 14px;
        padding: 12px 14px;
        border-radius: 10px;
        background: #f6f7f8;
      }

      .bank-review-current span {
        color: #858b92;
        font-size: 12px;
      }

      .bank-review-current strong {
        font-size: 13px;
      }

      .bank-review-current small {
        margin-left: auto;
        color: #777d85;
      }

      .bank-review-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 13px;
      }

      .bank-review-form label {
        display: grid;
        gap: 6px;
      }

      .bank-review-form label > span {
        font-size: 12px;
        font-weight: 800;
      }

      .bank-review-form input,
      .bank-review-form select,
      .bank-review-form textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #dfe3e7;
        border-radius: 10px;
        padding: 10px 11px;
        background: #fff;
        color: #16191d;
        font: inherit;
        outline: none;
      }

      .bank-review-form input:focus,
      .bank-review-form select:focus,
      .bank-review-form textarea:focus {
        border-color: #ef233c;
        box-shadow: 0 0 0 3px rgba(239,35,60,.08);
      }

      .bank-review-wide {
        grid-column: 1 / -1;
      }

      .bank-review-error,
      .bank-review-success {
        grid-column: 1 / -1;
        padding: 10px 12px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 700;
      }

      .bank-review-error {
        color: #a52333;
        background: #fff2f3;
      }

      .bank-review-success {
        color: #137333;
        background: #edf9f0;
      }

      .bank-review-submit {
        grid-column: 1 / -1;
        min-height: 43px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 10px;
        background: #ef233c;
        color: #fff;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .bank-review-submit:disabled {
        opacity: .65;
        cursor: wait;
      }

      @media (max-width: 900px) {
        .bank-portal-sidebar {
          transform: translateX(-100%);
          transition: transform .2s ease;
        }

        .bank-portal-sidebar.open {
          transform: translateX(0);
        }

        .bank-portal-main {
          margin-left: 0;
        }

        .bank-portal-menu {
          display: grid;
        }

        .bank-portal-brand > button {
          display: grid;
          place-items: center;
        }

        .bank-portal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: block;
          border: 0;
          background: rgba(0,0,0,.45);
        }

        .bank-portal-security {
          display: none !important;
        }
      }

      @media (max-width: 650px) {
        .bank-review-form {
          grid-template-columns: 1fr;
        }

        .bank-review-wide {
          grid-column: auto;
        }

        .bank-review-current {
          align-items: flex-start;
          flex-direction: column;
        }

        .bank-review-current small {
          margin-left: 0;
        }


        .bank-portal-content {
          width: min(100% - 20px, 1180px);
          padding-top: 12px;
        }

        .bank-portal-filters,
        .bank-portal-case-card-body,
        .bank-portal-info-grid {
          grid-template-columns: 1fr;
        }

        .bank-portal-case-grid {
          grid-template-columns: 1fr;
        }

        .bank-portal-list-head,
        .bank-case-hero,
        .bank-case-toolbar {
          flex-direction: column;
        }

        .bank-case-hero-right {
          justify-items: start;
        }
      }
    `}</style>
  );
}
