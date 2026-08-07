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

function resolveBundledFont(fileName) {
  try {
    return require.resolve(`dejavu-fonts-ttf/ttf/${fileName}`);
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
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
].filter(Boolean);

const LOGO_CANDIDATES = [
  process.env.PDF_LOGO_PATH,
  path.join(process.cwd(), 'assets', 'golden-key-logo.jpg'),
  path.join(process.cwd(), 'backend', 'assets', 'golden-key-logo.jpg'),
].filter(Boolean);

function findExistingFile(candidates) {
  return (
    candidates.find((filePath) => {
      try {
        return Boolean(filePath) && fs.existsSync(filePath);
      } catch {
        return false;
      }
    }) || null
  );
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

function contractVerificationHash({
  contract,
  renderedHtml,
  signedAt,
  invitationId,
}) {
  const canonical = JSON.stringify({
    contractId: contract.id,
    displayId: contract.displayId,
    caseId: contract.caseId,
    templateId: contract.templateId,
    signedAt: new Date(signedAt).toISOString(),
    invitationId,
    renderedHtml,
  });

  return crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');
}

function buildVerificationUrl(contract) {
  const baseUrl =
    process.env.PUBLIC_VERIFY_URL?.replace(/\/+$/, '') ||
    'https://taplink.cc/goldenkey';

  if (process.env.PUBLIC_VERIFY_URL) {
    return `${baseUrl}/${encodeURIComponent(contract.displayId)}`;
  }

  return baseUrl;
}

function writeHeading(doc, text) {
  doc
    .moveDown(0.5)
    .font('Bold')
    .fontSize(12)
    .fillColor('#111111')
    .text(text, {
      align: 'left',
    })
    .moveDown(0.25);
}

function writeLabelValue(doc, label, value) {
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

function drawHeader(doc, logoPath) {
  if (logoPath) {
    doc.image(logoPath, 50, 28, {
      fit: [180, 48],
      align: 'left',
      valign: 'center',
    });
  }

  doc
    .font('Regular')
    .fontSize(7.5)
    .fillColor('#666666')
    .text('www.taplink.cc/goldenkey', 360, 37, {
      width: 185,
      align: 'right',
      link: 'https://taplink.cc/goldenkey',
      underline: true,
    })
    .text('+998 99 999 79 73', 360, 50, {
      width: 185,
      align: 'right',
    });

  doc
    .strokeColor('#E30613')
    .lineWidth(1)
    .moveTo(50, 82)
    .lineTo(545, 82)
    .stroke();
}

function drawFooter(doc, contract, pageNumber, pageCount) {
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
        align: 'center',
      }
    );
}

function drawCover(doc, { logoPath, contract, caseItem, confirmation }) {
  if (logoPath) {
    doc.image(logoPath, 95, 90, {
      fit: [405, 105],
      align: 'center',
      valign: 'center',
    });
  }

  doc
    .font('Bold')
    .fontSize(18)
    .fillColor('#111111')
    .text('РИЭЛТОРЛИК ВА ИПОТЕКА ХИЗМАТЛАРИНИ КЎРСАТИШ ТЎҒРИСИДА', 60, 235, {
      width: 475,
      align: 'center',
    })
    .moveDown(0.35)
    .fontSize(20)
    .fillColor('#E30613')
    .text('ЭЛЕКТРОН ШАРТНОМА', {
      align: 'center',
    })
    .moveDown(1);

  doc
    .font('Bold')
    .fontSize(13)
    .fillColor('#111111')
    .text(`№ ${contract.displayId}`, {
      align: 'center',
    })
    .moveDown(0.8)
    .font('Regular')
    .fontSize(10)
    .text(`Мурожаат: ${caseItem.displayId}`, {
      align: 'center',
    })
    .text(`Қўқон шаҳри · ${formatDateTime(confirmation.signedAt)}`, {
      align: 'center',
    });

  doc
    .roundedRect(95, 430, 405, 125, 10)
    .fillAndStroke('#FFF7F7', '#F2B7BB');

  doc
    .font('Bold')
    .fontSize(11)
    .fillColor('#B0000B')
    .text('ФУҚАРОЛИК ЖАВОБГАРЛИГИ СУҒУРТАЛАНГАН', 115, 455, {
      width: 365,
      align: 'center',
    })
    .moveDown(0.35)
    .font('Regular')
    .fontSize(10)
    .fillColor('#222222')
    .text('«KAFOLAT» Суғурта компанияси АЖ', {
      width: 365,
      align: 'center',
    })
    .text('Суғурта полиси № 0077162 · 29.08.2025', {
      width: 365,
      align: 'center',
    });

  doc
    .font('Regular')
    .fontSize(9)
    .fillColor('#666666')
    .text('www.taplink.cc/goldenkey', 150, 690, {
      width: 295,
      align: 'center',
      link: 'https://taplink.cc/goldenkey',
      underline: true,
    })
    .text('+998 99 999 79 73 · goldenkeyinfo200@gmail.com', {
      width: 295,
      align: 'center',
    });
}

function drawVerificationPage(doc, {
  logoPath,
  contract,
  caseItem,
  confirmation,
  verificationHash,
  qrBuffer,
  verificationUrl,
}) {
  doc.addPage();
  drawHeader(doc, logoPath);

  doc
    .font('Bold')
    .fontSize(17)
    .fillColor('#111111')
    .text('ЭЛЕКТРОН ТАСДИҚ ВА ҲУЖЖАТНИ ТЕКШИРИШ', 60, 110, {
      width: 475,
      align: 'center',
    });

  doc
    .roundedRect(65, 160, 465, 95, 10)
    .fillAndStroke('#F0FBF5', '#9FD7B8');

  doc
    .font('Bold')
    .fontSize(14)
    .fillColor('#087742')
    .text('✓ QR ОРҚАЛИ ТАСДИҚЛАНГАН', 85, 185, {
      width: 425,
      align: 'center',
    })
    .font('Regular')
    .fontSize(10)
    .fillColor('#222222')
    .text(formatDateTime(confirmation.signedAt), {
      width: 425,
      align: 'center',
    });

  if (qrBuffer) {
    doc.image(qrBuffer, 80, 300, {
      fit: [175, 175],
    });
  }

  doc
    .font('Bold')
    .fontSize(10)
    .fillColor('#111111')
    .text('QR-код', 80, 485, {
      width: 175,
      align: 'center',
    })
    .font('Regular')
    .fontSize(8)
    .fillColor('#666666')
    .text(
      process.env.PUBLIC_VERIFY_URL
        ? 'Ҳужжат ҳолатини текшириш учун сканерланг'
        : 'Golden Key маълумот саҳифасини очиш учун сканерланг',
      70,
      500,
      {
        width: 195,
        align: 'center',
      }
    );

  doc
    .font('Bold')
    .fontSize(10)
    .fillColor('#111111')
    .text('Шартнома рақами', 300, 305)
    .font('Regular')
    .fontSize(9)
    .text(contract.displayId, 300, 322, {
      width: 230,
    });

  writeLabelValueAt(doc, 300, 355, 'Мурожаат', caseItem.displayId);
  writeLabelValueAt(doc, 300, 390, 'Invitation ID', confirmation.invitationId || '—');
  writeLabelValueAt(doc, 300, 425, 'IP манзил', confirmation.ip || 'Қайд этилмаган');
  writeLabelValueAt(
    doc,
    300,
    460,
    'Telegram ID',
    caseItem.applicant?.telegramId || 'Уланмаган'
  );

  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text('SHA-256', 65, 565)
    .font('Regular')
    .fontSize(7)
    .text(verificationHash, 65, 582, {
      width: 465,
      lineGap: 2,
    });

  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text('QR манзили', 65, 630)
    .font('Regular')
    .fontSize(7.5)
    .fillColor('#444444')
    .text(verificationUrl, 65, 647, {
      width: 465,
      link: verificationUrl,
      underline: true,
    });

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

function writeLabelValueAt(doc, x, y, label, value) {
  doc
    .font('Bold')
    .fontSize(9)
    .fillColor('#111111')
    .text(`${label}:`, x, y, {
      width: 230,
    })
    .font('Regular')
    .fontSize(8.5)
    .text(String(value ?? '—'), x, y + 14, {
      width: 230,
    });
}

export async function generateContractPdf({
  contract,
  caseItem,
  selectedOffer,
  confirmation,
}) {
  if (!contract || !caseItem || !confirmation?.signedAt) {
    const error = new Error('PDF яратиш учун шартнома маълумотлари тўлиқ эмас');
    error.status = 400;
    throw error;
  }

  const context = buildContractContext({
    contract,
    caseItem,
    selectedOffer,
  });

  const renderedHtml = renderContractHtml(
    contract.template?.htmlBody,
    context
  );

  const contractText = htmlToText(renderedHtml, {
    wordwrap: 105,
    preserveNewlines: true,
    selectors: [
      {
        selector: 'h1',
        options: {
          uppercase: false,
        },
      },
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

  const verificationHash = contractVerificationHash({
    contract,
    renderedHtml,
    signedAt: confirmation.signedAt,
    invitationId: confirmation.invitationId,
  });

  const regularFont = findExistingFile(FONT_CANDIDATES);
  const boldFont = findExistingFile(BOLD_FONT_CANDIDATES);
  const logoPath = findExistingFile(LOGO_CANDIDATES);

  if (!regularFont) {
    const error = new Error(
      'PDF учун DejaVu Sans шрифти топилмади. dejavu-fonts-ttf пакети ўрнатилганини текширинг.'
    );
    error.status = 503;
    throw error;
  }

  const verificationUrl = buildVerificationUrl(contract);
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    type: 'png',
    width: 500,
    margin: 2,
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    const chunks = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 100,
        bottom: 60,
        left: 50,
        right: 50,
      },
      info: {
        Title: contract.displayId,
        Author: 'GOLDEN KEY INFO',
        Subject: 'QR орқали электрон тарзда тасдиқланган шартнома',
        Keywords: 'Golden Key, contract, QR confirmation',
        CreationDate: new Date(confirmation.signedAt),
      },
      bufferPages: true,
      autoFirstPage: true,
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        verificationHash,
        renderedHtml,
        verificationUrl,
      });
    });

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont || regularFont);

    drawCover(doc, {
      logoPath,
      contract,
      caseItem,
      confirmation,
    });

    doc.addPage();
    drawHeader(doc, logoPath);

    doc
      .font('Bold')
      .fontSize(15)
      .fillColor('#111111')
      .text('ШАРТНОМА МАТНИ', 50, 105, {
        width: 495,
        align: 'center',
      })
      .moveDown(1);

    doc
      .font('Regular')
      .fontSize(9.3)
      .fillColor('#111111')
      .text(contractText, {
        align: 'justify',
        lineGap: 2.4,
      });

    drawVerificationPage(doc, {
      logoPath,
      contract,
      caseItem,
      confirmation,
      verificationHash,
      qrBuffer,
      verificationUrl,
    });

    const pageRange = doc.bufferedPageRange();

    for (
      let pageIndex = pageRange.start;
      pageIndex < pageRange.start + pageRange.count;
      pageIndex += 1
    ) {
      doc.switchToPage(pageIndex);

      if (pageIndex > 0) {
        drawFooter(
          doc,
          contract,
          pageIndex + 1,
          pageRange.count
        );
      }
    }

    doc.end();
  });
}
