import crypto from 'node:crypto';
import fs from 'node:fs';

import { htmlToText } from 'html-to-text';
import PDFDocument from 'pdfkit';

import {
  buildContractContext,
  renderContractHtml,
} from './contract-template.js';

const FONT_CANDIDATES = [
  process.env.PDF_FONT_PATH,
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
].filter(Boolean);

const BOLD_FONT_CANDIDATES = [
  process.env.PDF_BOLD_FONT_PATH,
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
].filter(Boolean);

function findExistingFont(candidates) {
  return candidates.find((fontPath) => {
    try {
      return fs.existsSync(fontPath);
    } catch {
      return false;
    }
  }) || null;
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

function writeHeading(doc, text) {
  doc
    .moveDown(0.5)
    .font('Bold')
    .fontSize(12)
    .text(text, {
      align: 'left',
    })
    .moveDown(0.25);
}

function writeLabelValue(doc, label, value) {
  doc
    .font('Bold')
    .fontSize(9)
    .text(`${label}: `, {
      continued: true,
    })
    .font('Regular')
    .text(String(value ?? '—'))
    .moveDown(0.15);
}

export async function generateContractPdf({
  contract,
  caseItem,
  selectedOffer,
  confirmation,
}) {
  const context = buildContractContext({
    contract,
    caseItem,
    selectedOffer,
  });

  const renderedHtml = renderContractHtml(
    contract.template.htmlBody,
    context
  );

  const contractText = htmlToText(renderedHtml, {
    wordwrap: 100,
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
    ],
  });

  const verificationHash = contractVerificationHash({
    contract,
    renderedHtml,
    signedAt: confirmation.signedAt,
    invitationId: confirmation.invitationId,
  });

  const regularFont = findExistingFont(FONT_CANDIDATES);
  const boldFont = findExistingFont(BOLD_FONT_CANDIDATES);

  if (!regularFont) {
    const error = new Error(
      'PDF учун кирилл алифбосини қўллаб-қувватлайдиган систем шрифти топилмади. Railway image ичида DejaVu Sans ўрнатилиши ёки PDF_FONT_PATH берилиши керак.'
    );
    error.status = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 45,
        bottom: 45,
        left: 50,
        right: 50,
      },
      info: {
        Title: contract.displayId,
        Author: 'GOLDEN KEY INFO',
        Subject: 'Мижоз томонидан QR орқали тасдиқланган шартнома',
        Keywords: 'Golden Key, contract, QR confirmation',
        CreationDate: new Date(confirmation.signedAt),
      },
      bufferPages: true,
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        verificationHash,
        renderedHtml,
      });
    });

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont || regularFont);

    doc
      .font('Bold')
      .fontSize(18)
      .text('GOLDEN KEY INFO', {
        align: 'center',
      })
      .moveDown(0.25)
      .fontSize(13)
      .text('ЭЛЕКТРОН ТАРЗДА ТАСДИҚЛАНГАН ШАРТНОМА', {
        align: 'center',
      })
      .moveDown(0.75);

    doc
      .font('Regular')
      .fontSize(9)
      .text(`Шартнома рақами: ${contract.displayId}`, {
        align: 'center',
      })
      .text(`Мурожаат рақами: ${caseItem.displayId}`, {
        align: 'center',
      })
      .text(`Тасдиқланган вақт: ${formatDateTime(confirmation.signedAt)}`, {
        align: 'center',
      })
      .moveDown(1);

    doc
      .strokeColor('#D9D9D9')
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    writeHeading(doc, 'Шартнома матни');

    doc
      .font('Regular')
      .fontSize(10)
      .text(contractText, {
        align: 'justify',
        lineGap: 3,
      });

    if (doc.y > 650) {
      doc.addPage();
    }

    writeHeading(doc, 'Электрон тасдиқ маълумотлари');

    writeLabelValue(doc, 'Ҳолат', 'Тасдиқланган');
    writeLabelValue(
      doc,
      'Тасдиқланган сана ва вақт',
      formatDateTime(confirmation.signedAt)
    );
    writeLabelValue(doc, 'Тасдиқлаш усули', 'Бир марталик QR-код');
    writeLabelValue(doc, 'Invitation ID', confirmation.invitationId);
    writeLabelValue(doc, 'IP манзил', confirmation.ip || 'Қайд этилмаган');
    writeLabelValue(
      doc,
      'Қурилма ва браузер',
      confirmation.userAgent || 'Қайд этилмаган'
    );
    writeLabelValue(
      doc,
      'Мижоз Telegram ID',
      caseItem.applicant?.telegramId || 'Уланмаган'
    );

    doc
      .moveDown(0.6)
      .font('Bold')
      .fontSize(9)
      .text('Текширув SHA-256:', {
        continued: false,
      })
      .font('Regular')
      .fontSize(7)
      .text(verificationHash, {
        lineBreak: true,
      })
      .moveDown(0.8);

    doc
      .font('Regular')
      .fontSize(8)
      .fillColor('#666666')
      .text(
        'Ушбу ҳужжат Golden Key OS тизимида бир марталик QR-код орқали берилган электрон розилик асосида шакллантирилди.',
        {
          align: 'center',
        }
      );

    const pageRange = doc.bufferedPageRange();

    for (
      let pageIndex = pageRange.start;
      pageIndex < pageRange.start + pageRange.count;
      pageIndex += 1
    ) {
      doc.switchToPage(pageIndex);

      doc
        .font('Regular')
        .fontSize(7)
        .fillColor('#777777')
        .text(
          `${contract.displayId} · ${pageIndex + 1}/${pageRange.count}`,
          50,
          805,
          {
            width: 495,
            align: 'center',
          }
        );
    }

    doc.end();
  });
}
