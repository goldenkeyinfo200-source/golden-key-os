Golden Key OS — realtor template v2 fix

Алмаштириладиган файллар:
1) backend/src/routes/contracts.js
2) backend/src/services/contract-template.js

Асосий тузатиш:
contracts.js ичида:
data-gk-template="realtor-service-v1"
→
data-gk-template="realtor-service-v2"

Натижа:
- янги риэлторлик шартномалари v2 шаблондан яратилади;
- CADASTRE_ASSISTANCE, NOTARY_DOCUMENTS, INHERITANCE_ASSISTANCE ва бошқа йўналишлар шартномада ўз матни билан чиқади;
- эски имзоланган шартномалар ўзгармайди;
- янги шартнома яратилганда ContractTemplate версияси янгиланиши мумкин.

Қўйиш:
- contracts.js → backend/src/routes/contracts.js
- contract-template.js → backend/src/services/contract-template.js
- commit + push
- Railway backend deployment тугашини кутинг
- кейин янги шартнома яратиб текширинг
