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

const SERVICE_TYPE_OPTIONS = [
  ['PRIMARY_MORTGAGE', '🏠 Бирламчи ипотека'],
  ['SECONDARY_MORTGAGE', '🏡 Иккиламчи ипотека'],
  ['MICROLOAN', '💳 Микрокредит'],
  ['REALTOR_SERVICE', '🤝 Риелтор хизмати'],
  ['SALE_PURCHASE', '📄 Олди-сотди'],
  ['CADASTRE_SERVICE', '📐 Кадастр хизмати'],
  ['OTHER', '📋 Бошқа'],
];

const MAIN_MENU = Markup.keyboard([
  ['🆕 Янги мурожаат'],
  ['📄 Аризам ҳолати'],
  ['📱 Телефонни юбориш'],
]).resize();

/**
 * Ҳар бир фойдаланувчининг жараёндаги ҳолати шу ерда сақланади
 * (хотирада). Бот бир нечта instance'да ишламаса, бу етарли.
 */
const sessions = new Map();

/**
 * Telegram deep-link манбаси шу ерда сақланади.
 * /start telegram_ipoteka_01 -> source/campaign мурожаатгача сақланади.
 */
const attributions = new Map();

function getSession(id) {
  return sessions.get(id);
}

function setSession(id, session) {
  sessions.set(id, session);
}

function clearSession(id) {
  sessions.delete(id);
}

function serviceTypeLabel(value) {
  return (
    SERVICE_TYPE_OPTIONS.find(([v]) => v === value)?.[1] || value
  );
}

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


async function trackProgress(telegramId, step, extra = {}) {
  try {
    await callCrm('/telegram/progress', {
      method: 'POST',
      body: JSON.stringify({
        telegramId,
        step,
        serviceType: extra.serviceType || null,
      }),
    });
  } catch (error) {
    console.error(
      `Progress track error (${step}):`,
      error.message
    );
  }
}

const FUNNEL_STEP_LABELS = {
  STARTED: 'ботга кириш',
  APPLICATION_STARTED: 'мурожаатни бошлаш',
  PHONE_SENT: 'телефон рақами',
  SERVICE_SELECTED: 'хизмат танлаш',
  AMOUNT_ENTERED: 'суммани киритиш',
  COMMENT_DONE: 'изоҳ',
  NAME_ENTERED: 'Ф.И.Ш.',
  CONFIRMATION_REACHED: 'тасдиқлаш',
};

async function sendAbandonedReminders() {
  try {
    const data = await callCrm(
      '/telegram/abandoned-due?minutes=30&limit=20'
    );

    for (const item of data.items || []) {
      try {
        const stepLabel =
          FUNNEL_STEP_LABELS[item.funnelStep] ||
          'мурожаат';

        await bot.telegram.sendMessage(
          item.telegramId,
          `Салом${item.firstName ? `, ${item.firstName}` : ''}! 👋\n\n` +
            `Сиз Golden Key Info ботида мурожаатни бошлаган эдингиз, лекин ${stepLabel} босқичида тўхтаб қолдингиз.\n\n` +
            `Давом эттириш учун «🆕 Янги мурожаат» тугмасини босинг. Агар ҳозир керак бўлмаса, хабарни эътиборсиз қолдиришингиз мумкин.`,
          MAIN_MENU
        );

        await callCrm('/telegram/reminder-sent', {
          method: 'POST',
          body: JSON.stringify({
            visitId: item.visitId,
          }),
        });
      } catch (error) {
        console.error(
          'Abandoned reminder send error:',
          error.message
        );
      }
    }
  } catch (error) {
    console.error(
      'Abandoned reminder scan error:',
      error.message
    );
  }
}

