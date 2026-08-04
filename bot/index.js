import express from "express";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";

dotenv.config();

const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {

    await ctx.reply(
        "🏦 Golden Key OS\n\nХуш келибсиз!"
    );

});

bot.command("ping", async (ctx) => {

    await ctx.reply("✅ Bot ishlayapti.");

});

app.use(bot.webhookCallback("/telegram"));

app.get("/", (req,res)=>{

    res.send("Golden Key Bot OK");

});

const PORT = process.env.PORT || 3001;

app.listen(PORT,()=>{

    console.log("Bot started : "+PORT);

});