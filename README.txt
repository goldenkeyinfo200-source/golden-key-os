Golden Key OS Telegram Bot — service flow fix

Алмаштирилади:
telegram-bot/src/index.js

Янги логика:
- PRIMARY_MORTGAGE / SECONDARY_MORTGAGE / MICROLOAN -> кредит суммаси.
- REALTOR_SERVICE / SALE_PURCHASE / CADASTRE_SERVICE -> риелторлик йўналиши.
- Риелторликда ипотека/кредит суммаси сўралмайди.
- Йўналишлар: сотиш, сотиб олиш, ижарага бериш, ижарага олиш.
- OTHER -> қўшимча изоҳ.

Файлни алмаштириб GitHub'га push қилинг ва Railway telegram-bot'ни redeploy қилинг.
