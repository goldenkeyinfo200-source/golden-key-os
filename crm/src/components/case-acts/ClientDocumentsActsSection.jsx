import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  LoaderCircle,
  PackageCheck,
  QrCode,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { apiRequest } from '../../services/api.js';

const KIND_OPTIONS = [
  ['ORIGINAL', 'Оригинал'],
  ['COPY', 'Нусха'],
  ['NOTARIZED_COPY', 'Нотариал нусха'],
  ['ELECTRONIC_COPY', 'Электрон нусха'],
  ['OTHER', 'Бошқа'],
];

const DIRECTION_DEFAULTS = {
  SELL: [
    'Объект ва тақдим этилган ҳужжатлар бўйича маълумотлар йиғилди',
    'Объектни реклама ва тақдимот қилиш ишлари амалга оширилди',
    'Харидорларни излаш ва кўрикларни ташкил этиш ишлари бажарилди',
    'Музокара ва битимга тайёргарлик жараёнига кўмаклашилди',
  ],
  BUY: [
    'Мижоз талабига мос кўчмас мулк вариантлари изланди',
    'Объект вариантлари тақдим этилди ва кўриклар ташкил этилди',
    'Сотувчи билан музокараларга кўмаклашилди',
    'Битимни расмийлаштиришга тайёргарлик жараёни мувофиқлаштирилди',
  ],
  RENT_OUT: [
    'Объектни ижарага таклиф қилиш учун маълумотлар тайёрланди',
    'Ижарачиларни излаш ва объект кўриклари ташкил этилди',
    'Ижара шартлари бўйича музокараларга кўмаклашилди',
    'Ижара муносабатларини расмийлаштиришга кўмаклашилди',
  ],
  RENT_IN: [
    'Мижоз талабига мос ижара объектлари изланди',
    'Вариантлар тақдим этилди ва кўриклар ташкил этилди',
    'Ижара берувчи билан музокараларга кўмаклашилди',
    'Ижара муносабатларини расмийлаштиришга кўмаклашилди',
  ],
  NOTARY_DOCUMENTS: [
    'Нотариал расмийлаштириш учун зарур ҳужжатлар рўйхати аниқланди',
    'Тақдим этилган ҳужжатлар жамланди ва тартибга солинди',
    'Етишмайдиган ҳужжатлар бўйича мижозга ахборот берилди',
    'Нотариусга тақдим этиш жараёни ташкилий жиҳатдан мувофиқлаштирилди',
  ],
  CADASTRE_ASSISTANCE: [
    'Кадастрга оид мавжуд ҳужжатлар жамланди',
    'Кадастр жараёни учун зарур ҳужжатларни тайёрлашга кўмаклашилди',
    'Ваколатли органга мурожаат қилиш жараёни мувофиқлаштирилди',
    'Жараён ҳолати бўйича мижозга ахборот берилди',
  ],
  INHERITANCE_ASSISTANCE: [
    'Мерос иши учун зарур ҳужжатлар рўйхати аниқланди',
    'Мижоз тақдим этган ҳужжатлар жамланди ва тартибга солинди',
    'Нотариус ва бошқа ваколатли ташкилотларга мурожаат қилиш жараёни мувофиқлаштирилди',
    'Жараён босқичлари бўйича мижозга ахборот берилди',
  ],
};

function directionCode(caseItem) {
  return String(caseItem?.nextAction || '')
    .match(/Риэлторлик йўналиши:\s*([A-Z_]+)/)?.[1] || '';
}

