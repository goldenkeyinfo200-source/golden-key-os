GOLDEN KEY OS — CONTRACT + ONE-TIME QR BACKEND (1-БОСҚИЧ)

СХЕМА ҲАҚИДА:
Сизнинг schema.prisma файлингизда ContractTemplate, Contract ва Invitation
моделлари аллақачон бор. Шу сабабли янги Prisma модели қўшилмади.

ТАЙЁР ФАЙЛЛАР:
backend/src/routes/contracts.js
backend/src/routes/public-contracts.js
backend/src/routes/index.js
backend/src/services/contract-template.js
backend/package.json
backend/prisma/schema.prisma

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги backend папкасини лойиҳангиз устига ташланг.
3. Windows сўраса:
   Replace the files in the destination
4. GitHub Desktop:
   Summary: Add contract and one-time QR API
   Commit to main
   Push origin
5. Railway backend deployment тугашини кутинг.

RAILWAY VARIABLE:
PUBLIC_SIGN_URL=https://crm-production-eced.up.railway.app/sign

Масалан CRM доменингиз:
https://crm-production-eced.up.railway.app
бўлса, қиймат:
https://crm-production-eced.up.railway.app/sign

API:
GET  /api/contracts/case/:caseId
POST /api/contracts/case/:caseId
POST /api/contracts/:contractId/qr

GET  /api/public/contracts/:token
POST /api/public/contracts/:token/confirm

QR ХАВФСИЗЛИГИ:
- 32 byte тасодифий токен
- базада фақат SHA-256 hash сақланади
- одатда 15 дақиқа амал қилади
- янги QR яратилса, аввалги ишлатилмаган QR ўчади
- бир марта ишлатилади
- тасдиқ вақти, IP ва user-agent AuditLog'га сақланади

1-БОСҚИЧ НАТИЖАСИ:
- шартнома яратилади
- автоматик асосий шаблон яратилади
- бир марталик QR қайтарилади
- мижоз шартномани очади
- чекбокс билан тасдиқлайди
- Contract SIGNED бўлади
- Case CONTRACT_SIGNED бўлади
- PDF ҳали кейинги босқичда генерация қилинади
- Telegram ботга PDF юбориш ҳам кейинги босқичда уланади
