GOLDEN KEY OS — QR + TELEFON EKRANIDA QO'L IMZOSI v1

Нима қўшилди
1) Мижоз QR'ни очади.
2) Шартнома матнини кўради.
3) Телефон экранида бармоқ/стилус билан имзо қўяди.
4) Розилик checkbox'ини белгилайди.
5) «Имзолаш ва тасдиқлаш»ни босади.
6) Имзо AuditLog metadata'да QR токен, role, вақт, IP ва user-agent билан сақланади.
7) Якуний PDF'га алоҳида «ТОМОНЛАРНИНГ ҚЎЛ ИМЗОЛАРИ» саҳифаси қўшилади.
8) SALE_PURCHASE бўлса BUYER ва SELLER имзолари алоҳида кўрсатилади.

Алмаштириладиган файллар
BACKEND:
- backend/src/routes/public-contracts.js
- backend/src/services/contract-finalize.js

CRM:
- crm/src/pages/ContractSignPage.jsx

contract-pdf.js:
Тўлиқ файлни алмаштирмасдан patch қўлланади, шунинг учун ҳозирги PDF дизайни сақланади.

Patch қилиш:
Лойиҳа root папкасида:
  node tools/apply-contract-pdf-signature-patch.mjs

Ёки агар script zip ичида tools папкасида бўлса, уни project root/tools ичига қўйинг.

Муҳим:
- backend/src/services/supabaseStorage.js да upsert:true бўлиши керак.
- Prisma schema ўзгармайди. Имзо AuditLog metadata Json ичида сақланади.
- PDF қўл имзосини қайта генерация қилиш учун contract-finalize.js аввалги pdfUrl reuse оптимизациясини ўчиради.
- Аввал BACKEND deploy, кейин CRM deploy қилинг.
- Янги QR яратиб тест қилинг. Эски ишлатилган QR қайта ишламайди.

Қонуний эслатма:
Экранда чизилган қўл имзоси электрон розилик/аудит далилини кучайтиради, лекин у автоматик равишда E-IMZO ёки малакавий электрон рақамли имзо мақомини олмайди. Қонун талаб қилган ҳолларда E-IMZO алоҳида қўлланади.
