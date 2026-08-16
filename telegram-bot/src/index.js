import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CRM_API = process.env.CRM_API;
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET;

const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const PUBLIC_BOT_USERNAME =
  (process.env.PUBLIC_BOT_USERNAME || 'gkos_bot').replace(/^@/, '');

const POSTING_ADMIN_IDS = new Set(
  String(process.env.POSTING_ADMIN_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

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


const BANK_MENU = Markup.keyboard([
  ['🏦 Банк мурожаатлари'],
  ['📱 Телефонни юбориш'],
]).resize();

function bankCaseButtons(caseId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '📋 Мурожаатни кўриш',
        `bank:view:${caseId}`
      ),
    ],
    [
      Markup.button.callback(
        '✅ Таклиф бериш',
        `bank:offer:${caseId}`
      ),
      Markup.button.callback(
        '❌ Рад этиш',
        `bank:reject:${caseId}`
      ),
    ],
  ]);
}

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
      data.type === 'bank_employee' ? BANK_MENU : MAIN_MENU
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

  if (session.step === 'bank_offer_amount') {
    const amount = Number(
      text.replace(/\s/g, '').replace(',', '.')
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      await ctx.reply(
        'Тасдиқланган суммани фақат рақам билан киритинг.'
      );
      return;
    }

    session.data.approvedAmount = amount;
    session.step = 'bank_offer_interest';
    setSession(telegramId, session);

    await ctx.reply(
      'Фоиз ставкасини киритинг.\nМисол: 26.5'
    );
    return;
  }

  if (session.step === 'bank_offer_interest') {
    const rate = Number(text.replace(',', '.'));

    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100
    ) {
      await ctx.reply(
        'Фоиз ставкасини тўғри киритинг. Масалан: 26.5'
      );
      return;
    }

    session.data.interestRate = rate;
    session.step = 'bank_offer_term';
    setSession(telegramId, session);

    await ctx.reply(
      'Кредит муддатини ойларда киритинг.\nМисол: 240'
    );
    return;
  }

  if (session.step === 'bank_offer_term') {
    const months = Number(text);

    if (
      !Number.isInteger(months) ||
      months < 1 ||
      months > 600
    ) {
      await ctx.reply(
        'Муддатни бутун сонда, ойларда киритинг.'
      );
      return;
    }

    session.data.termMonths = months;
    session.step = 'bank_offer_initial';
    setSession(telegramId, session);

    await ctx.reply(
      'Бошланғич тўлов суммасини киритинг.\nАгар бўлмаса 0 ёзинг.'
    );
    return;
  }

  if (session.step === 'bank_offer_initial') {
    const amount = Number(
      text.replace(/\s/g, '').replace(',', '.')
    );

    if (!Number.isFinite(amount) || amount < 0) {
      await ctx.reply('Суммани тўғри киритинг.');
      return;
    }

    session.data.initialPayment = amount || null;
    session.step = 'bank_offer_monthly';
    setSession(telegramId, session);

    await ctx.reply(
      'Ойлик тўловни киритинг.\nАгар ҳозир аниқ бўлмаса 0 ёзинг.'
    );
    return;
  }

  if (session.step === 'bank_offer_monthly') {
    const amount = Number(
      text.replace(/\s/g, '').replace(',', '.')
    );

    if (!Number.isFinite(amount) || amount < 0) {
      await ctx.reply('Ойлик тўловни тўғри киритинг.');
      return;
    }

    session.data.monthlyPayment = amount || null;
    session.step = 'bank_offer_conditions';
    setSession(telegramId, session);

    await ctx.reply(
      'Қўшимча шартларни ёзинг.\nАгар шарт бўлмаса «йўқ» деб ёзинг.'
    );
    return;
  }

  if (session.step === 'bank_offer_conditions') {
    session.data.conditions =
      text.toLowerCase() === 'йўқ'
        ? null
        : text.slice(0, 3000);

    session.step = 'bank_offer_confirm';
    setSession(telegramId, session);

    await sendBankOfferConfirmation(ctx, session);
    return;
  }

  if (session.step === 'bank_reject_reason') {
    if (text.length < 2) {
      await ctx.reply('Рад этиш сабабини ёзинг.');
      return;
    }

    try {
      await callCrm(
        `/telegram/bank/case/${session.data.caseId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({
            telegramId,
            reason: text.slice(0, 2000),
          }),
        }
      );

      clearSession(telegramId);

      await ctx.reply(
        '❌ Рад жавоби CRMга юборилди.',
        BANK_MENU
      );
    } catch (error) {
      console.error('Bank rejection error:', error.message);
      await ctx.reply(
        `Рад жавобини юбориб бўлмади: ${error.message}`,
        BANK_MENU
      );
    }

    return;
  }

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



/* =========================================================
   БАНК ХОДИМИ — МУРОЖААТЛАР / ТАКЛИФ / РАД
========================================================= */

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  return `${new Intl.NumberFormat('uz-UZ').format(amount)} сўм`;
}

async function sendBankAssignments(ctx) {
  try {
    const data = await callCrm(
      `/telegram/bank/assignments?telegramId=${ctx.from.id}`
    );

    if (!data.items?.length) {
      await ctx.reply(
        'Ҳозирча сизнинг банкингизга янги мурожаат юборилмаган.',
        BANK_MENU
      );
      return;
    }

    await ctx.reply(
      `🏦 ${data.employee?.bankName || 'Банк'} — актив мурожаатлар: ${data.items.length}`,
      BANK_MENU
    );

    for (const item of data.items) {
      const c = item.case;

      const text =
        `🏦 <b>Банк текширувидаги мурожаат</b>\n` +
        `№ ${c.displayId}\n` +
        `Хизмат: ${serviceTypeLabel(c.serviceType)}\n` +
        `Сўралган сумма: ${formatMoney(c.requestedAmount)}\n` +
        `Ҳолат: ${STATUS_LABELS[c.status] || c.status}`;

      await ctx.replyWithHTML(
        text,
        bankCaseButtons(c.id)
      );
    }
  } catch (error) {
    console.error('Bank assignments error:', error.message);

    await ctx.reply(
      error.status === 403
        ? 'Аввал «📱 Телефонни юбориш» орқали банк ходими аккаунтингизни боғланг.'
        : 'Банк мурожаатларини олишда хатолик юз берди.',
      MAIN_MENU
    );
  }
}

bot.hears('🏦 Банк мурожаатлари', async (ctx) => {
  clearSession(ctx.from.id);
  await sendBankAssignments(ctx);
});

bot.action(/^bank:view:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  try {
    const caseId = ctx.match[1];
    const data = await callCrm(
      `/telegram/bank/case/${caseId}?telegramId=${ctx.from.id}`
    );

    const c = data.case;

    const text =
      `📋 <b>Мурожаат маълумотлари</b>\n\n` +
      `№ ${c.displayId}\n` +
      `👤 Мижоз: ${c.applicant?.fullName || '—'}\n` +
      `📞 Телефон: ${c.applicant?.phone || '—'}\n` +
      `🏦 Хизмат: ${serviceTypeLabel(c.serviceType)}\n` +
      `💰 Сўралган сумма: ${formatMoney(c.requestedAmount)}\n\n` +
      `🏠 Гаров тури: ${c.collateralType || '—'}\n` +
      `📍 Гаров манзили: ${c.collateralAddress || '—'}\n` +
      `📐 Кадастр: ${c.collateralCadastreNumber || '—'}\n` +
      `💵 Баҳоланган қиймат: ${formatMoney(c.collateralEstimatedValue)}`;

    await ctx.replyWithHTML(
      text,
      bankCaseButtons(c.id)
    );
  } catch (error) {
    console.error('Bank case view error:', error.message);
    await ctx.reply(
      error.message || 'Мурожаатни очиб бўлмади.',
      BANK_MENU
    );
  }
});

bot.action(/^bank:offer:(.+)$/, async (ctx) => {
  const caseId = ctx.match[1];

  setSession(ctx.from.id, {
    step: 'bank_offer_amount',
    data: {
      caseId,
    },
  });

  await ctx.answerCbQuery();
  await ctx.reply(
    '✅ Таклиф бериш бошланди.\n\nТасдиқланган кредит суммасини сўмда киритинг.\nМисол: 300000000'
  );
});

bot.action(/^bank:reject:(.+)$/, async (ctx) => {
  const caseId = ctx.match[1];

  setSession(ctx.from.id, {
    step: 'bank_reject_reason',
    data: {
      caseId,
    },
  });

  await ctx.answerCbQuery();

  await ctx.reply(
    '❌ Рад этиш сабабини ёзинг.\nМасалан: КАТМ бўйича талабга жавоб бермади.'
  );
});

async function sendBankOfferConfirmation(ctx, session) {
  const d = session.data;

  await ctx.reply(
    `Банк таклифини текширинг:\n\n` +
      `💰 Тасдиқланган сумма: ${formatMoney(d.approvedAmount)}\n` +
      `📊 Фоиз: ${d.interestRate}%\n` +
      `📅 Муддат: ${d.termMonths} ой\n` +
      `💵 Бошланғич тўлов: ${
        d.initialPayment === null
          ? 'кўрсатилмаган'
          : formatMoney(d.initialPayment)
      }\n` +
      `💳 Ойлик тўлов: ${
        d.monthlyPayment === null
          ? 'кўрсатилмаган'
          : formatMoney(d.monthlyPayment)
      }\n` +
      `📝 Шартлар: ${d.conditions || 'йўқ'}\n\n` +
      `CRMга юборамизми?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '✅ Юбориш',
          'bank:offer:confirm'
        ),
      ],
      [
        Markup.button.callback(
          '❌ Бекор қилиш',
          'bank:offer:cancel'
        ),
      ],
    ])
  );
}