/* =========================================================
   /start
========================================================= */
bot.start(async (ctx) => {
  clearSession(ctx.from.id);

  const startParameter =
    typeof ctx.startPayload === 'string' && ctx.startPayload.trim()
      ? ctx.startPayload.trim()
      : 'direct';

  let attribution = {
    source: startParameter === 'direct'
      ? 'DIRECT'
      : String(startParameter.split('_')[0] || 'telegram').toUpperCase(),
    campaign:
      startParameter === 'direct'
        ? 'direct'
        : startParameter.split('_').slice(1).join('_') || startParameter,
    startParameter,
  };

  try {
    const tracked = await callCrm('/telegram/track', {
      method: 'POST',
      body: JSON.stringify({
        telegramId: ctx.from.id,
        startParam: startParameter,
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
      }),
    });

    attribution = {
      source: tracked.source || attribution.source,
      campaign: tracked.campaign || attribution.campaign,
      startParameter: tracked.startParam || startParameter,
    };
  } catch (error) {
    console.error('Marketing track error:', error.message);
  }

  attributions.set(ctx.from.id, attribution);

  await ctx.reply(
    `Ассалому алайкум, ${ctx.from.first_name}!\n\nGolden Key Info рақамли хизматлар ботига хуш келибсиз.\n\n` +
      `🆕 — янги мурожаат (ипотека/микрокредит) қолдириш\n` +
      `📄 — мавжуд аризангиз ҳолатини кўриш\n` +
      `📱 — телефонингизни тизимга боғлаш`,
    MAIN_MENU
  );
});

/* =========================================================
   ЯНГИ МУРОЖААТ — оқим бошланиши
========================================================= */
bot.hears('🆕 Янги мурожаат', async (ctx) => {
  const attribution = attributions.get(ctx.from.id) || {
    source: 'DIRECT',
    campaign: 'direct',
    startParameter: 'direct',
  };

  setSession(ctx.from.id, {
    step: 'contact',
    data: {
      ...attribution,
    },
  });

  await trackProgress(ctx.from.id, 'APPLICATION_STARTED');

  await ctx.reply(
    'Мурожаат қолдириш учун аввало телефон рақамингизни тасдиқлаймиз.',
    Markup.keyboard([
      [Markup.button.contactRequest('📲 Телефонни юбориш')],
    ]).resize()
  );
});

/* =========================================================
   Телефон рақамини сўраш (умумий, боғлаш учун)
========================================================= */
bot.hears('📱 Телефонни юбориш', async (ctx) => {
  setSession(ctx.from.id, { step: 'link', data: {} });

  await ctx.reply(
    'Телефон рақамингизни юборинг',
    Markup.keyboard([
      [Markup.button.contactRequest('📲 Телефонни юбориш')],
    ]).resize()
  );
});

