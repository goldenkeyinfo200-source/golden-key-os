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
