Golden Key OS — Windows Scanner Integration (v0.1)

Қўшилди:
1) CRM ҳужжат ойнасида «Файл танлаш» ва «Сканердан олиш».
2) Компьютерда ишлайдиган Golden Key Scanner Agent.
3) Windows WIA орқали USB/WIA scanner'ни чақириш.
4) Скан қилинган JPG файлни мавжуд CRM upload API орқали юклаш.
5) 20 MB лимит сақланади.

CRM файл:
crm/src/components/documents/DocumentsSection.jsx

Scanner Agent:
scanner-agent/

Ўрнатиш:
1. Windows компьютерда Node.js LTS бўлиши керак.
2. scanner-agent папкасини компьютерга кўчиринг.
3. PowerShell очиб scanner-agent ичига киринг.
4. .\install.ps1
5. Кейин start-agent.bat ни ишга туширинг.
6. CRM'ни қайта очинг.
7. «Ҳужжат юклаш» → «Сканердан олиш».

Муҳим:
- Бу биринчи версия Windows WIA билан бир саҳифани JPG қилиб скан қилади.
- Windows scanner driver WIA'ни қўллаши керак.
- Кейинги версияда кўп саҳифали PDF, preview ва scanner танлашни UIга қўшиш мумкин.
- Local agent фақат 127.0.0.1:17831 да ишлайди ва CRM origin whitelist билан чекланган.
