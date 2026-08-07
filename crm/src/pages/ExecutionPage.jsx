import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness, ChevronLeft, ChevronRight, RefreshCw, Search,
  UserRound, Building2, CalendarDays, Banknote, Phone, X, CheckCircle2,
  ArrowRight, Clock3, FileText
} from 'lucide-react';
import { apiRequest } from '../services/api.js';

const serviceNames = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

const flow = [
  'ASSIGNED_TO_EXECUTOR',
  'IN_EXECUTION',
  'PROPERTY_MONITORING',
  'CREDIT_APPROVED',
  'CREDIT_ISSUED',
  'CLIENT_RECEIVED_FUNDS',
  'SERVICE_FEE_PAID',
  'COMPLETED',
];

const statusNames = {
  ASSIGNED_TO_EXECUTOR: 'Ижрочига бириктирилган',
  IN_EXECUTION: 'Ижрода',
  PROPERTY_MONITORING: 'Объект кузатувида',
  CREDIT_APPROVED: 'Кредит тасдиқланган',
  CREDIT_ISSUED: 'Кредит ажратилган',
  CLIENT_RECEIVED_FUNDS: 'Мижоз маблағни олган',
  SERVICE_FEE_PAID: 'Хизмат ҳақи тўланган',
  COMPLETED: 'Якунланган',
};

