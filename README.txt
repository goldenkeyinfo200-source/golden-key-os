GOLDEN KEY OS — ГАРОВ → БАНК → 4,5% ИШ ЖАРАЁНИ

ПАКЕТ:
crm/src/pages/CaseDetails.jsx
crm/src/components/bank-offers/BankOffersSection.jsx
backend/src/routes/cases.js
backend/src/routes/bank-offers.js

ЯНГИ ТАРТИБ:
1. Гаров мулки маълумотлари киритилади ва сақланади.
2. Паспорт, кадастр ва бошқа ҳужжатлар юкланади.
3. Банк КАТМ ва гаров мулкини текширади.
4. Банк таклиф киритади.
5. Менежер банк таклифини танлайди.
6. Танланган таклифдан:
   - банк номи;
   - тасдиқланган сумма;
   - 4,5% хизмат ҳақи;
   - якуний хизмат ҳақи
   автоматик Case'га сақланади.
7. Шундан кейин шартнома яратилади.

МУҲИМ:
- Тасдиқланган кредит суммасини гаров формасида қўлда киритиш олиб ташланди.
- Хизмат ҳақи банк таклифи танланмагунча ҳисобланмайди.
- Банк таклифлари бўлими CaseDetails'га қайта қўшилди.
- Банк таклифи танланганда 4,5% backend'да ҳисобланади.

ЎРНАТИШ:
1. Архивни очинг.
2. backend ва crm папкаларини лойиҳа устига ташланг.
3. Replace the files in the destination.
4. GitHub Desktop:
   Summary: Fix collateral bank offer workflow
   Commit to main
   Push origin
5. Backend ва CRM deploy тугашини кутинг.
6. CRM'да Ctrl+F5 қилинг.

DATABASE:
Янги майдон қўшилмаган. npx prisma db push қайта бажариш шарт эмас.
