import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { htmlToText } from 'html-to-text';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import {
  buildContractContext,
  renderContractHtml,
} from './contract-template.js';

const require = createRequire(import.meta.url);

/* =========================================================
   FILE / FONT HELPERS
========================================================= */

function resolveBundledFont(fileName) {
  try {
    return require.resolve(
      `dejavu-fonts-ttf/ttf/${fileName}`
    );
  } catch {
    return null;
  }
}

const FONT_CANDIDATES = [
  process.env.PDF_FONT_PATH,
  resolveBundledFont('DejaVuSans.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
].filter(Boolean);

const BOLD_FONT_CANDIDATES = [
  process.env.PDF_BOLD_FONT_PATH,
  resolveBundledFont('DejaVuSans-Bold.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
].filter(Boolean);

const LOGO_CANDIDATES = [
  process.env.PDF_LOGO_PATH,
  path.join(
    process.cwd(),
    'assets',
    'golden-key-logo.jpg'
  ),
  path.join(
    process.cwd(),
    'backend',
    'assets',
    'golden-key-logo.jpg'
  ),
].filter(Boolean);

function findExistingFile(candidates) {
  return (
    candidates.find((filePath) => {
      try {
        return (
          Boolean(filePath) &&
          fs.existsSync(filePath)
        );
      } catch {
        return false;
      }
    }) || null
  );
}

/* =========================================================
   FORMAT HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

function normalizeConfirmationForHash(item) {
  if (!item) return null;

  return {
    role: item.role || 'CLIENT',
    invitationId: item.invitationId || null,
    signedAt: item.signedAt
      ? new Date(item.signedAt).toISOString()
      : null,
    ip: item.ip || null,
    method: item.method || 'ONE_TIME_QR',
  };
}

function contractVerificationHash({
  contract,
  renderedHtml,
  signedAt,
  invitationId,
  confirmations = [],
}) {
  const canonical = JSON.stringify({
    contractId: contract.id,
    displayId: contract.displayId,
    caseId: contract.caseId,
    templateId: contract.templateId,
    signedAt: new Date(signedAt).toISOString(),
    invitationId,
    confirmations: confirmations.map(normalizeConfirmationForHash),
    renderedHtml,
  });

  return crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');
}

function buildVerificationUrl(contract) {
  const displayId = encodeURIComponent(contract.displayId);

  const configuredBase =
    process.env.PUBLIC_VERIFY_URL?.trim().replace(/\/+$/, '');

  if (configuredBase) {
    return `${configuredBase}/${displayId}`;
  }

  const railwayDomain =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim();

  if (railwayDomain) {
    return `https://${railwayDomain}/api/public/contracts/${displayId}/verify`;
  }

  /*
    Production fallback for the current Golden Key OS backend.
    Tavsiya: Railway Variables ichida PUBLIC_VERIFY_URL ni
    https://<backend-domain>/api/public/contracts qilib belgilang.
  */
  return `https://backend-production-054ce.up.railway.app/api/public/contracts/${displayId}/verify`;
}

/* =========================================================
   HTML -> STRUCTURED BLOCKS
========================================================= */

/*
  Шартнома HTML'ини битта узун plain text қилиш ўрнига
  h1 / h2 / p блокларга ажратамиз.

  Шу орқали:
  - сарлавҳалар алоҳида форматланади;
  - абзацлар орасида ортиқча бўшлиқ йўқолади;
  - PDFKit матнни табиий равишда саҳифаларга бўлади.
*/
function htmlFragmentToText(html) {
  const text = htmlToText(String(html || ''), {
    wordwrap: false,
    preserveNewlines: false,

    selectors: [
      {
        selector: 'a',
        options: {
          ignoreHref: true,
        },
      },
      {
        selector: 'img',
        format: 'skip',
      },
    ],
  });

  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractContractBlocks(renderedHtml) {
  const blocks = [];

  const source = String(renderedHtml || '');

  const pattern =
    /<(h1|h2|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  let match;

  while ((match = pattern.exec(source))) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];

    const text = htmlFragmentToText(innerHtml);

    if (!text) {
      continue;
    }

    blocks.push({
      type:
        tag === 'h1'
          ? 'title'
          : tag === 'h2'
            ? 'heading'
            : 'paragraph',

      text,
    });
  }

  /*
    Агар қандайдир сабаб билан HTML блоклар
    ажратилмаса, fallback сифатида бутун матнни
    битта paragraph қилиб чиқарамиз.
  */
  if (blocks.length === 0) {
    const fallback = htmlFragmentToText(source);

    if (fallback) {
      blocks.push({
        type: 'paragraph',
        text: fallback,
      });
    }
  }

  return blocks;
}

/* =========================================================
   PAGE / TEXT HELPERS
========================================================= */

function bodyBottom(doc) {
  /*
    Footer тахминан 790 дан бошланади.
    Матн footer устига чиқиб кетмаслиги учун
    body bottom'ни 770 атрофида ушлаймиз.
  */
  return Math.min(
    doc.page.height -
      doc.page.margins.bottom,
    770
  );
}

function ensureSpace(doc, requiredHeight = 40) {
  if (
    doc.y + requiredHeight >
    bodyBottom(doc)
  ) {
    doc.addPage();
  }
}

function writeContractTitle(doc, text) {
  ensureSpace(doc, 70);

  doc
    .moveDown(0.15)
    .font('Bold')
    .fontSize(12.5)
    .fillColor('#111111')
    .text(text, {
      width: 495,
      align: 'center',
      lineGap: 1,
    })
    .moveDown(0.35);
}

function writeContractHeading(doc, text) {
  /*
    Сарлавҳа саҳифа охирида якка қолиб кетмаслиги
    учун камида сарлавҳа + 2-3 қатор матнга жой
    бўлишини текширамиз.
  */
  ensureSpace(doc, 62);

  doc
    .moveDown(0.22)
    .font('Bold')
    .fontSize(10.6)
    .fillColor('#111111')
    .text(text, {
      width: 495,
      align: 'left',
      lineGap: 0.7,
    })
    .moveDown(0.18);
}

function writeContractParagraph(doc, text) {
  if (!text) {
    return;
  }

  ensureSpace(doc, 24);

  doc
    .font('Regular')
    .fontSize(9.15)
    .fillColor('#111111')
    .text(text, {
      width: 495,
      align: 'justify',
      lineGap: 1.15,
      paragraphGap: 0,
    })
    .moveDown(0.24);
}

function writeContractBlocks(doc, blocks) {
  for (const block of blocks) {
    if (block.type === 'title') {
      writeContractTitle(
        doc,
        block.text
      );

      continue;
    }

    if (block.type === 'heading') {
      writeContractHeading(
        doc,
        block.text
      );

      continue;
    }

    writeContractParagraph(
      doc,
      block.text
    );
  }
}

/* =========================================================
   SMALL TEXT HELPERS
========================================================= */

function writeLabelValue(
  doc,
  label,
  value
) {
  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text(`${label}: `, {
      continued: true,
    })
    .font('Regular')
    .text(String(value ?? '—'))
    .moveDown(0.15);
}

function writeLabelValueAt(
  doc,
  x,
  y,
  label,
  value
) {
  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text(`${label}:`, x, y, {
      width: 230,
    })
    .font('Regular')
    .fontSize(8.5)
    .text(
      String(value ?? '—'),
      x,
      y + 14,
      {
        width: 230,
      }
    );
}

/* =========================================================
   HEADER / FOOTER
========================================================= */

function drawHeader(doc, logoPath) {
  if (logoPath) {
    doc.image(
      logoPath,
      50,
      28,
      {
        fit: [180, 48],
        align: 'left',
        valign: 'center',
      }
    );
  }

  doc
    .font('Regular')
    .fontSize(7.5)
    .fillColor('#666666')
    .text(
      '+998 99 999 79 73',
      360,
      37,
      {
        width: 185,
        align: 'right',
      }
    )
    .text(
      'goldenkeyinfo200@gmail.com',
      360,
      50,
      {
        width: 185,
        align: 'right',
      }
    );

  doc
    .strokeColor('#E30613')
    .lineWidth(1)
    .moveTo(50, 82)
    .lineTo(545, 82)
    .stroke();
}

function drawFooter(
  doc,
  contract,
  pageNumber,
  pageCount
) {
  /*
    MUHIM:
    PDFKit odatda matn pastki margin chegarasidan tashqariga yozilsa
    avtomatik yangi sahifa qo'shishi mumkin.

    Footer 790/798 nuqtalarda turadi, body bottom esa taxminan 770.
    Shu sabab eski variant ayrim PDF'larda oxirida bo'sh sahifalar
    yaratardi.

    Footer chizilayotgan paytda bottom margin'ni vaqtincha 0 qilamiz
    va matn uchun lineBreak'ni o'chiramiz. Shunda footer hech qachon
    yangi sahifa yaratmaydi.
  */

  const originalBottomMargin = doc.page.margins.bottom;

  doc.page.margins.bottom = 0;

  doc.save();

  doc
    .strokeColor('#E6E6E6')
    .lineWidth(0.6)
    .moveTo(50, 790)
    .lineTo(545, 790)
    .stroke();

  doc
    .font('Regular')
    .fontSize(7)
    .fillColor('#777777')
    .text(
      `${contract.displayId} · Golden Key OS · ${pageNumber}/${pageCount}`,
      50,
      798,
      {
        width: 495,
        height: 10,
        align: 'center',
        lineBreak: false,
      }
    );

  doc.restore();

  doc.page.margins.bottom = originalBottomMargin;
}

/* =========================================================
   COVER
========================================================= */

function coverTitle(caseItem) {
  if (caseItem.serviceType === 'SALE_PURCHASE') {
    return {
      main: 'КЎЧМАС МУЛК ОЛДИ-СОТДИСИНИ ТАШКИЛ ЭТИШ ВА РИЭЛТОРЛИК ХИЗМАТЛАРИ БЎЙИЧА',
      accent: 'УЧ ТОМОНЛАМА ЭЛЕКТРОН ШАРТНОМА',
    };
  }

  if (caseItem.serviceType === 'REALTOR_SERVICE') {
    return {
      main: 'РИЭЛТОРЛИК ХИЗМАТЛАРИНИ КЎРСАТИШ ТЎҒРИСИДА',
      accent: 'ЭЛЕКТРОН ШАРТНОМА',
    };
  }

  return {
    main: 'РИЭЛТОРЛИК ВА ИПОТЕКА ХИЗМАТЛАРИНИ КЎРСАТИШ ТЎҒРИСИДА',
    accent: 'ЭЛЕКТРОН ШАРТНОМА',
  };
}

function drawCover(
  doc,
  {
    logoPath,
    contract,
    caseItem,
    confirmation,
  }
) {
  if (logoPath) {
    doc.image(
      logoPath,
      95,
      90,
      {
        fit: [405, 105],
        align: 'center',
        valign: 'center',
      }
    );
  }

  const title = coverTitle(caseItem);

  doc
    .font('Bold')
    .fontSize(caseItem.serviceType === 'SALE_PURCHASE' ? 15.5 : 18)
    .fillColor('#111111')
    .text(
      title.main,
      60,
      225,
      {
        width: 475,
        align: 'center',
      }
    )
    .moveDown(0.35)
    .fontSize(caseItem.serviceType === 'SALE_PURCHASE' ? 18 : 20)
    .fillColor('#E30613')
    .text(
      title.accent,
      {
        align: 'center',
      }
    )
    .moveDown(1);

  doc
    .font('Bold')
    .fontSize(13)
    .fillColor('#111111')
    .text(
      `№ ${contract.displayId}`,
      {
        align: 'center',
      }
    )
    .moveDown(0.8)
    .font('Regular')
    .fontSize(10)
    .text(
      `Мурожаат: ${caseItem.displayId}`,
      {
        align: 'center',
      }
    )
    .text(
      `Қўқон шаҳри · ${formatDateTime(
        confirmation.signedAt
      )}`,
      {
        align: 'center',
      }
    );

  doc
    .roundedRect(
      95,
      430,
      405,
      125,
      10
    )
    .fillAndStroke(
      '#FFF7F7',
      '#F2B7BB'
    );

  doc
    .font('Bold')
    .fontSize(11)
    .fillColor('#B0000B')
    .text(
      'ФУҚАРОЛИК ЖАВОБГАРЛИГИ СУҒУРТАЛАНГАН',
      115,
      455,
      {
        width: 365,
        align: 'center',
      }
    )
    .moveDown(0.35)
    .font('Regular')
    .fontSize(10)
    .fillColor('#222222')
    .text(
      '«KAFOLAT» Суғурта компанияси АЖ',
      {
        width: 365,
        align: 'center',
      }
    )
    .text(
      'Суғурта полиси № 0077162 · 29.08.2025',
      {
        width: 365,
        align: 'center',
      }
    );

  doc
    .font('Regular')
    .fontSize(9)
    .fillColor('#666666')
    .text(
      '+998 99 999 79 73 · goldenkeyinfo200@gmail.com',
      150,
      690,
      {
        width: 295,
        align: 'center',
      }
    );
}

/* =========================================================
   VERIFICATION PAGE
========================================================= */

function confirmationTitle(caseItem, confirmations) {
  if (caseItem.serviceType === 'SALE_PURCHASE') {
    const buyer = confirmations.find((item) => item.role === 'BUYER');
    const seller = confirmations.find((item) => item.role === 'SELLER');

    if (buyer && seller) {
      return '✓ ОЛУВЧИ ВА СОТУВЧИ ТОМОНИДАН QR ОРҚАЛИ ТАСДИҚЛАНГАН';
    }
  }

  return '✓ QR ОРҚАЛИ ТАСДИҚЛАНГАН';
}

function drawConfirmationCard(doc, {
  x,
  y,
  width,
  confirmation,
  telegramId,
}) {
  doc
    .roundedRect(x, y, width, 150, 8)
    .fillAndStroke('#FAFAFA', '#D8D8D8');

  doc
    .font('Bold')
    .fontSize(10.5)
    .fillColor('#111111')
    .text(
      confirmation?.label || 'Тасдиқловчи',
      x + 12,
      y + 12,
      {
        width: width - 24,
        align: 'center',
      }
    );

  doc
    .font('Regular')
    .fontSize(8)
    .fillColor('#333333')
    .text(
      `Тасдиқланган: ${formatDateTime(confirmation?.signedAt)}`,
      x + 12,
      y + 38,
      {
        width: width - 24,
      }
    )
    .text(
      `Invitation ID: ${confirmation?.invitationId || '—'}`,
      x + 12,
      y + 58,
      {
        width: width - 24,
      }
    )
    .text(
      `IP манзил: ${confirmation?.ip || 'Қайд этилмаган'}`,
      x + 12,
      y + 82,
      {
        width: width - 24,
      }
    )
    .text(
      `Telegram ID: ${telegramId || 'Уланмаган'}`,
      x + 12,
      y + 104,
      {
        width: width - 24,
      }
    )
    .text(
      'Усул: Бир марталик QR-код',
      x + 12,
      y + 126,
      {
        width: width - 24,
      }
    );
}

function drawVerificationPage(
  doc,
  {
    contract,
    caseItem,
    confirmation,
    confirmations = [],
    verificationHash,
    qrBuffer,
    verificationUrl,
  }
) {
  doc.addPage();

  const normalizedConfirmations =
    confirmations.length > 0
      ? confirmations
      : [
          {
            role: 'CLIENT',
            label: 'Мижоз',
            invitationId: confirmation?.invitationId || null,
            signedAt: confirmation?.signedAt || contract.signedAt,
            ip: confirmation?.ip || null,
            userAgent: confirmation?.userAgent || null,
          },
        ];

  doc
    .font('Bold')
    .fontSize(17)
    .fillColor('#111111')
    .text(
      'ЭЛЕКТРОН ТАСДИҚ ВА ҲУЖЖАТНИ ТЕКШИРИШ',
      60,
      105,
      {
        width: 475,
        align: 'center',
      }
    );

  doc
    .roundedRect(
      65,
      150,
      465,
      95,
      10
    )
    .fillAndStroke(
      '#F0FBF5',
      '#9FD7B8'
    );

  doc
    .font('Bold')
    .fontSize(caseItem.serviceType === 'SALE_PURCHASE' ? 11.8 : 14)
    .fillColor('#087742')
    .text(
      confirmationTitle(caseItem, normalizedConfirmations),
      82,
      177,
      {
        width: 431,
        align: 'center',
      }
    )
    .font('Regular')
    .fontSize(9.5)
    .fillColor('#222222')
    .text(
      formatDateTime(contract.signedAt || confirmation?.signedAt),
      82,
      211,
      {
        width: 431,
        align: 'center',
      }
    );

  if (qrBuffer) {
    doc.image(
      qrBuffer,
      70,
      285,
      {
        fit: [155, 155],
      }
    );
  }

  doc
    .font('Bold')
    .fontSize(10)
    .fillColor('#111111')
    .text(
      'Шартномани текшириш QR-коди',
      60,
      450,
      {
        width: 175,
        align: 'center',
      }
    )
    .font('Regular')
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Golden Key OS реестрида шартноманинг ҳақиқийлиги ва тасдиқ ҳолатини текшириш учун сканерланг',
      55,
      468,
      {
        width: 185,
        align: 'center',
      }
    );

  doc
    .font('Bold')
    .fontSize(10)
    .fillColor('#111111')
    .text(
      'Шартнома рақами',
      270,
      290
    )
    .font('Regular')
    .fontSize(9)
    .text(
      contract.displayId,
      270,
      307,
      {
        width: 260,
      }
    );

  writeLabelValueAt(
    doc,
    270,
    340,
    'Мурожаат',
    caseItem.displayId
  );

  writeLabelValueAt(
    doc,
    270,
    375,
    'Ҳолат',
    contract.status === 'SIGNED'
      ? 'Тўлиқ тасдиқланган'
      : contract.status
  );

  writeLabelValueAt(
    doc,
    270,
    410,
    'Тасдиқланган сана',
    formatDateTime(contract.signedAt || confirmation?.signedAt)
  );

  if (caseItem.serviceType === 'SALE_PURCHASE') {
    const buyer =
      normalizedConfirmations.find((item) => item.role === 'BUYER') || null;

    const seller =
      normalizedConfirmations.find((item) => item.role === 'SELLER') || null;

    drawConfirmationCard(doc, {
      x: 55,
      y: 535,
      width: 235,
      confirmation: buyer,
      telegramId: caseItem.applicant?.telegramId || null,
    });

    drawConfirmationCard(doc, {
      x: 305,
      y: 535,
      width: 235,
      confirmation: seller,
      telegramId: caseItem.sellerTelegramId || null,
    });

    doc
      .font('Bold')
      .fontSize(8.5)
      .fillColor('#111111')
      .text(
        'SHA-256',
        55,
        705
      )
      .font('Regular')
      .fontSize(6.8)
      .text(
        verificationHash,
        55,
        721,
        {
          width: 485,
          lineGap: 1,
        }
      );

    doc
      .font('Bold')
      .fontSize(8.5)
      .fillColor('#111111')
      .text(
        'Текшириш манзили',
        55,
        760
      )
      .font('Regular')
      .fontSize(6.8)
      .fillColor('#444444')
      .text(
        verificationUrl,
        55,
        775,
        {
          width: 485,
          link: verificationUrl,
          underline: true,
        }
      );

    return;
  }

  const clientConfirmation = normalizedConfirmations[0];

  writeLabelValueAt(
    doc,
    270,
    445,
    'Invitation ID',
    clientConfirmation?.invitationId || '—'
  );

  writeLabelValueAt(
    doc,
    270,
    480,
    'IP манзил',
    clientConfirmation?.ip || 'Қайд этилмаган'
  );

  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text(
      'SHA-256',
      65,
      565
    )
    .font('Regular')
    .fontSize(7)
    .text(
      verificationHash,
      65,
      582,
      {
        width: 465,
        lineGap: 2,
      }
    );

  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text(
      'Текшириш манзили',
      65,
      630
    )
    .font('Regular')
    .fontSize(7.5)
    .fillColor('#444444')
    .text(
      verificationUrl,
      65,
      647,
      {
        width: 465,
        link: verificationUrl,
        underline: true,
      }
    );

  doc
    .font('Regular')
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Ушбу QR орқали тасдиқ электрон розиликни қайд этади. Қонунчилик ёки муайян битим учун малакавий электрон рақамли имзо талаб этилса, алоҳида E-IMZO ёки бошқа ваколатли имзо воситаси қўлланилади.',
      65,
      700,
      {
        width: 465,
        align: 'justify',
        lineGap: 2,
      }
    );
}

