GOLDEN KEY OS — PDF FONT FIX

МУАММО:
Railway контейнерда систем DejaVu Sans шрифти мавжуд эмас эди.

ЕЧИМ:
Шрифт файллари алоҳида тарқатилмайди.
dejavu-fonts-ttf npm пакети dependency сифатида ўрнатилади.
contract-pdf.js шрифт йўлини require.resolve() орқали автоматик топади.

ФАЙЛЛАР:
backend/package.json
backend/src/services/contract-pdf.js

ЎРНАТИШ:
1. Архивни очинг.
2. Ичидаги backend папкасини лойиҳа устига ташланг.
3. Replace the files in the destination.
4. GitHub Desktop:
   Summary: Fix PDF Cyrillic font on Railway
   Commit to main
   Push origin
5. Railway backend deploy тугашини кутинг.
6. CRM → PDF тайёрлаш тугмасини яна босинг.

RAILWAY VARIABLE КЕРАК ЭМАС:
PDF_FONT_PATH қўшиш шарт эмас.
