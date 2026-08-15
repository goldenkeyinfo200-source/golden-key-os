GOLDEN KEY OS — PRISMA MIGRATION HOTFIX

Сабаб:
SALE_PURCHASE учун Prisma schema'га янги Case колонкалари қўшилган,
лекин production PostgreSQL базасига migration автоматик қўлланмаган.

Шунинг учун:
- /api/cases -> 500
- Ижродаги ишлар -> 500
- Dashboard'да сўнгги ишлар -> 500
бўлиши мумкин.

Тузатиш:
backend/package.json start командаси энди:
1) prisma generate
2) prisma migrate deploy
3) node src/server.js
тартибида ишлайди.

Муҳим:
backend/prisma/migrations/20260816_sale_purchase_dual_qr/migration.sql
репозиторийда бўлиши шарт.

Railway backend Root Directory:
 /backend

Ўрнатиш:
1. ZIP'ни golden-key-os устига ташланг -> Replace.
2. GitHub Desktop -> Commit -> Push.
3. Railway backend auto deploy бўлади.
4. Deploy Logs'да "Applying migration 20260816_sale_purchase_dual_qr"
   ёки "No pending migrations to apply" чиқиши керак.
5. CRM'да Ctrl+F5.
