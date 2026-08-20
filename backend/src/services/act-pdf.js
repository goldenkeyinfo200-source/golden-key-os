import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';

import PDFDocument from 'pdfkit';

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
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
].filter(Boolean);

const BOLD_FONT_CANDIDATES = [
  process.env.PDF_BOLD_FONT_PATH,
  resolveBundledFont('DejaVuSans-Bold.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
].filter(Boolean);

function findExistingFile(candidates) {
  return candidates.find((item) => {
    try {
      return Boolean(item) && fs.existsSync(item);
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

function verificationHash(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function writeTitle(doc, title, displayId) {
  doc
    .font('Bold')
    .fontSize(15)
    .text(title, { align: 'center' })
    .moveDown(0.5)
    .fontSize(11)
    .text(`№ ${displayId}`, { align: 'center' })
    .moveDown(1);
}

function writeLine(doc, label, value) {
  doc
    .font('Bold')
    .fontSize(9.5)
    .text(`${label}: `, { continued: true })
    .font('Regular')
    .text(String(value ?? '—'))
    .moveDown(0.22);
}

function writeItems(doc, items, mapper) {
  items.forEach((item, index) => {
    const lines = mapper(item, index);
    doc.font('Regular').fontSize(9.3).text(lines, {
      width: 495,
      align: 'left',
      lineGap: 1.2,
    }).moveDown(0.3);
  });
}

export async function generateDocumentHandoverPdf({
  handover,
  caseItem,
  confirmation,
}) {
  const regularFont = findExistingFile(FONT_CANDIDATES);
  const boldFont = findExistingFile(BOLD_FONT_CANDIDATES) || regularFont;

  if (!regularFont) {
    const error = new Error('PDF учун DejaVu Sans шрифти топилмади');
    error.status = 503;
    throw error;
  }

  const isReceipt = handover.type === 'RECEIPT';
  const title = isReceipt
    ? 'МИЖОЗДАН ҲУЖЖАТЛАРНИ ҚАБУЛ ҚИЛИШ ДАЛОЛАТНОМАСИ'
    : 'МИЖОЗГА ҲУЖЖАТЛАРНИ ҚАЙТАРИШ ДАЛОЛАТНОМАСИ';

  const hash = verificationHash({
    kind: 'DOCUMENT_HANDOVER',
    handoverId: handover.id,
    displayId: handover.displayId,
    caseId: handover.caseId,
    type: handover.type,
    confirmedAt: confirmation.confirmedAt,
    invitationId: confirmation.invitationId,
    items: handover.items.map((x) => ({
      id: x.documentItem.id,
      name: x.documentItem.name,
      series: x.documentItem.series,
      number: x.documentItem.number,
      kind: x.documentItem.kind,
      quantity: x.quantity,
    })),
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 55, bottom: 55, left: 50, right: 50 },
      info: {
        Title: handover.displayId,
        Author: 'GOLDEN KEY INFO',
        Subject: title,
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve({
      buffer: Buffer.concat(chunks),
      verificationHash: hash,
    }));

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);

    writeTitle(doc, title, handover.displayId);

    writeLine(doc, 'Мурожаат', caseItem.displayId);
    writeLine(doc, 'Мижоз', caseItem.applicant?.fullName || '—');
    writeLine(doc, 'Телефон', caseItem.applicant?.phone || '—');
    writeLine(doc, 'ЖШШИР', caseItem.applicant?.pinfl || '—');
    writeLine(doc, 'Тасдиқланган сана ва вақт', formatDateTime(confirmation.confirmedAt));
    doc.moveDown(0.5);

    doc.font('Bold').fontSize(10.5).text('Ҳужжатлар рўйхати').moveDown(0.45);

    writeItems(doc, handover.items, (row, index) => {
      const item = row.documentItem;
      const number = [item.series, item.number].filter(Boolean).join(' ');
      return `${index + 1}. ${item.name} · ${item.kind} · ${row.quantity} дона${number ? ` · ${number}` : ''}${row.conditionNote ? ` · Ҳолати: ${row.conditionNote}` : ''}`;
    });

    doc.moveDown(0.7);

    const statement = isReceipt
      ? 'Мижоз юқорида кўрсатилган ҳужжатларни Ижрочига топширганини ва рўйхатдаги маълумотлар тўғри эканини QR орқали тасдиқлади.'
      : 'Мижоз юқорида кўрсатилган ҳужжатларни бут ва тўлиқ ҳолда қайтариб олганини QR орқали тасдиқлади.';

    doc
      .font('Regular')
      .fontSize(9.5)
      .text(statement, { align: 'justify', lineGap: 1.5 })
      .moveDown(0.8);

    writeLine(doc, 'QR тасдиқ идентификатори', confirmation.invitationId || '—');
    writeLine(doc, 'IP манзил', confirmation.ip || 'Қайд этилмаган');
    writeLine(doc, 'SHA-256', hash);

    if (handover.note) {
      doc.moveDown(0.5);
      writeLine(doc, 'Изоҳ', handover.note);
    }

    doc.moveDown(1);
    doc.font('Bold').fontSize(9.5).text('ИЖРОЧИ: «GOLDEN KEY INFO» МЧЖ');
    doc.font('Regular').fontSize(8.8).text(
      'Фарғона вилояти, Қўқон шаҳри, А. Т. Ҳўқандий мавзеси, 132-О · +998 99 999 79 73'
    );

    doc.end();
  });
}

export async function generateServiceCompletionPdf({
  act,
  caseItem,
  confirmation,
}) {
  const regularFont = findExistingFile(FONT_CANDIDATES);
  const boldFont = findExistingFile(BOLD_FONT_CANDIDATES) || regularFont;

  if (!regularFont) {
    const error = new Error('PDF учун DejaVu Sans шрифти топилмади');
    error.status = 503;
    throw error;
  }

  const hash = verificationHash({
    kind: 'SERVICE_COMPLETION',
    actId: act.id,
    displayId: act.displayId,
    caseId: act.caseId,
    confirmedAt: confirmation.confirmedAt,
    invitationId: confirmation.invitationId,
    items: act.items.map((x) => ({
      title: x.title,
      details: x.details,
      completed: x.completed,
    })),
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 55, bottom: 55, left: 50, right: 50 },
      info: {
        Title: act.displayId,
        Author: 'GOLDEN KEY INFO',
        Subject: 'Бажарилган ишлар (кўрсатилган хизматлар) далолатномаси',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve({
      buffer: Buffer.concat(chunks),
      verificationHash: hash,
    }));

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);

    writeTitle(
      doc,
      'БАЖАРИЛГАН ИШЛАР (КЎРСАТИЛГАН ХИЗМАТЛАР) ДАЛОЛАТНОМАСИ',
      act.displayId
    );

    writeLine(doc, 'Мурожаат', caseItem.displayId);
    writeLine(doc, 'Мижоз', caseItem.applicant?.fullName || '—');
    writeLine(doc, 'Телефон', caseItem.applicant?.phone || '—');
    writeLine(doc, 'Хизмат тури', act.serviceType);
    writeLine(doc, 'Хизмат йўналиши', act.serviceDirection || '—');
    writeLine(doc, 'Тасдиқланган сана ва вақт', formatDateTime(confirmation.confirmedAt));

    if (act.summary) {
      doc.moveDown(0.5);
      writeLine(doc, 'Умумий изоҳ', act.summary);
    }

    doc.moveDown(0.5);
    doc.font('Bold').fontSize(10.5).text('Бажарилган ишлар').moveDown(0.45);

    writeItems(doc, act.items, (item, index) => {
      const details = item.details ? ` — ${item.details}` : '';
      return `${index + 1}. ${item.title}${details}`;
    });

    doc.moveDown(0.7);
    doc
      .font('Regular')
      .fontSize(9.5)
      .text(
        'Мижоз юқорида кўрсатилган ишлар/хизматлар бажарилганини, натижа билан танишганини ва далолатнома мазмунини QR орқали тасдиқлаганини қайд этади.',
        { align: 'justify', lineGap: 1.5 }
      )
      .moveDown(0.8);

    if (act.clientClaims) {
      writeLine(doc, 'Мижоз эътирози/изоҳи', act.clientClaims);
    } else {
      writeLine(doc, 'Мижоз эътирози/изоҳи', 'Қайд этилмаган');
    }

    writeLine(doc, 'QR тасдиқ идентификатори', confirmation.invitationId || '—');
    writeLine(doc, 'IP манзил', confirmation.ip || 'Қайд этилмаган');
    writeLine(doc, 'SHA-256', hash);

    doc.moveDown(1);
    doc.font('Bold').fontSize(9.5).text('ИЖРОЧИ: «GOLDEN KEY INFO» МЧЖ');
    doc.font('Regular').fontSize(8.8).text(
      'Фарғона вилояти, Қўқон шаҳри, А. Т. Ҳўқандий мавзеси, 132-О · +998 99 999 79 73'
    );

    doc.end();
  });
}
