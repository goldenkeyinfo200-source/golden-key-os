GOLDEN KEY OS — SIGNED CONTRACT PDF CRM PATCH

БУ ПАКЕТ НИМА ҚИЛАДИ:
- Олдин тасдиқланган, лекин PDF ҳали яратилмаган шартномада
  «PDF тайёрлаш» тугмасини чиқаради.
- POST /api/contracts/:contractId/pdf API'сини чақиради.
- PDF тайёр бўлгач рўйхатни автоматик янгилайди.
- «PDF кўриш» ва юклаб олиш тугмаларини чиқаради.
- Telegram орқали юборилган/юборилмаган ҳолатни хабар қилади.

ФАЙЛЛАР:
crm/src/components/contracts/ContractsSection.jsx
crm/src/styles/contracts.css

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги crm папкасини лойиҳангиз устига ташланг.
3. Windows сўраса:
   Replace the files in the destination
4. GitHub Desktop:
   Summary: Add contract PDF generation button
   Commit to main
   Push origin
5. Railway CRM deploy тугашини кутинг.
6. CRM'ни Ctrl + F5 билан янгиланг.

ТЕКШИРИШ:
1. Тасдиқланган шартнома карточкасида «PDF тайёрлаш» чиқади.
2. Тугмани босинг.
3. PDF тайёр бўлса «PDF кўриш» тугмаси пайдо бўлади.
4. Мижозда telegramId бўлса PDF бот орқали ҳам юборилади.
