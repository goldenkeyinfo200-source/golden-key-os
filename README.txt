GOLDEN KEY OS — REALTOR_ONLY филиал

Алмаштирилади:
1. backend/prisma/schema.prisma
2. backend/src/routes/cases.js
3. crm/src/pages/CasesPage.jsx

Янги филиал турлари:
- MAIN — барча хизматлар
- REALTOR_ONLY — фақат:
  REALTOR_SERVICE
  SALE_PURCHASE
  CADASTRE_SERVICE

Ўрнатиш:
1. Файлларни жойига алмаштиринг.
2. Backend папкасида:
   npx prisma format
   npx prisma generate
   npx prisma db push
3. Backend deploy.
4. Frontend deploy.

Эслатма:
- Мавжуд филиалларнинг branchType қиймати автоматик MAIN бўлади.
- REALTOR_ONLY қилиш учун филиални база/API орқали REALTOR_ONLY га ўзгартириш керак.
- Frontend хизматларни яширади, backend эса тақиқланган хизматни API орқали ҳам қабул қилмайди.