bot.action('bank:offer:confirm', async (ctx) => {
  const session = getSession(ctx.from.id);

  if (!session || session.step !== 'bank_offer_confirm') {
    await ctx.answerCbQuery();
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText('⏳ Таклиф CRMга юборилмоқда...').catch(() => {});

  try {
    await callCrm(
      `/telegram/bank/case/${session.data.caseId}/offer`,
      {
        method: 'POST',
        body: JSON.stringify({
          telegramId: ctx.from.id,
          approvedAmount: session.data.approvedAmount,
          interestRate: session.data.interestRate,
          termMonths: session.data.termMonths,
          initialPayment: session.data.initialPayment,
          monthlyPayment: session.data.monthlyPayment,
          conditions: session.data.conditions,
        }),
      }
    );

    clearSession(ctx.from.id);

    await ctx.reply(
      '✅ Банк таклифи CRMга муваффақиятли юборилди.',
      BANK_MENU
    );
  } catch (error) {
    console.error('Bank offer submit error:', error.message);
    await ctx.reply(
      `Таклифни юбориб бўлмади: ${error.message}`,
      BANK_MENU
    );
  }
});

bot.action('bank:offer:cancel', async (ctx) => {
  clearSession(ctx.from.id);
  await ctx.answerCbQuery();
  await ctx.editMessageText('Банк таклифи бекор қилинди.').catch(() => {});
  await ctx.reply('Банк менюсига қайтдингиз.', BANK_MENU);
});

/* =========================================================
   КАНАЛГА TRACKING ТУГМАСИ БИЛАН РЕКЛАМА ПОСТИ
   Команда: /post_ipoteka
========================================================= */
function isPostingAdmin(ctx) {
  return POSTING_ADMIN_IDS.has(String(ctx.from?.id || ''));
}

bot.command('post_ipoteka', async (ctx) => {
  if (!isPostingAdmin(ctx)) {
    await ctx.reply('Бу команда фақат рухсат берилган администраторлар учун.');
    return;
  }

  if (!TELEGRAM_CHANNEL_ID) {
    await ctx.reply(
      'TELEGRAM_CHANNEL_ID Railway Variables ичида киритилмаган.'
    );
    return;
  }

  const startParameter = 'telegram_ipoteka_01';
  const applicationUrl =
    `https://t.me/${PUBLIC_BOT_USERNAME}?start=${startParameter}`;

  const postText =
    `🏠 <b>УЙ ОЛМОҚЧИМИСИЗ? СИЗГА ҚАНЧА ИПОТЕКА ЧИҚИШИНИ БИЛМОҚЧИМИСИЗ?</b>\n\n` +
    `Golden Key Info орқали маълумотларингизни қолдиринг — мутахассисларимиз сизга мос ипотека вариантларини кўриб чиқишда ёрдам беради.\n\n` +
    `🏢 Бирламчи ипотека — 430 млн сўмгача\n` +
    `🏡 Иккиламчи ипотека — 100 млндан 1,5 млрд сўмгача\n` +
    `💰 Микроқарз — 50 млндан 1,5 млрд сўмгача\n\n` +
    `✅ Ариза қолдириш бепул\n` +
    `✅ Бир нечта банк вариантларини кўриб чиқиш имконияти\n` +
    `✅ Мутахассис ёрдами\n` +
    `✅ Маълумотлар махфий сақланади\n\n` +
    `📞 Телефон: +998 99 999 79 73`;

  try {
    const sent = await bot.telegram.sendMessage(
      TELEGRAM_CHANNEL_ID,
      postText,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔴 БЕПУЛ АРИЗА ҚОЛДИРИШ',
                url: applicationUrl,
              },
            ],
          ],
        },
        disable_web_page_preview: true,
      }
    );

    await ctx.reply(
      `✅ Пост каналга тугма билан жойланди.\n` +
      `Tracking: ${startParameter}\n` +
      `Message ID: ${sent.message_id}`
    );
  } catch (error) {
    console.error('Channel post error:', error);
    await ctx.reply(
      `Постни каналга юбориб бўлмади: ${error.message}\n\n` +
      `Бот каналга администратор қилиб қўшилганини текширинг.`
    );
  }
});

bot
  .launch()
  .then(() => console.log('Golden Key OS Telegram bot ишга тушди'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));