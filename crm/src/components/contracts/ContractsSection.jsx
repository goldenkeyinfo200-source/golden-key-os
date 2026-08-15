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

  const [kiosks, setKiosks] = useState([]);
  const [kioskPicker, setKioskPicker] = useState(null);
  const [kioskLoading, setKioskLoading] = useState(false);

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

  const loadKiosks = useCallback(async () => {
    setKioskLoading(true);

    try {
      const data = await apiRequest('/kiosks');
      setKiosks(Array.isArray(data.items) ? data.items : []);
    } catch {
      setKiosks([]);
    } finally {
      setKioskLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
    loadKiosks();
  }, [loadContracts, loadKiosks]);

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
    setQrError('');

    try {
      const caseData = await apiRequest(`/cases/${caseId}`);
      const caseItem = caseData.item || null;
      const payload = {};

      if (caseItem?.serviceType === 'REALTOR_SERVICE') {
        let serviceFee = Number(caseItem.serviceFee || 0);

        if (!(serviceFee > 0)) {
          const feeText = window.prompt(
            'Риэлторлик хизмати ҳақини сўмда киритинг. Масалан: 5000000'
          );

          if (feeText === null) {
            return;
          }

          serviceFee = Number(
            String(feeText).replace(/\s/g, '').replace(',', '.')
          );

          if (!Number.isFinite(serviceFee) || serviceFee <= 0) {
            throw new Error('Хизмат ҳақи 0 дан катта рақам бўлиши керак.');
          }
        }

        payload.serviceFee = serviceFee;
      }

      const data = await apiRequest(`/contracts/case/${caseId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data.item?.id) {
        /*
          QR аввал чиқарилади. Parent onChanged ни QR дан олдин чақириш
          ContractsSection'ни қайта mount қилиб, QR modal state'ини йўқотар эди.
        */
        await createQr(data.item.id);
      }

      await loadContracts();
    } catch (error) {
      setPageError(error.message || 'Шартномани яратиб бўлмади.');
    } finally {
      setCreating(false);
    }
  };

  const createQr = async (contractId, selectedKioskId = null) => {
    setQrLoadingId(contractId);
    setQrError('');

    try {
      let kioskId = selectedKioskId;

      if (!kioskId) {
        let availableKiosks = kiosks;

        if (!availableKiosks.length) {
          const kioskData = await apiRequest('/kiosks');
          availableKiosks = Array.isArray(kioskData.items) ? kioskData.items : [];
          setKiosks(availableKiosks);
        }

        const onlineKiosks = availableKiosks.filter((item) => item.isOnline);

        if (onlineKiosks.length === 1) {
          kioskId = onlineKiosks[0].id;
        } else if (onlineKiosks.length > 1) {
          setKioskPicker({
            contractId,
            items: onlineKiosks,
          });
          return;
        } else if (availableKiosks.length === 1) {
          kioskId = availableKiosks[0].id;
        } else if (availableKiosks.length > 1) {
          setKioskPicker({
            contractId,
            items: availableKiosks,
          });
          return;
        } else {
          throw new Error(
            'QR экран топилмади. Аввал “QR экранлар” бўлимида оператор телефонини қўшинг ва телефонда kiosk саҳифасини очиб қўйинг.'
          );
        }
      }

      const data = await apiRequest(`/contracts/${contractId}/qr`, {
        method: 'POST',
        body: JSON.stringify({
          expiresInMinutes: 15,
          kioskId,
        }),
      });

      setKioskPicker(null);
      setQrModal(data);
      await loadKiosks();
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

      <style>{`
        .contracts-section {
          overflow: visible;
        }

        .contracts-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .contracts-head h3 {
          margin: 3px 0 4px;
        }

        .contracts-head p {
          margin: 0;
          color: #7d838b;
          font-size: 12px;
        }

        .contracts-head-actions,
        .contract-card-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .contracts-refresh,
        .contracts-create,
        .contract-action,
        .contracts-empty button,
        .contracts-error button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          border-radius: 9px;
          padding: 0 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .contracts-refresh {
          width: 38px;
          padding: 0;
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #25282c;
        }

        .contracts-create,
        .contracts-empty button,
        .contract-pdf-button,
        .contract-qr-button {
          border: 1px solid #e5232f;
          background: #e5232f;
          color: #fff;
        }

        .contracts-list {
          display: grid;
          gap: 11px;
        }

        .contract-card {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border: 1px solid #e4e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
        }

        .contract-card-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff1f2;
          color: #e5232f;
        }

        .contract-card-main {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .contract-card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .contract-card-title strong {
          font-size: 14px;
        }

        .contract-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 800;
          background: #f0f2f4;
          color: #555b63;
        }

        .contract-status-signed {
          background: #dcf8e8;
          color: #087742;
        }

        .contract-status-cancelled {
          background: #fff0f1;
          color: #cf1f2a;
        }

        .contract-card-meta,
        .contract-invitation-note,
        .contract-signed-note {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #858b93;
          font-size: 11px;
        }

        .contract-signed-note {
          color: #087742;
        }

        .contract-action {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid #dfe3e8;
          background: #fff;
          color: #25282c;
        }

        .contract-pdf-view {
          color: #087742;
          border-color: #b9e8cd;
          background: #f4fff8;
        }

        .contracts-loading,
        .contracts-empty,
        .contracts-error {
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 9px;
          text-align: center;
          color: #8c939c;
        }

        .contracts-error {
          color: #c9212c;
        }

        .contracts-empty span,
        .contracts-error span {
          max-width: 540px;
          font-size: 12px;
          line-height: 1.5;
        }

        .contract-inline-error,
        .contract-inline-success {
          margin-top: 12px;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .contract-inline-error {
          background: #fff0f1;
          color: #c9212c;
        }

        .contract-inline-success {
          background: #effbf4;
          color: #087742;
        }

        .contract-qr-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(10, 13, 17, 0.58);
          backdrop-filter: blur(3px);
        }

        .contract-qr-modal {
          width: min(520px, 100%);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.24);
        }

        .contract-qr-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #eceef1;
        }

        .contract-qr-head span {
          color: #e5232f;
          font-size: 11px;
          font-weight: 800;
        }

        .contract-qr-head h3 {
          margin: 4px 0 0;
        }

        .contract-qr-head button {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid #dfe3e8;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
        }

        .contract-qr-body {
          display: grid;
          place-items: center;
          gap: 12px;
          padding: 22px;
          text-align: center;
        }

        .contract-qr-image {
          width: 240px;
          height: 240px;
          display: grid;
          place-items: center;
          border: 1px solid #e1e5e9;
          border-radius: 16px;
          background: #fff;
          padding: 12px;
        }

        .contract-qr-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .contract-qr-body p {
          margin: 0;
          color: #6f7680;
          font-size: 12px;
          line-height: 1.5;
        }

        .contract-qr-body a {
          color: #e5232f;
          font-size: 12px;
          font-weight: 800;
        }

        .contract-kiosk-picker {
          width: min(560px, 100%);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.24);
        }

        .contract-kiosk-list {
          display: grid;
          gap: 10px;
          padding: 18px 20px 22px;
        }

        .contract-kiosk-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          border: 1px solid #dfe3e8;
          border-radius: 12px;
          background: #fff;
          color: #25282c;
          padding: 13px 14px;
          text-align: left;
          cursor: pointer;
        }

        .contract-kiosk-option:hover {
          border-color: #e5232f;
          background: #fff8f8;
        }

        .contract-kiosk-option > div {
          display: grid;
          gap: 3px;
        }

        .contract-kiosk-option strong {
          font-size: 14px;
        }

        .contract-kiosk-option span {
          color: #7b828c;
          font-size: 11px;
        }

        .contract-kiosk-online {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 5px 8px;
          background: #dcf8e8;
          color: #087742 !important;
          font-weight: 800;
        }

        .contract-kiosk-offline {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 5px 8px;
          background: #f0f2f4;
          color: #747b85 !important;
          font-weight: 800;
        }

        @media (max-width: 700px) {
          .contracts-head {
            flex-direction: column;
          }

          .contracts-head-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .contract-card {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .contract-card-actions {
            grid-column: 1 / -1;
            justify-content: flex-end;
          }

          .contract-qr-backdrop {
            padding: 10px;
          }
        }
      `}</style>

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
              className="contracts-refresh"
              onClick={loadKiosks}
              disabled={kioskLoading}
              title="QR экранлар ҳолатини янгилаш"
            >
              <QrCode size={17} className={kioskLoading ? 'spin' : ''} />
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
              Мурожаат турига қараб тегишли шартнома автоматик яратилади.
              Риэлторлик хизмати учун банк таклифи талаб қилинмайди.
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

      {kioskPicker ? (
        <div
          className="contract-qr-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setKioskPicker(null);
              setQrLoadingId('');
            }
          }}
        >
          <section
            className="contract-kiosk-picker"
            role="dialog"
            aria-modal="true"
          >
            <div className="contract-qr-head">
              <div>
                <span>QR ЭКРАННИ ТАНЛАНГ</span>
                <h3>Қайси телефонда QR чиқсин?</h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setKioskPicker(null);
                  setQrLoadingId('');
                }}
                aria-label="Ойнани ёпиш"
              >
                <X size={20} />
              </button>
            </div>

            <div className="contract-kiosk-list">
              {kioskPicker.items.map((kiosk) => (
                <button
                  type="button"
                  className="contract-kiosk-option"
                  key={kiosk.id}
                  onClick={() => createQr(kioskPicker.contractId, kiosk.id)}
                >
                  <div>
                    <strong>{kiosk.name}</strong>
                    <span>
                      {kiosk.branch?.name || 'Филиал'} ·{' '}
                      {kiosk.manager?.fullName || 'Оператор бириктирилмаган'}
                    </span>
                  </div>

                  <span
                    className={
                      kiosk.isOnline
                        ? 'contract-kiosk-online'
                        : 'contract-kiosk-offline'
                    }
                  >
                    {kiosk.isOnline ? 'Онлайн' : 'Офлайн'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

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

              <strong>
                Мижоз QR-кодни махсус телефон экранидан ўз телефони билан сканерласин
              </strong>

              {qrModal.kiosk?.name ? (
                <p>
                  QR экран: <b>{qrModal.kiosk.name}</b>
                </p>
              ) : null}

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
