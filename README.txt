GOLDEN KEY OS — ИПОТЕКА ИШТИРОКЧИЛАРИ MVP

ҚЎШИЛГАНЛАР:
1. Мурожаатчи — мавжуд Client маълумотларидан кўринади.
2. Қарз олувчи:
   - мурожаатчининг ўзи бўлиши мумкин;
   - бошқа шахс бўлса алоҳида маълумот киритилади;
   - Borrower жадвалида APPROVED сифатида сақланади.
3. Гаров эгаси:
   - қарз олувчининг ўзи бўлиши мумкин;
   - бошқа шахс бўлса Ф.И.Ш., телефон, ЖШШИР, паспорт ва манзил сақланади.
4. Мурожаат карточкасида янги «Иштирокчилар» бўлими.
5. Шартнома PDF шаблонида учала шахс алоҳида кўрсатилади.
6. AuditLog'да ўзгариш қайд қилинади.

ПАКЕТ:
backend/prisma/schema.prisma
backend/src/routes/cases.js
backend/src/services/contract-template.js
crm/src/pages/CaseDetails.jsx
crm/src/components/cases/ParticipantsSection.jsx

ЎРНАТИШ:
1. Архивни очинг.
2. backend ва crm папкаларини лойиҳа устига ташланг.
3. Replace the files in the destination.
4. GitHub Desktop:
   Summary: Add mortgage participants MVP
5. Commit to main.
6. Push origin.
7. Backend deploy тугашини кутинг.
8. Railway Console:
   cd /app
   npx prisma db push
9. Backend'ни Redeploy қилинг.
10. CRM deploy тугашини кутинг.
11. Ctrl + F5 қилинг.

ТЕКШИРИШ:
- Мурожаатни очинг.
- «Иштирокчилар» бўлимида:
  - мурожаатчининг ўзи қарз олувчи ёки бошқа шахсни танланг;
  - қарз олувчининг ўзи гаров эгаси ёки бошқа шахсни танланг;
  - сақланг.
- Янги шартнома яратинг.
- QR орқали тасдиқлаб, PDF тайёрланг.
- PDF'да учала иштирокчи кўринади.

DATABASE:
Янги Case майдонлари қўшилади, шунинг учун npx prisma db push шарт.
