Golden Key OS — оператор орқали шартнома тасдиқлаш

Файллар:
1. backend/src/routes/contracts.js
2. crm/src/components/contracts/ContractsSection.jsx

Нима ўзгарди:
- "Telegramга юбориш" тугмаси "Операторга юбориш" деб ўзгарди.
- Тасдиқлаш ҳаволаси мижозга эмас, мурожаатга бириктирилган қабул операторининг Telegram ID'сига юборилади.
- Оператор хабарни мижозга Telegram орқали forward қилади.
- Мижознинг CRM telegramId майдони шарт эмас.
- QR функцияси сақланади.

Муҳим:
- Операторнинг user.telegramId майдони тўлдирилган бўлиши керак.
- Prisma schema ёки db push талаб қилинмайди.
