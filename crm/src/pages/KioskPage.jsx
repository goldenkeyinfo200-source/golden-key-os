import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { API_URL } from '../services/api.js';

const POLL_INTERVAL_MS = 2500;
const AD_ROTATION_MS = 7000;
const SIGNED_SUCCESS_MS = 5000;

const AD_SLIDES = [
  '/kiosk-ads/ad-1.png',
  '/kiosk-ads/ad-2.png',
  '/kiosk-ads/ad-3.png',
  '/kiosk-ads/ad-4.png',
];

function getKioskCredentials() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const deviceCode = pathParts[1] || '';
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  return {
    deviceCode: decodeURIComponent(deviceCode),
    token,
  };
}

function formatRemaining(expiresAt, now) {
  if (!expiresAt) return '';

  const expires = new Date(expiresAt).getTime();

  if (!Number.isFinite(expires)) return '';

  const seconds = Math.max(0, Math.floor((expires - now) / 1000));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;

  return `${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
}

function BrandHeader({ kiosk, online }) {
  return (
    <header style={styles.header}>
      <div style={styles.logoBox}>
        <img
          src="/golden-key-logo.png"
          alt="Golden Key Info"
          style={styles.logo}
        />
      </div>

      <div style={styles.deviceMeta}>
        <div style={styles.onlineRow}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{online ? 'Тизимга уланган' : 'Алоқа йўқ'}</span>
        </div>

        <strong>{kiosk?.name || 'QR экран'}</strong>

        {kiosk?.branch?.name ? (
          <span style={styles.branchName}>{kiosk.branch.name}</span>
        ) : null}
      </div>
    </header>
  );
}

function AdsView({ slideIndex = 0 }) {
  const imageSrc = AD_SLIDES[slideIndex % AD_SLIDES.length];

  return (
    <div style={styles.adsWrap}>
      <img
        src={imageSrc}
        alt={`Golden Key реклама ${slideIndex + 1}`}
        style={styles.adImage}
      />

      <div style={styles.adsDots}>
        {AD_SLIDES.map((item, index) => (
          <span
            key={item}
            style={{
              ...styles.adsDot,
              ...(index === slideIndex % AD_SLIDES.length
                ? styles.adsDotActive
                : null),
            }}
          />
        ))}
      </div>
    </div>
  );
}

function QrReadyView({ display, now }) {
  const remaining = formatRemaining(display?.expiresAt, now);

  return (
    <div style={styles.centerContent}>
      <div style={styles.badge}>ШАРТНОМАНИ ТАСДИҚЛАШ</div>

      <h1 style={styles.title}>
        Телефонингизда QR-кодни сканерланг
      </h1>

      <p style={styles.subtitle}>
        Шартномани ўз телефонингизда очиб, тўлиқ ўқиб чиқинг ва тасдиқланг.
      </p>

      <div style={styles.qrCard}>
        {display?.qrDataUrl ? (
          <img
            src={display.qrDataUrl}
            alt="Шартномани тасдиқлаш QR-коди"
            style={styles.qrImage}
          />
        ) : (
          <QrCode size={210} />
        )}
      </div>

      <strong style={styles.contractId}>
        {display?.contractDisplayId || 'Шартнома'}
      </strong>

      {remaining ? (
        <div style={styles.timer}>
          <Clock3 size={21} />
          <span>QR амал қилиш вақти: {remaining}</span>
        </div>
      ) : null}

      <p style={styles.smallNote}>
        QR-кодни фақат шартнома эгаси ўз телефонида сканерлаши керак.
      </p>
    </div>
  );
}

function SignedView({ display }) {
  return (
    <div style={styles.centerContent}>
      <div style={styles.successIcon}>
        <CheckCircle2 size={92} strokeWidth={1.7} />
      </div>

      <div style={styles.successBadge}>МУВАФФАҚИЯТЛИ</div>

      <h1 style={styles.title}>Шартнома тасдиқланди</h1>

      <p style={styles.subtitle}>
        Электрон тасдиқ қабул қилинди. Шартнома PDF ҳужжати тизимда сақланди.
      </p>

      {display?.contractDisplayId ? (
        <strong style={styles.contractId}>{display.contractDisplayId}</strong>
      ) : null}
    </div>
  );
}

function LoadingView() {
  return (
    <div style={styles.centerContent}>
      <LoaderCircle size={54} style={styles.spinner} />
      <h1 style={styles.title}>QR экран юкланмоқда</h1>
      <p style={styles.subtitle}>Golden Key OS билан алоқа ўрнатилмоқда...</p>
    </div>
  );
}

function ErrorView({ message, onRetry }) {
  return (
    <div style={styles.centerContent}>
      <div style={styles.errorIcon}>
        <WifiOff size={70} strokeWidth={1.6} />
      </div>

      <h1 style={styles.title}>QR экранга уланиб бўлмади</h1>

      <p style={styles.subtitle}>{message}</p>

      <button type="button" onClick={onRetry} style={styles.retryButton}>
        <RefreshCw size={19} />
        Қайта уриниш
      </button>
    </div>
  );
}

export function KioskPage() {
  const credentials = useMemo(() => getKioskCredentials(), []);

  const [data, setData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [adSlideIndex, setAdSlideIndex] = useState(0);
  const [signedVisibleUntil, setSignedVisibleUntil] = useState(0);

  const loadDisplay = async ({ silent = false } = {}) => {
    if (!credentials.deviceCode || !credentials.token) {
      setError(
        'Қурилма манзили тўлиқ эмас. Ушбу телефон учун берилган махсус kiosk ҳаволасини очинг.'
      );
      setOnline(false);
      setInitialLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/kiosks/display/${encodeURIComponent(
          credentials.deviceCode
        )}?token=${encodeURIComponent(credentials.token)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            payload.message ||
            'QR экран маълумотларини олиб бўлмади.'
        );
      }

      setData(payload);
      setError('');
      setOnline(true);
    } catch (requestError) {
      setOnline(false);

      if (!silent || !data) {
        setError(
          requestError.message ||
            'Backend билан алоқа ўрнатиб бўлмади.'
        );
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadDisplay();

    const poll = window.setInterval(() => {
      loadDisplay({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const slider = window.setInterval(() => {
      setAdSlideIndex((current) => (current + 1) % AD_SLIDES.length);
    }, AD_ROTATION_MS);

    return () => window.clearInterval(slider);
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyMargin = document.body.style.margin;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.margin = previousBodyMargin;
    };
  }, []);

  const status = data?.display?.status || 'IDLE';

  useEffect(() => {
    if (status === 'SIGNED') {
      setSignedVisibleUntil((current) =>
        current > Date.now()
          ? current
          : Date.now() + SIGNED_SUCCESS_MS
      );
    } else {
      setSignedVisibleUntil(0);
    }
  }, [status, data?.display?.contractId]);

  let content = <AdsView slideIndex={adSlideIndex} />;

  if (initialLoading) {
    content = <LoadingView />;
  } else if (error && !data) {
    content = <ErrorView message={error} onRetry={() => loadDisplay()} />;
  } else if (status === 'QR_READY') {
    content = <QrReadyView display={data?.display} now={now} />;
  } else if (
    status === 'SIGNED' &&
    signedVisibleUntil > now
  ) {
    content = <SignedView display={data?.display} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <BrandHeader kiosk={data?.kiosk} online={online} />

        <main style={styles.main}>{content}</main>

        <footer style={styles.footer}>
          <span>GOLDEN KEY INFO</span>
          <span>•</span>
          <span>Электрон шартнома тасдиқлаш тизими</span>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100dvh',
    minHeight: 0,
    overflow: 'hidden',
    background:
      'radial-gradient(circle at top, #fff7f7 0%, #f5f7fa 45%, #edf1f5 100%)',
    color: '#111827',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 8,
    boxSizing: 'border-box',
  },
  shell: {
    height: 'calc(100dvh - 16px)',
    minHeight: 0,
    maxHeight: 'calc(100dvh - 16px)',
    maxWidth: 720,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 22,
    boxShadow: '0 24px 70px rgba(17, 24, 39, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  header: {
    flex: '0 0 auto',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottom: '1px solid #eef0f3',
  },
  logoBox: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    display: 'block',
    width: 'min(180px, 43vw)',
    maxHeight: 50,
    objectFit: 'contain',
    objectPosition: 'left center',
  },
  deviceMeta: {
    minWidth: 0,
    textAlign: 'right',
    display: 'grid',
    gap: 3,
    fontSize: 10,
  },
  onlineRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    color: '#047857',
    fontWeight: 700,
  },
  branchName: {
    color: '#6b7280',
    fontSize: 12,
  },
  main: {
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    padding: '12px 16px',
  },
  centerContent: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  badge: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: '#b91c1c',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 999,
    padding: '8px 14px',
    marginBottom: 14,
  },
  successBadge: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: '#047857',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 999,
    padding: '8px 14px',
    marginBottom: 12,
  },
  title: {
    fontSize: 'clamp(25px, 6vw, 40px)',
    lineHeight: 1.08,
    margin: '0 0 12px',
    maxWidth: 620,
  },
  subtitle: {
    margin: 0,
    maxWidth: 570,
    color: '#667085',
    fontSize: 'clamp(15px, 3.8vw, 19px)',
    lineHeight: 1.55,
  },
  idleIcon: {
    width: 132,
    height: 132,
    borderRadius: 34,
    display: 'grid',
    placeItems: 'center',
    color: '#b91c1c',
    background: '#fff1f2',
    marginBottom: 12,
  },
  successIcon: {
    color: '#059669',
    marginBottom: 18,
  },
  expiredIcon: {
    width: 132,
    height: 132,
    borderRadius: 34,
    display: 'grid',
    placeItems: 'center',
    color: '#b45309',
    background: '#fffbeb',
    marginBottom: 22,
  },
  errorIcon: {
    width: 132,
    height: 132,
    borderRadius: 34,
    display: 'grid',
    placeItems: 'center',
    color: '#b91c1c',
    background: '#fff1f2',
    marginBottom: 22,
  },
  securityPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    padding: '10px 14px',
    borderRadius: 999,
    background: '#f8fafc',
    color: '#475467',
    fontSize: 13,
    fontWeight: 700,
  },
  qrCard: {
    width: 'min(58vh, 72vw, 320px)',
    aspectRatio: '1 / 1',
    margin: '10px 0 8px',
    padding: 10,
    borderRadius: 22,
    background: '#ffffff',
    border: '2px solid #111827',
    boxShadow: '0 16px 40px rgba(17, 24, 39, 0.10)',
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
  },
  qrImage: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
  },
  contractId: {
    fontSize: 'clamp(16px, 3.2vh, 22px)',
    letterSpacing: 0.4,
    marginTop: 8,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    color: '#b45309',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 999,
    padding: '7px 12px',
    fontWeight: 800,
  },
  smallNote: {
    margin: '10px 0 0',
    color: '#98a2b3',
    fontSize: 12,
    maxWidth: 440,
  },
  adsWrap: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: 'calc(100% - 24px)',
    maxWidth: '100%',
    maxHeight: 'calc(100% - 24px)',
    display: 'block',
    objectFit: 'contain',
    objectPosition: 'center center',
    userSelect: 'none',
    WebkitUserDrag: 'none',
  },

  adsDots: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  adsDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#d0d5dd',
    transition: 'all .25s ease',
  },
  adsDotActive: {
    width: 28,
    background: '#b91c1c',
  },
  retryButton: {
    marginTop: 24,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 0,
    borderRadius: 12,
    padding: '12px 18px',
    background: '#b91c1c',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
  },
  spinner: {
    marginBottom: 22,
    animation: 'spin 1s linear infinite',
  },
  footer: {
    flex: '0 0 auto',
    padding: '8px 14px 10px',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    color: '#98a2b3',
    fontSize: 11,
    fontWeight: 700,
    borderTop: '1px solid #f2f4f7',
  },
};
