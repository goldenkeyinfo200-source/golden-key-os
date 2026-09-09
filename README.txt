Golden Key OS — масофадан Telegram орқали шартнома тасдиқлаш

Файллар:
1) backend/src/routes/contracts.js
2) backend/src/services/notify.js
3) crm/src/components/cases/ContractsSection.jsx

Нима қўшилди:
- Шартнома карточкасида “Telegramга юбориш” тугмаси.
- Мижозга 60 дақиқа амал қиладиган бир марталик шахсий тасдиқлаш ҳаволаси юборилади.
- Telegram хабар ичида “Шартномани кўриш ва тасдиқлаш” inline тугмаси бор.
- Мижоз ҳаволани босади, мавжуд /sign саҳифасида шартномани ўқийди, қўл имзоси қўяди ва тасдиқлайди.
- QR функцияси резерв вариант сифатида сақланади.
- Мижоз Telegram ID уланмаган бўлса, CRM аниқ хатолик кўрсатади.

Муҳим:
- TELEGRAM_BOT_TOKEN ёки BOT_TOKEN Railway backend Variables'да мавжуд бўлиши керак.
- Мижоз аввал Telegram ботга /start босиб, телефон рақамини тизим билан боғлаган бўлиши керак.
- PUBLIC_SIGN_URL ёки CRM_PUBLIC_URL аввалгидек ишлайди.
