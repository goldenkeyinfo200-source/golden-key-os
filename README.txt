Golden Key OS — шартномани текшириш саҳифаси

Алмаштириш:
backend/src/routes/public-contracts.js

Нима ўзгарди:
- /api/public/contracts/:displayId/verify браузерда очилганда JSON ўрнига
  чиройли Golden Key OS текширув саҳифаси чиқади.
- "ШАРТНОМА ҲАҚИҚИЙ" ҳолати кўрсатилади.
- Шартнома рақами, мурожаат рақами, шартнома тури, ҳолати,
  тасдиқланган сана, тасдиқлар сони, PDF ҳолати ва SHA-256 чиқади.
- INVESTOR_PARTNERSHIP учун "Инвестор билан ҳамкорлик шартномаси".
- Инвестор тасдиғи "Инвестор" деб кўрсатилади.
- Паспорт, ЖШШИР, телефон, манзил ва IP очиқ саҳифада чиқмайди.
- JSON API сақланди:
  /api/public/contracts/GK-.../verify?format=json

Қўллаш:
1) public-contracts.js ни backend/src/routes/ га алмаштиринг.
2) Commit / push қилинг.
3) Railway backend deploy тугашини кутинг.
4) Эски ёки янги шартнома QR кодини қайта скан қилинг.

Prisma db push керак эмас.
