import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { apiRequest, USER_KEY } from '../../services/api.js';
import { BankOfferCard } from './BankOfferCard.jsx';
import { BankOfferModal } from './BankOfferModal.jsx';

const CREATE = ['SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'RECEPTION_MANAGER', 'BANK_EMPLOYEE'];
const UPDATE = ['SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'RECEPTION_MANAGER', 'BANK_EMPLOYEE'];
const SELECT = ['SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'RECEPTION_MANAGER'];
const DELETE = ['SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER'];

function currentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function payload(form) {
  const data = { ...form, bankName: form.bankName.trim(), conditions: form.conditions.trim(), rejectionReason: form.rejectionReason.trim() };
  for (const key of ['interestRate','termMonths','approvedAmount','initialPayment','monthlyPayment','insuranceAmount','commissionAmount','validUntil','conditions','rejectionReason']) {
    if (data[key] === '') data[key] = null;
  }
  return data;
}

export function BankOffersSection({ caseId, onCaseChanged }) {
  const user = useMemo(() => currentUser(), []);
  const role = user?.role || '';
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await apiRequest(`/bank-offers/case/${caseId}`);
      setOffers(Array.isArray(data.items) ? data.items : []);
      setSelectedOffer(data.selectedOffer || null);
    } catch (error) {
      setPageError(error.message || 'Банк таклифларини юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setSaving(true);
    setModalError('');
    try {
      if (editingOffer) {
        await apiRequest(`/bank-offers/${editingOffer.id}`, { method: 'PATCH', body: JSON.stringify(payload(form)) });
      } else {
        await apiRequest(`/bank-offers/case/${caseId}`, { method: 'POST', body: JSON.stringify(payload(form)) });
      }
      setModalOpen(false);
      setEditingOffer(null);
      await load();
      await onCaseChanged?.();
    } catch (error) {
      setModalError(error.message || 'Таклифни сақлаб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  const choose = async (offer) => {
    if (!window.confirm(`${offer.bankName} банк таклифини танлашни тасдиқлайсизми?`)) return;
    setBusyId(offer.id);
    try {
      await apiRequest(`/bank-offers/${offer.id}/select`, { method: 'POST' });
      await load();
      await onCaseChanged?.();
    } catch (error) {
      setPageError(error.message || 'Таклифни танлаб бўлмади.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (offer) => {
    if (!window.confirm(`${offer.bankName} банк таклифини ўчиришни тасдиқлайсизми?`)) return;
    setBusyId(offer.id);
    try {
      await apiRequest(`/bank-offers/${offer.id}`, { method: 'DELETE' });
      await load();
      await onCaseChanged?.();
    } catch (error) {
      setPageError(error.message || 'Таклифни ўчириб бўлмади.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <section className="panel details-section bank-offers-section">
        <div className="details-section-head bank-offers-head">
          <div><span className="section-kicker">Банклар</span><h3>Банк таклифлари</h3><p>Жами {offers.length} та таклиф{selectedOffer ? ` · Танланган: ${selectedOffer.bankName}` : ''}</p></div>
          <div className="bank-offers-head-actions">
            <button type="button" className="bank-offers-refresh" onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
            {CREATE.includes(role) ? <button type="button" className="bank-offers-create" onClick={() => { setEditingOffer(null); setModalError(''); setModalOpen(true); }}><Plus size={17} />Таклиф қўшиш</button> : null}
          </div>
        </div>

        {pageError ? <div className="bank-offers-error"><strong>Хато</strong><span>{pageError}</span><button type="button" onClick={load}>Қайта уриниш</button></div>
        : loading ? <div className="bank-offers-loading"><LoaderCircle className="spin" size={31} /><strong>Банк таклифлари юкланмоқда...</strong></div>
        : offers.length === 0 ? <div className="bank-offers-empty"><Landmark size={36} /><strong>Банк таклифлари ҳали йўқ</strong><span>Биринчи таклифни қўшинг.</span>{CREATE.includes(role) ? <button type="button" onClick={() => setModalOpen(true)}><Plus size={16} />Таклиф қўшиш</button> : null}</div>
        : <div className="bank-offers-grid">{offers.map((offer) => <BankOfferCard key={offer.id} offer={offer} busy={busyId === offer.id} canManage={UPDATE.includes(role) && (role !== 'BANK_EMPLOYEE' || offer.bankEmployeeId === user?.id)} canSelect={SELECT.includes(role)} canDelete={DELETE.includes(role)} onEdit={(value) => { setEditingOffer(value); setModalError(''); setModalOpen(true); }} onSelect={choose} onDelete={remove} />)}</div>}
      </section>

      <BankOfferModal open={modalOpen} offer={editingOffer} saving={saving} error={modalError} onClose={() => { if (!saving) { setModalOpen(false); setEditingOffer(null); setModalError(''); } }} onSubmit={save} />
    </>
  );
}
