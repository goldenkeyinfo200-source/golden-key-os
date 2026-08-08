import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Home,
  Landmark,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { API_URL } from '../services/api.js';

const POLL_INTERVAL_MS = 2500;
const AD_ROTATION_MS = 7000;
const SIGNED_SUCCESS_MS = 5000;

const AD_SLIDES = [
  {
    id: 'mortgage',
    eyebrow: 'GOLDEN KEY IPOTEKA',
    title: 'Ипотека бўйича маслаҳат керакми?',
    text: 'Бирламчи ва иккиламчи уй-жойлар учун ипотека ечимлари. Мос вариантни мутахассисларимиз билан аниқланг.',
    icon: Landmark,
    tone: 'red',
  },
  {
    id: 'microloan',
    eyebrow: 'МОЛИЯВИЙ ЕЧИМ',
    title: 'Микроқарз хизмати',
    text: 'Кўчмас мулк билан боғлиқ молиявий эҳтиёжлар учун қулай ечимлар бўйича маълумот олинг.',
    icon: WalletCards,
    tone: 'gold',
  },
  {
    id: 'realtor',
    eyebrow: 'КЎЧМАС МУЛК',
    title: 'Уй сотмоқчимисиз ёки сотиб олмоқчимисиз?',
    text: 'Golden Key мутахассислари объект танлаш, сотиш ва расмийлаштириш жараёнида сизга ёрдам беради.',
    icon: Home,
    tone: 'green',
  },
  {
    id: 'digital',
    eyebrow: 'GOLDEN KEY OS',
    title: 'Ҳужжатлар — рақамли, жараён — шаффоф',
    text: 'Мурожаат ҳолати, электрон шартнома ва тўлов квитанциялари ягона рақамли тизимда.',
    icon: Sparkles,
    tone: 'blue',
  },
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
  const slide = AD_SLIDES[slideIndex % AD_SLIDES.length];
  const Icon = slide.icon;

  const toneStyles = {
    red: {
      iconBg: '#fff1f2',
      iconColor: '#b91c1c',
      eyebrowBg: '#fff1f2',
      eyebrowColor: '#b91c1c',
    },
    gold: {
      iconBg: '#fffbeb',
      iconColor: '#b45309',
      eyebrowBg: '#fffbeb',
      eyebrowColor: '#b45309',
    },
    green: {
      iconBg: '#ecfdf5',
      iconColor: '#047857',
      eyebrowBg: '#ecfdf5',
      eyebrowColor: '#047857',
    },
    blue: {
      iconBg: '#eff6ff',
      iconColor: '#1d4ed8',
      eyebrowBg: '#eff6ff',
      eyebrowColor: '#1d4ed8',
    },
  };

  const tone = toneStyles[slide.tone] || toneStyles.red;

  return (
    <div style={styles.adsWrap}>
      <div
        style={{
          ...styles.adsIcon,
          background: tone.iconBg,
          color: tone.iconColor,
        }}
      >
        <Icon size={76} strokeWidth={1.55} />
      </div>

      <div
        style={{
          ...styles.adsEyebrow,
          background: tone.eyebrowBg,
          color: tone.eyebrowColor,
        }}
      >
        {slide.eyebrow}
      </div>

      <h1 style={styles.adsTitle}>{slide.title}</h1>

      <p style={styles.adsText}>{slide.text}</p>

      <div style={styles.adsHint}>
        <QrCode size={19} />
        <span>
          Шартнома тайёр бўлганда QR-код автоматик равишда шу экранда пайдо бўлади.
        </span>
      </div>

      <div style={styles.adsDots}>
        {AD_SLIDES.map((item, index) => (
          <span
            key={item.id}
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
    minHeight: '100dvh',
    background:
      'radial-gradient(circle at top, #fff7f7 0%, #f5f7fa 45%, #edf1f5 100%)',
    color: '#111827',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 14,
    boxSizing: 'border-box',
  },
  shell: {
    minHeight: 'calc(100dvh - 28px)',
    maxWidth: 720,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 28,
    boxShadow: '0 24px 70px rgba(17, 24, 39, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  header: {
    padding: '18px 20px',
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
    width: 'min(220px, 46vw)',
    maxHeight: 64,
    objectFit: 'contain',
    objectPosition: 'left center',
  },
  deviceMeta: {
    minWidth: 0,
    textAlign: 'right',
    display: 'grid',
    gap: 3,
    fontSize: 13,
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
    flex: 1,
    display: 'flex',
    padding: '24px 22px',
  },
  centerContent: {
    width: '100%',
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
    marginBottom: 22,
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
    width: 'min(72vw, 360px)',
    aspectRatio: '1 / 1',
    margin: '22px 0 14px',
    padding: 14,
    borderRadius: 28,
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
    fontSize: 'clamp(18px, 4.5vw, 25px)',
    letterSpacing: 0.4,
    marginTop: 8,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    color: '#b45309',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 999,
    padding: '9px 14px',
    fontWeight: 800,
  },
  smallNote: {
    margin: '18px 0 0',
    color: '#98a2b3',
    fontSize: 12,
    maxWidth: 440,
  },
  adsWrap: {
    width: '100%',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '10px 0 4px',
  },
  adsIcon: {
    width: 146,
    height: 146,
    borderRadius: 38,
    display: 'grid',
    placeItems: 'center',
    marginBottom: 22,
    transition: 'all .35s ease',
  },
  adsEyebrow: {
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  adsTitle: {
    margin: '0 0 14px',
    maxWidth: 610,
    fontSize: 'clamp(28px, 7vw, 44px)',
    lineHeight: 1.08,
    letterSpacing: -0.6,
  },
  adsText: {
    margin: 0,
    maxWidth: 590,
    color: '#667085',
    fontSize: 'clamp(16px, 4vw, 21px)',
    lineHeight: 1.55,
  },
  adsHint: {
    maxWidth: 570,
    marginTop: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: '11px 15px',
    borderRadius: 16,
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    color: '#475467',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  adsDots: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
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
    padding: '14px 20px 18px',
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
