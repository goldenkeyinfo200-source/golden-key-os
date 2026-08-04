import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CRM_API = process.env.CRM_API;
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET;

if (!token) {
  console.log('BOT_TOKEN ҳали киритилмаган.');
  process.exit(0);
}

if (!CRM_API) {
  console.log('CRM_API ҳали киритилмаган. CRM билан боғланиш ишламайди.');
}

const bot = new Telegraf(token);

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

/**
 * CRM backend'га сўров юборувчи ёрдамчи функция.
 * Ҳар бир сўровга X-Bot-Secret header'и қўшилади,
 * шунга кўра backend буни ботдан келган сўров деб танийди.
 */
async function callCrm(path, options = {}) {
  if (!CRM_API) {
    throw new Error('CRM_API созланмаган');
  }

  const response = await fetch(`${CRM_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Secret': BOT_INTERNAL_SECRET || '',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'CRM хатоси');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/* =========================================================
   /start
========================================================= */
bot.start(async (ctx) => {
  await ctx.reply(
    `Ассалому алайкум, ${ctx.from.first_name}!\n\nGolden Key Info рақамли хизматлар ботига хуш келибсиз.`,
    Markup.keyboard([
      ['📄 Аризам ҳолати'],
      ['📱 Телефонни юбориш'],
    ]).resize()
  );
});

/* =========================================================
   Телефон рақамини сўраш
========================================================= */
bot.hears('📱 Телефонни юбориш', async (ctx) => {
  await ctx.reply(
    'Телефон рақамингизни юборинг',
    Markup.keyboard([
      [Markup.button.contactRequest('📲 Телефонни юбориш')],
    ]).resize()
  );
});

/* =========================================================
   Телефон қабул қилинди — CRM'га боғлаймиз
========================================================= */
bot.on('contact', async (ctx) => {
  const phone = ctx.message.contact.phone_number;
  const telegramId = ctx.from.id;

  try {
    const data = await callCrm('/api/telegram/link', {
      method: 'POST',
      body: JSON.stringify({ phone, telegramId }),
    });

    const roleText = data.type === 'client' ? 'мижоз' : 'ходим';

    await ctx.reply(
      `✅ Телефон рақамингиз тасдиқланди, ${data.fullName}!\n\n` +
        `Сиз ${roleText} сифатида тизимга боғландингиз. Энди мурожаатингиз ҳолати ўзгарганда сизга шу бот орқали хабар келади.`,
      Markup.keyboard([['📄 Аризам ҳолати']]).resize()
    );
  } catch (error) {
    if (error.status === 404) {
      await ctx.reply(
        'Бу телефон рақами бўйича тизимда маълумот топилмади. Илтимос, аввал офисимизга мурожаат қилинг ёки рақамни текшириб қайта юборинг.'
      );
    } else {
      console.error('Link error:', error.message);
      await ctx.reply(
        'Телефонни боғлашда хатолик юз берди. Кейинроқ қайта уриниб кўринг.'
      );
    }
  }
});

/* =========================================================
   Ариза ҳолатини сўраш
========================================================= */
bot.hears('📄 Аризам ҳолати', async (ctx) => {
  try {
    const data = await callCrm(
      `/api/telegram/cases?telegramId=${ctx.from.id}`
    );

    if (!data.items || data.items.length === 0) {
      await ctx.reply('Ҳозирча сизда актив заявка мавжуд эмас.');
      return;
    }

    const text = data.items
      .map((item) => {
        const label = STATUS_LABELS[item.status] || item.status;
        return `📄 №${item.displayId}\nҲолат: ${label}`;
      })
      .join('\n\n');

    await ctx.reply(text);
  } catch (error) {
    console.error('Cases fetch error:', error.message);
    await ctx.reply(
      'Ҳолатни олишда хатолик юз берди. Кейинроқ қайта уриниб кўринг.'
    );
  }
});

bot
  .launch()
  .then(() => console.log('Golden Key OS Telegram bot ишга тушди'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));