import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { sendTelegramMessage } from '../services/notify.js';

const router = Router();
const MAX_AGE = 3600;

function verifyTelegram(req, res, next) {
  const raw = req.headers['x-telegram-init-data'];
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || process.env.BOT_TOKEN?.trim();
  if (typeof raw !== 'string' || !raw || !token || raw.length > 8192) return res.status(401).json({ ok: false, error: 'Telegram тасдиғи талаб қилинади' });
  try {
    const params = new URLSearchParams(raw);
    const hash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash) || !Number.isSafeInteger(authDate) || authDate > now + 60 || now - authDate > MAX_AGE) throw new Error('expired');
    params.delete('hash');
    const dataCheck = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    const calculated = createHmac('sha256', secret).update(dataCheck).digest();
    if (!timingSafeEqual(calculated, Buffer.from(hash, 'hex'))) throw new Error('invalid');
    const user = JSON.parse(params.get('user') || '{}');
    if (!/^[0-9]+$/.test(String(user.id || ''))) throw new Error('no user');
    req.telegramId = String(user.id);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Telegram сессияси ҳақиқий эмас ёки муддати тугаган' });
  }
}
router.use(verifyTelegram);

async function ownedCase(caseId, telegramId) {
  return prisma.case.findFirst({
    where: { id: caseId, applicant: { telegramId } },
    select: { id: true, displayId: true, status: true, bankName: true, approvedAmount: true, receptionManagerId: true, executorId: true, applicant: { select: { fullName: true } } },
  });
}

router.get('/cases/:caseId/offers', async (req, res, next) => {
  try {
    const item = await ownedCase(req.params.caseId, req.telegramId);
    if (!item) return res.status(404).json({ ok: false, error: 'Мурожаат топилмади' });
    const offers = await prisma.bankOffer.findMany({
      where: { caseId: item.id, status: { in: ['SUBMITTED', 'SELECTED'] }, approvedAmount: { gt: 0 } },
      select: { id: true, bankName: true, status: true, approvedAmount: true, interestRate: true, termMonths: true, initialPayment: true, monthlyPayment: true, insuranceAmount: true, commissionAmount: true, validUntil: true, conditions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, case: { displayId: item.displayId }, offers });
  } catch (error) { next(error); }
});

router.post('/cases/:caseId/offers/:offerId/select', async (req, res, next) => {
  try {
    const caseItem = await ownedCase(req.params.caseId, req.telegramId);
    if (!caseItem) return res.status(404).json({ ok: false, error: 'Мурожаат топилмади' });
    const result = await prisma.$transaction(async (tx) => {
      // Бир мурожаат учун параллел танлашларни сериаллаштирамиз.
      await tx.$queryRaw`SELECT id FROM "Case" WHERE id = ${caseItem.id} FOR UPDATE`;
      const already = await tx.bankOffer.findFirst({ where: { caseId: caseItem.id, status: 'SELECTED' }, select: { id: true } });
      if (already) return { conflict: true };
      const offer = await tx.bankOffer.findFirst({ where: { id: req.params.offerId, caseId: caseItem.id, status: 'SUBMITTED', approvedAmount: { gt: 0 } } });
      if (!offer) return { missing: true };
      await tx.bankOffer.update({ where: { id: offer.id }, data: { status: 'SELECTED', selectedAt: new Date() } });
      if (offer.bankId) {
        await tx.caseBankAssignment.updateMany({ where: { caseId: caseItem.id }, data: { status: 'CLOSED' } });
        await tx.caseBankAssignment.updateMany({ where: { caseId: caseItem.id, bankId: offer.bankId }, data: { status: 'SELECTED', respondedAt: new Date() } });
      }
      const percent = Number((await tx.case.findUnique({ where: { id: caseItem.id }, select: { serviceFeePercent: true } })).serviceFeePercent);
      const autoAmount = Math.round(Number(offer.approvedAmount) * percent / 100);
      await tx.case.update({ where: { id: caseItem.id }, data: {
        bankName: offer.bankName, approvedAmount: offer.approvedAmount,
        serviceFeeAutoAmount: autoAmount,
        // serviceFee қўлда белгиланган бўлиши мумкин — уни ўзгартирмаймиз.
        status: 'CLIENT_PREAPPROVED', nextAction: 'Мижоз танлаган банк таклифини кўриб чиқиш',
      } });
      await tx.caseHistory.create({ data: { caseId: caseItem.id, fromStatus: caseItem.status, toStatus: 'CLIENT_PREAPPROVED', note: `Мижоз Mini App орқали ${offer.bankName} таклифини танлади` } });
      await tx.auditLog.create({ data: { entityType: 'BankOffer', entityId: offer.id, action: 'CLIENT_SELECTED_BANK_OFFER', metadata: { caseId: caseItem.id, telegramId: req.telegramId, bankName: offer.bankName } } });
      return { offer };
    });
    if (result.conflict) return res.status(409).json({ ok: false, error: 'Ушбу мурожаат бўйича таклиф аввал танланган' });
    if (result.missing) return res.status(409).json({ ok: false, error: 'Таклиф мавжуд эмас ёки танлаш учун очиқ эмас' });
    // Хабар юбориш танлаш транзакциясини бекор қилмаслиги керак.
    const managers = await prisma.user.findMany({ where: { id: { in: [caseItem.receptionManagerId, caseItem.executorId].filter(Boolean) } }, select: { telegramId: true } });
    const message = `🏦 <b>Golden Key OS</b>\nМурожаат: ${caseItem.displayId}\nМижоз <b>${result.offer.bankName.replace(/[<>&"']/g, '')}</b> банк таклифини танлади.`;
    await Promise.allSettled(managers.filter((u) => u.telegramId).map((u) => sendTelegramMessage(u.telegramId, message)));
    if (result.offer.bankEmployeeId) {
      const employee = await prisma.user.findUnique({ where: { id: result.offer.bankEmployeeId }, select: { telegramId: true } });
      if (employee?.telegramId) await sendTelegramMessage(employee.telegramId, message);
    }
    res.json({ ok: true, message: 'Танловингиз қабул қилинди', selectedOfferId: result.offer.id });
  } catch (error) { next(error); }
});
export default router;
