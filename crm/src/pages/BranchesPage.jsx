import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Pencil, Phone, Plus, RefreshCw, Users, X } from 'lucide-react';

import { apiRequest } from '../services/api.js';

const EMPTY_FORM = { name: '', city: '', address: '', phone: '' };

export function BranchesPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
    } catch (err) {
      setError(err.message || 'Филиалларни юклаб бўлмади.');
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

  const closeModal = () => {
    if (saving) return;
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

      closeModal();
      await loadBranches();
    } catch (err) {
      setFormError(err.message || 'Филиални сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head dashboard-panel-head">
        <div>
          <h2>Филиаллар</h2>
          <p>Golden Key Info филиаллари ва уларга бириктирилган ходимлар.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="text-button" onClick={loadBranches} disabled={loading}>
            <RefreshCw size={17} /> Янгилаш
          </button>
          {canManage ? (
            <button type="button" className="primary" onClick={openCreate}>
              <Plus size={18} /> Янги филиал
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="empty"><strong>Филиаллар юкланмоқда...</strong></div>
      ) : error ? (
        <div className="page-error dashboard-error">
          <strong>Филиалларни юклаб бўлмади</strong>
          <span>{error}</span>
          <button type="button" onClick={loadBranches}>Қайта уриниш</button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <Building2 size={42} />
          <strong>Ҳозирча филиал йўқ</strong>
          <span>{canManage ? 'Биринчи филиални қўшиш учун «Янги филиал»ни босинг.' : 'Сизга филиал бириктирилмаган.'}</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((branch) => (
            <article key={branch.id} className="panel" style={{ margin: 0, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Building2 size={28} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 18 }}>{branch.name}</strong>
                    <span>{branch.city || '—'}</span>
                  </div>
                </div>
                {canManage ? (
                  <button type="button" className="text-button" onClick={() => openEdit(branch)} title="Таҳрирлаш">
                    <Pencil size={17} />
                  </button>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={17} /> {branch.address || 'Манзил киритилмаган'}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Phone size={17} /> {branch.phone || 'Телефон киритилмаган'}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Users size={17} /> {branch.employeesCount ?? branch._count?.users ?? 0} нафар ходим</span>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(148,163,184,.22)' }}>
                <span style={{ display: 'block', fontSize: 13, opacity: .7 }}>Филиал раҳбари</span>
                <strong>{branch.manager?.fullName || 'Тайинланмаган'}</strong>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-card" style={{ maxWidth: 560, width: 'calc(100% - 32px)' }}>
            <div className="panel-head">
              <div>
                <h2>{editing ? 'Филиални таҳрирлаш' : 'Янги филиал'}</h2>
                <p>Филиалнинг асосий маълумотларини киритинг.</p>
              </div>
              <button type="button" className="text-button" onClick={closeModal} disabled={saving}><X size={20} /></button>
            </div>

            <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
              <label>
                <span>Филиал номи *</span>
                <input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Масалан: Қўқон марказ" disabled={saving} />
              </label>
              <label>
                <span>Шаҳар *</span>
                <input value={form.city} onChange={(e) => setForm((v) => ({ ...v, city: e.target.value }))} placeholder="Қўқон" disabled={saving} />
              </label>
              <label>
                <span>Манзил</span>
                <input value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} placeholder="Филиал манзили" disabled={saving} />
              </label>
              <label>
                <span>Телефон</span>
                <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="+998 ..." disabled={saving} />
              </label>

              {formError ? <div className="login-error">{formError}</div> : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="text-button" onClick={closeModal} disabled={saving}>Бекор қилиш</button>
                <button type="submit" className="primary" disabled={saving}>{saving ? 'Сақланмоқда...' : 'Сақлаш'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
