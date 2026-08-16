FIX: Bank offer confirm callback collision

Сабаб:
"✅ Юбориш" callback = bank:offer:confirm эди.
Лекин ундан олдин /^bank:offer:(.+)$/ handler тургани учун
"confirm" caseId деб қабул қилиниб, таклиф жараёни қайта бошланар эди.
Шу сабаб CRM'га POST умуман кетмаган.

Тузатилди:
- case offer start callback: bank:offercase:<caseId>
- handler: /^bank:offercase:(.+)$/
- bank:offer:confirm ва bank:offer:cancel ўз ҳолича қолди.

Алмаштирилади:
telegram-bot/src/index.js

Кейин:
Commit -> Push origin
Railway -> telegram-bot deploy

Backend ёки CRM frontend'ни ўзгартириш шарт эмас.