function fmt(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function statusLabel(status) {
  return ({
    DRAFT: 'Қоралама',
    READY_TO_SIGN: 'QR тасдиқ кутилмоқда',
    SIGNED: 'Тасдиқланган',
    CANCELLED: 'Бекор қилинган',
    ARCHIVED: 'Архивланган',
  })[status] || status;
}

export function ClientDocumentsActsSection({ caseId, caseItem, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState([]);
  const [qr, setQr] = useState(null);

  const [documentForm, setDocumentForm] = useState({
    name: '',
    series: '',
    number: '',
    kind: 'ORIGINAL',
    quantity: 1,
    conditionOnReceipt: 'Бут, ташқи шикастланишсиз',
    notes: '',
  });

  const defaults = useMemo(() => {
    const code = directionCode(caseItem);
    return DIRECTION_DEFAULTS[code] || [
      'Шартнома доирасида келишилган хизматлар бажарилди',
    ];
  }, [caseItem]);

  const [completionItems, setCompletionItems] = useState(defaults);

  useEffect(() => {
    setCompletionItems(defaults);
  }, [defaults]);

  const [completionSummary, setCompletionSummary] = useState('');

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/case-acts/case/${caseId}`);
      setData(response.item || null);
    } catch (e) {
      setError(e.message || 'Далолатнома маълумотларини юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const documents = data?.documents || [];
  const handovers = data?.handovers || [];
  const completionActs = data?.completionActs || [];

  const toggle = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const addDocument = async (event) => {
    event.preventDefault();
    if (!documentForm.name.trim()) return;

    setBusy('document');
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/case-acts/case/${caseId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          ...documentForm,
          quantity: Number(documentForm.quantity || 1),
        }),
      });
      setDocumentForm({
        name: '',
        series: '',
        number: '',
        kind: 'ORIGINAL',
        quantity: 1,
        conditionOnReceipt: 'Бут, ташқи шикастланишсиз',
        notes: '',
      });
      setSuccess('Ҳужжат рўйхатга қўшилди.');
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e.message || 'Ҳужжатни қўшиб бўлмади.');
    } finally {
      setBusy('');
    }
  };

  const removeDocument = async (id) => {
    if (!window.confirm('Ушбу ҳужжатни рўйхатдан ўчиришни тасдиқлайсизми?')) {
      return;
    }

    setBusy(`delete-${id}`);
    setError('');
    try {
      await apiRequest(`/case-acts/documents/${id}`, { method: 'DELETE' });
      setSelected((current) => current.filter((x) => x !== id));
      await load();
    } catch (e) {
      setError(e.message || 'Ҳужжатни ўчириб бўлмади.');
    } finally {
      setBusy('');
    }
  };

  const createHandover = async (type) => {
    if (!selected.length) {
      setError('Камида битта ҳужжатни белгиланг.');
      return;
    }

    setBusy(`handover-${type}`);
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/case-acts/case/${caseId}/handovers`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          documentItemIds: selected,
        }),
      });
      setSelected([]);
      setSuccess(
        type === 'RECEIPT'
          ? 'Қабул қилиш далолатномаси тайёрланди.'
          : 'Қайтариш далолатномаси тайёрланди.'
      );
      await load();
    } catch (e) {
      setError(e.message || 'Далолатномани тайёрлаб бўлмади.');
    } finally {
      setBusy('');
    }
  };

  const createQr = async (kind, id) => {
    setBusy(`qr-${id}`);
    setError('');
    setQr(null);
    try {
      const path =
        kind === 'handover'
          ? `/case-acts/handovers/${id}/qr`
          : `/case-acts/completion-acts/${id}/qr`;

      const response = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify({ expiresInMinutes: 15 }),
      });

      setQr(response.item || null);
    } catch (e) {
      setError(e.message || 'QR-кодни яратиб бўлмади.');
    } finally {
      setBusy('');
    }
  };

  const updateCompletionItem = (index, value) => {
    setCompletionItems((current) =>
      current.map((item, i) => (i === index ? value : item))
    );
  };

  const createCompletion = async () => {
    const items = completionItems
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title) => ({ title, completed: true }));

    if (!items.length) {
      setError('Камида битта бажарилган ишни киритинг.');
      return;
    }

    setBusy('completion');
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/case-acts/case/${caseId}/completion-acts`, {
        method: 'POST',
        body: JSON.stringify({
          summary: completionSummary.trim() || null,
          items,
        }),
      });
      setSuccess('Бажарилган ишлар далолатномаси тайёрланди.');
      await load();
    } catch (e) {
      setError(e.message || 'Бажарилган ишлар далолатномасини тайёрлаб бўлмади.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <section className="panel details-section">
        <LoaderCircle className="spin" size={28} />
        <strong>Ҳужжатлар ва далолатномалар юкланмоқда...</strong>
      </section>
    );
  }

  return (
    <section className="panel details-section gk-acts-section">
      <style>{`
        .gk-acts-section{display:grid;gap:22px}
        .gk-act-block{border:1px solid #e4e7eb;border-radius:14px;padding:16px;display:grid;gap:14px}
        .gk-act-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .gk-act-title h4{margin:0;font-size:16px}.gk-act-title p{margin:4px 0 0;color:#727983;font-size:12px;line-height:1.45}
        .gk-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
        .gk-form-grid label,.gk-act-block>label{display:grid;gap:6px;font-size:12px;font-weight:700;color:#555c65}
        .gk-form-grid input,.gk-form-grid select,.gk-act-block textarea,.gk-act-block input{width:100%;border:1px solid #dfe3e8;border-radius:10px;padding:10px 11px;font:inherit;box-sizing:border-box}
        .gk-act-actions{display:flex;flex-wrap:wrap;gap:8px}
        .gk-act-btn{border:0;border-radius:10px;padding:10px 13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
        .gk-act-btn.primary{background:#e5232f;color:#fff}.gk-act-btn.secondary{background:#f1f3f5;color:#202327}.gk-act-btn:disabled{opacity:.55;cursor:not-allowed}
        .gk-doc-list{display:grid;gap:8px}.gk-doc-row{display:flex;gap:10px;align-items:flex-start;border:1px solid #eceff2;border-radius:10px;padding:10px}
        .gk-doc-row.returned{opacity:.68;background:#f7f8f9}.gk-doc-main{flex:1;display:grid;gap:3px}.gk-doc-main small{color:#777f89}
        .gk-act-history{display:grid;gap:8px}.gk-act-card{border:1px solid #eceff2;border-radius:10px;padding:11px;display:flex;justify-content:space-between;gap:12px;align-items:center}
        .gk-act-card>div{display:grid;gap:3px}.gk-act-card small{color:#777f89}
        .gk-status-signed{color:#087742;font-weight:800}.gk-status-wait{color:#9a6700;font-weight:800}
        .gk-qr-box{border:2px solid #e5232f;border-radius:14px;padding:16px;text-align:center;background:#fff8f8}
        .gk-qr-box img{width:min(300px,100%);height:auto}.gk-qr-box a{display:block;margin-top:8px;word-break:break-all;font-size:12px}
        .gk-completion-list{display:grid;gap:8px}.gk-completion-row{display:flex;gap:8px;align-items:center}.gk-completion-row input{flex:1}
        .gk-mini-delete{border:0;background:transparent;color:#b4232d;cursor:pointer;padding:5px}
        @media(max-width:700px){.gk-act-actions{display:grid}.gk-act-btn{justify-content:center;width:100%}.gk-act-card{align-items:flex-start;flex-direction:column}}
      `}</style>

      <div className="details-section-head">
        <div>
          <span className="section-kicker">Юридик ҳужжатлар</span>
          <h3>Ҳужжатларни қабул қилиш, қайтариш ва бажарилган ишлар</h3>
          <p>
            Мижоздан олинган ҳужжатлар рўйхати ва QR орқали тасдиқланадиган
            далолатномалар.
          </p>
        </div>
        <ClipboardCheck size={22} />
      </div>

      {error ? <div className="form-error">{error}</div> : null}
      {success ? <div className="form-success">{success}</div> : null}

      <div className="gk-act-block">
        <div className="gk-act-title">
          <div>
            <h4>1. Мижоздан олинган ҳужжатлар</h4>
            <p>Оригинал ва нусхаларни алоҳида рўйхатга олинг.</p>
          </div>
          <FilePlus2 size={22} />
        </div>

        <form onSubmit={addDocument}>
          <div className="gk-form-grid">
            <label>
              Ҳужжат номи
              <input
                value={documentForm.name}
                onChange={(e) =>
                  setDocumentForm((x) => ({ ...x, name: e.target.value }))
                }
                placeholder="Масалан: Кадастр паспорти"
                required
              />
            </label>

            <label>
              Тур
              <select
                value={documentForm.kind}
                onChange={(e) =>
                  setDocumentForm((x) => ({ ...x, kind: e.target.value }))
                }
              >
                {KIND_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              Серия
              <input
                value={documentForm.series}
                onChange={(e) =>
                  setDocumentForm((x) => ({ ...x, series: e.target.value }))
                }
              />
            </label>

            <label>
              Рақами
              <input
                value={documentForm.number}
                onChange={(e) =>
                  setDocumentForm((x) => ({ ...x, number: e.target.value }))
                }
              />
            </label>

            <label>
              Дона
              <input
                type="number"
                min="1"
                value={documentForm.quantity}
                onChange={(e) =>
                  setDocumentForm((x) => ({ ...x, quantity: e.target.value }))
                }
              />
            </label>

            <label>
              Қабул қилингандаги ҳолати
              <input
                value={documentForm.conditionOnReceipt}
                onChange={(e) =>
                  setDocumentForm((x) => ({
                    ...x,
                    conditionOnReceipt: e.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="gk-act-actions" style={{ marginTop: 10 }}>
            <button
              className="gk-act-btn primary"
              type="submit"
              disabled={busy === 'document'}
            >
              {busy === 'document' ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <FilePlus2 size={16} />
              )}
              Ҳужжатни қўшиш
            </button>
          </div>
        </form>

        <div className="gk-doc-list">
          {documents.length ? documents.map((doc) => (
            <div
              className={`gk-doc-row ${doc.status === 'RETURNED' ? 'returned' : ''}`}
              key={doc.id}
            >
              <input
                type="checkbox"
                checked={selected.includes(doc.id)}
                disabled={doc.status === 'RETURNED'}
                onChange={() => toggle(doc.id)}
              />
              <FileText size={18} />
              <div className="gk-doc-main">
                <strong>{doc.name}</strong>
                <small>
                  {KIND_OPTIONS.find(([v]) => v === doc.kind)?.[1] || doc.kind}
                  {' · '}{doc.quantity} дона
                  {doc.series || doc.number
                    ? ` · ${[doc.series, doc.number].filter(Boolean).join(' ')}`
                    : ''}
                  {' · '}{doc.status === 'RETURNED' ? 'Қайтарилган' : 'Олинган'}
                </small>
                <small>Қабул қилинган: {fmt(doc.receivedAt, true)}</small>
                {doc.returnedAt ? (
                  <small>Қайтарилган: {fmt(doc.returnedAt, true)}</small>
                ) : null}
              </div>

              <button
                type="button"
                className="gk-mini-delete"
                title="Ўчириш"
                disabled={busy === `delete-${doc.id}`}
                onClick={() => removeDocument(doc.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          )) : (
            <div className="details-empty-block">
              <FileText size={28} />
              <strong>Ҳали ҳужжат қабул қилинмаган</strong>
              <span>Мижоздан олинган ҳужжатларни юқорида киритинг.</span>
            </div>
          )}
        </div>

        <div className="gk-act-actions">
          <button
            type="button"
            className="gk-act-btn primary"
            disabled={!selected.length || busy === 'handover-RECEIPT'}
            onClick={() => createHandover('RECEIPT')}
          >
            <PackageCheck size={16} />
            Қабул қилиш далолатномасини тайёрлаш
          </button>

          <button
            type="button"
            className="gk-act-btn secondary"
            disabled={!selected.length || busy === 'handover-RETURN'}
            onClick={() => createHandover('RETURN')}
          >
            <RotateCcw size={16} />
            Қайтариш далолатномасини тайёрлаш
          </button>
        </div>
      </div>

      <div className="gk-act-block">
        <div className="gk-act-title">
          <div>
            <h4>2. Ҳужжатлар бўйича далолатномалар</h4>
            <p>Тайёр далолатномани QR орқали мижозга тасдиқлатинг.</p>
          </div>
          <QrCode size={22} />
        </div>

        <div className="gk-act-history">
          {handovers.length ? handovers.map((act) => (
            <div className="gk-act-card" key={act.id}>
              <div>
                <strong>{act.displayId}</strong>
                <small>
                  {act.type === 'RECEIPT'
                    ? 'Ҳужжатларни қабул қилиш'
                    : 'Ҳужжатларни қайтариш'}
                  {' · '}{act.items?.length || 0} та ҳужжат
                </small>
                <span className={act.status === 'SIGNED' ? 'gk-status-signed' : 'gk-status-wait'}>
                  {statusLabel(act.status)}
                </span>
              </div>

              <div className="gk-act-actions">
                {act.status !== 'SIGNED' ? (
                  <button
                    type="button"
                    className="gk-act-btn primary"
                    disabled={busy === `qr-${act.id}`}
                    onClick={() => createQr('handover', act.id)}
                  >
                    <QrCode size={16} />
                    QR чиқариш
                  </button>
                ) : null}

                {act.pdfUrl ? (
                  <a
                    className="gk-act-btn secondary"
                    href={act.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF очиш
                  </a>
                ) : null}
              </div>
            </div>
          )) : (
            <div className="details-empty-block">
              <FileText size={28} />
              <strong>Далолатнома йўқ</strong>
              <span>Ҳужжатларни белгилаб, қабул ёки қайтариш далолатномасини тайёрланг.</span>
            </div>
          )}
        </div>
      </div>

      <div className="gk-act-block">
        <div className="gk-act-title">
          <div>
            <h4>3. Бажарилган ишлар далолатномаси</h4>
            <p>Амалга оширилган ишларни текшириб, керак бўлса таҳрирланг.</p>
          </div>
          <CheckCircle2 size={22} />
        </div>

        <div className="gk-completion-list">
          {completionItems.map((value, index) => (
            <div className="gk-completion-row" key={index}>
              <input
                value={value}
                onChange={(e) => updateCompletionItem(index, e.target.value)}
              />
              <button
                type="button"
                className="gk-mini-delete"
                onClick={() =>
                  setCompletionItems((current) =>
                    current.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="gk-act-btn secondary"
          onClick={() => setCompletionItems((current) => [...current, ''])}
        >
          + Яна иш қўшиш
        </button>

        <label>
          Умумий изоҳ
          <textarea
            rows={3}
            value={completionSummary}
            onChange={(e) => setCompletionSummary(e.target.value)}
            placeholder="Зарур бўлса қўшимча изоҳ..."
          />
        </label>

        <div className="gk-act-actions">
          <button
            type="button"
            className="gk-act-btn primary"
            disabled={busy === 'completion'}
            onClick={createCompletion}
          >
            <ClipboardCheck size={16} />
            Бажарилган ишлар далолатномасини тайёрлаш
          </button>
        </div>

        <div className="gk-act-history">
          {completionActs.map((act) => (
            <div className="gk-act-card" key={act.id}>
              <div>
                <strong>{act.displayId}</strong>
                <small>{act.serviceDirection || act.serviceType} · {act.items?.length || 0} та иш</small>
                <span className={act.status === 'SIGNED' ? 'gk-status-signed' : 'gk-status-wait'}>
                  {statusLabel(act.status)}
                </span>
              </div>

              <div className="gk-act-actions">
                {act.status !== 'SIGNED' ? (
                  <button
                    type="button"
                    className="gk-act-btn primary"
                    disabled={busy === `qr-${act.id}`}
                    onClick={() => createQr('completion', act.id)}
                  >
                    <QrCode size={16} />
                    QR чиқариш
                  </button>
                ) : null}

                {act.pdfUrl ? (
                  <a
                    className="gk-act-btn secondary"
                    href={act.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF очиш
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {qr ? (
        <div className="gk-qr-box">
          <strong>Мижоз скан қилиши учун QR-код</strong>
          <div>
            <img src={qr.qrDataUrl} alt="QR" />
          </div>
          <small>Амал қилиш муддати: {fmt(qr.expiresAt, true)}</small>
          <a href={qr.signUrl} target="_blank" rel="noreferrer">
            {qr.signUrl}
          </a>
          <div className="gk-act-actions" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button
              type="button"
              className="gk-act-btn secondary"
              onClick={() => setQr(null)}
            >
              Ёпиш
            </button>
            <button
              type="button"
              className="gk-act-btn secondary"
              onClick={load}
            >
              <RotateCcw size={16} />
              Ҳолатни янгилаш
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
