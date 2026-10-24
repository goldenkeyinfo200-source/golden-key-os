# Golden Key OS — Bank Mini App integration

## Changed files
- `backend/src/routes/auth.js`: verifies Telegram WebApp initData signature and freshness (10 minutes); issues existing 12-hour JWT only for linked active BANK_EMPLOYEE users.
- `crm/src/App.jsx`: auto-signs-in only when `/bank-mini` is opened with Telegram signed initData. Existing CRM username/password login is preserved.
- `crm/index.html`: Telegram WebApp JavaScript bridge.
- `telegram-bot/src/index.js`: optional WebApp button on each bank case.

## Railway variables
- backend: `BOT_TOKEN` (same token used by telegram-bot), `JWT_SECRET` already configured.
- telegram-bot: `BANK_MINI_APP_URL` = public HTTPS origin hosting CRM (e.g. https://crm.example.uz; **no** trailing `/bank-mini`).
- The Telegram bot must have HTTPS URL approved/configured in BotFather as needed.

## Deploy
1. Review changes and commit to your GitHub branch.
2. Deploy backend and CRM, then telegram-bot. Do not replace Railway Postgres or reset the database.
3. Link bank staff's Telegram account via the bot's existing phone linking flow.
4. Open bank cases from Telegram and tap Mini App button; confirm normal CRM password login still works.

## Security
Telegram initData is verified on the server; bank users must already be linked and active. The existing backend authorization and bank assignment checks still apply. Do not put BOT_TOKEN in Vite/frontend environment variables. WebApp access from Telegram is required for automatic sign-in. Never test with real customer documents in a public environment.

## Limitations
The new button opens the existing BankPortalPage, not a separate new mobile design. The `caseId` query parameter is reserved for future deep-link selection; it does not automatically open the selected case yet. Automatic push notification for each new assignment is not implemented by this patch.