/* =========================================================
   Телефон қабул қилинди
========================================================= */
bot.on('contact', async (ctx) => {
  const phone = ctx.message.contact.phone_number;
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  // Мурожаат оқими ичида — телефонни сессияда сақлаб, хизмат турини сўраймиз
  if (session?.step === 'contact') {
    session.data.phone = phone;
    session.data.fullName =
      [ctx.message.contact.first_name, ctx.message.contact.last_name]
        .filter(Boolean)
        .join(' ') || null;
    session.step = 'service_type';
    setSession(telegramId, session);

    await trackProgress(telegramId, 'PHONE_SENT');

    await ctx.reply(
      'Раҳмат! Энди қандай хизмат кераклигини танланг:',
      Markup.removeKeyboard()
    );
    await ctx.reply(
      'Хизмат тури',
      Markup.inlineKeyboard(
        SERVICE_TYPE_OPTIONS.map(([value, label]) => [
          Markup.button.callback(label, `svc:${value}`),
        ])
      )
    );
    return;
  }

  // Оддий боғлаш (мавжуд ходим/мижоз учун — статус кўриш, хабар олиш)
  clearSession(telegramId);

  try {
    const data = await callCrm('/telegram/link', {
      method: 'POST',
      body: JSON.stringify({ phone, telegramId }),
    });

    let roleText = 'мижоз';
    if (data.type === 'bank_employee') roleText = 'банк ходими';
    else if (data.type === 'staff') roleText = 'ходим';

    let extra = '';
    if (data.type !== 'client' && !data.hasPassword) {
      extra =
        '\n\nСизга ҳали парол ўрнатилмаган. CRM саҳифасида "Паролни ўрнатиш" тугмасини босиб, шу ботга келадиган код орқали парол қўйишингиз мумкин.';
    }

    await ctx.reply(
      `✅ Телефон рақамингиз тасдиқланди, ${data.fullName}!\n\n` +
        `Сиз ${roleText} сифатида тизимга боғландингиз. Энди мурожаатингиз ҳолати ўзгарганда сизга шу бот орқали хабар келади.${extra}`,
      MAIN_MENU
    );
  } catch (error) {
    if (error.status === 404) {
      await ctx.reply(
        'Бу телефон рақами бўйича тизимда маълумот топилмади. Агар биринчи марта мурожаат қилаётган бўлсангиз, "🆕 Янги мурожаат" тугмасидан фойдаланинг.',
        MAIN_MENU
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
   Хизмат тури танланди
========================================================= */
bot.action(/^svc:(.+)$/, async (ctx) => {
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  if (!session || session.step !== 'service_type') {
    await ctx.answerCbQuery();
    return;
  }

  session.data.serviceType = ctx.match[1];
  session.step = 'amount';
  setSession(telegramId, session);

  await trackProgress(telegramId, 'SERVICE_SELECTED', {
    serviceType: session.data.serviceType,
  });

  await ctx.answerCbQuery();
  await ctx
    .editMessageText(`Танланди: ${serviceTypeLabel(session.data.serviceType)}`)
    .catch(() => {});

  await ctx.reply(
    'Тахминий сўралаётган сумма қанча (сўмда)? Рақам билан ёзинг.\n\nБилмасангиз, пастдаги тугмани босинг.',
    Markup.inlineKeyboard([
      [Markup.button.callback('Кўрсатмайман', 'amount:skip')],
    ])
  );
});

bot.action('amount:skip', async (ctx) => {
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  if (!session || session.step !== 'amount') {
    await ctx.answerCbQuery();
    return;
  }

  session.data.requestedAmount = null;
  session.step = 'comment';
  setSession(telegramId, session);

  await trackProgress(telegramId, 'AMOUNT_ENTERED');

  await ctx.answerCbQuery();
  await ctx.editMessageText('Сумма кўрсатилмади.').catch(() => {});

  await ctx.reply(
    'Қўшимча изоҳ ёзмоқчимисиз? (мулк манзили, шошилинчлик ва ҳ.к.)\n\nБўлмаса, пастдаги тугмани босинг.',
    Markup.inlineKeyboard([
      [Markup.button.callback('Изоҳсиз', 'comment:skip')],
    ])
  );
});

bot.action('comment:skip', async (ctx) => {
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  if (!session || session.step !== 'comment') {
    await ctx.answerCbQuery();
    return;
  }

  session.data.comment = null;
  session.step = 'fullname';
  setSession(telegramId, session);

  await trackProgress(telegramId, 'COMMENT_DONE');

  await ctx.answerCbQuery();
  await ctx.editMessageText('Изоҳ киритилмади.').catch(() => {});

  await askFullName(ctx, session);
});

async function askFullName(ctx, session) {
  const suggestion = session.data.fullName
    ? `\n\nТахминий: ${session.data.fullName} — шуни ишлатиш учун ҳам ёзиб жўнатинг.`
    : '';

  await ctx.reply(
    `Тўлиқ исм-шарифингизни ёзинг (Ф.И.Ш.):${suggestion}`
  );
}

async function sendConfirmation(ctx, session) {
  const d = session.data;

  const text =
    `Мурожаатни текширинг:\n\n` +
    `👤 Ф.И.Ш.: ${d.fullName}\n` +
    `📞 Телефон: ${d.phone}\n` +
    `🏦 Хизмат: ${serviceTypeLabel(d.serviceType)}\n` +
    `💰 Сумма: ${d.requestedAmount ? d.requestedAmount + " сўм" : 'кўрсатилмаган'}\n` +
    `📝 Изоҳ: ${d.comment || 'йўқ'}\n\n` +
    `Юборамизми?`;

  await ctx.reply(
    text,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Юбориш', 'case:confirm')],
      [Markup.button.callback('❌ Бекор қилиш', 'case:cancel')],
    ])
  );
}

/* =========================================================
   Матн орқали киритиладиган қадамлар: сумма / изоҳ / Ф.И.Ш.
========================================================= */
bot.on('text', async (ctx, next) => {
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  if (!session) return next();

  const text = ctx.message.text.trim();

  if (session.step === 'amount') {
    const amount = Number(text.replace(/\s/g, '').replace(',', '.'));

    if (!Number.isFinite(amount) || amount < 0) {
      await ctx.reply(
        'Илтимос, фақат рақам киритинг (мисол: 250000000) ёки "Кўрсатмайман" тугмасини босинг.'
      );
      return;
    }

    session.data.requestedAmount = amount;
    session.step = 'comment';
    setSession(telegramId, session);

    await trackProgress(telegramId, 'AMOUNT_ENTERED');

    await ctx.reply(
      'Қўшимча изоҳ ёзмоқчимисиз? Бўлмаса, пастдаги тугмани босинг.',
      Markup.inlineKeyboard([
        [Markup.button.callback('Изоҳсиз', 'comment:skip')],
      ])
    );
    return;
  }

  if (session.step === 'comment') {
    session.data.comment = text.slice(0, 500);
    session.step = 'fullname';
    setSession(telegramId, session);

    await trackProgress(telegramId, 'COMMENT_DONE');

    await askFullName(ctx, session);
    return;
  }

  if (session.step === 'fullname') {
    if (text.length < 3) {
      await ctx.reply('Илтимос, тўлиқ исм-шарифингизни ёзинг.');
      return;
    }

    session.data.fullName = text.slice(0, 200);
    session.step = 'confirm';
    setSession(telegramId, session);

    await trackProgress(telegramId, 'NAME_ENTERED');
    await trackProgress(
      telegramId,
      'CONFIRMATION_REACHED'
    );

    await sendConfirmation(ctx, session);
    return;
  }

  return next();
});

/* =========================================================
   Тасдиқлаш — CRM'га юбориш
========================================================= */
bot.action('case:confirm', async (ctx) => {
  const telegramId = ctx.from.id;
  const session = getSession(telegramId);

  if (!session || session.step !== 'confirm') {
    await ctx.answerCbQuery();
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText('⏳ Юборилмоқда...').catch(() => {});

  try {
    const result = await callCrm('/telegram/case', {
      method: 'POST',
      body: JSON.stringify({
        phone: session.data.phone,
        telegramId,
        fullName: session.data.fullName,
        serviceType: session.data.serviceType,
        requestedAmount: session.data.requestedAmount,
        comment: session.data.comment,
        source: session.data.source || null,
        campaign: session.data.campaign || null,
        startParameter: session.data.startParameter || null,
      }),
    });

    clearSession(telegramId);

    await ctx.reply(
      `✅ Мурожаатингиз қабул қилинди!\n\nАриза рақами: №${result.displayId}\n\nМенежерларимиз тез орада боғланади. Ҳолатни "📄 Аризам ҳолати" тугмаси орқали кузатиб боришингиз мумкин.`,
      MAIN_MENU
    );
  } catch (error) {
    console.error('Case create error:', error.message);
    await ctx.reply(
      'Мурожаатни юборишда хатолик юз берди. Кейинроқ қайта уриниб кўринг.',
      MAIN_MENU
    );
  }
});

bot.action('case:cancel', async (ctx) => {
  const telegramId = ctx.from.id;

  await trackProgress(telegramId, 'CANCELLED');
  clearSession(telegramId);

  await ctx.answerCbQuery();
  await ctx.editMessageText('Бекор қилинди.').catch(() => {});
  await ctx.reply('Асосий менюга қайтдингиз.', MAIN_MENU);
});

/* =========================================================
   Ариза ҳолатини сўраш
========================================================= */
bot.hears('📄 Аризам ҳолати', async (ctx) => {
  try {
    const data = await callCrm(
      `/telegram/cases?telegramId=${ctx.from.id}`
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
  .then(() => {
    console.log('Golden Key OS Telegram bot ишга тушди');

    // Ҳар 5 дақиқада 30+ дақиқа тўхтаб қолган
    // анкеталарни текшириб, бир марта эслатма юборади.
    setTimeout(sendAbandonedReminders, 60 * 1000);
    setInterval(
      sendAbandonedReminders,
      5 * 60 * 1000
    );
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));