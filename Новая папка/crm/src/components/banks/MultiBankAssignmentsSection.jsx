import React, { useCallback, useEffect, useState } from 'react';
import { Building2, LoaderCircle, Send, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../services/api.js';

const STATUS_LABELS = {
  SENT: 'Юборилган',
  VIEWED: 'Кўрилган',
  UNDER_REVIEW: 'Текширувда',
  NEEDS_DOCUMENTS: 'Ҳужжат кутилмоқда',
  OFFER_SUBMITTED: 'Таклиф берилган',
  REJECTED: 'Рад этилган',
  SELECTED: 'Танланган',
  CLOSED: 'Ёпилган',
};

export function MultiBankAssignmentsSection({ caseId, onChanged }) {
  const [banks, setBanks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [banksData, assignmentsData] = await Promise.all([
        apiRequest('/banks'),
        apiRequest(`/banks/cases/${caseId}/assignments`),
      ]);
      setBanks((banksData.items || []).filter((item) => item.isActive));
      setAssignments(assignmentsData.items || []);
      setSelected((assignmentsData.items || []).filter((item)=>item.status!=='CLOSED').map((item)=>item.bankId));
    } catch (requestError) {
      setError(requestError.message || 'Банклар рўйхатини юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(()=>{load();},[load]);

  const toggle = (bankId) => {
    setSelected((current) =>
      current.includes(bankId)
        ? current.filter((id) => id !== bankId)
        : [...current, bankId]
    );
  };

  const send = async () => {
    if (!selected.length) {
      setError('Камида битта банкни танланг.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/banks/cases/${caseId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ bankIds: selected }),
      });
      await load();
      await onChanged?.();
    } catch (requestError) {
      setError(requestError.message || 'Мурожаатни банкларга юбориб бўлмади.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel details-section">
      <style>{`
        .multi-bank-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:15px}
        .multi-bank-option{display:flex;align-items:center;gap:10px;border:1px solid #e1e5e9;border-radius:11px;background:#fff;padding:12px;text-align:left;cursor:pointer}
        .multi-bank-option.selected{border-color:#e5232f;background:#fff7f7}
        .multi-bank-option>div{display:grid;gap:3px;flex:1}
        .multi-bank-option span{color:#858b93;font-size:11px}
        .multi-bank-status{border-radius:999px;padding:5px 8px;background:#f0f2f4;font-size:9px;font-weight:800}
        .multi-bank-actions{display:flex;justify-content:flex-end;margin-top:14px}
      `}</style>
      <div className="details-section-head">
        <div>
          <span className="section-kicker">Кўп банкли юбориш</span>
          <h3>Мурожаатни банкларга юбориш</h3>
          <p>КАТМ ва гаровни текшириш учун бир нечта банкни танланг.</p>
        </div>
        <Building2 size={21}/>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="details-empty-block"><LoaderCircle className="spin" size={30}/><strong>Банклар юкланмоқда...</strong></div>
      ) : (
        <>
          <div className="multi-bank-grid">
            {banks.map((bank)=>{
              const assignment = assignments.find((item)=>item.bankId===bank.id);
              const active = selected.includes(bank.id);
              return (
                <button type="button" className={`multi-bank-option ${active?'selected':''}`} key={bank.id} onClick={()=>toggle(bank.id)}>
                  {active ? <CheckCircle2 size={20}/> : <Building2 size={20}/>}
                  <div><strong>{bank.shortName || bank.name}</strong><span>{bank.name}</span></div>
                  {assignment ? <span className="multi-bank-status">{STATUS_LABELS[assignment.status] || assignment.status}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="multi-bank-actions">
            <button type="button" className="primary" onClick={send} disabled={saving || !selected.length}>
              {saving?<LoaderCircle className="spin" size={17}/>:<Send size={17}/>}
              {saving?'Юборилмоқда...':'Танланган банкларга юбориш'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
