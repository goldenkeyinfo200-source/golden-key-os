require("dotenv").config();

const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const api = require("./api");

const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

const STATUS_LABELS = {
    NEW: "Янги",
    DATA_COLLECTION: "Маълумот йиғилмоқда",
    BANK_REVIEW: "Банк текширувида",
    CLIENT_PREAPPROVED: "Дастлабки тасдиқ",
    OFFICE_VISIT: "Офисга таклиф",
    CONTRACT_PENDING: "Шартнома тайёрланмоқда",
    CONTRACT_SIGNED: "Шартнома имзоланди",
    ASSIGNED_TO_EXECUTOR: "Ижрочига бириктирилди",
    IN_EXECUTION: "Ижрода",
    PROPERTY_MONITORING: "Мулк мониторингида",
    CREDIT_APPROVED: "Кредит тасдиқланган",
    CREDIT_ISSUED: "Кредит чиқарилган",
    CLIENT_RECEIVED_FUNDS: "Мижоз маблағни олди",
    SERVICE_FEE_PAID: "Хизмат ҳақи тўланди",
    COMPLETED: "Якунланган",
    REJECTED: "Рад этилган",
    CANCELLED: "Бекор қилинган",
    ARCHIVED: "Архивланган"
};

bot.start(async (ctx) => {
    const user = ctx.from;

    const startParam =
        typeof ctx.startPayload === "string" && ctx.startPayload.trim()
            ? ctx.startPayload.trim()
            : "direct";

    try {
        await api.post("/api/telegram/track", {
            telegramId: user.id,
            startParam,
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null
        });
    } catch (error) {
        console.error("Marketing track error:", error.message);
    }

    await ctx.reply(
        `Ассалому алайкум, ${user.first_name}!

Golden Key CRM ботга хуш келибсиз.`,
        Markup.keyboard([
            ["📄 Заявкам ҳолати"],
            ["📱 Телефонни юбориш"]
        ])
        .resize()
    );
});

bot.hears("📄 Заявкам ҳолати", async (ctx) => {

    try {
        const { data } = await api.get("/api/telegram/cases", {
            params: { telegramId: ctx.from.id }
        });

        if (!data.items || data.items.length === 0) {
            await ctx.reply(
                "Ҳозирча сизда актив заявка мавжуд эмас."
            );
            return;
        }

        const text = data.items
            .map((item) => {
                const label = STATUS_LABELS[item.status] || item.status;
                return `📄 №${item.displayId}\nҲолат: ${label}`;
            })
            .join("\n\n");

        await ctx.reply(text);

    } catch (error) {
        console.error("Cases fetch error:", error.message);
        await ctx.reply(
            "Ҳолатни олишда хатолик юз берди. Кейинроқ қайта уриниб кўринг."
        );
    }

});

bot.hears("📱 Телефонни юбориш", async (ctx) => {

    await ctx.reply(
        "Телефон рақамингизни юборинг",
        Markup.keyboard([
            [
                Markup.button.contactRequest("📲 Телефонни юбориш")
            ]
        ]).resize()
    );

});

bot.on("contact", async (ctx) => {

    const phone = ctx.message.contact.phone_number;
    const telegramId = ctx.from.id;

    try {
        const { data } = await api.post("/api/telegram/link", {
            phone,
            telegramId
        });

        const roleText = data.type === "client" ? "мижоз" : "ходим";

        await ctx.reply(
            `✅ Телефон рақамингиз тасдиқланди, ${data.fullName}!\n\n` +
            `Сиз ${roleText} сифатида тизимга боғландингиз. Энди мурожаатингиз ҳолати ўзгарганда сизга шу бот орқали хабар келади.`,
            Markup.keyboard([
                ["📄 Заявкам ҳолати"]
            ]).resize()
        );

    } catch (error) {
        if (error.response && error.response.status === 404) {
            await ctx.reply(
                "Бу телефон рақами бўйича тизимда маълумот топилмади. Илтимос, аввал офисимизга мурожаат қилинг ёки рақамни текшириб қайта юборинг."
            );
        } else {
            console.error("Link error:", error.message);
            await ctx.reply(
                "Телефонни боғлашда хатолик юз берди. Кейинроқ қайта уриниб кўринг."
            );
        }
    }

});

bot.launch();

console.log("Telegram Bot Started");

app.get("/", (req, res) => {

    res.send("Golden Key Telegram Bot");

});

app.listen(process.env.PORT || 3001);