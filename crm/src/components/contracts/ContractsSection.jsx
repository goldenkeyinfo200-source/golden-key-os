import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  FilePlus2,
  FileText,
  LoaderCircle,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react';

import { apiRequest } from '../../services/api.js';

const STATUS_LABELS = {
  DRAFT: 'Қоралама',
  READY_TO_SIGN: 'Тасдиқлашга тайёр',
  SIGNED: 'Тасдиқланган',
  CANCELLED: 'Бекор қилинган',
};

function formatDate(value, withTime = false) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(date);
}

function statusClass(status) {
  if (status === 'SIGNED') return 'contract-status-signed';
  if (status === 'CANCELLED') return 'contract-status-cancelled';
  return 'contract-status-pending';
}

export function ContractsSection({ caseId, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [creating, setCreating] = useState(false);

  const [qrModal, setQrModal] = useState(null);
  const [qrLoadingId, setQrLoadingId] = useState('');
  const [qrError, setQrError] = useState('');

  const [pdfLoadingId, setPdfLoadingId] = useState('');
  const [pdfMessage, setPdfMessage] = useState('');
  const [pdfError, setPdfError] = useState('');

  const loadContracts = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setPageError('');

    try {
      const data = await apiRequest(`/contracts/case/${caseId}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setPageError(error.message || 'Шартномаларни юклаб бўлмади.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  useEffect(() => {
    if (!qrModal) return undefined;

    const closeWithEscape = (event) => {
      if (event.key === 'Escape') {
        setQrModal(null);
        setQrError('');
      }
    };

    document.addEventListener('keydown', closeWithEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', closeWithEscape);
      document.body.style.overflow = '';
    };
  }, [qrModal]);

  const createContract = async () => {
    setCreating(true);
    setPageError('');

    try {
      const data = await apiRequest(`/contracts/case/${caseId}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await loadContracts();
      await onChanged?.();

      if (data.item?.id) {
        await createQr(data.item.id);
      }
    } catch (error) {
      setPageError(error.message || 'Шартномани яратиб бўлмади.');
    } finally {
      setCreating(false);
    }
  };

  const createQr = async (contractId) => {
    setQrLoadingId(contractId);
    setQrError('');

    try {
      const data = await apiRequest(`/contracts/${contractId}/qr`, {
        method: 'POST',
        body: JSON.stringify({
          expiresInMinutes: 15,
        }),
      });

      setQrModal(data);
    } catch (error) {
      setQrError(error.message || 'QR-кодни яратиб бўлмади.');
    } finally {
      setQrLoadingId('');
    }
  };

  const createPdf = async (contractId) => {
    setPdfLoadingId(contractId);
    setPdfMessage('');
    setPdfError('');

    try {
      const data = await apiRequest(`/contracts/${contractId}/pdf`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await loadContracts();
      await onChanged?.();

      const telegram = data.item?.telegram;

      if (telegram?.sent) {
        setPdfMessage('PDF тайёрланди ва мижозга Telegram орқали юборилди.');
      } else if (telegram?.skipped) {
        setPdfMessage(
          `PDF тайёрланди. Telegram юборилмади: ${
            telegram.reason || 'Telegram ID ёки бот токени йўқ'
          }.`
        );
      } else {
        setPdfMessage('PDF муваффақиятли тайёрланди.');
      }
    } catch (error) {
      setPdfError(error.message || 'PDF шартномани тайёрлаб бўлмади.');
    } finally {
      setPdfLoadingId('');
    }
  };

  const latestInvitation = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      map.set(item.id, item.invitations?.[0] || null);
    });

    return map;
  }, [items]);

  return (
    <>
      <section className="panel details-section contracts-section">
        <div className="details-section-head contracts-head">
          <div>
            <span className="section-kicker">Шартномалар</span>
            <h3>Мижоз билан тузилган шартномалар</h3>
            <p>Жами {items.length} та шартнома</p>
          </div>

          <div className="contracts-head-actions">
            <button
              type="button"
              className="contracts-refresh"
              onClick={loadContracts}
              disabled={loading}
              title="Янгилаш"
            >
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>

            <button
              type="button"
              className="contracts-create"
              onClick={createContract}
              disabled={creating}
            >
              {creating ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <FilePlus2 size={17} />
              )}
              {creating ? 'Яратилмоқда...' : 'Шартнома яратиш'}
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="contracts-error">
            <strong>Хато</strong>
            <span>{pageError}</span>
            <button type="button" onClick={loadContracts}>
              Қайта уриниш
            </button>
          </div>
        ) : loading ? (
          <div className="contracts-loading">
            <LoaderCircle size={31} className="spin" />
            <strong>Шартномалар юкланмоқда...</strong>
          </div>
        ) : items.length === 0 ? (
          <div className="contracts-empty">
            <FileText size={36} />
            <strong>Шартнома ҳали яратилмаган</strong>
            <span>
              Мижоз маълумотлари ва танланган банк таклифи асосида шартнома
              автоматик яратилади.
            </span>
            <button type="button" onClick={createContract} disabled={creating}>
              <FilePlus2 size={16} />
              Биринчи шартномани яратиш
            </button>
          </div>
        ) : (
          <div className="contracts-list">
            {items.map((contract) => {
              const invitation = latestInvitation.get(contract.id);
              const signed = contract.status === 'SIGNED';

              return (
                <article className="contract-card" key={contract.id}>
                  <div className="contract-card-icon">
                    {signed ? (
                      <CheckCircle2 size={23} />
                    ) : (
                      <FileText size={23} />
                    )}
                  </div>

                  <div className="contract-card-main">
                    <div className="contract-card-title">
                      <strong>{contract.displayId}</strong>

                      <span
                        className={`contract-status ${statusClass(
                          contract.status
                        )}`}
                      >
                        {STATUS_LABELS[contract.status] || contract.status}
                      </span>
                    </div>

                    <span className="contract-card-meta">
                      {contract.template?.name || 'Асосий шартнома'} ·{' '}
                      {formatDate(contract.createdAt, true)}
                    </span>

                    {signed ? (
                      <span className="contract-signed-note">
                        <CheckCircle2 size={14} />
                        Мижоз томонидан {formatDate(contract.signedAt, true)} да
                        тасдиқланган
                      </span>
                    ) : invitation ? (
                      <span className="contract-invitation-note">
                        <Clock3 size={14} />
                        Охирги QR: {formatDate(invitation.createdAt, true)}
                      </span>
                    ) : null}
                  </div>

                  <div className="contract-card-actions">
                    {contract.pdfUrl ? (
                      <>
                        <a
                          className="contract-action contract-pdf-view"
                          href={contract.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText size={16} />
                          PDF кўриш
                        </a>

                        <a
                          className="contract-action"
                          href={contract.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={`${contract.displayId}.pdf`}
                          title="PDF ни юклаб олиш"
                        >
                          <Download size={16} />
                        </a>
                      </>
                    ) : signed ? (
                      <button
                        type="button"
                        className="contract-action contract-pdf-button"
                        onClick={() => createPdf(contract.id)}
                        disabled={pdfLoadingId === contract.id}
                      >
                        {pdfLoadingId === contract.id ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                        {pdfLoadingId === contract.id
                          ? 'PDF тайёрланмоқда...'
                          : 'PDF тайёрлаш'}
                      </button>
                    ) : null}

                    {!signed && contract.status !== 'CANCELLED' ? (
                      <button
                        type="button"
                        className="contract-action contract-qr-button"
                        onClick={() => createQr(contract.id)}
                        disabled={qrLoadingId === contract.id}
                      >
                        {qrLoadingId === contract.id ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <QrCode size={16} />
                        )}
                        QR чиқариш
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {qrError ? <div className="contract-inline-error">{qrError}</div> : null}
        {pdfError ? (
          <div className="contract-inline-error">{pdfError}</div>
        ) : null}
        {pdfMessage ? (
          <div className="contract-inline-success">{pdfMessage}</div>
        ) : null}
      </section>

      {qrModal ? (
        <div
          className="contract-qr-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQrModal(null);
              setQrError('');
            }
          }}
        >
          <section className="contract-qr-modal" role="dialog" aria-modal="true">
            <div className="contract-qr-head">
              <div>
                <span>Бир марталик тасдиқлаш</span>
                <h3>{qrModal.contractDisplayId}</h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQrModal(null);
                  setQrError('');
                }}
                aria-label="Ойнани ёпиш"
              >
                <X size={20} />
              </button>
            </div>

            <div className="contract-qr-body">
              <div className="contract-qr-image">
                <img src={qrModal.qrDataUrl} alt="Шартномани тасдиқлаш QR-коди" />
              </div>

              <strong>Мижоз ўз телефони билан QR-кодни сканерласин</strong>

              <p>
                QR-код бир марта ишлайди ва{' '}
                <b>{formatDate(qrModal.expiresAt, true)}</b> гача амал қилади.
              </p>

              <a href={qrModal.signUrl} target="_blank" rel="noreferrer">
                Телефон саҳифасини тест учун очиш
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
