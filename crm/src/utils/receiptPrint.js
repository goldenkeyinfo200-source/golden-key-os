const SERVICE_LABELS = {
  PRIMARY_MORTGAGE: 'Бирламчи ипотека',
  SECONDARY_MORTGAGE: 'Иккиламчи ипотека',
  MICROLOAN: 'Микроқарз',
  REALTOR_SERVICE: 'Риэлторлик хизмати',
  SALE_PURCHASE: 'Олди-сотди',
  CADASTRE_SERVICE: 'Кадастр хизмати',
  OTHER: 'Бошқа',
};

const esc = (value) => String(value ?? '—')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value) =>
  `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} сўм`;

const dateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

function receiptCode(payment, supplied) {
  if (supplied) return supplied;

  const raw = String(payment?.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return `GK-${raw.slice(-8) || 'RECEIPT'}`;
}

/**
 * Golden Key OS — XP-58IIT / 58 mm учун тиниқ чоп этиш версияси.
 *
 * Тавсия этилган print settings:
 * - Printer: XP-58
 * - Paper: 58 mm
 * - Scale: 100%
 * - Margins: None / Minimum
 * - Headers and footers: OFF
 */
export function printGoldenKeyReceipt({
  caseItem,
  payment,
  receiptNumber,
}) {
  if (!caseItem || !payment) {
    throw new Error('Квитанция маълумотлари етарли эмас');
  }

  const code = receiptCode(payment, receiptNumber);
  const client = caseItem.applicant || caseItem.client || {};
  const branch =
    caseItem.branch?.name ||
    caseItem.branchName ||
    '—';

  const service =
    SERVICE_LABELS[caseItem.serviceType] ||
    caseItem.serviceType ||
    '—';

  const paidAt =
    payment.paidAt ||
    payment.createdAt ||
    new Date().toISOString();

  const method = payment.method || '—';
  const reference = payment.reference || '—';

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(code)}</title>

  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 58mm;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    body {
      font-weight: 400;
    }

    .toolbar {
      width: 58mm;
      display: flex;
      gap: 5px;
      padding: 5px;
      background: #f2f2f2;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .toolbar button {
      flex: 1;
      border: 0;
      border-radius: 5px;
      padding: 7px 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .print {
      background: #ef233c;
      color: #fff;
    }

    .close {
      background: #ddd;
      color: #111;
    }

    .receipt {
      width: 58mm;
      padding: 2.2mm 1.5mm 3mm;
      background: #fff;
    }

    .logo {
      display: block;
      width: 31mm;
      max-height: 15mm;
      object-fit: contain;
      margin: 0 auto 1.4mm;
    }

    .title {
      text-align: center;
      font-size: 14px;
      line-height: 1.2;
      font-weight: 700;
      margin: 0 0 1.8mm;
      letter-spacing: 0;
    }

    .dash {
      border-top: 1px dashed #000;
      margin: 1.8mm 0;
    }

    .code {
      text-align: center;
      font-size: 14px;
      line-height: 1.2;
      font-weight: 700;
      margin: 1.8mm 0 2mm;
      letter-spacing: 0;
    }

    .row {
      display: grid;
      grid-template-columns: 17.5mm minmax(0, 1fr);
      column-gap: 1.2mm;
      align-items: start;
      font-size: 11px;
      line-height: 1.45;
      margin: 1.25mm 0;
      font-weight: 400;
    }

    .row .v {
      text-align: right;
      font-weight: 500;
      overflow-wrap: anywhere;
      word-break: normal;
    }

    .amount {
      text-align: center;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 700;
      margin: 2.5mm 0 2.2mm;
      white-space: nowrap;
    }

    .note {
      text-align: center;
      font-size: 10.5px;
      line-height: 1.4;
      font-weight: 400;
      margin: 1.8mm 0 1.4mm;
    }

    .qr {
      display: block;
      width: 27mm;
      height: 27mm;
      object-fit: contain;
      margin: 1.6mm auto 1.2mm;
      image-rendering: pixelated;
    }

    .qrnote {
      text-align: center;
      font-size: 10.5px;
      line-height: 1.3;
      font-weight: 500;
      margin-top: 0.7mm;
    }

    .thanks {
      text-align: center;
      font-size: 10.5px;
      line-height: 1.25;
      font-weight: 700;
      margin-top: 2mm;
    }

    @media print {
      html,
      body {
        width: 58mm !important;
        min-width: 58mm !important;
        max-width: 58mm !important;
      }

      body {
        margin: 0 !important;
        padding: 0 !important;
      }

      .toolbar {
        display: none !important;
      }

      .receipt {
        width: 58mm !important;
        padding: 2.2mm 1.5mm 3mm !important;
      }

      /*
       * Термо-принтерда қизил логотип кулранг чиқиб кетмаслиги учун
       * чоп пайтида логотипни кучли монохром қиламиз.
       */
      .logo {
        filter: grayscale(1) contrast(2.2);
      }

      .qr {
        filter: grayscale(1) contrast(1.4);
      }

      .title,
      .code,
      .row,
      .amount,
      .note,
      .qrnote,
      .thanks {
        color: #000 !important;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button class="print" onclick="window.print()">Чоп этиш</button>
    <button class="close" onclick="window.close()">Ёпиш</button>
  </div>

  <main class="receipt">
    <img
      class="logo"
      src="/golden-key-logo.png"
      alt="Golden Key Info"
    />

    <div class="title">ТЎЛОВ КВИТАНЦИЯСИ</div>

    <div class="dash"></div>

    <div class="code">${esc(code)}</div>

    <div class="row">
      <span>Мурожаат:</span>
      <span class="v">${esc(caseItem.displayId || '—')}</span>
    </div>

    <div class="row">
      <span>Мижоз:</span>
      <span class="v">${esc(client.fullName || '—')}</span>
    </div>

    <div class="row">
      <span>Телефон:</span>
      <span class="v">${esc(client.phone || '—')}</span>
    </div>

    <div class="row">
      <span>Филиал:</span>
      <span class="v">${esc(branch)}</span>
    </div>

    <div class="row">
      <span>Хизмат:</span>
      <span class="v">${esc(service)}</span>
    </div>

    <div class="dash"></div>

    <div class="row">
      <span>Тўлов санаси:</span>
      <span class="v">${esc(dateTime(paidAt))}</span>
    </div>

    <div class="row">
      <span>Тўлов усули:</span>
      <span class="v">${esc(method)}</span>
    </div>

    <div class="row">
      <span>Чек / транзакция:</span>
      <span class="v">${esc(reference)}</span>
    </div>

    <div class="amount">${esc(money(payment.amount))}</div>

    <div class="dash"></div>

    <div class="note">
      Golden Key OS орқали шакллантирилди.<br />
      Квитанцияни сақлаб қўйинг.
    </div>

    <img
      class="qr"
      src="/taplink-qr.png"
      alt="QR"
    />

    <div class="qrnote">
      Батафсил маълумотлар учун<br />
      QR кодни сканерланг
    </div>

    <div class="dash"></div>

    <div class="thanks">
      ИШОНЧИНГИЗ УЧУН РАҲМАТ!
    </div>
  </main>
</body>
</html>`;

  const w = window.open(
    '',
    '_blank',
    'width=520,height=820'
  );

  if (!w) {
    throw new Error('Браузер янги ойна очишни блоклади');
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}
