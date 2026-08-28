import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  LoaderCircle,
  PenLine,
  ShieldCheck,
} from 'lucide-react';

import { API_URL } from '../services/api.js';
import '../styles/contract-sign.css';

function getTokenFromPath() {
  const match =
    window.location.pathname.match(
      /^\/sign\/([^/]+)\/?$/
    );

  return match
    ? decodeURIComponent(match[1])
    : '';
}

function setupCanvas(canvas) {
  if (!canvas) return;

  const rect =
    canvas.getBoundingClientRect();

  const ratio =
    Math.max(
      window.devicePixelRatio || 1,
      1
    );

  canvas.width =
    Math.round(rect.width * ratio);

  canvas.height =
    Math.round(rect.height * ratio);

  const ctx =
    canvas.getContext('2d');

  ctx.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.3;
  ctx.strokeStyle = '#111827';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    0,
    0,
    rect.width,
    rect.height
  );
}

export function ContractSignPage() {
  const token =
    useMemo(
      () => getTokenFromPath(),
      []
    );

  const canvasRef =
    useRef(null);

  const drawingRef =
    useRef(false);

  const lastPointRef =
    useRef(null);

  const [item, setItem] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState('');

  const [accepted, setAccepted] =
    useState(false);

  const [hasSignature, setHasSignature] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setPageError(
          'QR-код ҳаволаси нотўғри.'
        );

        setLoading(false);
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/public/contracts/${encodeURIComponent(
              token
            )}`
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Шартномани очиб бўлмади.'
          );
        }

        setItem(
          data.item || null
        );
      } catch (error) {
        setPageError(
          error.message ||
            'Шартномани очиб бўлмади.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  useEffect(() => {
    if (!item || confirmed) {
      return undefined;
    }

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const resize = () => {
      const hadSignature =
        hasSignature;

      setupCanvas(canvas);

      if (hadSignature) {
        setHasSignature(false);
      }
    };

    setupCanvas(canvas);

    window.addEventListener(
      'resize',
      resize
    );

    return () => {
      window.removeEventListener(
        'resize',
        resize
      );
    };
  }, [item, confirmed]);

  const pointFromEvent = (event) => {
    const canvas =
      canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,
      y:
        event.clientY -
        rect.top,
    };
  };

  const startDrawing = (event) => {
    if (submitting) return;

    event.preventDefault();

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    try {
      canvas.setPointerCapture(
        event.pointerId
      );
    } catch {}

    drawingRef.current = true;

    lastPointRef.current =
      pointFromEvent(event);
  };

  const moveDrawing = (event) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext('2d');

    const point =
      pointFromEvent(event);

    const previous =
      lastPointRef.current ||
      point;

    ctx.beginPath();

    ctx.moveTo(
      previous.x,
      previous.y
    );

    ctx.lineTo(
      point.x,
      point.y
    );

    ctx.stroke();

    lastPointRef.current =
      point;

    setHasSignature(true);
  };

  const endDrawing = (event) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();

    drawingRef.current = false;
    lastPointRef.current = null;

    const canvas =
      canvasRef.current;

    try {
      canvas.releasePointerCapture(
        event.pointerId
      );
    } catch {}
  };

  const clearSignature = () => {
    const canvas =
      canvasRef.current;

    if (!canvas || submitting) {
      return;
    }

    setupCanvas(canvas);

    setHasSignature(false);
  };

  const confirmContract =
    async () => {
      if (
        !accepted ||
        !hasSignature ||
        submitting
      ) {
        return;
      }

      setSubmitting(true);
      setPageError('');

      try {
        const canvas =
          canvasRef.current;

        const signatureDataUrl =
          canvas.toDataURL(
            'image/png'
          );

        const response =
          await fetch(
            `${API_URL}/public/contracts/${encodeURIComponent(
              token
            )}/confirm`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                accepted: true,
                signatureDataUrl,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Шартномани тасдиқлаб бўлмади.'
          );
        }

        setConfirmed(
          data.item || {}
        );
      } catch (error) {
        setPageError(
          error.message ||
            'Шартномани тасдиқлаб бўлмади.'
        );
      } finally {
        setSubmitting(false);
      }
    };

  if (loading) {
    return (
      <main className="sign-page">
        <section className="sign-state-card">
          <LoaderCircle
            className="spin"
            size={38}
          />

          <strong>
            Шартнома юкланмоқда...
          </strong>
        </section>
      </main>
    );
  }

  if (pageError && !item) {
    return (
      <main className="sign-page">
        <section className="sign-state-card sign-error-card">
          <AlertTriangle
            size={40}
          />

          <strong>
            Шартномани очиб бўлмади
          </strong>

          <p>{pageError}</p>
        </section>
      </main>
    );
  }

  if (confirmed) {
    return (
      <main className="sign-page">
        <section className="sign-success-card">
          <div className="sign-logo">
            <img
              src="/golden-key-logo.png"
              alt="Golden Key Info"
            />
          </div>

          <CheckCircle2
            size={58}
          />

          <h1>
            Шартнома имзоланди
          </h1>

          <p>
            <strong>
              {confirmed.displayId}
            </strong>{' '}
            рақамли шартнома экрандаги
            қўл имзоси ва бир марталик
            QR орқали тасдиқланди.
          </p>

          <span>
            Якуний PDF ҳужжатда
            имзо ва электрон тасдиқ
            маълумотлари сақланади.
          </span>
        </section>
      </main>
    );
  }

  return (
    <main className="sign-page">
      <section className="sign-contract-shell">
        <header className="sign-header">
          <div className="sign-logo">
            <img
              src="/golden-key-logo.png"
              alt="Golden Key Info"
            />
          </div>

          <div>
            <span>
              Golden Key Info
            </span>

            <h1>
              Шартномани имзолаш
            </h1>
          </div>
        </header>

        <div className="sign-summary">
          <div>
            <span>
              Шартнома
            </span>

            <strong>
              {item.contractDisplayId}
            </strong>
          </div>

          <div>
            <span>
              Мурожаат
            </span>

            <strong>
              {item.caseDisplayId}
            </strong>
          </div>

          <div>
            <span>
              {item.signerLabel ||
                'Мижоз'}
            </span>

            <strong>
              {item.clientFullName}
            </strong>
          </div>
        </div>

        <article
          className="sign-contract-html"
          dangerouslySetInnerHTML={{
            __html: item.html,
          }}
        />

        <section className="sign-confirm-box">
          <div className="sign-security-note">
            <ShieldCheck
              size={24}
            />

            <div>
              <strong>
                Бир марталик хавфсиз
                тасдиқлаш
              </strong>

              <span>
                Имзо, сана, вақт,
                QR-токен ва техник
                маълумотлар электрон
                журналда қайд этилади.
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              border:
                '1px solid #e3e7ec',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
                gap: 10,
                padding:
                  '12px 14px',
                borderBottom:
                  '1px solid #edf0f2',
                background:
                  '#fafbfc',
              }}
            >
              <div>
                <strong
                  style={{
                    display:
                      'flex',
                    alignItems:
                      'center',
                    gap: 7,
                    fontSize: 14,
                  }}
                >
                  <PenLine
                    size={18}
                  />

                  Қўл имзоси
                </strong>

                <span
                  style={{
                    display:
                      'block',
                    marginTop: 3,
                    color:
                      '#777f89',
                    fontSize: 11,
                  }}
                >
                  Қуйидаги майдонга
                  бармоғингиз ёки
                  стилус билан имзо
                  қўйинг.
                </span>
              </div>

              <button
                type="button"
                onClick={
                  clearSignature
                }
                disabled={
                  submitting
                }
                style={{
                  minHeight: 34,
                  border:
                    '1px solid #e0e4e9',
                  borderRadius: 8,
                  background: '#fff',
                  padding:
                    '0 10px',
                  display:
                    'inline-flex',
                  alignItems:
                    'center',
                  gap: 6,
                  fontWeight: 700,
                }}
              >
                <Eraser
                  size={15}
                />

                Тозалаш
              </button>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={
                startDrawing
              }
              onPointerMove={
                moveDrawing
              }
              onPointerUp={
                endDrawing
              }
              onPointerCancel={
                endDrawing
              }
              onPointerLeave={
                endDrawing
              }
              style={{
                width: '100%',
                height: 190,
                display: 'block',
                touchAction: 'none',
                cursor:
                  'crosshair',
                background: '#fff',
              }}
            />

            <div
              style={{
                padding:
                  '9px 12px',
                borderTop:
                  '1px solid #edf0f2',
                color:
                  hasSignature
                    ? '#087742'
                    : '#b42318',
                background:
                  hasSignature
                    ? '#f1fbf5'
                    : '#fff7f7',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {hasSignature
                ? '✓ Имзо киритилди'
                : 'Имзо ҳали киритилмаган'}
            </div>
          </div>

          <label className="sign-accept-label">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(
                event
              ) =>
                setAccepted(
                  event.target.checked
                )
              }
              disabled={
                submitting
              }
            />

            <span>
              Мен шартнома матнини
              ўқиб чиқдим,
              шартларни тушундим,
              ушбу қўл имзосини
              ўзим қўйдим ва
              шартномани
              тасдиқлайман.
            </span>
          </label>

          {pageError ? (
            <div className="sign-inline-error">
              {pageError}
            </div>
          ) : null}

          <button
            type="button"
            className="sign-confirm-button"
            onClick={
              confirmContract
            }
            disabled={
              !accepted ||
              !hasSignature ||
              submitting
            }
          >
            {submitting ? (
              <>
                <LoaderCircle
                  size={18}
                  className="spin"
                />

                Имзоланмоқда...
              </>
            ) : (
              <>
                <PenLine
                  size={18}
                />

                Имзолаш ва
                тасдиқлаш
              </>
            )}
          </button>

          <p className="sign-legal-note">
            Экранда чизилган қўл
            имзоси QR-тасдиқ ва
            аудит журналига
            қўшимча тасдиқ сифатида
            сақланади. Қонунчиликда
            малакавий электрон
            рақамли имзо талаб
            қилинган ҳолатларда
            E-IMZO ёки бошқа
            ваколатли электрон
            имзо воситаси алоҳида
            қўлланади.
          </p>
        </section>
      </section>
    </main>
  );
}
