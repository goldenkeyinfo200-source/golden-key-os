GK PAYMENT RECEIPT WORKING v2

САБАБ:
Аввалги telegram.js фақат квитанцияни ЮБОРИШ функциясини олган эди.
Лекин finance.js ва debtors.js тўлов сақланганидан кейин уни чақирмаган.
Шунинг учун Telegram'га ҳеч нарса кетмаган.

АЛМАШТИРИЛАДИ:
1. backend/src/routes/finance.js
2. backend/src/routes/debtors.js
3. backend/src/services/telegram.js

ЯНГИ ФАЙЛ:
4. backend/src/services/payment-receipt.js

ТЎЛОВ ОҚИМИ:
Payment сақланади
→ PDF квитанция автоматик яратилади
→ Client.telegramId олинади
→ Telegram sendDocument
→ AuditLog'га натижа ёзилади.

Railway backend Variables:
TELEGRAM_BOT_TOKEN ёки BOT_TOKEN бўлиши шарт.

Мижознинг Client.telegramId майдони ҳам бўлиши керак.
Ботда телефонни улаган мижозларда бу автоматик сақланади.

Frontend ўзгармайди.
Фақат backend'ни redeploy қилинг.

ТЕСТ:
Молия → Тўлов қабул қилиш → кичик сумма.
Сақлаш босилгандан кейин мижозга PDF квитанция келиши керак.
