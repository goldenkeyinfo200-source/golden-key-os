import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Stamp,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

import { CasesPage } from './pages/CasesPage.jsx';
import { ExecutionPage } from './pages/ExecutionPage.jsx';
import { BankPortalPage } from './pages/BankPortalPage.jsx';
import { BanksPage } from './pages/BanksPage.jsx';
import { ContractSignPage } from './pages/ContractSignPage.jsx';
import { KioskPage } from './pages/KioskPage.jsx';
import { KioskDevicesPage } from './pages/KioskDevicesPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { BranchesPage } from './pages/BranchesPage.jsx';
import { ContractsPage } from './pages/ContractsPage.jsx';
import { FinancePage } from './pages/FinancePage.jsx';
import { DebtorsPage } from './pages/DebtorsPage.jsx';
import { ArchivePage } from './pages/ArchivePage.jsx';
import { MarketingStatsPage } from './pages/MarketingStatsPage.jsx';
import { AppraisalsPage } from './pages/AppraisalsPage.jsx';
import { NotariesPage } from './pages/NotariesPage.jsx';
import {
  API_URL,
  TOKEN_KEY,
  USER_KEY,
  apiRequest,
} from './services/api.js';

const menu = [
  ['Бош панель', LayoutDashboard],
  ['Мурожаатлар', FileText],
  ['Ижродаги ишлар', BriefcaseBusiness],
  ['Банклар', Landmark],
  ['Баҳолаш', ClipboardCheck],
  ['Нотариуслар', Stamp],
  ['Филиаллар', Building2],
  ['QR экранлар', MonitorSmartphone],
  ['Ходимлар', Users],
  ['Шартномалар', FileText],
  ['Молия', WalletCards],
  ['Қарздорлар', CircleDollarSign],
  ['Реклама статистикаси', BarChart3],
  ['Архив', Archive],
];

/**
 * Ҳар бир рол қайси меню бўлимларини кўра олиши.
 * Backend'да маълумотлар аллақачон рол бўйича чегараланган
 * (масалан EXECUTOR фақат ўзига бириктирилган ишларни кўради),
 * бу эса фақат интерфейсда ортиқча бўлимларни яширади.
 */
const MENU_ACCESS = {
  SUPER_ADMIN: null, // null = ҳаммаси кўринади
  DIRECTOR: null,
  BRANCH_MANAGER: [
    'Бош панель',
    'Филиаллар',
    'QR экранлар',
    'Мурожаатлар',
    'Ижродаги ишлар',
    'Шартномалар',
    'Молия',
    'Қарздорлар',
    'Архив',
  ],
  RECEPTION_MANAGER: ['Бош панель', 'Мурожаатлар', 'Нотариуслар', 'QR экранлар', 'Қарздорлар', 'Архив'],
  EXECUTOR: ['Бош панель', 'Ижродаги ишлар', 'Архив'],
  LAWYER: ['Бош панель', 'Мурожаатлар', 'Шартномалар', 'Архив'],
  ACCOUNTANT: ['Бош панель', 'Молия', 'Қарздорлар', 'Архив'],
  APPRAISAL_EMPLOYEE: ['Баҳолаш'],
  NOTARY: ['Нотариуслар'],
};

const roleNames = {
  SUPER_ADMIN: 'Бош администратор',
  DIRECTOR: 'Директор',
  BRANCH_MANAGER: 'Филиал раҳбари',
  RECEPTION_MANAGER: 'Қабул менежери',
  EXECUTOR: 'Ижрочи',
  BANK_EMPLOYEE: 'Банк ходими',
  APPRAISAL_EMPLOYEE: 'Баҳолаш компанияси ходими',
  NOTARY: 'Нотариус',
  LAWYER: 'Ҳуқуқшунос',
  ACCOUNTANT: 'Ҳисобчи',
  CLIENT: 'Мижоз',
};

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
  COMPLETED: 'Якунланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
  ARCHIVED: 'Архивланган',
};

const INITIAL_STATS = {
  total: 0,
  new: 0,
  bankReview: 0,
  inExecution: 0,
  completed: 0,
  rejected: 0,
};

function readSavedUser() {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
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
  }).format(date);
}

