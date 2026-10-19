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
  const [hrUser, setHrUser] = useState(null);
  const [hrProfile, setHrProfile] = useState(null);
  const [hrForm, setHrForm] = useState({jobTitle:'',salaryType:'FIXED',monthlySalary:'',commissionPercent:'',commissionBasis:'',certificateRequired:false,certificateNumber:''});
  const [hrNumber, setHrNumber] = useState('');
  const [hrError, setHrError] = useState('');
  const [hrSaving, setHrSaving] = useState(false);
  const openHr = async (user) => {
    setHrUser(user);setHrError('');setHrProfile(null);
    try {
      const data = await apiRequest(`/employee-contracts/${user.id}`);
      setHrProfile(data.profile);
      const p=data.profile || {};
      setHrForm({jobTitle:p.jobTitle||'',salaryType:p.salaryType||'FIXED',monthlySalary:p.monthlySalary??'',commissionPercent:p.commissionPercent??'',commissionBasis:p.commissionBasis||'',certificateRequired:!!p.certificateRequired,certificateNumber:p.certificateNumber||''});
    } catch(e){setHrError(e.message)}
  };
  const saveHr = async (event) => {
    event.preventDefault();setHrSaving(true);setHrError('');
    try {
      const body={...hrForm,monthlySalary:hrForm.monthlySalary===''?null:Number(hrForm.monthlySalary),commissionPercent:hrForm.commissionPercent===''?null:Number(hrForm.commissionPercent)};
      const data=await apiRequest(`/employee-contracts/${hrUser.id}/profile`,{method:'PUT',body:JSON.stringify(body)});
      setHrProfile(prev=>({...prev,...data.profile}));
    }catch(e){setHrError(e.message)}finally{setHrSaving(false)}
  };
  const createHrDraft=async()=>{
    setHrSaving(true);setHrError('');
    try{
      await apiRequest(`/employee-contracts/${hrUser.id}/contracts`,{method:'POST',body:JSON.stringify({contractNumber:hrNumber,startDate:hrStartDate?new Date(hrStartDate+'T12:00:00').toISOString():null,endDate:hrEndDate?new Date(hrEndDate+'T12:00:00').toISOString():null,notes:hrNotes||null})});
      const data=await apiRequest(`/employee-contracts/${hrUser.id}`);setHrProfile(data.profile);setHrNumber('');setHrStartDate('');setHrEndDate('');setHrNotes('');
    }catch(e){setHrError(e.message)}finally{setHrSaving(false)}
  };

  const [hrStartDate, setHrStartDate] = useState('');
  const [hrEndDate, setHrEndDate] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const printHrDraft = (contract) => {
    const snapshot = contract.termsSnapshot || {};
    const value = (v) => escapeHtml(v === null || v === undefined || v === '' ? '________________' : v);
    const date = (v) => v ? new Date(v).toLocaleDateString('uz-UZ') : '________________';
    const pay = snapshot.salaryType === 'FIXED' ? `Ойлик иш ҳақи: ${value(snapshot.monthlySalary)} сўм.`
      : snapshot.salaryType === 'PERCENT' ? `Фоиз: ${value(snapshot.commissionPercent)}%. Ҳисоблаш базаси: ${value(snapshot.commissionBasis)}.`
      : `Ойлик: ${value(snapshot.monthlySalary)} сўм; фоиз: ${value(snapshot.commissionPercent)}%. Ҳисоблаш базаси: ${value(snapshot.commissionBasis)}.`;
    const html = `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><title>Меҳнат шартномаси лойиҳаси ${value(contract.contractNumber)}</title><style>
    @page{size:A4;margin:18mm 17mm 18mm 17mm}
    *{box-sizing:border-box}
    html{background:#eef1f5}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.55;color:#17202a;background:#fff;max-width:210mm;margin:24px auto;padding:18mm 17mm;overflow-wrap:break-word}
    h1{text-align:center;font-size:15pt;line-height:1.3;margin:17px 0 13px}
    h2{font-size:11pt;line-height:1.4;margin:18px 0 7px;break-after:avoid;page-break-after:avoid}
    p{margin:7px 0;text-align:justify;orphans:3;widows:3}
    .watermark{text-align:center;border:1.5px solid #aa6b00;color:#8b5c00;padding:9px 10px;font-size:9pt;line-height:1.4;font-weight:bold;break-inside:avoid}
    .meta{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:12px 0 14px;font-size:10pt;break-inside:avoid}
    .meta span:last-child{text-align:right}
    .sign{display:flex;gap:25px;margin-top:17px;break-inside:avoid;page-break-inside:avoid}
    .sign>div{flex:1;min-width:0}
    .sign p{text-align:left}
    .legal-note{margin-top:20px;font-size:9pt;line-height:1.5;break-inside:avoid}
    .print-button{display:block;margin:24px 0 0;padding:10px 16px;background:#17202a;color:white;border:0;border-radius:6px;cursor:pointer}
    @media print{
      html{background:#fff}
      body{width:auto;max-width:none;margin:0;padding:0;font-size:11pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .print-button{display:none}
      h1,h2,.watermark,.meta,.sign{break-inside:avoid;page-break-inside:avoid}
    }</style></head><body>
    <div class="watermark">ЛОЙИҲА — ИМЗОЛАНМАГАН, ЮРИДИК ТЕКШИРУВ ТАЛАБ ҚИЛИНАДИ</div>
    <h1>МЕҲНАТ ШАРТНОМАСИ ЛОЙИҲАСИ</h1><div class="meta"><span>№ ${value(contract.contractNumber)}</span><span>Қўқон шаҳри · ${date(contract.createdAt)}</span></div>
    <p>Иш берувчи: <b>«GOLDEN KEY INFO» МЧЖ</b> (ваколатли вакилнинг Ф.И.О. ва ваколати: ____________________) ва ходим <b>${value(hrUser?.fullName)}</b> ўртасида мазкур шартнома лойиҳаси тузилди.</p>
    <h2>1. Меҳнат вазифаси</h2><p>Лавозим: <b>${value(snapshot.jobTitle)}</b>. Иш жойи ва аниқ вазифалар: ____________________.</p>
    <h2>2. Муддат ва иш бошлаш санаси</h2><p>Иш бошлаш: ${date(contract.startDate)}. Тугаш санаси (агар муддатли бўлса): ${date(contract.endDate)}. Муддатли шартнома асоси: ____________________.</p>
    <h2>3. Иш ҳақи</h2><p>${pay} Тўлаш муддатлари, солиқ ва бошқа қонуний ушланмалар амалдаги қонунчилик ва иш берувчининг тасдиқланган тартибига мувофиқ белгиланади.</p>
    <h2>4. Иш вақти ва дам олиш</h2><p>Иш режими, ҳафталик иш соатлари, дам олиш кунлари, таътил ва танаффуслар: ____________________.</p>
    <h2>5. Тарафларнинг ҳуқуқ ва мажбуриятлари</h2><p>Ходим меҳнат вазифаларини бажаради, иш берувчи хавфсиз меҳнат шароитларини таъминлайди ва иш ҳақини ўз вақтида тўлайди. Бошқа шартлар Ўзбекистон Республикасининг амалдаги меҳнат қонунчилигига мувофиқ белгиланади.</p>
    <h2>6. Қўшимча шартлар</h2><p style="white-space:pre-wrap">${value(contract.notes)}</p>
    <h2>7. Тарафларнинг реквизитлари ва имзолари</h2><div class="sign"><div><b>Иш берувчи</b><p>«GOLDEN KEY INFO» МЧЖ</p><p>Вакил: ____________________</p><p>Имзо: ____________________</p></div><div><b>Ходим</b><p>${value(hrUser?.fullName)}</p><p>Паспорт/ЖШШИР: ____________________</p><p>Имзо: ____________________</p></div></div>
    <p class="legal-note">Ушбу ҳужжат CRM'даги DRAFT маълумотлари асосида шакллантирилган кўриб чиқиш нусхаси. Электрон имзо ёки тасдиқлаш амалга оширилмаган. Қонунчиликка мувофиқ барча мажбурий шартларни кадрлар мутахассиси текшириши керак.</p>
    <button class="print-button" onclick="window.print()">Чоп этиш / PDF сифатида сақлаш</button></body></html>`;
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

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
                <button type="button" className="users-secondary" onClick={() => openHr(user)}>Меҳнат шартномаси</button>
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

      {hrUser ? (
        <div className="users-modal-backdrop">
          <section className="users-modal">
            <div className="users-modal-head"><div><h3>{hrUser.fullName} — кадрлар карточкаси</h3><p>Меҳнат шартномаси лойиҳаси</p></div><button type="button" onClick={()=>setHrUser(null)}><X size={20}/></button></div>
            <form className="users-form" onSubmit={saveHr}>
              {hrError ? <div className="users-error">{hrError}</div> : null}
              <label><span>Расмий лавозим</span><input required value={hrForm.jobTitle} onChange={e=>setHrForm({...hrForm,jobTitle:e.target.value})}/></label>
              <label><span>Иш ҳақи тартиби</span><select value={hrForm.salaryType} onChange={e=>setHrForm({...hrForm,salaryType:e.target.value})}><option value="FIXED">Ойлик</option><option value="PERCENT">Фоиз</option><option value="MIXED">Ойлик + фоиз</option></select></label>
              {hrForm.salaryType!=='PERCENT' ? <label><span>Ойлик (сўм)</span><input type="number" min="0" value={hrForm.monthlySalary} onChange={e=>setHrForm({...hrForm,monthlySalary:e.target.value})}/></label> : null}
              {hrForm.salaryType!=='FIXED' ? <><label><span>Фоиз (%)</span><input type="number" min="0" max="100" step="0.001" value={hrForm.commissionPercent} onChange={e=>setHrForm({...hrForm,commissionPercent:e.target.value})}/></label><label><span>Фоиз ҳисоблаш базаси</span><input value={hrForm.commissionBasis} onChange={e=>setHrForm({...hrForm,commissionBasis:e.target.value})}/></label></> : null}
              <label><span><input type="checkbox" checked={hrForm.certificateRequired} onChange={e=>setHrForm({...hrForm,certificateRequired:e.target.checked})}/> Малака сертификати талаб қилинади</span></label>
              {hrForm.certificateRequired ? <label><span>Сертификат рақами</span><input value={hrForm.certificateNumber} onChange={e=>setHrForm({...hrForm,certificateNumber:e.target.value})}/></label> : null}
              <button className="users-primary" disabled={hrSaving}>Карточкани сақлаш</button>
            </form>
            <div className="users-form">
              <strong>Меҳнат шартномаси лойиҳаси</strong>
              <label><span>Шартнома рақами</span><input value={hrNumber} onChange={e=>setHrNumber(e.target.value)}/></label>
              <label><span>Иш бошлаш санаси</span><input type="date" value={hrStartDate} onChange={e=>setHrStartDate(e.target.value)}/></label>
              <label><span>Тугаш санаси (ихтиёрий)</span><input type="date" value={hrEndDate} onChange={e=>setHrEndDate(e.target.value)}/></label>
              <label><span>Қўшимча шартлар (лойиҳа)</span><textarea rows={3} maxLength={4000} value={hrNotes} onChange={e=>setHrNotes(e.target.value)}/></label>
              <button type="button" className="users-secondary" disabled={hrSaving||!hrNumber.trim()||!hrProfile} onClick={createHrDraft}>Лойиҳани сақлаш</button>
              {(hrProfile?.laborContracts||[]).map(c=><div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:10}}><span>{c.contractNumber} — {c.status}</span><button type="button" className="users-secondary" onClick={()=>printHrDraft(c)}>Кўриш / PDF</button></div>)}
              <p style={{fontSize:12,color:'#777'}}>«Кўриш / PDF» босилганда босмага мос лойиҳа очилади. Браузернинг «Чоп этиш → PDF сифатида сақлаш» функциясидан фойдаланинг. Бу имзоланган ёки ҳуқуқий жиҳатдан тўлиқ тасдиқланган шартнома эмас.</p>
            </div>
          </section>
        </div>
      ) : null}
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
