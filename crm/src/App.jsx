import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

import { CasesPage } from './pages/CasesPage.jsx';
import { BankPortalPage } from './pages/BankPortalPage.jsx';
import { BanksPage } from './pages/BanksPage.jsx';
import { ContractSignPage } from './pages/ContractSignPage.jsx';
import { KioskPage } from './pages/KioskPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { BranchesPage } from './pages/BranchesPage.jsx';
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
  ['Филиаллар', Building2],
  ['Ходимлар', Users],
  ['Шартномалар', FileText],
  ['Молия', WalletCards],
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
    'Мурожаатлар',
    'Ижродаги ишлар',
    'Шартномалар',
    'Молия',
    'Архив',
  ],
  RECEPTION_MANAGER: ['Бош панель', 'Мурожаатлар', 'Архив'],
  EXECUTOR: ['Бош панель', 'Ижродаги ишлар', 'Архив'],
  LAWYER: ['Бош панель', 'Мурожаатлар', 'Шартномалар', 'Архив'],
  ACCOUNTANT: ['Бош панель', 'Молия', 'Архив'],
};

const roleNames = {
  SUPER_ADMIN: 'Бош администратор',
  DIRECTOR: 'Директор',
  BRANCH_MANAGER: 'Филиал раҳбари',
  RECEPTION_MANAGER: 'Қабул менежери',
  EXECUTOR: 'Ижрочи',
  BANK_EMPLOYEE: 'Банк ходими',
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
  const [activeMenu, setActiveMenu] = useState('Бош панель');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createCaseSignal, setCreateCaseSignal] = useState(0);

  const [stats, setStats] = useState(INITIAL_STATS);
  const [recentCases, setRecentCases] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

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

    if (activeMenu === 'Филиаллар') {
      return <BranchesPage user={user} />;
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