import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Upload,
  UserPlus,
} from 'lucide-react';

import { apiRequest, USER_KEY } from '../services/api.js';

const STATUS = {
  SENT: 'Янги заявка',
  ACCEPTED: 'Қабул қилинган',
  IN_PROGRESS: 'Иш жараёнида',
  REPORT_READY: 'Ҳисобот тайёр',
  COMPLETED: 'Якунланган',
  CANCELLED: 'Бекор қилинган',
};

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppraisalsPage() {
  const user = useMemo(() => readUser(), []);
  const isEmployee = user?.role === 'APPRAISAL_EMPLOYEE';
  const canManage = ['SUPER_ADMIN', 'DIRECTOR'].includes(user?.role);

  const [companies, setCompanies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyForm, setCompanyForm] = useState({
    name: '', inn: '', license: '', phone: '', email: '', address: '',
  });
  const [employeeForm, setEmployeeForm] = useState({
    companyId: '', fullName: '', phone: '', email: '', login: '', password: '',
  });
  const [reportMeta, setReportMeta] = useState({});
  const [uploading, setUploading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, r] = await Promise.all([
        apiRequest('/appraisals/companies'),
        apiRequest('/appraisals/requests'),
      ]);
      setCompanies(c.items || []);
      setRequests(r.items || []);
    } catch (e) {
      setError(e.message || 'Баҳолаш маълумотларини юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCompany = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/appraisals/companies', {
        method: 'POST',
        body: JSON.stringify(companyForm),
      });
      setCompanyForm({ name: '', inn: '', license: '', phone: '', email: '', address: '' });
      await load();
    } catch (err) { setError(err.message); }
  };

  const createEmployee = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/appraisals/companies/${employeeForm.companyId}/employees`, {
        method: 'POST',
        body: JSON.stringify(employeeForm),
      });
      setEmployeeForm({ companyId: '', fullName: '', phone: '', email: '', login: '', password: '' });
      await load();
    } catch (err) { setError(err.message); }
  };

  const changeStatus = async (id, status) => {
    try {
      await apiRequest(`/appraisals/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) { setError(e.message); }
  };

  const uploadReport = async (request, file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Ҳисобот файли 20 МБдан ошмаслиги керак.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Ҳисобот PDF форматда бўлиши керак.');
      return;
    }

    setUploading(request.id);
    setError('');
    try {
      const meta = reportMeta[request.id] || {};
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'REPORT');
      if (meta.appraisalValue) form.append('appraisalValue', meta.appraisalValue);
      if (meta.reportNumber) form.append('reportNumber', meta.reportNumber);
      if (meta.reportDate) form.append('reportDate', meta.reportDate);

      await apiRequest(`/appraisals/requests/${request.id}/files`, {
        method: 'POST',
        body: form,
      });
      await load();
    } catch (e) {
      setError(e.message || 'Ҳисоботни юклаб бўлмади.');
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <div className="empty">
          <LoaderCircle className="spin" size={34} />
          <strong>Баҳолаш модули юкланмоқда...</strong>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error ? <div className="form-error">{error}</div> : null}

      {canManage ? (
        <section className="panel details-section">
          <div className="details-section-head">
            <div>
              <span className="section-kicker">Ҳамкорлар</span>
              <h3>Баҳолаш компаниялари</h3>
            </div>
            <Building2 size={22} />
          </div>

          <form onSubmit={createCompany} className="form-grid">
            {[
              ['name','Компания номи *'],
              ['inn','СТИР'],
              ['license','Лицензия / сертификат'],
              ['phone','Телефон'],
              ['email','E-mail'],
              ['address','Манзил'],
            ].map(([key,label]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input
                  value={companyForm[key]}
                  onChange={(e) => setCompanyForm((x) => ({ ...x, [key]: e.target.value }))}
                />
              </label>
            ))}
            <button className="primary" type="submit" disabled={!companyForm.name.trim()}>
              <Plus size={16} /> Компания қўшиш
            </button>
          </form>

          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            {companies.map((c) => (
              <div className="details-list-card" key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.phone || 'Телефон йўқ'} · {c._count?.requests || 0} заявка</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="panel details-section">
          <div className="details-section-head">
            <div>
              <span className="section-kicker">Аккаунт</span>
              <h3>Баҳоловчи ходимини қўшиш</h3>
            </div>
            <UserPlus size={22} />
          </div>
          <form onSubmit={createEmployee} className="form-grid">
            <label className="field field-wide">
              <span>Компания *</span>
              <select
                value={employeeForm.companyId}
                onChange={(e) => setEmployeeForm((x) => ({ ...x, companyId: e.target.value }))}
              >
                <option value="">— Танланг —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {[
              ['fullName','Ф.И.Ш. *'],
              ['phone','Телефон'],
              ['email','E-mail'],
              ['login','Логин *'],
              ['password','Пароль *'],
            ].map(([key,label]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input
                  type={key === 'password' ? 'password' : 'text'}
                  value={employeeForm[key]}
                  onChange={(e) => setEmployeeForm((x) => ({ ...x, [key]: e.target.value }))}
                />
              </label>
            ))}
            <button
              className="primary"
              type="submit"
              disabled={!employeeForm.companyId || !employeeForm.fullName || !employeeForm.login || employeeForm.password.length < 6}
            >
              <UserPlus size={16} /> Аккаунт яратиш
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel details-section">
        <div className="details-section-head">
          <div>
            <span className="section-kicker">Заявкалар</span>
            <h3>{isEmployee ? 'Бизга келган баҳолаш заявкалари' : 'Барча баҳолаш заявкалари'}</h3>
          </div>
          <button className="icon-button" type="button" onClick={load}>
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {requests.map((r) => {
            const reports = (r.files || []).filter((f) => f.kind === 'REPORT');
            const photos = (r.files || []).filter((f) => f.kind === 'PROPERTY_PHOTO');
            const meta = reportMeta[r.id] || {};

            return (
              <article
                key={r.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 13,
                  padding: 15,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <strong>{r.displayId}</strong>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {r.case?.displayId} · {r.case?.applicant?.fullName}
                    </div>
                    <div style={{ color: '#777', fontSize: 11, marginTop: 3 }}>
                      {r.company?.name} · {r.case?.collateralAddress || r.case?.salePropertyAddress || 'Мулк манзили киритилмаган'}
                    </div>
                  </div>
                  <span className="status-badge status-progress">{STATUS[r.status] || r.status}</span>
                </div>

                <div style={{ fontSize: 11, color: '#666' }}>
                  Ҳужжатлар: {r._count?.documents || 0} · Расмлар: {photos.length}
                </div>

                {isEmployee ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.status === 'SENT' ? (
                      <button className="primary" type="button" onClick={() => changeStatus(r.id, 'ACCEPTED')}>
                        Қабул қилиш
                      </button>
                    ) : null}
                    {['SENT','ACCEPTED'].includes(r.status) ? (
                      <button className="secondary-button" type="button" onClick={() => changeStatus(r.id, 'IN_PROGRESS')}>
                        Ишни бошлаш
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {isEmployee && ['ACCEPTED','IN_PROGRESS','REPORT_READY'].includes(r.status) ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: 9,
                      padding: 12,
                      background: '#fafafa',
                      borderRadius: 10,
                    }}
                  >
                    <label className="field">
                      <span>Баҳоланган қиймат</span>
                      <input
                        inputMode="numeric"
                        value={meta.appraisalValue || ''}
                        onChange={(e) => setReportMeta((x) => ({
                          ...x, [r.id]: { ...meta, appraisalValue: e.target.value.replace(/\D/g,'') }
                        }))}
                      />
                    </label>
                    <label className="field">
                      <span>Ҳисобот рақами</span>
                      <input
                        value={meta.reportNumber || ''}
                        onChange={(e) => setReportMeta((x) => ({
                          ...x, [r.id]: { ...meta, reportNumber: e.target.value }
                        }))}
                      />
                    </label>
                    <label className="field">
                      <span>Ҳисобот санаси</span>
                      <input
                        type="date"
                        value={meta.reportDate || ''}
                        onChange={(e) => setReportMeta((x) => ({
                          ...x, [r.id]: { ...meta, reportDate: e.target.value }
                        }))}
                      />
                    </label>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        minHeight: 42,
                        alignSelf: 'end',
                        borderRadius: 9,
                        background: '#ef232d',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: '0 12px',
                      }}
                    >
                      {uploading === r.id ? <LoaderCircle className="spin" size={16}/> : <Upload size={16}/>}
                      PDF ҳисобот юклаш (20 МБ)
                      <input
                        hidden
                        type="file"
                        accept="application/pdf"
                        disabled={uploading === r.id}
                        onChange={(e) => uploadReport(r, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                ) : null}

                {reports.map((report) => (
                  <a key={report.id} href={report.fileUrl} target="_blank" rel="noreferrer" className="details-list-card">
                    <CheckCircle2 size={17} />
                    <div>
                      <strong>Баҳолаш ҳисоботи</strong>
                      <span>{report.fileName}</span>
                    </div>
                  </a>
                ))}
              </article>
            );
          })}

          {!requests.length ? (
            <div className="empty">
              <FileText size={36} />
              <strong>Баҳолаш заявкалари йўқ</strong>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
