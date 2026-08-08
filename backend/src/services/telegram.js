const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getBotToken() {
  return (
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.BOT_TOKEN?.trim() ||
    null
  );
}

export async function sendContractPdfToClient({
  telegramId,
  pdfBuffer,
  fileName,
  contractDisplayId,
}) {
  const botToken = getBotToken();

  if (!botToken || !telegramId) {
    return {
      sent: false,
      skipped: true,
      reason: !botToken
        ? 'Telegram bot token созланмаган'
        : 'Мижоз Telegram ID уланмаган',
    };
  }

  const formData = new FormData();

  formData.append('chat_id', String(telegramId));
  formData.append(
    'caption',
    `✅ Шартномангиз тасдиқланди.\n\n📄 ${contractDisplayId}\n\nPDF ҳужжат илова қилинди.`
  );

  formData.append(
    'document',
    new Blob([pdfBuffer], {
      type: 'application/pdf',
    }),
    fileName
  );

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/sendDocument`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.description ||
        'Telegram бот орқали PDF юбориб бўлмади'
    );

    error.status = 502;
    error.telegramResponse = data;
    throw error;
  }

  return {
    sent: true,
    skipped: false,
    messageId: data.result?.message_id || null,
  };
}


export async function sendPaymentReceiptToClient({
  telegramId,
  pdfBuffer,
  fileName,
  receiptNumber,
  caseDisplayId,
  paidAmount,
  remainingAmount,
}) {
  const botToken = getBotToken();

  if (!botToken || !telegramId) {
    return {
      sent: false,
      skipped: true,
      reason: !botToken
        ? 'Telegram bot token созланмаган'
        : 'Мижоз Telegram ID уланмаган',
    };
  }

  const money = (value) =>
    `${new Intl.NumberFormat('uz-UZ').format(Number(value || 0))} сўм`;

  const caption = [
    '🧾 ТЎЛОВ КВИТАНЦИЯСИ',
    '',
    `Квитанция: ${receiptNumber}`,
    `Мурожаат: ${caseDisplayId}`,
    `Тўланган сумма: ${money(paidAmount)}`,
    `Қолдиқ: ${money(remainingAmount)}`,
    '',
    Number(remainingAmount || 0) <= 0
      ? '✅ Хизмат ҳақи тўлиқ тўланди.'
      : '✅ Тўлов қабул қилинди.',
    '',
    'PDF квитанция илова қилинди.',
  ].join('\n');

  const formData = new FormData();

  formData.append('chat_id', String(telegramId));
  formData.append('caption', caption);
  formData.append(
    'document',
    new Blob([pdfBuffer], { type: 'application/pdf' }),
    fileName
  );

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/sendDocument`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.description ||
        'Telegram бот орқали тўлов квитанциясини юбориб бўлмади'
    );

    error.status = 502;
    error.telegramResponse = data;
    throw error;
  }

  return {
    sent: true,
    skipped: false,
    messageId: data.result?.message_id || null,
  };
}
