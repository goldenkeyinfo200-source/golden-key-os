GOLDEN KEY OS — BANK EMPLOYEE TELEGRAM WORKFLOW

Алмаштиринг:
1) backend/src/routes/telegram.js
2) backend/src/routes/bank-offers.js
3) telegram-bot/src/index.js

Натижа:
- Банк ходими телефон орқали Telegram аккаунтини боғлайди.
- Банк ходими менюсида "🏦 Банк мурожаатлари" чиқади.
- Фақат ўз банкига юборилган CaseBankAssignment'лар кўринади.
- "📋 Мурожаатни кўриш" — мижоз, телефон, сумма, гаров маълумотлари.
- "✅ Таклиф бериш" — тасдиқланган сумма, фоиз, муддат,
  бошланғич тўлов, ойлик тўлов, шартлар.
- Таклиф CRM BankOffer'га SUBMITTED бўлиб тушади.
- CaseBankAssignment OFFER_SUBMITTED бўлади.
- Қабул менежери notifyBankOfferSubmitted орқали Telegram хабар олади.
- "❌ Рад этиш" — сабаб CRMга сақланади ва assignment REJECTED бўлади.
- Банк ходими бошқа банкка юборилган мурожаатга жавоб бера олмайди.

Deploy:
- backend
- telegram-bot

Migration керак эмас.
CRM frontend файли ўзгармайди.

Тест:
1. Банк ходими ботда телефонни боғлайди.
2. CRMда мурожаатни Trastbank'ка юборинг.
3. Банк ходими ботда "🏦 Банк мурожаатлари"ни босади.
4. "📋 Мурожаатни кўриш".
5. "✅ Таклиф бериш" ёки "❌ Рад этиш".
6. CRMда BankOffer натижасини текширинг.
