import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Crown,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { apiRequest } from '../services/api.js';

const EMPTY_FORM = {
  name: '',
  city: '',
  address: '',
  phone: '',
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Бош администратор',
  DIRECTOR: 'Директор',
  BRANCH_MANAGER: 'Филиал раҳбари',
  RECEPTION_MANAGER: 'Қабул менежери',
  EXECUTOR: 'Ижрочи',
  LAWYER: 'Юрист',
  ACCOUNTANT: 'Бухгалтер',
};

export function BranchesPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffBranch, setStaffBranch] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);

  const canManage = useMemo(
    () => ['SUPER_ADMIN', 'DIRECTOR'].includes(user?.role),
    [user]
  );

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/branches');
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Филиалларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({
      name: branch.name || '',
      city: branch.city || '',
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.city.trim()) {
      setFormError('Филиал номи ва шаҳарни киритинг.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      };

      if (editing) {
        await apiRequest(`/branches/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeModal(true);
      await loadBranches();
    } catch (requestError) {
      setFormError(requestError.message || 'Филиални сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const loadBranchStaff = useCallback(async (branchId) => {
    setStaffLoading(true);
    setStaffError('');

    try {
      const data = await apiRequest(`/branches/${branchId}/staff`);
      setAssignedStaff(Array.isArray(data.assigned) ? data.assigned : []);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setSelectedManagerId(data.manager?.id || '');
      setSelectedStaffId('');
    } catch (requestError) {
      setStaffError(
        requestError.message || 'Филиал ходимларини юклаб бўлмади.'
      );
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const openStaff = async (branch) => {
    setStaffBranch(branch);
    setStaffModalOpen(true);
    setAssignedStaff([]);
    setCandidates([]);
    setSelectedStaffId('');
    setSelectedManagerId('');
    setStaffError('');
    await loadBranchStaff(branch.id);
  };

  const closeStaff = () => {
    if (staffSaving) return;
    setStaffModalOpen(false);
    setStaffBranch(null);
    setAssignedStaff([]);
    setCandidates([]);
    setSelectedStaffId('');
    setSelectedManagerId('');
    setStaffError('');
  };

  const attachStaff = async () => {
    if (!staffBranch || !selectedStaffId) {
      setStaffError('Бириктириш учун ходимни танланг.');
      return;
    }

    setStaffSaving(true);
    setStaffError('');

    try {
      await apiRequest(`/branches/${staffBranch.id}/staff`, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedStaffId }),
      });

      await Promise.all([
        loadBranchStaff(staffBranch.id),
        loadBranches(),
      ]);
    } catch (requestError) {
      setStaffError(
        requestError.message || 'Ходимни филиалга бириктириб бўлмади.'
      );
    } finally {
      setStaffSaving(false);
    }
  };

  const setManager = async () => {
    if (!staffBranch || !selectedManagerId) {
      setStaffError('Филиал раҳбарини танланг.');
      return;
    }

    setStaffSaving(true);
    setStaffError('');

    try {
      await apiRequest(`/branches/${staffBranch.id}/manager`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: selectedManagerId }),
      });

      await Promise.all([
        loadBranchStaff(staffBranch.id),
        loadBranches(),
      ]);
    } catch (requestError) {
      setStaffError(
        requestError.message || 'Филиал раҳбарини тайинлаб бўлмади.'
      );
    } finally {
      setStaffSaving(false);
    }
  };

  const removeStaff = async (staff) => {
    if (!staffBranch) return;

    const confirmed = window.confirm(
      `${staff.fullName}ни ${staffBranch.name} филиалидан чиқарасизми?`
    );

    if (!confirmed) return;

    setStaffSaving(true);
    setStaffError('');

    try {
      await apiRequest(
        `/branches/${staffBranch.id}/staff/${staff.id}`,
        { method: 'DELETE' }
      );

      await Promise.all([
        loadBranchStaff(staffBranch.id),
        loadBranches(),
      ]);
    } catch (requestError) {
      setStaffError(
        requestError.message || 'Ходимни филиалдан чиқариб бўлмади.'
      );
    } finally {
      setStaffSaving(false);
    }
  };

  const attachableCandidates = candidates.filter(
    (candidate) =>
      !assignedStaff.some((staff) => staff.id === candidate.id) &&
      candidate.role !== 'SUPER_ADMIN'
  );

  const managerCandidates = assignedStaff.filter(
    (staff) => staff.isActive && staff.role !== 'SUPER_ADMIN'
  );

  return (
    <section className="panel">
      <div className="panel-head dashboard-panel-head">
        <div>
          <h2>Филиаллар</h2>
          <p>Golden Key Info филиаллари ва уларга бириктирилган ходимлар.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={loadBranches}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Янгилаш
          </button>

          {canManage ? (
            <button type="button" className="primary" onClick={openCreate}>
              <Plus size={17} />
              Янги филиал
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="empty">
          <strong>Филиаллар юкланмоқда...</strong>
        </div>
      ) : error ? (
        <div className="page-error dashboard-error">
          <strong>Филиалларни юклаб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={loadBranches}>
            Қайта уриниш
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <Building2 size={42} />
          <strong>Ҳозирча филиал йўқ</strong>
          <span>
            {canManage
              ? 'Биринчи филиални қўшиш учун «Янги филиал»ни босинг.'
              : 'Сизга филиал бириктирилмаган.'}
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            padding: 18,
          }}
        >
          {items.map((branch) => (
            <article
              key={branch.id}
              style={{
                padding: 18,
                border: '1px solid #e7e7e7',
                borderRadius: 13,
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="case-info-icon">
                    <Building2 size={18} />
                  </div>

                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong style={{ fontSize: 16 }}>{branch.name}</strong>
                    <span style={{ color: '#858b94', fontSize: 11 }}>
                      {branch.city || '—'}
                    </span>
                  </div>
                </div>

                {canManage ? (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => openEdit(branch)}
                    title="Таҳрирлаш"
                  >
                    <Pencil size={16} />
                  </button>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 11, marginTop: 18 }}>
                <span style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, color: '#535963' }}>
                  <MapPin size={16} />
                  {branch.address || 'Манзил киритилмаган'}
                </span>

                <span style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, color: '#535963' }}>
                  <Phone size={16} />
                  {branch.phone || 'Телефон киритилмаган'}
                </span>

                <span style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, color: '#535963' }}>
                  <Users size={16} />
                  {branch.employeesCount ?? branch._count?.users ?? 0} нафар ходим
                </span>
              </div>

              <div
                style={{
                  marginTop: 17,
                  paddingTop: 14,
                  borderTop: '1px solid #ededed',
                  display: 'grid',
                  gap: 4,
                }}
              >
                <span style={{ color: '#858b94', fontSize: 10 }}>
                  Филиал раҳбари
                </span>
                <strong style={{ fontSize: 12 }}>
                  {branch.manager?.fullName || 'Тайинланмаган'}
                </strong>
              </div>

              {canManage ? (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
                  onClick={() => openStaff(branch)}
                >
                  <Users size={16} />
                  Ходимларни бошқариш
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="case-modal" style={{ width: 'min(720px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  {editing ? 'Филиални таҳрирлаш' : 'ЯНГИ ФИЛИАЛ'}
                </span>
                <h2>{editing ? 'Филиални таҳрирлаш' : 'Янги филиал'}</h2>
                <p>Филиалнинг асосий маълумотларини киритинг.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => closeModal()}
                disabled={saving}
                aria-label="Ойнани ёпиш"
              >
                <X size={19} />
              </button>
            </div>

            <form className="case-form" onSubmit={submit}>
              <section className="form-section">
                <div className="form-section-title">
                  <strong>Филиал маълумотлари</strong>
                  <span>Номи, шаҳар, манзил ва телефон рақамини киритинг.</span>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Филиал номи *</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Масалан: Қўқон марказ"
                      disabled={saving}
                      autoFocus
                    />
                  </label>

                  <label className="field">
                    <span>Шаҳар *</span>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      placeholder="Масалан: Қўқон"
                      disabled={saving}
                    />
                  </label>

                  <label className="field field-wide">
                    <span>Манзил</span>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="Масалан: Навоий кўчаси, 25-уй"
                      disabled={saving}
                    />
                  </label>

                  <label className="field field-wide">
                    <span>Телефон</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="+998 90 123 45 67"
                      disabled={saving}
                    />
                  </label>
                </div>
              </section>

              {formError ? <div className="form-error">{formError}</div> : null}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => closeModal()} disabled={saving}>
                  Бекор қилиш
                </button>
                <button type="submit" className="primary modal-save" disabled={saving}>
                  {saving ? 'Сақланмоқда...' : editing ? 'Ўзгаришни сақлаш' : 'Сақлаш'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {staffModalOpen && staffBranch ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeStaff();
          }}
        >
          <div className="case-modal" style={{ width: 'min(860px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">ФИЛИАЛ ХОДИМЛАРИ</span>
                <h2>{staffBranch.name}</h2>
                <p>Ходимларни филиалга бириктиринг ва филиал раҳбарини тайинланг.</p>
              </div>
              <button type="button" className="icon-button" onClick={closeStaff} disabled={staffSaving} aria-label="Ойнани ёпиш">
                <X size={19} />
              </button>
            </div>

            <div className="case-form">
              {staffError ? <div className="form-error">{staffError}</div> : null}

              <section className="form-section">
                <div className="form-section-title">
                  <strong>Ходим бириктириш</strong>
                  <span>Филиалга бириктирилмаган фаол ходимлардан танланг.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <label className="field">
                    <span>Ходим</span>
                    <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={staffLoading || staffSaving}>
                      <option value="">Ходимни танланг</option>
                      {attachableCandidates.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.fullName} — {ROLE_LABELS[staff.role] || staff.role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="button" className="primary" onClick={attachStaff} disabled={staffLoading || staffSaving || !selectedStaffId}>
                    <UserPlus size={16} />
                    Бириктириш
                  </button>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-title">
                  <strong>Филиал раҳбари</strong>
                  <span>Янги раҳбар тайинланса, аввалги раҳбар қабул менежери ролига ўтказилади.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <label className="field">
                    <span>Раҳбар</span>
                    <select value={selectedManagerId} onChange={(event) => setSelectedManagerId(event.target.value)} disabled={staffLoading || staffSaving}>
                      <option value="">Раҳбарни танланг</option>
                      {managerCandidates.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.fullName} — {ROLE_LABELS[staff.role] || staff.role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="button" className="primary" onClick={setManager} disabled={staffLoading || staffSaving || !selectedManagerId}>
                    <Crown size={16} />
                    Раҳбар тайинлаш
                  </button>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-title">
                  <strong>Филиалдаги ходимлар</strong>
                  <span>{assignedStaff.length} нафар ходим</span>
                </div>

                {staffLoading ? (
                  <div className="empty"><strong>Ходимлар юкланмоқда...</strong></div>
                ) : assignedStaff.length === 0 ? (
                  <div className="empty">
                    <Users size={34} />
                    <strong>Филиалга ҳали ходим бириктирилмаган</strong>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {assignedStaff.map((staff) => (
                      <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid #ececec', borderRadius: 10 }}>
                        <div style={{ display: 'grid', gap: 3 }}>
                          <strong style={{ fontSize: 13 }}>{staff.fullName}</strong>
                          <span style={{ fontSize: 11, color: '#858b94' }}>
                            {ROLE_LABELS[staff.role] || staff.role}
                            {staff.phone ? ` · ${staff.phone}` : ''}
                          </span>
                        </div>

                        <button type="button" className="secondary-button" onClick={() => removeStaff(staff)} disabled={staffSaving} title="Филиалдан чиқариш">
                          <UserMinus size={15} />
                          Чиқариш
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeStaff} disabled={staffSaving}>
                  Ёпиш
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
