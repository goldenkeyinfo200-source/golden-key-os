GK PAYMENT RECEIPT UPDATE

1. telegram.js -> backend/src/services/telegram.js га алмаштиринг.
2. Бу файлга sendPaymentReceiptToClient() функцияси қўшилди.
3. Кейинги босқичда payments/finance route ичида:
   - тўловни сақлаш
   - PDF квитанция яратиш
   - sendPaymentReceiptToClient() ни чақириш
   уланади.

Эслатма:
Фақат telegram.js билан квитанция автоматик кетмайди.
Тўлов сақланадиган backend route ҳам янгиланиши керак.
