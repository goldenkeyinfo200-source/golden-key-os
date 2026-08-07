import { prisma } from '../config/prisma.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getBotToken() {
  return (
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.BOT_TOKEN?.trim() ||
    null
  );
}

/**
 * Битта фойдаланувчига Telegram орқали хабар юборади.
 */
export async function sendTelegramMessage(chatId, text) {
  const botToken = getBotToken();

  if (!botToken || !chatId) {
    return { sent: false, skipped: true };
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId),
          text,
          parse_mode: 'HTML',
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      console.error('Telegram хабар юборилмади:', data);
      return { sent: false, error: data.description || 'unknown_error' };
    }

    return { sent: true, messageId: data.result?.message_id || null };
  } catch (error) {
    console.error('Telegram хабар юборишда хато:', error.message);
    return { sent: false, error: error.message };
  }
}

async function notifyMany(chatIds, text) {
  const uniqueIds = [...new Set((chatIds || []).filter(Boolean))];
  return Promise.all(uniqueIds.map((id) => sendTelegramMessage(id, text)));
}

const STATUS_LABELS = {
  NEW: 'Янги',
  DATA_COLLECTION: 'Маълумот йиғилмоқда',
  BANK_REVIEW: 'Банк текширувида',
  CLIENT_PREAPPROVED: 'Дастлабки тасдиқ',
  OFFICE_VISIT: 'Офисга таклиф',
  CONTRACT_PENDING: 'Шартнома тайёрланмоқда',
  CONTRACT_SIGNED: 'Шартнома имзоланди',
  ASSIGNED_TO_EXECUTOR: 'Ижрочига бириктирилди',
  IN_EXECUTION: 'Ижрода',
  PROPERTY_MONITORING: 'Мулк мониторингида',
  CREDIT_APPROVED: 'Кредит тасдиқланган',
  CREDIT_ISSUED: 'Кредит чиқарилган',
  CLIENT_RECEIVED_FUNDS: 'Мижоз маблағни олди',
  SERVICE_FEE_PAID: 'Хизмат ҳақи тўланди',
  COMPLETED: 'Якунланган',
  REJECTED: 'Рад этилган',
  CANCELLED: 'Бекор қилинган',
  ARCHIVED: 'Архивланган',
};

/* =========================================================
   ЯНГИ МУРОЖААТ — раҳбарларга хабар
========================================================= */
export async function notifyNewCase(caseId) {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      displayId: true,
      serviceType: true,
      requestedAmount: true,
      applicant: { select: { fullName: true } },
    },
  });

  if (!caseItem) return;

  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'DIRECTOR', 'BRANCH_MANAGER'] },
      isActive: true,
      telegramId: { not: null },
    },
    select: { telegramId: true },
  });

  const text =
    `🆕 <b>Янги мурожаат</b>\n` +
    `№ ${caseItem.displayId}\n` +
    `Мижоз: ${caseItem.applicant?.fullName || '-'}\n` +
    `Хизмат: ${caseItem.serviceType}` +
    (caseItem.requestedAmount
      ? `\nСумма: ${caseItem.requestedAmount}`
      : '');

  return notifyMany(managers.map((m) => m.telegramId), text);
}

/* =========================================================
   МУРОЖААТ СТАТУСИ ЎЗГАРДИ — мижозга хабар
========================================================= */
export async function notifyCaseStatusChanged(caseId, fromStatus, toStatus) {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      displayId: true,
      applicant: { select: { telegramId: true } },
    },
  });

  if (!caseItem?.applicant?.telegramId) {
    return { sent: false, skipped: true };
  }

  const text =
    `📋 <b>Аризангиз ҳолати ўзгарди</b>\n` +
    `№ ${caseItem.displayId}\n` +
    `${STATUS_LABELS[fromStatus] || fromStatus} → <b>${
      STATUS_LABELS[toStatus] || toStatus
    }</b>`;

  return sendTelegramMessage(caseItem.applicant.telegramId, text);
}

/* =========================================================
   БАНККА БИРИКТИРИЛДИ — банк ходимларига хабар
========================================================= */
export async function notifyBankAssignment(caseId, bankId) {
  const [caseItem, employees] = await Promise.all([
    prisma.case.findUnique({
      where: { id: caseId },
      select: { displayId: true, serviceType: true, requestedAmount: true },
    }),
    prisma.user.findMany({
      where: {
        bankId,
        role: 'BANK_EMPLOYEE',
        isActive: true,
        telegramId: { not: null },
      },
      select: { telegramId: true },
    }),
  ]);

  if (!caseItem) return;

  const text =
    `🏦 <b>Янги мурожаат текширувга юборилди</b>\n` +
    `№ ${caseItem.displayId}\n` +
    `Хизмат: ${caseItem.serviceType}` +
    (caseItem.requestedAmount
      ? `\nСумма: ${caseItem.requestedAmount}`
      : '');

  return notifyMany(employees.map((e) => e.telegramId), text);
}

/* =========================================================
   БАНК ХОДИМИ ТЕКШИРУВ НАТИЖАСИ — қабул қилувчи/админларга хабар
========================================================= */
export async function notifyBankReview(assignmentId) {
  const assignment = await prisma.caseBankAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      status: true,
      bank: { select: { name: true } },
      case: {
        select: {
          displayId: true,
          receptionManager: { select: { telegramId: true } },
        },
      },
    },
  });

  if (!assignment) return;

  const recipients = [];

  if (assignment.case?.receptionManager?.telegramId) {
    recipients.push(assignment.case.receptionManager.telegramId);
  }

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'DIRECTOR'] },
      isActive: true,
      telegramId: { not: null },
    },
    select: { telegramId: true },
  });

  recipients.push(...admins.map((a) => a.telegramId));

  const text =
    `🏦 <b>Банк жавоби келди</b>\n` +
    `№ ${assignment.case?.displayId || '-'}\n` +
    `Банк: ${assignment.bank?.name || '-'}\n` +
    `Ҳолат: ${assignment.status}`;

  return notifyMany(recipients, text);
}

/* =========================================================
   БАНК ТАКЛИФИ ЮБОРИЛДИ — раҳбарга хабар
========================================================= */
export async function notifyBankOfferSubmitted(offerId) {
  const offer = await prisma.bankOffer.findUnique({
    where: { id: offerId },
    select: {
      bankName: true,
      interestRate: true,
      approvedAmount: true,
      case: {
        select: {
          displayId: true,
          receptionManager: { select: { telegramId: true } },
        },
      },
    },
  });

  if (!offer) return;

  const recipients = [];

  if (offer.case?.receptionManager?.telegramId) {
    recipients.push(offer.case.receptionManager.telegramId);
  }

  const text =
    `💼 <b>Банкдан таклиф келди</b>\n` +
    `№ ${offer.case?.displayId || '-'}\n` +
    `Банк: ${offer.bankName}` +
    (offer.interestRate ? `\nСтавка: ${offer.interestRate}%` : '') +
    (offer.approvedAmount ? `\nСумма: ${offer.approvedAmount}` : '');

  return notifyMany(recipients, text);
}
