import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';

import { API_URL } from '../services/api.js';
import '../styles/contract-sign.css';

function getTokenFromPath() {
  const match = window.location.pathname.match(/^\/sign\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function ContractSignPage() {
  const token = useMemo(() => getTokenFromPath(), []);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setPageError('QR-код ҳаволаси нотўғри.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/public/contracts/${encodeURIComponent(token)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Шартномани очиб бўлмади.');
        }

        setItem(data.item || null);
      } catch (error) {
        setPageError(error.message || 'Шартномани очиб бўлмади.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const confirmContract = async () => {
    if (!accepted || submitting) return;

    setSubmitting(true);
    setPageError('');

    try {
      const response = await fetch(
        `${API_URL}/public/contracts/${encodeURIComponent(token)}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accepted: true,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Шартномани тасдиқлаб бўлмади.');
      }

      setConfirmed(data.item || {});
    } catch (error) {
      setPageError(error.message || 'Шартномани тасдиқлаб бўлмади.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="sign-page">
        <section className="sign-state-card">
          <LoaderCircle className="spin" size={38} />
          <strong>Шартнома юкланмоқда...</strong>
        </section>
      </main>
    );
  }

  if (pageError && !item) {
    return (
      <main className="sign-page">
        <section className="sign-state-card sign-error-card">
          <AlertTriangle size={40} />
          <strong>Шартномани очиб бўлмади</strong>
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
            <img src="/golden-key-logo.png" alt="Golden Key Info" />
          </div>

          <CheckCircle2 size={58} />

          <h1>Шартнома тасдиқланди</h1>

          <p>
            <strong>{confirmed.displayId}</strong> рақамли шартнома
            муваффақиятли тасдиқланди.
          </p>

          <span>
            PDF ҳужжат тайёрлангач Telegram бот орқали юборилади.
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
            <img src="/golden-key-logo.png" alt="Golden Key Info" />
          </div>

          <div>
            <span>Golden Key Info</span>
            <h1>Шартномани тасдиқлаш</h1>
          </div>
        </header>

        <div className="sign-summary">
          <div>
            <span>Шартнома</span>
            <strong>{item.contractDisplayId}</strong>
          </div>

          <div>
            <span>Мурожаат</span>
            <strong>{item.caseDisplayId}</strong>
          </div>

          <div>
            <span>Мижоз</span>
            <strong>{item.clientFullName}</strong>
          </div>
        </div>

        <article
          className="sign-contract-html"
          dangerouslySetInnerHTML={{ __html: item.html }}
        />

        <section className="sign-confirm-box">
          <div className="sign-security-note">
            <ShieldCheck size={24} />

            <div>
              <strong>Бир марталик хавфсиз тасдиқлаш</strong>
              <span>
                Тасдиқдан кейин QR-код қайта ишламайди. Сана, вақт ва техник
                маълумотлар журналга сақланади.
              </span>
            </div>
          </div>

          <label className="sign-accept-label">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              disabled={submitting}
            />

            <span>
              Мен шартнома матнини ўқиб чиқдим, шартларни тушундим ва
              тасдиқлайман.
            </span>
          </label>

          {pageError ? (
            <div className="sign-inline-error">{pageError}</div>
          ) : null}

          <button
            type="button"
            className="sign-confirm-button"
            onClick={confirmContract}
            disabled={!accepted || submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle size={18} className="spin" />
                Тасдиқланмоқда...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Тасдиқлайман
              </>
            )}
          </button>

          <p className="sign-legal-note">
            Бу босқич бир марталик QR орқали электрон розиликни қайд этади.
            E-IMZO ёки SMS-код интеграцияси кейин алоҳида кучайтирилиши мумкин.
          </p>
        </section>
      </section>
    </main>
  );
}
