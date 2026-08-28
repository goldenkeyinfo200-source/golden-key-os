import fs from 'node:fs';
import path from 'node:path';

const target =
  process.argv[2] ||
  path.join(
    process.cwd(),
    'backend',
    'src',
    'services',
    'contract-pdf.js'
  );

if (!fs.existsSync(target)) {
  console.error(
    `contract-pdf.js топилмади: ${target}`
  );
  process.exit(1);
}

let source =
  fs.readFileSync(
    target,
    'utf8'
  );

if (
  source.includes(
    'function drawHandwrittenSignaturePage('
  )
) {
  console.log(
    'Signature PDF patch аввал қўлланган.'
  );
  process.exit(0);
}

const helperMarker =
  '/* =========================================================\\n   GENERATE CONTRACT PDF\\n========================================================= */';

const helperCode = `
/* =========================================================
   HANDWRITTEN SIGNATURE PAGE
========================================================= */

function signatureBufferFromDataUrl(dataUrl) {
  if (
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:image/png;base64,')
  ) {
    return null;
  }

  try {
    return Buffer.from(
      dataUrl.slice('data:image/png;base64,'.length),
      'base64'
    );
  } catch {
    return null;
  }
}

function drawSignatureBox(
  doc,
  {
    x,
    y,
    width,
    height,
    confirmation,
  }
) {
  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      9
    )
    .fillAndStroke(
      '#FAFAFA',
      '#D9DDE3'
    );

  doc
    .font('Bold')
    .fontSize(11)
    .fillColor('#111111')
    .text(
      confirmation?.label ||
        'Тасдиқловчи',
      x + 14,
      y + 14,
      {
        width: width - 28,
        align: 'center',
      }
    );

  const signatureBuffer =
    signatureBufferFromDataUrl(
      confirmation?.signatureDataUrl
    );

  if (signatureBuffer) {
    try {
      doc.image(
        signatureBuffer,
        x + 20,
        y + 46,
        {
          fit: [
            width - 40,
            105,
          ],
          align: 'center',
          valign: 'center',
        }
      );
    } catch {
      doc
        .font('Regular')
        .fontSize(9)
        .fillColor('#B42318')
        .text(
          'Имзо расмини PDFга жойлашда хато',
          x + 20,
          y + 80,
          {
            width: width - 40,
            align: 'center',
          }
        );
    }
  } else {
    doc
      .font('Regular')
      .fontSize(9)
      .fillColor('#777777')
      .text(
        'Қўл имзоси сақланмаган',
        x + 20,
        y + 85,
        {
          width: width - 40,
          align: 'center',
        }
      );
  }

  doc
    .strokeColor('#C8CDD4')
    .lineWidth(0.7)
    .moveTo(
      x + 25,
      y + 158
    )
    .lineTo(
      x + width - 25,
      y + 158
    )
    .stroke();

  doc
    .font('Regular')
    .fontSize(8)
    .fillColor('#444444')
    .text(
      \`Тасдиқланган: \${formatDateTime(
        confirmation?.signedAt
      )}\`,
      x + 14,
      y + 172,
      {
        width: width - 28,
        align: 'center',
      }
    );

  if (
    confirmation?.signatureHash
  ) {
    doc
      .font('Regular')
      .fontSize(6.5)
      .fillColor('#777777')
      .text(
        \`Имзо SHA-256: \${confirmation.signatureHash}\`,
        x + 14,
        y + 192,
        {
          width: width - 28,
          align: 'center',
        }
      );
  }
}

function drawHandwrittenSignaturePage(
  doc,
  {
    contract,
    caseItem,
    confirmations = [],
  }
) {
  const signedConfirmations =
    confirmations.filter(
      (item) =>
        Boolean(
          item?.signatureDataUrl
        )
    );

  if (
    signedConfirmations.length === 0
  ) {
    return;
  }

  doc.addPage();

  doc
    .font('Bold')
    .fontSize(17)
    .fillColor('#111111')
    .text(
      'ТОМОНЛАРНИНГ ҚЎЛ ИМЗОЛАРИ',
      60,
      110,
      {
        width: 475,
        align: 'center',
      }
    )
    .font('Regular')
    .fontSize(9)
    .fillColor('#666666')
    .text(
      \`\${contract.displayId} · \${caseItem.displayId}\`,
      60,
      140,
      {
        width: 475,
        align: 'center',
      }
    );

  if (
    signedConfirmations.length === 1
  ) {
    drawSignatureBox(
      doc,
      {
        x: 120,
        y: 205,
        width: 355,
        height: 235,
        confirmation:
          signedConfirmations[0],
      }
    );
  } else {
    drawSignatureBox(
      doc,
      {
        x: 55,
        y: 205,
        width: 235,
        height: 235,
        confirmation:
          signedConfirmations[0],
      }
    );

    drawSignatureBox(
      doc,
      {
        x: 305,
        y: 205,
        width: 235,
        height: 235,
        confirmation:
          signedConfirmations[1],
      }
    );
  }

  doc
    .font('Regular')
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Ушбу саҳифадаги имзо тасвири телефон/планшет экранида чизилган ва бир марталик QR-токен, тасдиқланган вақт ҳамда Golden Key OS аудит журнали билан боғланган.',
      75,
      500,
      {
        width: 445,
        align: 'justify',
        lineGap: 2,
      }
    );
}

`;

if (!source.includes(helperMarker)) {
  console.error(
    'GENERATE CONTRACT PDF marker топилмади. contract-pdf.js версиясини текширинг.'
  );
  process.exit(2);
}

source =
  source.replace(
    helperMarker,
    helperCode +
      '\\n' +
      helperMarker
  );

const callMarker = `      drawVerificationPage(
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
      );`;

const callCode =
  callMarker +
  `

      /*
        4. HANDWRITTEN SIGNATURE PAGE
      */
      drawHandwrittenSignaturePage(
        doc,
        {
          contract,
          caseItem,
          confirmations,
        }
      );`;

if (!source.includes(callMarker)) {
  console.error(
    'drawVerificationPage call marker топилмади. contract-pdf.js версиясини текширинг.'
  );
  process.exit(3);
}

source =
  source.replace(
    callMarker,
    callCode
  );

fs.writeFileSync(
  target,
  source,
  'utf8'
);

console.log(
  '✓ contract-pdf.js га қўл имзоси PDF саҳифаси қўшилди.'
);
