Golden Key OS — уч томонлама шартнома тузатишлари

Алмаштириладиган файллар:
1) backend/src/services/contract-template.js
2) backend/src/services/contract-pdf.js
3) backend/src/services/contract-finalize.js
4) backend/src/routes/public-contracts.js

Асосий ўзгаришлар:
- Харидор атамаси уч томонлама шартномада "Олувчи" қилиб ўзгартирилди.
- Хизмат ҳақини тўловчи:
  BUYER -> Олувчи
  SELLER -> Сотувчи
  BOTH -> Сотувчи ва Олувчи
- APARTMENT каби техник мулк турлари ўзбекча кўрсатилади.
- Телефонлар +998 форматга келтирилади.
- Уч томонлама шартнома cover сарлавҳаси тўғриланди.
- Taplink QR олиб ташланди.
- QR шартнома ҳақиқийлигини /api/public/contracts/:displayId/verify орқали текширади.
- Олувчи ва Сотувчининг QR тасдиқлари PDFда алоҳида кўрсатилади.
- BUYER public label "Олувчи" деб чиқади.

Railway учун тавсия:
PUBLIC_VERIFY_URL = https://backend-production-054ce.up.railway.app/api/public/contracts

Агар PUBLIC_VERIFY_URL қўйилмаса, код Railway RAILWAY_PUBLIC_DOMAIN орқали
автоматик /api/public/contracts/:displayId/verify манзилини тузади.
