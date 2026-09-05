import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, Eye, FileText, LoaderCircle,
  Plus, RefreshCw, Stamp, UserPlus
} from 'lucide-react';

import { apiRequest, USER_KEY } from '../services/api.js';

const STATUS = {
  SENT: 'Нотариусга юборилди',
  REVIEWING: 'Текширувда',
  DEFICIENCY: 'Камчилик бор',
  RESUBMITTED: 'Қайта юборилди',
  DOCUMENTS_OK: 'Ҳужжатлар тайёр',
  READY_FOR_VISIT: 'Нотариусга бориш керак',
  COMPLETED: 'Якунланган',
  CANCELLED: 'Бекор қилинган',
};

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function documentTitle(doc) {
  return doc?.fileName || doc?.originalName || doc?.name ||
    doc?.documentType || doc?.type || 'Ҳужжат';
}

export function NotariesPage() {
  const user = useMemo(() => readUser(), []);
  const isNotary = user?.role === 'NOTARY';
  const canManage = ['SUPER_ADMIN', 'DIRECTOR'].includes(user?.role);

  const [notaries, setNotaries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [noteById, setNoteById] = useState({});
  const [form, setForm] = useState({
    fullName: '', officeName: '', licenseNumber: '', address: '',
    phone: '', email: '', login: '', password: ''
  });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [n, r] = await Promise.all([
        apiRequest('/notaries'),
        apiRequest('/notaries/requests'),
      ]);
      setNotaries(n.items || []);
      setRequests(r.items || []);
    } catch (e) {
      setError(e.message || 'Нотариус маълумотларини юклаб бўлмади.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNotary = async (e) => {
    e.preventDefault(); setError('');
    try {
      await apiRequest('/notaries', { method: 'POST', body: JSON.stringify(form) });
      setForm({ fullName:'', officeName:'', licenseNumber:'', address:'', phone:'', email:'', login:'', password:'' });
      await load();
    } catch (e2) { setError(e2.message || 'Нотариусни сақлаб бўлмади.'); }
  };

  const fetchDetail = useCallback(async (id) => {
    setDetailLoadingId(id);
    try {
      const data = await apiRequest(`/notaries/requests/${id}`);
      setDetailById(x => ({ ...x, [id]: data.item }));
      return data.item;
    } catch (e) {
      setError(e.message || 'Заявкани очиб бўлмади.');
    } finally { setDetailLoadingId(null); }
  }, []);

  const toggleDetail = async (id) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!detailById[id]) await fetchDetail(id);
  };

  const changeStatus = async (id, status) => {
    setError('');
    try {
      await apiRequest(`/notaries/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: noteById[id] || undefined }),
      });
      await load();
      if (openId === id) await fetchDetail(id);
    } catch (e) { setError(e.message || 'Ҳолатни ўзгартириб бўлмади.'); }
  };

  if (loading) return (
    <section className="panel"><div className="empty">
      <LoaderCircle className="spin" size={34}/><strong>Нотариуслар модули юкланмоқда...</strong>
    </div></section>
  );

  return (
    <div style={{display:'grid',gap:16}}>
      {error ? <div className="form-error">{error}</div> : null}

      {canManage ? <section className="panel details-section" style={{padding:14}}>
        <div className="details-section-head">
          <div><span className="section-kicker">Ҳамкорлар</span><h3>Нотариуслар</h3>
            <p style={{margin:0,fontSize:11,color:'#7b7f86'}}>Нотариус аккаунтларини шу ердан бошқаринг.</p>
          </div><Stamp size={20}/>
        </div>
        <form onSubmit={createNotary} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:8,marginTop:12}}>
          {[
            ['fullName','Нотариус Ф.И.Ш. *'],['officeName','Нотариал идора'],
            ['licenseNumber','Лицензия / реестр рақами'],['phone','Телефон'],
            ['email','E-mail'],['address','Манзил'],['login','Логин *'],['password','Пароль *']
          ].map(([key,label]) => <label className="field" key={key}>
            <span>{label}</span><input type={key==='password'?'password':'text'} value={form[key]}
              onChange={e=>setForm(x=>({...x,[key]:e.target.value}))}/>
          </label>)}
          <button className="primary" disabled={!form.fullName || !form.login || form.password.length < 6}>
            <Plus size={15}/> Нотариус қўшиш
          </button>
        </form>
        <div style={{display:'grid',gap:8,marginTop:12}}>
          {notaries.map(n => <div className="details-list-card" key={n.id}>
            <Stamp size={18}/><div><strong>{n.fullName}</strong>
              <span>{n.officeName || 'Нотариал идора'}{n.phone ? ` · ${n.phone}` : ''}</span>
            </div>
          </div>)}
        </div>
      </section> : null}

      <section className="panel details-section">
        <div className="details-section-head">
          <div><span className="section-kicker">Заявкалар</span>
            <h3>{isNotary ? 'Менга келган нотариал заявкалар' : 'Барча нотариал заявкалар'}</h3>
          </div>
          <button className="icon-button" type="button" onClick={load}><RefreshCw size={18}/></button>
        </div>

        <div style={{display:'grid',gap:12}}>
          {requests.map(r => {
            const isOpen = openId === r.id;
            const detail = detailById[r.id];
            const documents = detail?.documents || [];
            const caseItem = detail?.case || r.case || {};
            return <article key={r.id} style={{border:'1px solid #e5e7eb',borderRadius:13,padding:15,display:'grid',gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                <div><strong>{r.displayId}</strong>
                  <div style={{fontSize:12,marginTop:4}}>{r.case?.displayId} · {r.case?.applicant?.fullName}</div>
                  <div style={{fontSize:11,color:'#777',marginTop:3}}>{r.notary?.fullName || r.notary?.officeName || 'Нотариус'}</div>
                </div>
                <span className="status-badge status-progress">{STATUS[r.status] || r.status}</span>
              </div>
              <button className="secondary-button" type="button" onClick={()=>toggleDetail(r.id)} style={{justifySelf:'start'}}>
                {detailLoadingId===r.id ? <LoaderCircle className="spin" size={16}/> : <Eye size={16}/>}
                {isOpen?'Ёпиш':'Кўриш / ўрганиш'} {isOpen?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
              </button>

              {isOpen ? <div style={{border:'1px solid #e8e8e8',background:'#fafafa',borderRadius:12,padding:14,display:'grid',gap:14}}>
                {detail ? <>
                  <div><strong>Мижоз</strong><div style={{fontSize:12,marginTop:5}}>
                    {caseItem?.applicant?.fullName || '—'} · {caseItem?.applicant?.phone || '—'}
                  </div></div>
                  <div><strong>Юборилган ҳужжатлар ({documents.length})</strong>
                    <div style={{display:'grid',gap:8,marginTop:8}}>
                      {documents.map(doc => <div className="details-list-card" key={doc.id}>
                        <FileText size={18}/><div style={{flex:1}}><strong>{documentTitle(doc)}</strong></div>
                        {doc.fileUrl ? <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="secondary-button"><Eye size={15}/> Кўриш</a> : null}
                      </div>)}
                    </div>
                  </div>

                  {isNotary ? <div style={{display:'grid',gap:8}}>
                    <label className="field"><span>Изоҳ / камчиликлар</span>
                      <textarea rows={3} value={noteById[r.id] || ''} onChange={e=>setNoteById(x=>({...x,[r.id]:e.target.value}))}/>
                    </label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {['SENT','RESUBMITTED'].includes(r.status) ? <button className="primary" type="button" onClick={()=>changeStatus(r.id,'REVIEWING')}>Текширувга қабул қилиш</button> : null}
                      {r.status==='REVIEWING' ? <>
                        <button className="secondary-button" type="button" onClick={()=>changeStatus(r.id,'DEFICIENCY')}>Камчилик бор</button>
                        <button className="primary" type="button" onClick={()=>changeStatus(r.id,'READY_FOR_VISIT')}><CheckCircle2 size={16}/> Ҳужжатлар тайёр</button>
                      </> : null}
                    </div>
                  </div> : null}
                </> : <div className="empty"><LoaderCircle className="spin" size={28}/></div>}
              </div> : null}
            </article>
          })}
          {!requests.length ? <div className="empty"><FileText size={36}/><strong>Нотариал заявкалар йўқ</strong></div> : null}
        </div>
      </section>
    </div>
  );
}