function LoginPage({ onLogin }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState('login'); // 'login' | 'request' | 'confirm'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLogin, setResetLogin] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Хатолик юз берди.');
      }

      setResetMessage(
        data.message || 'Код Telegram орқали юборилди.'
      );
      setMode('confirm');
    } catch (requestError) {
      setResetError(requestError.message || 'Хатолик юз берди.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const confirmSetPassword = async (event) => {
    event.preventDefault();
    setResetError('');
    setResetSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          code: resetCode.trim(),
          newPassword: resetPassword,
          newLogin: resetLogin.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Хатолик юз берди.');
      }

      setResetMessage(
        'Парол ўрнатилди! Энди шу маълумотлар билан тизимга киринг.'
      );
      setLogin(resetLogin.trim() || resetIdentifier.trim());
      setPassword('');
      setMode('login');
      setResetCode('');
      setResetPassword('');
    } catch (requestError) {
      setResetError(requestError.message || 'Хатолик юз берди.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!login.trim() || !password) {
      setError('Логин ва парольни киритинг.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Тизимга киришда хато юз берди.'
        );
      }

      if (!data.token || !data.user) {
        throw new Error('Сервер нотўғри жавоб қайтарди.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      onLogin(data.user);
    } catch (requestError) {
      setError(
        requestError.message ||
          'Backend билан боғланиб бўлмади. Серверни текширинг.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <div className="login-card">
        <section className="login-brand-panel">
          <div className="login-logo-box">
            <img src="/golden-key-logo.png" alt="Golden Key Info" />
          </div>

          <div className="login-brand-copy">
            <span className="login-system-name">GOLDEN KEY OS</span>

            <h1>Ягона рақамли бошқарув тизими</h1>

            <p>
              Мурожаатлар, банк текширувлари, шартномалар ва ижро
              жараёнларини ягона тизимда бошқаринг.
            </p>
          </div>

          <div className="security-note">
            <ShieldCheck size={22} />

            <div>
              <strong>Ҳимояланган кириш</strong>
              <span>JWT авторизация ва ролларга асосланган назорат</span>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-heading">
            <span>Хуш келибсиз</span>
            <h2>Тизимга кириш</h2>
            <p>Сизга берилган логин ва парольни киритинг.</p>
          </div>

          <form onSubmit={submit} className="login-form" style={{ display: mode === 'login' ? 'grid' : 'none' }}>
            <label>
              <span>Логин ёки электрон почта</span>

              <div className="input-wrap">
                <UserRound size={19} />

                <input
                  type="text"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="Логинни киритинг"
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </label>

            <label>
              <span>Пароль</span>

              <div className="input-wrap">
                <ShieldCheck size={19} />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Парольни киритинг"
                  autoComplete="current-password"
                  disabled={submitting}
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? 'Парольни яшириш' : 'Парольни кўрсатиш'
                  }
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            {error ? <div className="login-error">{error}</div> : null}
            {resetMessage && mode === 'login' ? (
              <div className="login-success">{resetMessage}</div>
            ) : null}

            <button
              type="submit"
              className="login-submit"
              disabled={submitting}
            >
              {submitting ? 'Текширилмоқда...' : 'Тизимга кириш'}
            </button>

            <button
              type="button"
              className="login-link-btn"
              onClick={() => {
                setMode('request');
                setResetError('');
                setResetMessage('');
              }}
            >
              Паролни унутдингизми ёки биринчи марта кираяпсизми?
            </button>
          </form>

          {mode === 'request' ? (
            <form onSubmit={requestCode} className="login-form">
              <p className="login-hint">
                Телефон рақамингиз ёки логинингизни киритинг — Telegram
                ботингизга бир марталик код юборамиз. (Аввал ботда /start
                босиб, телефонингизни боғлаган бўлишингиз керак.)
              </p>

              <label>
                <span>Телефон ёки логин</span>
                <div className="input-wrap">
                  <UserRound size={19} />
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="+998901234567 ёки логин"
                    disabled={resetSubmitting}
                  />
                </div>
              </label>

              {resetError ? (
                <div className="login-error">{resetError}</div>
              ) : null}

              <button
                type="submit"
                className="login-submit"
                disabled={resetSubmitting}
              >
                {resetSubmitting ? 'Юборилмоқда...' : 'Кодни юбориш'}
              </button>

              <button
                type="button"
                className="login-link-btn"
                onClick={() => setMode('login')}
              >
                Ортга
              </button>
            </form>
          ) : null}

          {mode === 'confirm' ? (
            <form onSubmit={confirmSetPassword} className="login-form">
              {resetMessage ? (
                <div className="login-success">{resetMessage}</div>
              ) : null}

              <label>
                <span>Telegram'дан келган код</span>
                <div className="input-wrap">
                  <ShieldCheck size={19} />
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="6 хонали код"
                    disabled={resetSubmitting}
                  />
                </div>
              </label>

              <label>
                <span>Янги пароль</span>
                <div className="input-wrap">
                  <ShieldCheck size={19} />
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Камида 6 та белги"
                    disabled={resetSubmitting}
                  />
                </div>
              </label>

              <label>
                <span>Янги логин (ихтиёрий)</span>
                <div className="input-wrap">
                  <UserRound size={19} />
                  <input
                    type="text"
                    value={resetLogin}
                    onChange={(e) => setResetLogin(e.target.value)}
                    placeholder="Бўш қолдирсангиз, эскиси қолади"
                    disabled={resetSubmitting}
                  />
                </div>
              </label>

              {resetError ? (
                <div className="login-error">{resetError}</div>
              ) : null}

              <button
                type="submit"
                className="login-submit"
                disabled={resetSubmitting}
              >
                {resetSubmitting ? 'Сақланмоқда...' : 'Паролни ўрнатиш'}
              </button>

              <button
                type="button"
                className="login-link-btn"
                onClick={() => setMode('request')}
              >
                Ортга
              </button>
            </form>
          ) : null}

          <div className="login-footer">
            <span>Golden Key Info</span>
            <span>•</span>
            <span>2026</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState(
    user?.role === 'APPRAISAL_EMPLOYEE'
      ? 'Баҳолаш'
      : user?.role === 'NOTARY'
        ? 'Нотариуслар'
        : 'Бош панель'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createCaseSignal, setCreateCaseSignal] = useState(0);

  const [stats, setStats] = useState(INITIAL_STATS);
  const [recentCases, setRecentCases] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [caseNotification, setCaseNotification] = useState(null);
  const [unreadCases, setUnreadCases] = useState(0);
  const latestCaseIdRef = useRef(null);

  const roleLabel = useMemo(
    () => roleNames[user?.role] || user?.role || 'Фойдаланувчи',
    [user]
  );

  const visibleMenu = useMemo(() => {
    const allowed = MENU_ACCESS[user?.role];
    if (!allowed) return menu;
    return menu.filter(([label]) => allowed.includes(label));
  }, [user]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError('');

    try {
      const [statsData, casesData] = await Promise.all([
        apiRequest('/cases/stats'),
        apiRequest('/cases?page=1&limit=5'),
      ]);

      setStats(statsData.stats || INITIAL_STATS);
      setRecentCases(casesData.items || []);
    } catch (error) {
      setDashboardError(
        error.message || 'Бош панель маълумотларини юклаб бўлмади.'
      );

      if (error.status === 401) {
        window.location.reload();
      }
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.16,
        audioContext.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.45
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);

      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    } catch {
      // Браузер овозни блокласа, popup барибир ишлайди.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const checkNewCaseSilently = async () => {
      try {
        const data = await apiRequest(
          '/cases?page=1&limit=1'
        );

        const latest = data.items?.[0];

        if (!latest || cancelled) {
          return;
        }

        if (!latestCaseIdRef.current) {
          // Биринчи текширувда мавжуд мурожаатни "янги" деб сигнал қилмаймиз.
          latestCaseIdRef.current = latest.id;
          return;
        }

        if (latestCaseIdRef.current !== latest.id) {
          latestCaseIdRef.current = latest.id;

          setUnreadCases((current) => current + 1);
          setCaseNotification(latest);
          playNotificationSound();

          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(
              'Golden Key OS — Янги мурожаат',
              {
                body: `${latest.displayId || ''} · ${
                  latest.applicant?.fullName || 'Янги мижоз'
                }`,
                icon: '/golden-key-logo.png',
              }
            );
          }
        }
      } catch {
        // Бу фон текшируви. Хато оператор ишини тўхтатмайди.
      } finally {
        if (!cancelled) {
          // Саҳифани янгиламайди. Фақат фон API текшируви.
          timerId = window.setTimeout(
            checkNewCaseSilently,
            30000
          );
        }
      }
    };

    checkNewCaseSilently();

    return () => {
      cancelled = true;

      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [playNotificationSound]);

  const enableBrowserNotifications = async () => {
    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission();
    }
  };

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

  const openCreateCase = () => {
    setActiveMenu('Мурожаатлар');
    setCreateCaseSignal((current) => current + 1);
  };

  const handleStatsChange = useCallback((nextStats) => {
    setStats((current) => ({
      ...current,
      ...(nextStats || {}),
    }));
  }, []);

  const renderDashboard = () => (
    <>
      <section className="cards">
        <article>
          <span>Янги мурожаатлар</span>
          <strong>{stats.new || 0}</strong>
        </article>

        <article>
          <span>Банк текширувида</span>
          <strong>{stats.bankReview || 0}</strong>
        </article>

        <article>
          <span>Ижродаги ишлар</span>
          <strong>{stats.inExecution || 0}</strong>
        </article>

        <article>
          <span>Якунланган</span>
          <strong>{stats.completed || 0}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head dashboard-panel-head">
          <div>
            <h2>Сўнгги ишлар</h2>
            <p>Энг охирги 5 та мурожаат шу ерда кўринади.</p>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={() => setActiveMenu('Мурожаатлар')}
          >
            Барчасини кўриш
          </button>
        </div>

        {dashboardLoading ? (
          <div className="empty">
            <strong>Маълумотлар юкланмоқда...</strong>
          </div>
        ) : dashboardError ? (
          <div className="page-error dashboard-error">
            <strong>Бош панель маълумотлари юкланмади</strong>
            <span>{dashboardError}</span>

            <button type="button" onClick={loadDashboard}>
              Қайта уриниш
            </button>
          </div>
        ) : recentCases.length === 0 ? (
          <div className="empty">
            <FileText size={40} />
            <strong>Ҳозирча мурожаатлар йўқ</strong>

            <span>
              Биринчи мурожаатни қўшиш учун юқоридаги тугмани босинг.
            </span>
          </div>
        ) : (
          <div className="recent-list">
            {recentCases.map((item) => (
              <button
                type="button"
                className="recent-case"
                key={item.id}
                onClick={() => setActiveMenu('Мурожаатлар')}
              >
                <div>
                  <strong>{item.displayId}</strong>
                  <span>{item.applicant?.fullName || 'Мижоз номи йўқ'}</span>
                </div>

                <div className="recent-case-meta">
                  <strong>
                    {statusNames[item.status] || item.status || '—'}
                  </strong>

                  <span>
                    {serviceNames[item.serviceType] ||
                      item.serviceType ||
                      formatDate(item.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderPlaceholder = () => (
    <section className="panel module-placeholder">
      <div className="empty">
        <strong>{activeMenu} модули</strong>
        <span>Ушбу бўлим кейинги босқичда ишга туширилади.</span>
      </div>
    </section>
  );

  const renderContent = () => {
    if (activeMenu === 'Бош панель') {
      return renderDashboard();
    }

    if (activeMenu === 'Банклар') {
      return <BanksPage />;
    }

    if (activeMenu === 'Баҳолаш') {
      return <AppraisalsPage />;
    }

    if (activeMenu === 'Нотариуслар') {
      return <NotariesPage />;
    }

    if (activeMenu === 'Филиаллар') {
      return <BranchesPage user={user} />;
    }

    if (activeMenu === 'QR экранлар') {
      return <KioskDevicesPage user={user} />;
    }

    if (activeMenu === 'Ходимлар') {
      return <UsersPage />;
    }

    if (activeMenu === 'Мурожаатлар') {
      return (
        <CasesPage
          openCreateSignal={createCaseSignal}
          onStatsChange={handleStatsChange}
        />
      );
    }

    if (activeMenu === 'Ижродаги ишлар') {
      return <ExecutionPage user={user} />;
    }

    if (activeMenu === 'Шартномалар') {
      return <ContractsPage />;
    }

    if (activeMenu === 'Молия') {
      return <FinancePage />;
    }

    if (activeMenu === 'Қарздорлар') {
      return <DebtorsPage />;
    }

    if (activeMenu === 'Реклама статистикаси') {
      return <MarketingStatsPage />;
    }

    if (activeMenu === 'Архив') {
      return <ArchivePage />;
    }

    return renderPlaceholder();
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img src="/golden-key-logo.png" alt="Golden Key Info" />

          <div>
            <strong>Golden Key OS</strong>
            <span>v0.3</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Менюни ёпиш"
          >
            <X size={22} />
          </button>
        </div>

        <nav>
          {visibleMenu.map(([label, Icon]) => (
            <button
              type="button"
              className={activeMenu === label ? 'active' : ''}
              key={label}
              onClick={() => {
                setActiveMenu(label);
                setSidebarOpen(false);

                if (label === 'Бош панель') {
                  loadDashboard();
                }
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <div className="sidebar-user-text">
            <strong>{user?.fullName || 'Администратор'}</strong>
            <span>{roleLabel}</span>
          </div>

          <button
            type="button"
            className="logout-icon"
            title="Тизимдан чиқиш"
            onClick={logout}
          >
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Менюни ёпиш"
        />
      ) : null}

      <main>
        <header>
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Менюни очиш"
          >
            <Menu size={23} />
          </button>

          <div>
            <h1>{activeMenu}</h1>
            <p>Golden Key Info рақамли бошқарув тизими</p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              title="Уведомления"
              aria-label="Уведомления"
              onClick={async () => {
                await enableBrowserNotifications();
                setUnreadCases(0);
              }}
              style={{
                position: 'relative',
                width: 42,
                height: 42,
                borderRadius: 12,
                border: '1px solid #dc2626',
                background: '#dc2626',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                boxShadow: unreadCases > 0
                  ? '0 0 0 4px rgba(220,38,38,.12)'
                  : 'none',
              }}
            >
              <Bell size={20} />

              {unreadCases > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 20,
                    height: 20,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: '#991b1b',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {unreadCases > 99 ? '99+' : unreadCases}
                </span>
              ) : null}
            </button>

            <div className="header-user">
              <strong>{user?.fullName || 'Администратор'}</strong>
              <span>{roleLabel}</span>
            </div>

            <button
              type="button"
              className="primary"
              onClick={openCreateCase}
            >
              + Янги мурожаат
            </button>
          </div>
        </header>

        {caseNotification ? (
          <div
            style={{
              position: 'fixed',
              right: 24,
              bottom: 24,
              zIndex: 9999,
              width: 'min(390px, calc(100vw - 32px))',
              padding: 18,
              borderRadius: 16,
              background: '#111827',
              color: '#fff',
              boxShadow: '0 18px 50px rgba(0,0,0,.25)',
            }}
          >
            <strong
              style={{
                display: 'block',
                fontSize: 16,
              }}
            >
              🆕 Янги мурожаат келди
            </strong>

            <span
              style={{
                display: 'block',
                marginTop: 8,
                opacity: 0.86,
              }}
            >
              {caseNotification.displayId || '—'} ·{' '}
              {caseNotification.applicant?.fullName ||
                'Мижоз'}
            </span>

            <span
              style={{
                display: 'block',
                marginTop: 5,
                opacity: 0.68,
              }}
            >
              {serviceNames[caseNotification.serviceType] ||
                caseNotification.serviceType ||
                'Хизмат тури кўрсатилмаган'}
            </span>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setUnreadCases(0);
                  setCaseNotification(null);
                  setActiveMenu('Мурожаатлар');
                }}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Мурожаатни очиш
              </button>

              <button
                type="button"
                onClick={() => setCaseNotification(null)}
                style={{
                  border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 10,
                  padding: '9px 12px',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Ёпиш
              </button>
            </div>
          </div>
        ) : null}

        {renderContent()}
      </main>
    </div>
  );
}

export function App() {
  const isPublicContractSignPage = /^\/sign\/[^/]+\/?$/.test(
    window.location.pathname
  );

  if (isPublicContractSignPage) {
    return <ContractSignPage />;
  }

  const isKioskPage = /^\/kiosk\/[^/]+\/?$/.test(
    window.location.pathname
  );

  if (isKioskPage) {
    return <KioskPage />;
  }

  const [user, setUser] = useState(() => readSavedUser());
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setUser(null);
        setCheckingSession(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/me');

        if (!data.user) {
          throw new Error('Сеанс яроқсиз');
        }

        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  if (checkingSession) {
    return (
      <div className="session-loader">
        <img src="/golden-key-logo.png" alt="Golden Key Info" />
        <strong>Golden Key OS</strong>
        <span>Сеанс текширилмоқда...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (user.role === 'APPRAISAL_EMPLOYEE') {
    return <Dashboard user={user} onLogout={() => setUser(null)} />;
  }

  if (user.role === 'BANK_EMPLOYEE') {
    return (
      <BankPortalPage
        user={user}
        onLogout={() => setUser(null)}
      />
    );
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}