require("dotenv").config();

const express = require("express");
const { Telegraf, Markup } = require("telegraf");

const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

bot.start(async (ctx) => {
    const user = ctx.from;

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

    await ctx.reply(
        "Ҳозирча сизда актив заявка мавжуд эмас."
    );

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

    console.log(phone);

    await ctx.reply(
        `Телефон қабул қилинди

${phone}`
    );

});

bot.launch();

console.log("Telegram Bot Started");

app.get("/", (req, res) => {

    res.send("Golden Key Telegram Bot");

});

app.listen(process.env.PORT || 3001);