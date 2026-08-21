Golden Key OS — INVESTOR_PARTNERSHIP complete contract fix

Алмаштириладиган файллар:
1) backend/src/services/contract-template.js
2) backend/src/services/contract-pdf.js
3) backend/src/services/contract-finalize.js
4) backend/src/routes/contracts.js

Натижа:
- INVESTOR_PARTNERSHIP учун алоҳида шартнома шаблони;
- шартнома рақами GK-IV-2026-000001 форматида;
- муқова: "Инвестор билан ҳамкорлик қилиш тўғрисида электрон шартнома";
- инвестиция суммаси, соф фойдадан улуш %, бошланиш/тугаш санаси;
- Инвестор маълумотлари;
- ипотекадаги қарз олувчи/гаров эгаси блоклари инвестор шартномасида чиқмайди;
- QR тасдиқ саҳифасида "Инвестор томонидан" деб кўрсатилади;
- DBда investor-partnership-v1 marker билан янги ContractTemplate автоматик яратилади;
- риэлторлик шаблони marker'i realtor-service-v3 ҳолатида сақланади.

Deploy:
Файлларни алмаштиринг → commit/push → Railway backend deploy.
DB push қайта талаб қилинмайди, чунки бу ZIP schema'ни ўзгартирмайди.
ЯНГИ инвестор шартномасини яратиб текширинг.
