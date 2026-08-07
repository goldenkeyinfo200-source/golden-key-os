import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  LoaderCircle,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const MANAGER_ROLES = new Set([
  'RECEPTION_MANAGER',
  'BRANCH_MANAGER',
  'SUPER_ADMIN',
  'DIRECTOR',
]);

function formatDateTime(value) {
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

function statusLabel(status) {
  switch (status) {
    case 'QR_READY':
      return 'QR экранда';
    case 'SIGNED':
      return 'Тасдиқланди';
    case 'EXPIRED':
      return 'Муддати тугади';
    default:
      return 'Кутиш режими';
  }
}

function statusTone(status) {
  switch (status) {
    case 'QR_READY':
      return {
        background: '#fff7ed',
        border: '#fed7aa',
        color: '#c2410c',
      };
    case 'SIGNED':
      return {
        background: '#ecfdf5',
        border: '#a7f3d0',
        color: '#047857',
      };
    case 'EXPIRED':
      return {
        background: '#fff1f2',
        border: '#fecdd3',
        color: '#be123c',
      };
    default:
      return {
        background: '#f8fafc',
        border: '#e2e8f0',
        color: '#475569',
      };
  }
}

function normalizeUsers(payload) {
  const raw =
    payload?.items ||
    payload?.users ||
    payload?.data ||
    [];

  return Array.isArray(raw) ? raw : [];
}

function normalizeBranches(payload) {
  const raw =
    payload?.items ||
    payload?.branches ||
    payload?.data ||
    [];

  return Array.isArray(raw) ? raw : [];
}

function CreateDeviceModal({
  branches,
  users,
  user,
  onClose,
  onCreated,
}) {
  const defaultBranchId =
    user?.branchId ||
    (branches.length === 1 ? branches[0].id : '');

  const [branchId, setBranchId] = useState(defaultBranchId);
  const [managerId, setManagerId] = useState(
    user?.role === 'RECEPTION_MANAGER' ? user?.id || '' : ''
  );
  const [name, setName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleManagers = useMemo(() => {
    return users.filter((item) => {
      if (!MANAGER_ROLES.has(item.role)) return false;

      if (branchId && item.branchId && item.branchId !== branchId) {
        return false;
      }

      return true;
    });
  }, [users, branchId]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!branchId) {
      setError('Филиални танланг.');
      return;
    }

    if (!name.trim()) {
      setError('QR экран номини киритинг.');
      return;
    }

    setSaving(true);

    try {
      const payload = await apiRequest('/kiosks', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          managerId: managerId || null,
          name: name.trim(),
          deviceCode: deviceCode.trim() || undefined,
        }),
      });

      onCreated(payload);
    } catch (requestError) {
      setError(
        requestError.message ||
          'QR экран қурилмасини яратиб бўлмади.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalStyles.backdrop}>
      <div style={modalStyles.card}>
        <div style={modalStyles.header}>
          <div>
            <span style={modalStyles.eyebrow}>ЯНГИ ҚУРИЛМА</span>
            <h2 style={modalStyles.title}>QR экран қўшиш</h2>
            <p style={modalStyles.subtitle}>
              Оператор столида турадиган махсус телефонни тизимга бириктиринг.
            </p>
          </div>

          <button type="button" style={modalStyles.close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} style={modalStyles.form}>
          <label style={modalStyles.field}>
            <span style={modalStyles.label}>Филиал *</span>

            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                if (user?.role !== 'RECEPTION_MANAGER') {
                  setManagerId('');
                }
              }}
              style={modalStyles.input}
              disabled={saving || Boolean(user?.branchId)}
            >
              <option value="">Филиални танланг</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.city ? ` — ${branch.city}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label style={modalStyles.field}>
            <span style={modalStyles.label}>Оператор</span>

            <select
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              style={modalStyles.input}
              disabled={
                saving ||
                user?.role === 'RECEPTION_MANAGER'
              }
            >
              <option value="">Оператор танланмаган</option>

              {visibleManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName} — {manager.role}
                </option>
              ))}
            </select>
          </label>

          <label style={modalStyles.field}>
            <span style={modalStyles.label}>Экран номи *</span>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={modalStyles.input}
              placeholder="Масалан: 1-стол телефони"
              disabled={saving}
            />
          </label>

          <label style={modalStyles.field}>
            <span style={modalStyles.label}>
              Қурилма коди
              <small style={modalStyles.optional}> ихтиёрий</small>
            </span>

            <input
              value={deviceCode}
              onChange={(event) => setDeviceCode(event.target.value)}
              style={modalStyles.input}
              placeholder="Бўш қолдирсангиз автомат яратилади"
              disabled={saving}
            />
          </label>

          {error ? (
            <div style={modalStyles.error}>{error}</div>
          ) : null}

          <div style={modalStyles.actions}>
            <button
              type="button"
              style={modalStyles.secondary}
              onClick={onClose}
              disabled={saving}
            >
              Бекор қилиш
            </button>

            <button
              type="submit"
              style={modalStyles.primary}
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle size={18} />
                  Яратилмоқда...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  QR экран яратиш
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatedDeviceModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  const fullDisplayUrl = useMemo(() => {
    if (!result?.displayPath) return '';

    return new URL(
      result.displayPath,
      window.location.origin
    ).toString();
  }, [result]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullDisplayUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={modalStyles.backdrop}>
      <div style={modalStyles.card}>
        <div style={modalStyles.header}>
          <div>
            <span style={modalStyles.eyebrow}>ҚУРИЛМА ТАЙЁР</span>
            <h2 style={modalStyles.title}>Телефон учун махсус ҳавола</h2>
            <p style={modalStyles.subtitle}>
              Ушбу ҳаволани фақат шу махсус телефонда очинг. Токен хавфсизлик
              сабабли кейин рўйхатда қайта кўрсатилмайди.
            </p>
          </div>

          <button type="button" style={modalStyles.close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={createdStyles.success}>
          <CheckCircle2 size={30} />
          <div>
            <strong>{result?.item?.name || 'QR экран'}</strong>
            <span>{result?.item?.deviceCode || '—'}</span>
          </div>
        </div>

        <div style={createdStyles.urlBox}>
          <span style={createdStyles.urlLabel}>Телефонда очиладиган ҳавола</span>
          <code style={createdStyles.url}>{fullDisplayUrl}</code>
        </div>

        <div style={modalStyles.actions}>
          <button
            type="button"
            style={modalStyles.secondary}
            onClick={() => window.open(fullDisplayUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={18} />
            Ҳозир очиш
          </button>

          <button
            type="button"
            style={modalStyles.primary}
            onClick={copy}
          >
            <Clipboard size={18} />
            {copied ? 'Нусха олинди' : 'Ҳаволани нусхалаш'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function KioskDevicesPage({ user }) {
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [clearingId, setClearingId] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const [kioskData, branchData, userData] = await Promise.all([
        apiRequest('/kiosks'),
        apiRequest('/branches'),
        apiRequest('/users'),
      ]);

      setItems(
        Array.isArray(kioskData?.items)
          ? kioskData.items
          : []
      );

      setBranches(normalizeBranches(branchData));
      setUsers(normalizeUsers(userData));
    } catch (requestError) {
      setError(
        requestError.message ||
          'QR экранлар маълумотларини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const poll = window.setInterval(() => {
      load({ quiet: true });
    }, 10000);

    return () => window.clearInterval(poll);
  }, [load]);

  const clearDevice = async (item) => {
    if (!window.confirm(`${item.name} экранидаги жорий QR маълумотини тозалаймизми?`)) {
      return;
    }

    setClearingId(item.id);

    try {
      await apiRequest(`/kiosks/${item.id}/clear`, {
        method: 'POST',
      });

      await load({ quiet: true });
    } catch (requestError) {
      window.alert(
        requestError.message ||
          'QR экранни тозалаб бўлмади.'
      );
    } finally {
      setClearingId('');
    }
  };

  const handleCreated = async (payload) => {
    setCreateOpen(false);
    setCreatedResult(payload);
    await load({ quiet: true });
  };

  return (
    <section style={pageStyles.page}>
      <div style={pageStyles.header}>
        <div>
          <span style={pageStyles.eyebrow}>МИЖОЗ ЭКРАНЛАРИ</span>
          <h2 style={pageStyles.heading}>QR экранлар</h2>
          <p style={pageStyles.subheading}>
            Оператор столларидаги махсус телефонларни бошқариш ва уларнинг
            онлайн ҳолатини кузатиш.
          </p>
        </div>

        <div style={pageStyles.headerActions}>
          <button
            type="button"
            style={pageStyles.secondaryButton}
            onClick={() => load({ quiet: true })}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
            {refreshing ? 'Янгиланмоқда...' : 'Янгилаш'}
          </button>

          <button
            type="button"
            style={pageStyles.primaryButton}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            Янги QR экран
          </button>
        </div>
      </div>

      <div style={pageStyles.summary}>
        <div style={pageStyles.summaryItem}>
          <span>Жами қурилмалар</span>
          <strong>{items.length}</strong>
        </div>

        <div style={pageStyles.summaryItem}>
          <span>Онлайн</span>
          <strong>{items.filter((item) => item.isOnline).length}</strong>
        </div>

        <div style={pageStyles.summaryItem}>
          <span>QR кўрсатяпти</span>
          <strong>
            {items.filter((item) => item.displayStatus === 'QR_READY').length}
          </strong>
        </div>
      </div>

      {loading ? (
        <div style={pageStyles.stateBox}>
          <LoaderCircle size={34} />
          <strong>QR экранлар юкланмоқда...</strong>
        </div>
      ) : error ? (
        <div style={pageStyles.errorBox}>
          <strong>Маълумотларни юклаб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={() => load()}>
            Қайта уриниш
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={pageStyles.stateBox}>
          <MonitorSmartphone size={46} />
          <strong>Ҳозирча QR экранлар йўқ</strong>
          <span>
            Биринчи оператор телефонини қўшиш учун «Янги QR экран»ни босинг.
          </span>
        </div>
      ) : (
        <div style={pageStyles.grid}>
          {items.map((item) => {
            const tone = statusTone(item.displayStatus);

            return (
              <article key={item.id} style={pageStyles.card}>
                <div style={pageStyles.cardTop}>
                  <div style={pageStyles.deviceIcon}>
                    <Smartphone size={28} />
                  </div>

                  <div style={pageStyles.deviceInfo}>
                    <strong>{item.name}</strong>
                    <span>{item.deviceCode}</span>
                  </div>

                  <div
                    style={{
                      ...pageStyles.onlineBadge,
                      color: item.isOnline ? '#047857' : '#64748b',
                      background: item.isOnline ? '#ecfdf5' : '#f1f5f9',
                    }}
                  >
                    {item.isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
                    {item.isOnline ? 'Онлайн' : 'Офлайн'}
                  </div>
                </div>

                <div style={pageStyles.details}>
                  <div>
                    <span>Филиал</span>
                    <strong>
                      {item.branch?.name || '—'}
                      {item.branch?.city ? ` · ${item.branch.city}` : ''}
                    </strong>
                  </div>

                  <div>
                    <span>Оператор</span>
                    <strong>{item.manager?.fullName || 'Бириктирилмаган'}</strong>
                  </div>

                  <div>
                    <span>Охирги алоқа</span>
                    <strong>{formatDateTime(item.lastSeenAt)}</strong>
                  </div>
                </div>

                <div
                  style={{
                    ...pageStyles.status,
                    background: tone.background,
                    borderColor: tone.border,
                    color: tone.color,
                  }}
                >
                  <span>Экран ҳолати</span>
                  <strong>{statusLabel(item.displayStatus)}</strong>
                </div>

                <div style={pageStyles.cardActions}>
                  <button
                    type="button"
                    style={pageStyles.clearButton}
                    onClick={() => clearDevice(item)}
                    disabled={clearingId === item.id}
                  >
                    <RotateCcw size={17} />
                    {clearingId === item.id ? 'Тозаланмоқда...' : 'Экранни тозалаш'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {createOpen ? (
        <CreateDeviceModal
          branches={branches}
          users={users}
          user={user}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {createdResult ? (
        <CreatedDeviceModal
          result={createdResult}
          onClose={() => setCreatedResult(null)}
        />
      ) : null}
    </section>
  );
}

const pageStyles = {
  page: {
    display: 'grid',
    gap: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
    background: '#ffffff',
    border: '1px solid #e8ebef',
    borderRadius: 18,
    padding: 22,
  },
  eyebrow: {
    color: '#ef233c',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  heading: {
    margin: '5px 0 4px',
    fontSize: 25,
  },
  subheading: {
    margin: 0,
    color: '#7a8290',
    maxWidth: 650,
    lineHeight: 1.5,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 0,
    borderRadius: 11,
    padding: '11px 15px',
    background: '#ef233c',
    color: '#ffffff',
    fontWeight: 800,
    display: 'inline-flex',
    gap: 7,
    alignItems: 'center',
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #dfe3e8',
    borderRadius: 11,
    padding: '11px 15px',
    background: '#ffffff',
    color: '#222831',
    fontWeight: 800,
    display: 'inline-flex',
    gap: 7,
    alignItems: 'center',
    cursor: 'pointer',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  },
  summaryItem: {
    background: '#ffffff',
    border: '1px solid #e8ebef',
    borderRadius: 16,
    padding: '17px 18px',
    display: 'grid',
    gap: 6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e8ebef',
    borderRadius: 18,
    padding: 18,
    display: 'grid',
    gap: 16,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    display: 'grid',
    placeItems: 'center',
    background: '#fff1f2',
    color: '#e11d48',
    flexShrink: 0,
  },
  deviceInfo: {
    minWidth: 0,
    display: 'grid',
    gap: 3,
    flex: 1,
  },
  onlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 800,
  },
  details: {
    display: 'grid',
    gap: 10,
  },
  status: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    border: '1px solid',
    borderRadius: 11,
    padding: '10px 12px',
    fontSize: 12,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  clearButton: {
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    borderRadius: 10,
    padding: '9px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontWeight: 750,
    cursor: 'pointer',
  },
  stateBox: {
    minHeight: 280,
    background: '#ffffff',
    border: '1px dashed #dfe3e8',
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 9,
    textAlign: 'center',
    color: '#697180',
    padding: 30,
  },
  errorBox: {
    minHeight: 230,
    background: '#fff7f7',
    border: '1px solid #ffc5cb',
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 9,
    textAlign: 'center',
    color: '#b42318',
    padding: 30,
  },
};

const modalStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.58)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 3000,
    padding: 18,
  },
  card: {
    width: 'min(680px, 100%)',
    maxHeight: '92dvh',
    overflow: 'auto',
    background: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
  },
  header: {
    padding: '22px 22px 18px',
    borderBottom: '1px solid #edf0f3',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  eyebrow: {
    color: '#ef233c',
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 1.35,
  },
  title: {
    margin: '5px 0 4px',
    fontSize: 24,
  },
  subtitle: {
    margin: 0,
    color: '#7a8290',
    lineHeight: 1.5,
  },
  close: {
    width: 38,
    height: 38,
    display: 'grid',
    placeItems: 'center',
    background: '#ffffff',
    border: '1px solid #dfe3e8',
    borderRadius: 10,
    cursor: 'pointer',
  },
  form: {
    padding: 22,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
  },
  field: {
    display: 'grid',
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
  },
  optional: {
    fontWeight: 500,
    color: '#98a2b3',
  },
  input: {
    width: '100%',
    minHeight: 44,
    boxSizing: 'border-box',
    border: '1px solid #d9dde3',
    borderRadius: 10,
    padding: '10px 12px',
    font: 'inherit',
    background: '#ffffff',
  },
  error: {
    gridColumn: '1 / -1',
    color: '#b42318',
    background: '#fff4f4',
    border: '1px solid #ffc8c8',
    borderRadius: 10,
    padding: '10px 12px',
  },
  actions: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  secondary: {
    border: '1px solid #dfe3e8',
    borderRadius: 10,
    padding: '10px 14px',
    background: '#ffffff',
    color: '#222831',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
  },
  primary: {
    border: 0,
    borderRadius: 10,
    padding: '10px 14px',
    background: '#ef233c',
    color: '#ffffff',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    cursor: 'pointer',
  },
};

const createdStyles = {
  success: {
    margin: '22px 22px 0',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 14,
    padding: 14,
    color: '#047857',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  urlBox: {
    margin: 22,
    display: 'grid',
    gap: 8,
  },
  urlLabel: {
    fontSize: 12,
    color: '#667085',
    fontWeight: 800,
  },
  url: {
    display: 'block',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 14,
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    fontSize: 12,
  },
};