const executionStatuses = flow.slice(0, -1);

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('uz-UZ', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
  }).format(d);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${new Intl.NumberFormat('uz-UZ').format(n)} сўм`;
}

export function ExecutionPage({ user }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page:1, limit:20, total:0, totalPages:1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ scope:'execution', page:String(page), limit:'20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const data = await apiRequest(`/cases?${params.toString()}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || { page, limit:20, total:0, totalPages:1 });
    } catch (err) {
      setError(err.message || 'Ижродаги ишларни юклаб бўлмади.');
    } finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const subtitle = useMemo(() => {
    if (user?.role === 'EXECUTOR') return 'Сизга бириктирилган ижродаги ишлар';
    if (user?.role === 'BRANCH_MANAGER') return 'Филиалингиздаги ижродаги ишлар';
    return 'Барча ижрочиларга бириктирилган ишлар';
  }, [user]);

  const openCase = async (id) => {
    setDetailLoading(true); setActionError(''); setSuccess(''); setNote('');
    try {
      const data = await apiRequest(`/cases/${id}`);
      setSelected(data.item || null);
    } catch (err) {
      setActionError(err.message || 'Иш маълумотларини очиб бўлмади.');
    } finally { setDetailLoading(false); }
  };

  const nextStatus = selected ? flow[flow.indexOf(selected.status) + 1] : null;

  const changeToNextStatus = async () => {
    if (!selected || !nextStatus) return;
    setStatusSaving(true); setActionError(''); setSuccess('');
    try {
      const data = await apiRequest(`/cases/${selected.id}/status`, {
        method:'PATCH',
        body: JSON.stringify({ status: nextStatus, note: note.trim() }),
      });
      setSelected(data.item);
      setNote('');
      setSuccess(data.message || 'Иш босқичи ўзгартирилди.');
      await load();
    } catch (err) {
      setActionError(err.message || 'Иш босқичини ўзгартириб бўлмади.');
    } finally { setStatusSaving(false); }
  };

  const submitSearch = (e) => {
    e.preventDefault(); setPage(1); setSearch(searchInput.trim());
  };

  return (
    <section className="panel execution-page">
      <div className="panel-head execution-head">
        <div><span className="execution-kicker">ИЖРО НАЗОРАТИ</span><h2>Ижродаги ишлар</h2><p>{subtitle}</p></div>
        <button type="button" className="execution-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={18}/> Янгилаш
        </button>
      </div>

      <div className="execution-toolbar">
        <form className="execution-search" onSubmit={submitSearch}>
          <Search size={18}/>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            placeholder="ID, Ф.И.Ш., телефон ёки ЖШШИР бўйича қидириш"/>
          <button type="submit">Қидириш</button>
        </form>
        <select className="execution-status-filter" value={status}
          onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="">Барча ижро ҳолатлари</option>
          {executionStatuses.map(k=><option key={k} value={k}>{statusNames[k]}</option>)}
        </select>
      </div>

      <div className="execution-summary">
        <div><BriefcaseBusiness size={19}/><span>Жами</span><strong>{pagination.total || 0}</strong></div>
        {user?.role === 'EXECUTOR' && <div><UserRound size={19}/><span>Ижрочи</span><strong>{user?.fullName || '—'}</strong></div>}
      </div>

      {loading ? <div className="empty execution-empty"><RefreshCw size={34}/><strong>Юкланмоқда...</strong></div>
      : error ? <div className="page-error execution-error"><strong>Маълумотларни юклаб бўлмади</strong><span>{error}</span><button onClick={load}>Қайта уриниш</button></div>
      : items.length === 0 ? <div className="empty execution-empty"><BriefcaseBusiness size={40}/><strong>Ижродаги ишлар топилмади</strong></div>
      : <div className="execution-list">
          {items.map(item=><article className="execution-card" key={item.id} onClick={()=>openCase(item.id)}>
            <div className="execution-card-top">
              <div><span className="execution-id">{item.displayId || item.id}</span><h3>{item.applicant?.fullName || 'Мижоз номи киритилмаган'}</h3></div>
              <span className="execution-status">{statusNames[item.status] || item.status || '—'}</span>
            </div>
            <div className="execution-card-grid">
              <div><BriefcaseBusiness size={17}/><span>Хизмат</span><strong>{serviceNames[item.serviceType] || item.serviceType || '—'}</strong></div>
              <div><UserRound size={17}/><span>Ижрочи</span><strong>{item.executor?.fullName || 'Бириктирилмаган'}</strong></div>
              <div><Building2 size={17}/><span>Филиал</span><strong>{item.branch?.name || '—'}</strong></div>
              <div><Banknote size={17}/><span>Сўралаётган сумма</span><strong>{formatMoney(item.requestedAmount)}</strong></div>
              <div><Phone size={17}/><span>Телефон</span><strong>{item.applicant?.phone || '—'}</strong></div>
              <div><CalendarDays size={17}/><span>Яратилган</span><strong>{formatDate(item.createdAt)}</strong></div>
            </div>
            <div className="execution-open">Ишни очиш <ArrowRight size={16}/></div>
          </article>)}
        </div>}

      {!loading && !error && pagination.totalPages > 1 && <div className="execution-pagination">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={18}/> Олдинги</button>
        <span>{pagination.page || page} / {pagination.totalPages}</span>
        <button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Кейинги <ChevronRight size={18}/></button>
      </div>}

      {(selected || detailLoading) && <div className="execution-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
        <div className="execution-modal">
          <div className="execution-modal-head">
            <div><span>ИЖРО КАРТОЧКАСИ</span><h3>{selected?.displayId || 'Юкланмоқда...'}</h3></div>
            <button onClick={()=>setSelected(null)}><X size={20}/></button>
          </div>
          {detailLoading && !selected ? <div className="execution-modal-loading">Маълумотлар юкланмоқда...</div> : selected && <>
            <div className="execution-client">
              <div><UserRound size={20}/><div><span>Мижоз</span><strong>{selected.applicant?.fullName || '—'}</strong></div></div>
              <div><Phone size={20}/><div><span>Телефон</span><strong>{selected.applicant?.phone || '—'}</strong></div></div>
              <div><BriefcaseBusiness size={20}/><div><span>Хизмат</span><strong>{serviceNames[selected.serviceType] || selected.serviceType}</strong></div></div>
              <div><UserRound size={20}/><div><span>Ижрочи</span><strong>{selected.executor?.fullName || '—'}</strong></div></div>
            </div>

            <div className="execution-flow">
              {flow.map((key,index)=>{
                const current = flow.indexOf(selected.status);
                const done = index < current || selected.status === 'COMPLETED';
                const active = index === current && selected.status !== 'COMPLETED';
                return <div key={key} className={`execution-step ${done?'done':''} ${active?'active':''}`}>
                  <div className="execution-step-dot">{done ? <CheckCircle2 size={17}/> : index+1}</div>
                  <span>{statusNames[key]}</span>
                </div>;
              })}
            </div>

            <div className="execution-info-grid">
              <div><Banknote/><span>Сўралган сумма</span><strong>{formatMoney(selected.requestedAmount)}</strong></div>
              <div><Banknote/><span>Тасдиқланган сумма</span><strong>{formatMoney(selected.approvedAmount)}</strong></div>
              <div><Clock3/><span>Кредит ажратилган</span><strong>{formatDate(selected.creditIssuedAt)}</strong></div>
              <div><CalendarDays/><span>Мижоз маблағни олган</span><strong>{formatDate(selected.clientReceivedAt)}</strong></div>
            </div>

            {Array.isArray(selected.history) && selected.history.length > 0 && <div className="execution-history">
              <h4><FileText size={18}/> Жараён тарихи</h4>
              {selected.history.slice(0,8).map(h=><div key={h.id}>
                <span>{formatDate(h.createdAt)}</span>
                <strong>{statusNames[h.toStatus] || h.toStatus}</strong>
                {h.note && <p>{h.note}</p>}
              </div>)}
            </div>}

            {nextStatus && <div className="execution-action">
              <label>Изоҳ <small>(ихтиёрий)</small></label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}
                placeholder="Ушбу босқич бўйича қисқа изоҳ..."/>
              {actionError && <div className="execution-action-error">{actionError}</div>}
              {success && <div className="execution-action-success">{success}</div>}
              <button onClick={changeToNextStatus} disabled={statusSaving}>
                {statusSaving ? 'Сақланмоқда...' : <>Кейинги босқич: {statusNames[nextStatus]} <ArrowRight size={17}/></>}
              </button>
            </div>}
          </>}
        </div>
      </div>}

      <style>{`
        .execution-page{overflow:hidden}.execution-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
        .execution-kicker{display:block;margin-bottom:6px;color:#ef233c;font-size:11px;font-weight:800;letter-spacing:.08em}
        .execution-head h2{margin:0 0 5px}.execution-head p{margin:0;color:#7b8190}.execution-refresh{display:flex;align-items:center;gap:8px;border:1px solid #e2e5ea;background:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
        .execution-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:12px;padding:18px;border-top:1px solid #edf0f3;border-bottom:1px solid #edf0f3}
        .execution-search{display:flex;align-items:center;gap:10px;border:1px solid #dfe3e8;border-radius:11px;padding-left:12px;background:#fff}.execution-search input{min-width:0;flex:1;border:0;outline:0;padding:12px 0;font:inherit}.execution-search button{align-self:stretch;border:0;border-radius:0 10px 10px 0;padding:0 18px;background:#ef233c;color:#fff;font-weight:700;cursor:pointer}
        .execution-status-filter{border:1px solid #dfe3e8;border-radius:11px;padding:0 12px;background:#fff;font:inherit}.execution-summary{display:flex;gap:12px;padding:16px 18px 0}.execution-summary>div{display:flex;align-items:center;gap:8px;background:#f7f8fa;border-radius:10px;padding:10px 12px}.execution-summary span{color:#7b8190;font-size:12px}.execution-summary strong{font-size:13px}
        .execution-list{display:grid;gap:12px;padding:18px}.execution-card{border:1px solid #e3e6ea;border-radius:14px;padding:17px;background:#fff;cursor:pointer;transition:.15s}.execution-card:hover{border-color:#ef9aa5;box-shadow:0 6px 22px rgba(20,25,35,.06)}.execution-card-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #eef0f2}.execution-id{color:#ef233c;font-size:12px;font-weight:800}.execution-card h3{margin:5px 0 0;font-size:17px}.execution-status{flex:none;padding:7px 10px;border-radius:999px;background:#fff4f5;color:#d71932;font-size:11px;font-weight:800}
        .execution-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding-top:14px}.execution-card-grid>div{display:grid;grid-template-columns:22px 1fr;column-gap:7px}.execution-card-grid svg{grid-row:1/span 2;color:#ef233c}.execution-card-grid span{color:#8a909d;font-size:11px}.execution-card-grid strong{font-size:13px}.execution-open{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:14px;color:#ef233c;font-weight:800;font-size:12px}
        .execution-pagination{display:flex;justify-content:center;align-items:center;gap:14px;padding:0 18px 20px}.execution-pagination button{display:flex;align-items:center;gap:6px;border:1px solid #dfe3e8;background:#fff;border-radius:9px;padding:9px 12px;font-weight:700}
        .execution-modal-backdrop{position:fixed;inset:0;background:rgba(16,20,28,.55);z-index:9999;display:flex;justify-content:flex-end}.execution-modal{width:min(720px,100%);height:100%;overflow:auto;background:#fff;box-shadow:-20px 0 50px rgba(0,0,0,.16)}.execution-modal-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:20px 22px;background:#fff;border-bottom:1px solid #e8eaee}.execution-modal-head span{font-size:10px;font-weight:900;color:#ef233c}.execution-modal-head h3{margin:4px 0 0}.execution-modal-head button{border:0;background:#f4f5f7;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;cursor:pointer}
        .execution-client,.execution-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px}.execution-client>div,.execution-info-grid>div{display:flex;gap:10px;border:1px solid #e7e9ed;border-radius:12px;padding:12px}.execution-client svg,.execution-info-grid svg{color:#ef233c;flex:none}.execution-client span,.execution-info-grid span{display:block;color:#8a909d;font-size:11px}.execution-client strong,.execution-info-grid strong{display:block;margin-top:3px;font-size:13px}
        .execution-flow{padding:4px 22px 18px}.execution-step{display:flex;align-items:center;gap:10px;min-height:38px;color:#8b919c;position:relative}.execution-step:not(:last-child):before{content:'';position:absolute;left:14px;top:28px;width:2px;height:20px;background:#e4e7eb}.execution-step-dot{width:30px;height:30px;border-radius:50%;background:#f1f3f5;display:grid;place-items:center;font-size:11px;font-weight:900;z-index:1}.execution-step.active{color:#111827;font-weight:800}.execution-step.active .execution-step-dot{background:#ef233c;color:#fff}.execution-step.done{color:#15803d}.execution-step.done .execution-step-dot{background:#dcfce7;color:#15803d}
        .execution-history{margin:0 22px 18px;border-top:1px solid #eceef1;padding-top:16px}.execution-history h4{display:flex;align-items:center;gap:7px;margin:0 0 10px}.execution-history>div{padding:10px 0;border-bottom:1px solid #f0f1f3}.execution-history span{font-size:11px;color:#8b919c;margin-right:10px}.execution-history strong{font-size:12px}.execution-history p{margin:5px 0 0;font-size:12px;color:#555}
        .execution-action{margin:0 22px 28px;padding:16px;background:#f8f9fb;border-radius:14px}.execution-action label{display:block;font-size:12px;font-weight:800;margin-bottom:7px}.execution-action small{font-weight:500;color:#8b919c}.execution-action textarea{width:100%;min-height:80px;resize:vertical;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:10px;padding:10px;font:inherit}.execution-action>button{margin-top:10px;width:100%;display:flex;justify-content:center;align-items:center;gap:7px;border:0;border-radius:10px;padding:12px;background:#ef233c;color:#fff;font-weight:800;cursor:pointer}.execution-action-error{margin-top:8px;color:#b42318;font-size:12px}.execution-action-success{margin-top:8px;color:#15803d;font-size:12px}
        .execution-modal-loading{padding:30px}.execution-empty{min-height:260px}
        @media(max-width:900px){.execution-toolbar{grid-template-columns:1fr}.execution-status-filter{min-height:44px}.execution-card-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.execution-head,.execution-card-top{flex-direction:column}.execution-card-grid,.execution-client,.execution-info-grid{grid-template-columns:1fr}.execution-search button{padding:0 12px}.execution-summary{flex-direction:column}}
      `}</style>
    </section>
  );
}