/* =========================================================
   GENERATE CONTRACT PDF
========================================================= */

export async function generateContractPdf({
  contract,
  caseItem,
  selectedOffer,
  confirmation,
  confirmations = [],
}) {
  if (
    !contract ||
    !caseItem ||
    !confirmation?.signedAt
  ) {
    const error = new Error(
      'PDF яратиш учун шартнома маълумотлари тўлиқ эмас'
    );

    error.status = 400;

    throw error;
  }

  /*
    Dynamic contract context.
  */
  const context =
    buildContractContext({
      contract,
      caseItem,
      selectedOffer,
    });

  /*
    DB'да сақланган template HTML
    мижоз маълумотлари билан тўлдирилади.
  */
  const renderedHtml =
    renderContractHtml(
      contract.template?.htmlBody,
      context
    );

  /*
    Энди HTML'ни structured blocks қилиб оламиз.
  */
  const contractBlocks =
    extractContractBlocks(
      renderedHtml
    );

  /*
    Электрон ҳужжат verification hash.
  */
  const verificationHash =
    contractVerificationHash({
      contract,
      renderedHtml,
      signedAt:
        confirmation.signedAt,
      invitationId:
        confirmation.invitationId,
      confirmations,
    });

  const regularFont =
    findExistingFile(
      FONT_CANDIDATES
    );

  const boldFont =
    findExistingFile(
      BOLD_FONT_CANDIDATES
    );

  const logoPath =
    findExistingFile(
      LOGO_CANDIDATES
    );

  if (!regularFont) {
    const error = new Error(
      'PDF учун DejaVu Sans шрифти топилмади. dejavu-fonts-ttf пакети ўрнатилганини текширинг.'
    );

    error.status = 503;

    throw error;
  }

  /*
    Verification QR.
  */
  const verificationUrl =
    buildVerificationUrl(
      contract
    );

  const qrBuffer =
    await QRCode.toBuffer(
      verificationUrl,
      {
        type: 'png',
        width: 500,
        margin: 2,
        errorCorrectionLevel: 'M',
      }
    );

  return new Promise(
    (resolve, reject) => {
      const chunks = [];

      const doc =
        new PDFDocument({
          size: 'A4',

          margins: {
            top: 100,
            bottom: 72,
            left: 50,
            right: 50,
          },

          info: {
            Title:
              contract.displayId,

            Author:
              'GOLDEN KEY INFO',

            Subject:
              'QR орқали электрон тарзда тасдиқланган шартнома',

            Keywords:
              'Golden Key, contract, QR confirmation',

            CreationDate:
              new Date(
                confirmation.signedAt
              ),
          },

          bufferPages: true,
          autoFirstPage: true,
        });

      doc.on(
        'data',
        (chunk) =>
          chunks.push(chunk)
      );

      doc.on(
        'error',
        reject
      );

      doc.on(
        'end',
        () => {
          resolve({
            buffer:
              Buffer.concat(chunks),

            verificationHash,

            renderedHtml,

            verificationUrl,
          });
        }
      );

      doc.registerFont(
        'Regular',
        regularFont
      );

      doc.registerFont(
        'Bold',
        boldFont ||
          regularFont
      );

      /* ===============================================
         1. COVER
      =============================================== */

      drawCover(doc, {
        logoPath,
        contract,
        caseItem,
        confirmation,
      });

      /* ===============================================
         2. CONTRACT TEXT
      =============================================== */

      doc.addPage();

      /*
        Бошланиш нуқтаси.
        Header 82px гача, шунинг учун матн 105px дан.
      */
      doc.y = 105;

      doc
        .font('Bold')
        .fontSize(14)
        .fillColor('#111111')
        .text(
          'ШАРТНОМА МАТНИ',
          50,
          doc.y,
          {
            width: 495,
            align: 'center',
          }
        )
        .moveDown(0.55);

      writeContractBlocks(
        doc,
        contractBlocks
      );

      /* ===============================================
         3. VERIFICATION PAGE
      =============================================== */

      drawVerificationPage(
        doc,
        {
          contract,
          caseItem,
          confirmation,
          confirmations,
          verificationHash,
          qrBuffer,
          verificationUrl,
        }
      );

      /* ===============================================
         4. HEADER + FOOTER FOR ALL PAGES
      =============================================== */

      const pageRange =
        doc.bufferedPageRange();

      for (
        let pageIndex =
          pageRange.start;

        pageIndex <
        pageRange.start +
          pageRange.count;

        pageIndex += 1
      ) {
        doc.switchToPage(
          pageIndex
        );

        /*
          Cover page'га header/footer қўймаймиз.
          Қолган барча саҳифаларда бир хил header.
        */
        if (pageIndex > 0) {
          drawHeader(
            doc,
            logoPath
          );

          drawFooter(
            doc,
            contract,
            pageIndex + 1,
            pageRange.count
          );
        }
      }

      doc.end();
    }
  );
}