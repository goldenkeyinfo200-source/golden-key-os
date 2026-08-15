GOLDEN KEY OS — БАНК ТАНЛАШ DROPDOWN

ЎЗГАРГАН ФАЙЛ:
crm/src/components/bank-offers/BankOffersSection.jsx

НИМА ҚЎШИЛДИ:
- «Банк номи» қўлда ёзиладиган input эмас, банклар рўйхатидан select.
- Банклар /api/banks орқали базадан юкланади.
- Фақат isActive=true банклар янги таклифда чиқади.
- BANK_EMPLOYEE ролидаги ходимнинг ўз банки автоматик танланади.
- BANK_EMPLOYEE банк номини ўзгартира олмайди.
- Агар банк ходими аккаунтига bankId/банк бириктирилмаган бўлса, аниқ хатолик чиқади.
- Админ/менежерлар рўйхатдан исталган фаол банкни танлай олади.
- Эски таклиф таҳрирланганда банк рўйхатда бўлмаса ҳам эски номи сақланиб кўринади.

ЎРНАТИШ:
1. ZIP ни очинг.
2. Ичидаги crm папкасини golden-key-os устига ташланг.
3. Replace the files in the destination.
4. GitHub Desktop:
   Summary: Add bank selector to offers
5. Commit to main → Push origin.
6. CRM Railway deploy тугашини кутинг.
7. Ctrl + F5 қилинг.

МУҲИМ:
Банк ходимига банк Admin → Банклар бўлимида бириктирилган бўлиши керак.
Backend /api/banks маршрути ишлаши керак.
