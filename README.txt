GOLDEN KEY OS — ARCHIVE FLOW v4

ҚИЛИНДИ:
- ARCHIVED асосий «Мурожаатлар»дан яширилади.
- CANCELLED асосий «Мурожаатлар»дан яширилади.
- Иккаласи ҳам «Архив» бўлимида кўринади.
- Эски маълумотларни база бўйича қўлда кўчириш шарт эмас.
- Backend `scope=archive` бўйича уларни автомат архив рўйхатига беради.
- Архивда қидирув, ҳолат ва хизмат фильтрлари бор.

ФАЙЛЛАР:
backend/src/routes/cases.js
crm/src/pages/CasesPage.jsx
crm/src/pages/ArchivePage.jsx
APP_PATCH.txt

ЎРНАТИШ:
1. backend ва crm папкаларини golden-key-os устига ташланг → Replace.
2. APP_PATCH.txt даги 2 та кичик ўзгаришни crm/src/App.jsx га киритинг.
3. GitHub Desktop:
   Move cancelled and archived cases to archive
4. Commit to main → Push origin.
5. Backend ва CRM deploy.
6. Ctrl+F5.
