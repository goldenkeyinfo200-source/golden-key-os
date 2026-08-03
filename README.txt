GOLDEN KEY OS — MULTI-BANK V1

ҚЎШИЛГАНЛАР:
1. Bank модели.
2. Банк ходими User'га bankId ва bankPosition.
3. CaseBankAssignment — битта мурожаатни бир нечта банкка юбориш.
4. Ҳар бир банк учун алоҳида ҳолат:
   SENT, VIEWED, UNDER_REVIEW, NEEDS_DOCUMENTS,
   OFFER_SUBMITTED, REJECTED, SELECTED, CLOSED.
5. Банк таклифи Bank ва Assignment билан боғланади.
6. Админда «Банклар» модули ишлайди:
   - янги банк;
   - реквизитлар;
   - банк ходими аккаунти;
   - логин ва пароль.
7. Мурожаат карточкасида бир нечта банкни танлаб юбориш.
8. Bank Portal фақат ўз банкига юборилган мурожаатларни кўради.
9. Банк ходими бошқа банк таклифларини кўрмайди.
10. Таклиф танланганда танланган банк Assignment=SELECTED,
    қолган банклар CLOSED бўлади.

ПАКЕТ:
backend/prisma/schema.prisma
backend/src/server.js
backend/src/routes/auth.js
backend/src/routes/cases.js
backend/src/routes/bank-offers.js
backend/src/routes/banks.js
backend/src/middleware/auth.js
crm/src/App.jsx
crm/src/pages/BanksPage.jsx
crm/src/pages/BankPortalPage.jsx
crm/src/pages/CaseDetails.jsx
crm/src/components/banks/MultiBankAssignmentsSection.jsx

ЎРНАТИШ:
1. Архивни очинг.
2. backend ва crm папкаларини лойиҳа устига ташланг.
3. Replace the files in the destination.
4. GitHub Desktop:
   Summary: Add multi bank assignment system v1
5. Commit to main.
6. Push origin.
7. Backend deploy тугашини кутинг.
8. Railway Console:
   cd /app
   npx prisma db push
9. Backend'ни Redeploy қилинг.
10. CRM deploy тугашини кутинг.
11. Ctrl + F5 қилинг.

ИШЛАШ:
- Админ → Банклар → Янги банк.
- Банк карточкаси → Ходимлар → логин/пароль яратиш.
- Мурожаат → Гаров маълумотлари → Кўп банкли юбориш.
- Банкларни танлаш → Юбориш.
- Банк ходими ўз логини билан киради.
- Фақат ўз банкига юборилган ишлар кўринади.
- Банк таклиф беради.
- Менежер энг яхши таклифни танлайди.

ЭҲТИЁТ:
Бу катта schema ўзгариши. Аввал GitHub ва PostgreSQL backup олиш тавсия қилинади.
