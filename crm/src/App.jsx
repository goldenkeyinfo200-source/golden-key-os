import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://backend-production-054ce.up.railway.app/api';

const TOKEN_KEY = 'golden_key_access_token';
const USER_KEY = 'golden_key_current_user';

const menu = [
  ['Бош панель', LayoutDashboard],
  ['Мурожаатлар', FileText],
  ['Ижродаги ишлар', BriefcaseBusiness],
  ['Банклар', Landmark],
  ['Шартномалар', FileText],
  ['Молия', WalletCards],
  ['Архив', Archive],
];

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

function readSavedUser() {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function LoginPage({ onLogin }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        throw new Error(data.error || 'Тизимга киришда хато юз берди.');
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
          'Backend билан боғланиб бўлмади. Интернет ва серверни текширинг.'
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
              Мурожаатлар, банк текширувлари, шартномалар ва ижро жараёнларини
              ягона тизимда бошқаринг.
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

          <form onSubmit={submit} className="login-form">
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

            <button
              type="submit"
              className="login-submit"
              disabled={submitting}
            >
              {submitting ? 'Текширилмоқда...' : 'Тизимга кириш'}
            </button>
          </form>

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

  const roleLabel = useMemo(
    () => roleNames[user?.role] || user?.role || 'Фойдаланувчи',
    [user]
  );

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

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img src="/golden-key-logo.png" alt="Golden Key Info" />

          <div>
            <strong>Golden Key OS</strong>
            <span>v0.2</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav>
          {menu.map(([label, Icon]) => (
            <button
              type="button"
              className={activeMenu === label ? 'active' : ''}
              key={label}
              onClick={() => {
                setActiveMenu(label);
                setSidebarOpen(false);
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
          >
            <Menu size={23} />
          </button>

          <div>
            <h1>{activeMenu}</h1>
            <p>Golden Key Info рақамли бошқарув тизими</p>
          </div>

          <div className="header-actions">
            <div className="header-user">
              <strong>{user?.fullName}</strong>
              <span>{roleLabel}</span>
            </div>

            <button type="button" className="primary">
              + Янги мурожаат
            </button>
          </div>
        </header>

        {activeMenu === 'Бош панель' ? (
          <>
            <section className="cards">
              <article>
                <span>Янги мурожаатлар</span>
                <strong>0</strong>
              </article>

              <article>
                <span>Банк текширувида</span>
                <strong>0</strong>
              </article>

              <article>
                <span>Ижродаги ишлар</span>
                <strong>0</strong>
              </article>

              <article>
                <span>Якунланган</span>
                <strong>0</strong>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Сўнгги ишлар</h2>
                  <p>Янги мурожаатлар ва ўзгаришлар шу ерда кўринади.</p>
                </div>
              </div>

              <div className="empty">
                <ShieldCheck size={40} />

                <strong>Авторизация тизими ишга тушди</strong>

                <span>
                  Сиз тизимга {roleLabel} сифатида кирдингиз. Кейинги модул —
                  мурожаатларни бошқариш.
                </span>
              </div>
            </section>
          </>
        ) : (
          <section className="panel module-placeholder">
            <div className="empty">
              <strong>{activeMenu} модули</strong>
              <span>Ушбу бўлим кейинги босқичда ишга туширилади.</span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export function App() {
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
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.user) {
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

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}