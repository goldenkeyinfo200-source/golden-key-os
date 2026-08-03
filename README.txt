GOLDEN KEY OS — CONTRACT PDF + SUPABASE + TELEGRAM BACKEND

ТАЙЁР ФАЙЛЛАР:
backend/package.json
backend/src/routes/contracts.js
backend/src/routes/public-contracts.js
backend/src/routes/index.js
backend/src/services/contract-template.js
backend/src/services/contract-pdf.js
backend/src/services/contract-finalize.js
backend/src/services/telegram.js
backend/prisma/schema.prisma

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги backend папкасини лойиҳангиз устига ташланг.
3. Windows сўраса:
   Replace the files in the destination
4. GitHub Desktop:
   Summary: Add contract PDF and Telegram delivery
   Commit to main
   Push origin
5. Railway backend deployment тугашини кутинг.

ТАЛАБ ҚИЛИНАДИГАН МАВЖУД ФАЙЛ:
backend/src/services/supabaseStorage.js
Унда қуйидаги export'лар бўлиши шарт:
- uploadStorageFile
- createSignedFileUrl

RAILWAY VARIABLES:
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_DOCUMENTS_BUCKET=documents

TELEGRAM:
TELEGRAM_BOT_TOKEN=...
ёки
BOT_TOKEN=...

Мижознинг Client.telegramId майдони тўлдирилган бўлса,
PDF автоматик Telegram орқали юборилади.
Telegram token ёки telegramId бўлмаса, PDF барибир яратилади;
Telegram юбориш фақат skipped ҳолатида қолади.

PDF:
- pdfkit ишлатилади
- html-to-text HTML шартномани матнга айлантиради
- кирилл учун системада DejaVu Sans қидирилади
- PDF_FONT_PATH ва PDF_BOLD_FONT_PATH орқали бошқа system font path бериш мумкин
- PDF Supabase private bucket'да contracts/... папкасига сақланади
- Contract.pdfUrl майдонида storage path сақланади
- CRM'га 24 соатлик signed URL қайтарилади

АВТОМАТИК ЖАРАЁН:
1. Мижоз QR орқали тасдиқлайди
2. Contract SIGNED бўлади
3. PDF яратилади
4. Supabase Storage'га сақланади
5. Contract.pdfUrl янгиланади
6. Telegram ботга юборилади
7. AuditLog сақланади

ҚЎЛДА ҚАЙТА PDF ЯРАТИШ:
POST /api/contracts/:contractId/pdf

МУҲИМ:
Ушбу электрон тасдиқ E-IMZO билан тенг деб автоматик даъво қилинмайди.
PDF'да QR тасдиқ вақти, IP, User-Agent ва SHA-256 текширув коди қайд этилади.
