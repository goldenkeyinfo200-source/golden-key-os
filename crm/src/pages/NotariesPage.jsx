import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Stamp,
  UserPlus,
} from 'lucide-react';

import { apiRequest, USER_KEY } from '../services/api.js';

const STATUS = {
  SENT: 'Нотариусга юборилди',
  ACCEPTED: 'Қабул қилинган',
  IN_REVIEW: 'Текширувда',
  NEEDS_CORRECTION: 'Камчилик бор',
  RESUBMITTED: 'Қайта юборилди',
  DOCUMENTS_READY: 'Ҳужжатлар тайёр',
  READY_FOR_VISIT: 'Нотариусга бориш керак',
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

function documentTitle(doc) {
  return (
    doc?.fileName ||
    doc?.originalName ||
    doc?.name ||
    doc?.documentType ||
    doc?.type ||
    'Ҳужжат'
  );
}

export function NotariesPage() {
  const user = useMemo(() => readUser(), []);
  const isNotary = user?.role === 'NOTARY';
  const canManageOffices = ['SUPER_ADMIN', 'DIRECTOR'].includes(user?.role);

  const [offices, setOffices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [officeForm, setOfficeForm] = useState({
    name: '',
    officeNumber: '',
    licenseNumber: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });

  const [employeeForm, setEmployeeForm] = useState({
    officeId: '',
    fullName: '',
    phone: '',
    email: '',
    login: '',
    password: '',
    isActive: true,
  });

  const [openId, setOpenId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const [statusNoteById, setStatusNoteById] = useState({});
  const [visitNoteById, setVisitNoteById] = useState({});
  const [visitAtById, setVisitAtById] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [officeData, requestData] = await Promise.all([
        apiRequest('/notaries/offices'),
        apiRequest('/notaries/requests'),
      ]);

      setOffices(officeData.items || []);
      setRequests(requestData.items || []);
    } catch (requestError) {
      setError(
        requestError.message || 'Нотариус маълумотларини юклаб бўлмади.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createOffice = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await apiRequest('/notaries/offices', {
        method: 'POST',
        body: JSON.stringify(officeForm),
      });

      setOfficeForm({
        name: '',
        officeNumber: '',
        licenseNumber: '',
        address: '',
        phone: '',
        email: '',
        isActive: true,
      });

      await load();
    } catch (requestError) {
      setError(
        requestError.message || 'Нотариал идорани сақлаб бўлмади.'
      );
    }
  };

  const createEmployee = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await apiRequest(
        `/notaries/offices/${employeeForm.officeId}/employees`,
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: employeeForm.fullName,
            phone: employeeForm.phone,
            email: employeeForm.email,
            login: employeeForm.login,
            password: employeeForm.password,
            isActive: employeeForm.isActive,
          }),
        }
      );

      setEmployeeForm({
        officeId: '',
        fullName: '',
        phone: '',
        email: '',
        login: '',
        password: '',
        isActive: true,
      });

      await load();
    } catch (requestError) {
      setError(
        requestError.message || 'Нотариус аккаунтини сақлаб бўлмади.'
      );
    }
  };

  const fetchDetail = useCallback(async (id) => {
    setDetailLoadingId(id);
    setError('');

    try {
      const response = await apiRequest(`/notaries/requests/${id}`);
      setDetailById((current) => ({
        ...current,
        [id]: response.item,
      }));
      return response.item;
    } catch (requestError) {
      setError(
        requestError.message || 'Нотариус заявкасини очиб бўлмади.'
      );
      return null;
    } finally {
      setDetailLoadingId(null);
    }
  }, []);

  const toggleDetail = async (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }

    setOpenId(id);

    if (!detailById[id]) {
      await fetchDetail(id);
    }
  };

  const changeStatus = async (id, status) => {
    setError('');

    try {
      const payload = { status };

      if (status === 'NEEDS_CORRECTION') {
        payload.deficiencyNote = statusNoteById[id] || '';
      }

      if (status === 'READY_FOR_VISIT') {
        payload.visitNote = visitNoteById[id] || '';
        payload.visitAt = visitAtById[id] || null;
      }

      await apiRequest(`/notaries/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      await load();

      if (openId === id) {
        await fetchDetail(id);
      }
    } catch (requestError) {
      setError(
        requestError.message || 'Заявка ҳолатини ўзгартириб бўлмади.'
      );
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <div className="empty">
          <LoaderCircle className="spin" size={34} />
          <strong>Нотариуслар модули юкланмоқда...</strong>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error ? <div className="form-error">{error}</div> : null}

      {canManageOffices ? (
        <section className="panel details-section" style={{ padding: 14 }}>
          <div className="details-section-head">
            <div>
              <span className="section-kicker">Ҳамкорлар</span>
              <h3>Нотариал идоралар ва нотариуслар</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#7b7f86' }}>
                Аввал нотариал идорани қўшинг, кейин унга нотариус аккаунтини
                бириктиринг.
              </p>
            </div>

            <Stamp size={20} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 12,
              marginTop: 12,
              alignItems: 'start',
            }}
          >
            <div
              style={{
                border: '1px solid #ececec',
                borderRadius: 12,
                padding: 12,
                background: '#fafafa',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 9 }}>
                Нотариал идора қўшиш
              </div>

              <form
                onSubmit={createOffice}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {[
                  ['name', 'Нотариал идора номи *'],
                  ['officeNumber', 'Идора рақами'],
                  ['licenseNumber', 'Лицензия / реестр рақами'],
                  ['phone', 'Телефон'],
                  ['email', 'E-mail'],
                  ['address', 'Манзил'],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      value={officeForm[key]}
                      onChange={(event) =>
                        setOfficeForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}

                <button
                  className="primary"
                  type="submit"
                  disabled={!officeForm.name.trim()}
                  style={{ gridColumn: '1 / -1', minHeight: 38 }}
                >
                  <Plus size={15} />
                  Идора қўшиш
                </button>
              </form>
            </div>

            <div
              style={{
                border: '1px solid #ececec',
                borderRadius: 12,
                padding: 12,
                background: '#fafafa',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 9 }}>
                Нотариус аккаунтини қўшиш
              </div>

              <form
                onSubmit={createEmployee}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>Нотариал идора *</span>

                  <select
                    value={employeeForm.officeId}
                    onChange={(event) =>
                      setEmployeeForm((current) => ({
                        ...current,
                        officeId: event.target.value,
                      }))
                    }
                  >
                    <option value="">— Танланг —</option>

                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </label>

                {[
                  ['fullName', 'Нотариус Ф.И.Ш. *'],
                  ['phone', 'Телефон'],
                  ['email', 'E-mail'],
                  ['login', 'Логин *'],
                  ['password', 'Пароль'],
                ].map(([key, label]) => (
                  <label
                    className="field"
                    key={key}
                    style={
                      key === 'password'
                        ? { gridColumn: '1 / -1' }
                        : undefined
                    }
                  >
                    <span>{label}</span>

                    <input
                      type={key === 'password' ? 'password' : 'text'}
                      value={employeeForm[key]}
                      onChange={(event) =>
                        setEmployeeForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}

                <button
                  className="primary"
                  type="submit"
                  disabled={
                    !employeeForm.officeId ||
                    !employeeForm.fullName.trim() ||
                    !employeeForm.login.trim()
                  }
                  style={{ gridColumn: '1 / -1', minHeight: 38 }}
                >
                  <UserPlus size={15} />
                  Аккаунт яратиш
                </button>
              </form>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {offices.map((office) => (
              <div
                key={office.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 11,
                  padding: '10px 12px',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                    }}
                  >
                    <Building2 size={18} />

                    <div>
                      <strong>{office.name}</strong>
                      <div
                        style={{
                          color: '#777',
                          fontSize: 10.5,
                          marginTop: 2,
                        }}
                      >
                        {office.phone || 'Телефон йўқ'} ·{' '}
                        {office._count?.requests || 0} заявка ·{' '}
                        {office.employees?.length || 0} нотариус
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: '#f4f0ff',
                      color: '#6941c6',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {office.employees?.length || 0} нотариус
                  </span>
                </div>

                {office.employees?.length ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 7,
                      flexWrap: 'wrap',
                    }}
                  >
                    {office.employees.map((employee) => (
                      <div
                        key={employee.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          border: '1px solid #ececec',
                          borderRadius: 9,
                          padding: '6px 8px',
                          background: '#fafafa',
                          fontSize: 10.5,
                        }}
                      >
                        <UserPlus size={13} />

                        <div style={{ display: 'grid', gap: 1 }}>
                          <strong style={{ fontSize: 10.5 }}>
                            {employee.fullName}
                          </strong>

                          <span style={{ color: '#777' }}>
                            {employee.login || 'логин йўқ'}
                            {employee.phone ? ` · ${employee.phone}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: '#8a8f98',
                    }}
                  >
                    Бу идорага ҳали нотариус аккаунти қўшилмаган.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel details-section">
        <div className="details-section-head">
          <div>
            <span className="section-kicker">Заявкалар</span>

            <h3>
              {isNotary
                ? 'Бизга келган нотариал заявкалар'
                : 'Барча нотариал заявкалар'}
            </h3>
          </div>

          <button className="icon-button" type="button" onClick={load}>
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {requests.map((request) => {
            const isOpen = openId === request.id;
            const detail = detailById[request.id];
            const documents = detail?.documents || [];
            const caseItem = detail?.case || request.case || {};
            const applicant = caseItem?.applicant || {};

            return (
              <article
                key={request.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 13,
                  padding: 15,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>{request.displayId}</strong>

                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      {request.case?.displayId} ·{' '}
                      {request.case?.applicant?.fullName}
                    </div>

                    <div
                      style={{
                        color: '#777',
                        fontSize: 11,
                        marginTop: 3,
                      }}
                    >
                      {request.office?.name || 'Нотариал идора'}
                    </div>
                  </div>

                  <span className="status-badge status-progress">
                    {STATUS[request.status] || request.status}
                  </span>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => toggleDetail(request.id)}
                  style={{ justifySelf: 'start' }}
                >
                  {detailLoadingId === request.id ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Eye size={16} />
                  )}

                  {isOpen ? 'Ёпиш' : 'Кўриш / ўрганиш'}

                  {isOpen ? (
                    <ChevronUp size={15} />
                  ) : (
                    <ChevronDown size={15} />
                  )}
                </button>

                {isOpen ? (
                  <div
                    style={{
                      border: '1px solid #e8e8e8',
                      background: '#fafafa',
                      borderRadius: 12,
                      padding: 14,
                      display: 'grid',
                      gap: 14,
                    }}
                  >
                    {detailLoadingId === request.id && !detail ? (
                      <div className="empty">
                        <LoaderCircle className="spin" size={28} />
                      </div>
                    ) : detail ? (
                      <>
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              marginBottom: 8,
                            }}
                          >
                            Мижоз маълумотлари
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(auto-fit,minmax(200px,1fr))',
                              gap: 8,
                            }}
                          >
                            <div className="details-list-card">
                              <div>
                                <strong>Ф.И.Ш.</strong>
                                <span>{applicant.fullName || '—'}</span>
                              </div>
                            </div>

                            <div className="details-list-card">
                              <div>
                                <strong>Телефон</strong>
                                <span>{applicant.phone || '—'}</span>
                              </div>
                            </div>

                            <div className="details-list-card">
                              <div>
                                <strong>ЖШШИР</strong>
                                <span>{applicant.pinfl || '—'}</span>
                              </div>
                            </div>

                            <div className="details-list-card">
                              <div>
                                <strong>Паспорт</strong>
                                <span>
                                  {[
                                    applicant.passportSeries,
                                    applicant.passportNumber,
                                  ]
                                    .filter(Boolean)
                                    .join(' ') || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {detail.note ? (
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                marginBottom: 6,
                              }}
                            >
                              Golden Key изоҳи
                            </div>

                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: 10,
                                padding: 12,
                                fontSize: 12,
                              }}
                            >
                              {detail.note}
                            </div>
                          </div>
                        ) : null}

                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              marginBottom: 8,
                            }}
                          >
                            Юборилган ҳужжатлар ({documents.length})
                          </div>

                          {documents.length ? (
                            <div style={{ display: 'grid', gap: 8 }}>
                              {documents.map((document) => (
                                <div
                                  className="details-list-card"
                                  key={document.id}
                                >
                                  <FileText size={18} />

                                  <div
                                    style={{
                                      minWidth: 0,
                                      flex: 1,
                                    }}
                                  >
                                    <strong>
                                      {documentTitle(document)}
                                    </strong>

                                    <span>
                                      {document.mimeType ||
                                        document.type ||
                                        'Ҳужжат'}
                                    </span>
                                  </div>

                                  {document.fileUrl ? (
                                    <a
                                      href={document.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="secondary-button"
                                    >
                                      <Eye size={15} />
                                      Кўриш
                                    </a>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="details-empty-block">
                              <FileText size={24} />
                              <strong>Ҳужжат юборилмаган</strong>
                            </div>
                          )}
                        </div>

                        {detail.deficiencyNote ? (
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                marginBottom: 6,
                              }}
                            >
                              Нотариус кўрсатган камчилик
                            </div>

                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                background: '#fff5f5',
                                border: '1px solid #fecaca',
                                borderRadius: 10,
                                padding: 12,
                                fontSize: 12,
                              }}
                            >
                              {detail.deficiencyNote}
                            </div>
                          </div>
                        ) : null}

                        {isNotary ? (
                          <div
                            style={{
                              borderTop: '1px solid #e5e7eb',
                              paddingTop: 12,
                              display: 'grid',
                              gap: 10,
                            }}
                          >
                            {request.status === 'SENT' ? (
                              <button
                                className="primary"
                                type="button"
                                onClick={() =>
                                  changeStatus(
                                    request.id,
                                    'ACCEPTED'
                                  )
                                }
                              >
                                <CheckCircle2 size={16} />
                                Заявкани қабул қилиш
                              </button>
                            ) : null}

                            {request.status === 'ACCEPTED' ? (
                              <button
                                className="primary"
                                type="button"
                                onClick={() =>
                                  changeStatus(
                                    request.id,
                                    'IN_REVIEW'
                                  )
                                }
                              >
                                Текширувни бошлаш
                              </button>
                            ) : null}

                            {request.status === 'RESUBMITTED' ? (
                              <button
                                className="primary"
                                type="button"
                                onClick={() =>
                                  changeStatus(
                                    request.id,
                                    'IN_REVIEW'
                                  )
                                }
                              >
                                Қайта текшириш
                              </button>
                            ) : null}

                            {request.status === 'IN_REVIEW' ? (
                              <>
                                <label className="field">
                                  <span>
                                    Камчиликлар
                                  </span>

                                  <textarea
                                    rows={3}
                                    value={
                                      statusNoteById[request.id] ||
                                      ''
                                    }
                                    onChange={(event) =>
                                      setStatusNoteById(
                                        (current) => ({
                                          ...current,
                                          [request.id]:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    placeholder="Етишмаётган ёки нотўғри ҳужжатларни аниқ ёзинг"
                                  />
                                </label>

                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() =>
                                      changeStatus(
                                        request.id,
                                        'NEEDS_CORRECTION'
                                      )
                                    }
                                  >
                                    Камчилик бор
                                  </button>

                                  <button
                                    className="primary"
                                    type="button"
                                    onClick={() =>
                                      changeStatus(
                                        request.id,
                                        'DOCUMENTS_READY'
                                      )
                                    }
                                  >
                                    <CheckCircle2 size={16} />
                                    Ҳужжатлар тайёр
                                  </button>
                                </div>
                              </>
                            ) : null}

                            {request.status ===
                            'DOCUMENTS_READY' ? (
                              <>
                                <label className="field">
                                  <span>
                                    Нотариусга келиш вақти
                                    (ихтиёрий)
                                  </span>

                                  <input
                                    type="datetime-local"
                                    value={
                                      visitAtById[request.id] || ''
                                    }
                                    onChange={(event) =>
                                      setVisitAtById(
                                        (current) => ({
                                          ...current,
                                          [request.id]:
                                            event.target.value,
                                        })
                                      )
                                    }
                                  />
                                </label>

                                <label className="field">
                                  <span>
                                    Қабул изоҳи
                                  </span>

                                  <textarea
                                    rows={2}
                                    value={
                                      visitNoteById[request.id] ||
                                      ''
                                    }
                                    onChange={(event) =>
                                      setVisitNoteById(
                                        (current) => ({
                                          ...current,
                                          [request.id]:
                                            event.target.value,
                                        })
                                      )
                                    }
                                  />
                                </label>

                                <button
                                  className="primary"
                                  type="button"
                                  onClick={() =>
                                    changeStatus(
                                      request.id,
                                      'READY_FOR_VISIT'
                                    )
                                  }
                                >
                                  Нотариусга келишга тайёр
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          {!requests.length ? (
            <div className="empty">
              <FileText size={36} />
              <strong>Нотариал заявкалар йўқ</strong>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
