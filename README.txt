Golden Key OS — Шартномалар рўйхати маршрути тузатилди

Алмаштириш:
backend/src/routes/contracts.js

Қўшилди:
GET /api/contracts

Ишлайди:
- Барча шартномалар рўйхати
- Pagination
- Қидирув: шартнома ID, мурожаат ID, мижоз Ф.И.Ш., телефон
- Ҳолат бўйича фильтр
- Филиал ва мижоз маълумотлари
- PDF учун signed URL
- BRANCH_MANAGER / RECEPTION_MANAGER учун филиал чеклови
- RECEPTION_MANAGER учун ўзига бириктирилган мурожаатлар чеклови

Тегилмаган:
- Шартнома яратиш
- QR яратиш
- PDF генерация
- Шаблонлар
- Тасдиқлаш логикаси

Қўллаш:
1) contracts.js ни backend/src/routes/ ичига алмаштиринг.
2) GitHub commit/push қилинг.
3) Railway backend deploy тугашини кутинг.
4) CRM'да Шартномалар бўлими → Янгилаш.

Prisma db push керак эмас.
