GOLDEN KEY OS — Telegram channel post + inline tracking button

Алмаштиринг:
telegram-bot/src/index.js

Railway -> telegram-bot -> Variables га қўшинг:

TELEGRAM_CHANNEL_ID
- Канал ID ёки @username.
- Масалан: @gk_ipoteka
- Агар private channel бўлса: -100xxxxxxxxxx кўринишидаги ID.

PUBLIC_BOT_USERNAME
- gkos_bot
- @ белгисиз ҳам бўлади.

POSTING_ADMIN_IDS
- Пост чиқаришга рухсат берилган Telegram user ID'лар.
- Бир нечта бўлса вергул билан:
  123456789,987654321

Муҳим:
1. gkos_bot каналга ADMIN бўлиши керак.
2. Bot'га "Post Messages" ҳуқуқи берилиши керак.
3. Deploy бўлгандан кейин рухсат берилган админ ботга:
   /post_ipoteka
   деб ёзади.
4. Бот каналга постни қуйидаги inline тугма билан чиқаради:
   🔴 БЕПУЛ АРИЗА ҚОЛДИРИШ
5. Тугма:
   https://t.me/gkos_bot?start=telegram_ipoteka_01
   орқали очилади.
6. Шу сабаб CRM'да campaign = ipoteka_01 сифатида ҳисобланади.

Кейин янги рекламалар учун алоҳида command / startParameter қўшиш мумкин:
telegram_ipoteka_02
telegram_microloan_01
instagram_ipoteka_01
