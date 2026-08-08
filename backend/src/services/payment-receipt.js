import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';

const require = createRequire(import.meta.url);

function bundledFont(name) {
  try {
    return require.resolve(`dejavu-fonts-ttf/ttf/${name}`);
  } catch {
    return null;
  }
}

function existing(paths) {
  return (
    paths.find((filePath) => {
      try {
        return filePath && fs.existsSync(filePath);
      } catch {
        return false;
      }
    }) || null
  );
}

const FONT = existing([
  process.env.PDF_FONT_PATH,
  bundledFont('DejaVuSans.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
]);

const BOLD = existing([
  process.env.PDF_BOLD_FONT_PATH,
  bundledFont('DejaVuSans-Bold.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
]);

const LOGO = existing([
  process.env.PDF_LOGO_PATH,
  path.join(process.cwd(), 'assets', 'golden-key-logo.jpg'),
  path.join(process.cwd(), 'backend', 'assets', 'golden-key-logo.jpg'),
]);

const money = (value) =>
  `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} so'm`;

function dateTime(value) {
  const date = new Date(value || Date.now());

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

const SERVICE = {
  PRIMARY_MORTGAGE: 'Birlamchi ipoteka',
  SECONDARY_MORTGAGE: 'Ikkilamchi ipoteka',
  MICROLOAN: 'Mikroqarz',
  REALTOR_SERVICE: 'Riyeltorlik xizmati',
  SALE_PURCHASE: 'Oldi-sotdi',
  CADASTRE_SERVICE: 'Kadastr xizmati',
  OTHER: 'Boshqa',
};

export function makeReceiptNumber(payment) {
  const year = new Date(
    payment.paidAt || payment.createdAt || Date.now()
  ).getFullYear();

  const tail = String(payment.id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase()
    .padStart(8, '0');

  return `GK-PAY-${year}-${tail}`;
}

export function createPaymentReceiptPdf({
  payment,
  caseItem,
  paidBefore = 0,
  paidAfter = 0,
  remainingAfter = 0,
  operatorName = null,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
      });

      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (FONT) doc.registerFont('Regular', FONT);
      if (BOLD || FONT) {
        doc.registerFont('Bold', BOLD || FONT);
      }

      const regular = FONT ? 'Regular' : 'Helvetica';
      const bold =
        BOLD || FONT ? 'Bold' : 'Helvetica-Bold';

      const receiptNumber = makeReceiptNumber(payment);

      if (LOGO) {
        try {
          doc.image(LOGO, 48, 40, {
            fit: [70, 55],
          });
        } catch {
          // Logo бўлмаса ҳам PDF яратилади.
        }
      }

      doc
        .font(bold)
        .fontSize(19)
        .fillColor('#111111')
        .text("TO'LOV KVITANSIYASI", 135, 48);

      doc
        .font(regular)
        .fontSize(10)
        .fillColor('#666666')
        .text('OOO GOLDEN KEY INFO', 135, 76)
        .text(`Kvitansiya: ${receiptNumber}`, 135, 94);

      doc
        .moveTo(48, 126)
        .lineTo(547, 126)
        .strokeColor('#e5e7eb')
        .stroke();

      const rows = [
        ['Murojaat', caseItem.displayId || '—'],
        ['Mijoz', caseItem.applicant?.fullName || '—'],
        ['Telefon', caseItem.applicant?.phone || '—'],
        [
          'Xizmat',
          SERVICE[caseItem.serviceType] ||
            caseItem.serviceType ||
            '—',
        ],
        ['Filial', caseItem.branch?.name || '—'],
        [
          "To'lov sanasi",
          dateTime(payment.paidAt || payment.createdAt),
        ],
        ["To'lov usuli", payment.method || '—'],
        ['Chek / tranzaksiya', payment.reference || '—'],
      ];

      let y = 148;

      for (const [label, value] of rows) {
        doc
          .font(regular)
          .fontSize(10)
          .fillColor('#777777')
          .text(label, 48, y, {
            width: 180,
          });

        doc
          .font(bold)
          .fillColor('#111111')
          .text(String(value), 235, y, {
            width: 312,
          });

        y += 25;
      }

      y += 10;

      doc
        .roundedRect(48, y, 499, 132, 10)
        .fillAndStroke('#f8fafc', '#e5e7eb');

      const financeRows = [
        ['Xizmat haqi', money(caseItem.serviceFee)],
        ["Oldin to'langan", money(paidBefore)],
        ["Ushbu to'lov", money(payment.amount)],
        ["Jami to'langan", money(paidAfter)],
        ['Qoldiq', money(remainingAfter)],
      ];

      let fy = y + 15;

      for (const [label, value] of financeRows) {
        doc
          .font(regular)
          .fontSize(10)
          .fillColor('#666666')
          .text(label, 65, fy, {
            width: 210,
          });

        doc
          .font(bold)
          .fillColor('#111111')
          .text(value, 300, fy, {
            width: 225,
            align: 'right',
          });

        fy += 21;
      }

      y += 158;

      doc
        .font(bold)
        .fontSize(11)
        .fillColor(
          Number(remainingAfter) <= 0
            ? '#087742'
            : '#111111'
        )
        .text(
          Number(remainingAfter) <= 0
            ? "Xizmat haqi to'liq to'landi."
            : "To'lov qabul qilindi.",
          48,
          y,
          {
            width: 499,
            align: 'center',
          }
        );

      doc
        .font(regular)
        .fontSize(9)
        .fillColor('#777777')
        .text(
          `To'lovni qabul qilgan: ${
            operatorName || 'Golden Key xodimi'
          }`,
          48,
          y + 35
        )
        .text(
          "Ushbu elektron kvitansiya Golden Key OS tizimida avtomatik shakllantirildi.",
          48,
          y + 58,
          {
            width: 499,
            align: 'center',
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
