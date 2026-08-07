GK Finance Module v1

ЯНГИ ФАЙЛЛАР:
1) backend/src/routes/finance.js
2) crm/src/pages/FinancePage.jsx

АЛМАШТИРИЛАДИ:
3) backend/src/routes/index.js
4) crm/src/App.jsx

Prisma schema ўзгармайди.

ФУНКЦИЯЛАР:
- Жами хизмат ҳақи
- Тўланган сумма
- Қолдиқ
- Тўланган / қисман / кутилмоқда ҳисоблари
- Филиал фильтри
- Сана фильтри
- Қидирув
- Ҳар бир мурожаат бўйича хизмат ҳақи
- Тўловлар тарихи
- "Тўлов қабул қилиш" ойнаси
- Нақд / банк / Click / Payme / терминал
- Тўлиқ тўланса, CLIENT_RECEIVED_FUNDS ҳолатидан SERVICE_FEE_PAID га автоматик ўтади

DEPLOY:
1. 4 та файлни тегишли жойига қўйинг
2. Commit + Push
3. Railway backend deploy
4. Vercel frontend deploy
5. CRM → Молия бўлимни текширинг
