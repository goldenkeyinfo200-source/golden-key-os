import React, { useCallback, useEffect, useState } from 'react';
import {
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Бош администратор',
  DIRECTOR: 'Директор',
  BRANCH_MANAGER: 'Филиал раҳбари',
  RECEPTION_MANAGER: 'Қабул менежери',
  EXECUTOR: 'Ижрочи',
  LAWYER: 'Ҳуқуқшунос',
  ACCOUNTANT: 'Ҳисобчи',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  login: '',
  password: '',
  role: 'RECEPTION_MANAGER',
  branchId: '',
  isActive: true,
};

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersData, branchesData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/users/branches'),
      ]);

      setUsers(usersData.items || []);
      setBranches(branchesData.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Ходимларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      login: user.login || '',
      password: '',
      role: user.role,
      branchId: user.branchId || '',
      isActive: user.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        delete payload.login;

        await apiRequest(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }

      closeModal();
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user) => {
    if (
      !window.confirm(
        `"${user.fullName}" ходимини ўчиришни (тизимга киришини блоклашни) тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/users/${user.id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни ўчириб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="users-admin-page">
      <style>{`
        .users-admin-page{display:grid;gap:16px}
        .users-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;padding:20px}
        .users-toolbar h2{margin:3px 0}
        .users-toolbar p{margin:0;color:#7d838b;font-size:12px}
        .users-actions{display:flex;gap:8px;flex-wrap:wrap}
        .users-primary,.users-secondary{min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:0 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .users-primary{border:1px solid #e5232f;background:#e5232f;color:#fff}
        .users-secondary{border:1px solid #dfe3e8;background:#fff;color:#25282c}
        .users-state{min-height:220px;display:grid;place-items:center;align-content:center;gap:9px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;color:#8c939c}
        .users-error{border-radius:10px;padding:11px 12px;background:#fff0f1;color:#c9212c;font-size:12px;font-weight:700}
        .users-list{display:grid;gap:8px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;padding:14px}
        .user-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5e8eb;border-radius:10px;padding:12px}
        .user-row-main{display:flex;align-items:center;gap:10px}
        .user-avatar{width:38px;height:38px;border-radius:10px;background:#fff1f2;color:#e5232f;display:grid;place-items:center;font-weight:800}
        .user-info{display:grid;gap:2px}
        .user-info span{color:#858b93;font-size:11px}
        .user-row-actions{display:flex;align-items:center;gap:8px}
        .users-modal-backdrop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(10,13,17,.58)}
        .users-modal{width:min(650px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:16px;background:#fff}
        .users-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:18px 20px;border-bottom:1px solid #eceef1;background:#fff}
        .users-modal-head button{width:36px;height:36px;border:1px solid #dfe3e8;border-radius:9px;background:#fff}
        .users-form{display:grid;gap:14px;padding:20px}
        .users-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
        .users-form label{display:grid;gap:6px}
        .users-form label span{color:#555c65;font-size:12px;font-weight:700}
        .users-form input,.users-form select{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;padding:11px 12px;font:inherit}
        @media(max-width:650px){.users-form-grid{grid-template-columns:1fr}.users-toolbar{flex-direction:column}}
      `}</style>

      <section className="users-toolbar">
        <div>
          <span className="section-kicker">Жамоа</span>
          <h2>Golden Key ходимлари</h2>
          <p>Тизим ходимларини (менежер, ижрочи, ҳуқуқшунос, ҳисобчи) ва уларнинг ҳуқуқларини бошқаринг.</p>
        </div>

        <div className="users-actions">
          <button type="button" className="users-secondary" onClick={load}>
            <RefreshCw size={17} />
            Янгилаш
          </button>
          <button type="button" className="users-primary" onClick={openCreate}>
            <Plus size={17} />
            Янги ходим
          </button>
        </div>
      </section>

      {error ? <div className="users-error">{error}</div> : null}

      {loading ? (
        <section className="users-state">
          <LoaderCircle className="spin" size={34} />
          <strong>Ходимлар юкланмоқда...</strong>
        </section>
      ) : users.length === 0 ? (
        <section className="users-state">
          <UserRound size={34} />
          <strong>Ҳозирча ходимлар йўқ</strong>
        </section>
      ) : (
        <section className="users-list">
          {users.map((user) => (
            <div className="user-row" key={user.id}>
              <div className="user-row-main">
                <div className="user-avatar">
                  {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="user-info">
                  <strong>{user.fullName}</strong>
                  <span>
                    {ROLE_LABELS[user.role] || user.role}
                    {user.branch ? ` · ${user.branch.name}` : ''}
                    {' · '}
                    {user.login}
                  </span>
                </div>
              </div>

              <div className="user-row-actions">
                <strong>{user.isActive ? 'Фаол' : 'Блокланган'}</strong>
                <button
                  type="button"
                  className="users-secondary"
                  onClick={() => openEdit(user)}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  className="users-secondary"
                  onClick={() => removeUser(user)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {modalOpen ? (
        <div className="users-modal-backdrop">
          <section className="users-modal">
            <div className="users-modal-head">
              <div>
                <span>Ходим</span>
                <h3>{editingId ? 'Ходимни таҳрирлаш' : 'Янги ходим'}</h3>
              </div>
              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="users-form" onSubmit={save}>
              <div className="users-form-grid">
                <label>
                  <span>Ф.И.Ш.</span>
                  <input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  <span>Роли</span>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Телефон</span>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Логин</span>
                  <input
                    value={form.login}
                    onChange={(e) =>
                      setForm({ ...form, login: e.target.value })
                    }
                    required={!editingId}
                    disabled={Boolean(editingId)}
                  />
                </label>

                <label>
                  <span>
                    {editingId
                      ? 'Янги пароль (ихтиёрий)'
                      : 'Пароль (ихтиёрий)'}
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Филиал</span>
                  <select
                    value={form.branchId}
                    onChange={(e) =>
                      setForm({ ...form, branchId: e.target.value })
                    }
                  >
                    <option value="">— Танланмаган —</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                        {branch.city ? ` (${branch.city})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Ҳолат</span>
                  <select
                    value={form.isActive ? '1' : '0'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isActive: e.target.value === '1',
                      })
                    }
                  >
                    <option value="1">Фаол</option>
                    <option value="0">Блокланган</option>
                  </select>
                </label>
              </div>

              <p style={{ margin: '-4px 0 4px', color: '#7d838b', fontSize: 12, lineHeight: 1.6 }}>
                Паролни бўш қолдирсангиз, ходим Golden Key OS ботида
                телефонини боғлаб, CRM логин саҳифасидаги "Паролни
                унутдингизми ёки биринчи марта кираяпсизми?" тугмаси орқали
                ўзи ўрнатади.
              </p>

              <button className="users-primary" disabled={saving}>
                <ShieldCheck size={17} />
                {saving
                  ? 'Сақланмоқда...'
                  : editingId
                  ? 'Ўзгаришларни сақлаш'
                  : 'Ходимни қўшиш'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
