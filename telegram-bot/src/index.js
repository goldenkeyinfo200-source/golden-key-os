import 'dotenv/config';
import { Telegraf } from 'telegraf';
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.log('TELEGRAM_BOT_TOKEN ҳали киритилмаган.'); process.exit(0); }
const bot = new Telegraf(token);
bot.start((ctx)=>ctx.reply('Ассалому алайкум! Golden Key Info рақамли хизматлар ботига хуш келибсиз.'));
bot.launch().then(()=>console.log('Golden Key OS Telegram bot ишга тушди'));
process.once('SIGINT',()=>bot.stop('SIGINT'));
process.once('SIGTERM',()=>bot.stop('SIGTERM'));
