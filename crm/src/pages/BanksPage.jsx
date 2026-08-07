import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const EMPTY_BANK = {
  name: '',
  shortName: '',
  inn: '',
  mfo: '',
  licenseNumber: '',
  address: '',
  phone: '',
  email: '',
  isActive: true,
};

const EMPTY_EMPLOYEE = {
  fullName: '',
  phone: '',
  email: '',
  login: '',
  password: '',
  bankPosition: 'Кредит инспектори',
  isActive: true,
};

export function BanksPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankModal, setBankModal] = useState(null);
  const [employeeBank, setEmployeeBank] = useState(null);
  const [bankForm, setBankForm] = useState(EMPTY_BANK);
  const [employeeForm, setEmployeeForm] = useState(EMPTY_EMPLOYEE);
  const [employees, setEmployees] = useState([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/banks');
      setBanks(data.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Банкларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openBank = (bank = null) => {
    setBankModal(bank || {});
    setBankForm(
      bank
        ? {
            name: bank.name || '',
            shortName: bank.shortName || '',
            inn: bank.inn || '',
            mfo: bank.mfo || '',
            licenseNumber: bank.licenseNumber || '',
            address: bank.address || '',
            phone: bank.phone || '',
            email: bank.email || '',
            isActive: bank.isActive !== false,
          }
        : EMPTY_BANK
    );
  };

  const saveBank = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (bankModal?.id) {
        await apiRequest(`/banks/${bankModal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(bankForm),
        });
      } else {
        await apiRequest('/banks', {
          method: 'POST',
          body: JSON.stringify(bankForm),
        });
      }

      setBankModal(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Банкни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const openEmployees = async (bank) => {
    setEmployeeBank(bank);
    setEmployeeForm(EMPTY_EMPLOYEE);
    setEditingEmployeeId(null);
    setEmployees([]);

    try {
      const data = await apiRequest(`/banks/${bank.id}/employees`);
      setEmployees(data.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Ходимларни юклаб бўлмади.');
    }
  };

  const startEditEmployee = (employee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      fullName: employee.fullName || '',
      phone: employee.phone || '',
      email: employee.email || '',
      login: employee.login || '',
      password: '',
      bankPosition: employee.bankPosition || '',
      isActive: employee.isActive !== false,
    });
  };

  const cancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm(EMPTY_EMPLOYEE);
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingEmployeeId) {
        const payload = { ...employeeForm };
        if (!payload.password) delete payload.password;
        delete payload.login;

        await apiRequest(`/banks/employees/${editingEmployeeId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/banks/${employeeBank.id}/employees`, {
          method: 'POST',
          body: JSON.stringify(employeeForm),
        });
      }

      setEmployeeForm(EMPTY_EMPLOYEE);
      setEditingEmployeeId(null);
      await openEmployees(employeeBank);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (employee) => {
    if (
      !window.confirm(
        `"${employee.fullName}" ходимини ўчиришни (тизимга киришини блоклашни) тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest(`/banks/employees/${employee.id}`, {
        method: 'DELETE',
      });

      if (editingEmployeeId === employee.id) {
        cancelEditEmployee();
      }

      await openEmployees(employeeBank);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Ходимни ўчириб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="banks-admin-page">
      <style>{`
        .banks-admin-page{display:grid;gap:16px}
        .banks-toolbar,.banks-card-head,.banks-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}
        .banks-toolbar{border:1px solid #e1e5e9;border-radius:15px;background:#fff;padding:20px}
        .banks-toolbar h2,.banks-card h3,.banks-modal-head h3{margin:3px 0}
        .banks-toolbar p{margin:0;color:#7d838b;font-size:12px}
        .banks-primary,.banks-secondary{min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:0 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .banks-primary{border:1px solid #e5232f;background:#e5232f;color:#fff}
        .banks-secondary{border:1px solid #dfe3e8;background:#fff;color:#25282c}
        .banks-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
        .banks-card{border:1px solid #e1e5e9;border-radius:14px;background:#fff;padding:16px}
        .banks-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:11px;background:#fff1f2;color:#e5232f}
        .banks-card-head>div:nth-child(2){display:grid;gap:3px;flex:1}
        .banks-card-head span,.banks-meta span{color:#858b93;font-size:11px}
        .banks-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;margin:14px 0;border:1px solid #eceef1;border-radius:10px;overflow:hidden;background:#eceef1}
        .banks-meta>div{display:grid;gap:4px;padding:10px;background:#fff}
        .banks-actions{display:flex;gap:8px;flex-wrap:wrap}
        .banks-state{min-height:220px;display:grid;place-items:center;align-content:center;gap:9px;border:1px solid #e1e5e9;border-radius:15px;background:#fff;color:#8c939c}
        .banks-error{border-radius:10px;padding:11px 12px;background:#fff0f1;color:#c9212c;font-size:12px;font-weight:700}
        .banks-modal-backdrop{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(10,13,17,.58)}
        .banks-modal{width:min(850px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:16px;background:#fff}
        .banks-modal-head{position:sticky;top:0;z-index:2;padding:18px 20px;border-bottom:1px solid #eceef1;background:#fff}
        .banks-modal-head button{width:36px;height:36px;border:1px solid #dfe3e8;border-radius:9px;background:#fff}
        .banks-form{display:grid;gap:14px;padding:20px}
        .banks-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
        .banks-form label{display:grid;gap:6px}
        .banks-form label span{color:#555c65;font-size:12px;font-weight:700}
        .banks-form input,.banks-form textarea,.banks-form select{width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;padding:11px 12px;font:inherit}
        .banks-span-2{grid-column:span 2}
        .employees-list{display:grid;gap:8px;padding:0 20px 20px}
        .employee-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5e8eb;border-radius:10px;padding:11px}
        .employee-row div{display:grid;gap:3px}
        .employee-row span{color:#858b93;font-size:11px}
        @media(max-width:650px){.banks-form-grid{grid-template-columns:1fr}.banks-span-2{grid-column:span 1}.banks-toolbar{flex-direction:column}}
      `}</style>

      <section className="banks-toolbar">
        <div>
          <span className="section-kicker">Ҳамкорлар</span>
          <h2>Банклар ва банк ходимлари</h2>
          <p>Банк ташкилотларини ва уларнинг Bank Portal аккаунтларини бошқаринг.</p>
        </div>

        <div className="banks-actions">
          <button type="button" className="banks-secondary" onClick={load}>
            <RefreshCw size={17} />
            Янгилаш
          </button>
          <button type="button" className="banks-primary" onClick={() => openBank()}>
            <Plus size={17} />
            Янги банк
          </button>
        </div>
      </section>

      {error ? <div className="banks-error">{error}</div> : null}

      {loading ? (
        <section className="banks-state">
          <LoaderCircle className="spin" size={34} />
          <strong>Банклар юкланмоқда...</strong>
        </section>
      ) : (
        <section className="banks-grid">
          {banks.map((bank) => (
            <article className="banks-card" key={bank.id}>
              <div className="banks-card-head">
                <div className="banks-icon"><Building2 size={22} /></div>
                <div>
                  <h3>{bank.shortName || bank.name}</h3>
                  <span>{bank.name}</span>
                </div>
              </div>

              <div className="banks-meta">
                <div><span>Ходимлар</span><strong>{bank._count?.employees || 0}</strong></div>
                <div><span>Мурожаатлар</span><strong>{bank._count?.assignments || 0}</strong></div>
                <div><span>МФО</span><strong>{bank.mfo || '—'}</strong></div>
                <div><span>Ҳолат</span><strong>{bank.isActive ? 'Фаол' : 'Блокланган'}</strong></div>
              </div>

              <div className="banks-actions">
                <button type="button" className="banks-secondary" onClick={() => openBank(bank)}>
                  <Edit3 size={16} /> Таҳрирлаш
                </button>
                <button type="button" className="banks-primary" onClick={() => openEmployees(bank)}>
                  <Users size={16} /> Ходимлар
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {bankModal ? (
        <div className="banks-modal-backdrop">
          <section className="banks-modal">
            <div className="banks-modal-head">
              <div><span>Банк</span><h3>{bankModal.id ? 'Банкни таҳрирлаш' : 'Янги банк'}</h3></div>
              <button type="button" onClick={() => setBankModal(null)}><X size={20} /></button>
            </div>
            <form className="banks-form" onSubmit={saveBank}>
              <div className="banks-form-grid">
                {[
                  ['name','Банкнинг тўлиқ номи'],
                  ['shortName','Қисқа номи'],
                  ['inn','СТИР'],
                  ['mfo','МФО'],
                  ['licenseNumber','Лицензия рақами'],
                  ['phone','Телефон'],
                  ['email','Email'],
                ].map(([key,label]) => (
                  <label key={key}><span>{label}</span><input value={bankForm[key]} onChange={(e)=>setBankForm({...bankForm,[key]:e.target.value})} required={key==='name'} /></label>
                ))}
                <label className="banks-span-2"><span>Манзил</span><textarea rows={3} value={bankForm.address} onChange={(e)=>setBankForm({...bankForm,address:e.target.value})} /></label>
              </div>
              <button className="banks-primary" disabled={saving}>{saving?'Сақланмоқда...':'Сақлаш'}</button>
            </form>
          </section>
        </div>
      ) : null}

      {employeeBank ? (
        <div className="banks-modal-backdrop">
          <section className="banks-modal">
            <div className="banks-modal-head">
              <div><span>{employeeBank.name}</span><h3>Банк ходимлари</h3></div>
              <button type="button" onClick={() => setEmployeeBank(null)}><X size={20} /></button>
            </div>
            <form className="banks-form" onSubmit={saveEmployee}>
              <div className="banks-form-grid">
                {[
                  ['fullName','Ф.И.Ш.'],
                  ['phone','Телефон'],
                  ['email','Email'],
                  ['login','Логин'],
                  ['password', editingEmployeeId ? 'Янги пароль (ихтиёрий)' : 'Пароль (ихтиёрий)'],
                  ['bankPosition','Лавозим'],
                ].map(([key,label]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      type={key==='password'?'password':'text'}
                      value={employeeForm[key]}
                      onChange={(e)=>setEmployeeForm({...employeeForm,[key]:e.target.value})}
                      required={editingEmployeeId ? ['fullName'].includes(key) : ['fullName','login'].includes(key)}
                      disabled={key === 'login' && Boolean(editingEmployeeId)}
                    />
                  </label>
                ))}
              </div>
              <p style={{ margin: '-4px 0 4px', color: '#7d838b', fontSize: 12, lineHeight: 1.6 }}>
                Паролни бўш қолдирсангиз, ходим Golden Key OS ботида
                телефонини боғлаб, CRM логин саҳифасидаги "Паролни
                унутдингизми ёки биринчи марта кираяпсизми?" тугмаси орқали
                ўзи ўрнатади.
              </p>
              <div className="banks-actions">
                <button className="banks-primary" disabled={saving}>
                  <UserPlus size={17}/>
                  {saving ? 'Сақланмоқда...' : editingEmployeeId ? 'Ўзгаришларни сақлаш' : 'Банк ходимини қўшиш'}
                </button>
                {editingEmployeeId ? (
                  <button type="button" className="banks-secondary" onClick={cancelEditEmployee}>
                    Бекор қилиш
                  </button>
                ) : null}
              </div>
            </form>
            <div className="employees-list">
              {employees.map((employee)=>(
                <div className="employee-row" key={employee.id}>
                  <div><strong>{employee.fullName}</strong><span>{employee.bankPosition || 'Банк ходими'} · {employee.login}</span></div>
                  <div className="banks-actions">
                    <strong>{employee.isActive?'Фаол':'Блокланган'}</strong>
                    <button type="button" className="banks-secondary" onClick={() => startEditEmployee(employee)}>
                      <Edit3 size={15} />
                    </button>
                    <button type="button" className="banks-secondary" onClick={() => removeEmployee(employee)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
