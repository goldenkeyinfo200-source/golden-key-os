# Golden Key OS

Golden Key Info учун ягона рақамли платформа.

## Модуллар

- `backend` — Node.js + Express + Prisma + PostgreSQL
- `crm` — React + Vite веб CRM
- `telegram-bot` — Telegram бот
- `shared` — умумий типлар ва константалар
- `docs` — ТЗ, схема ва бренд материаллари

## Ишга тушириш

```bash
npm install
cp .env.example .env
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:migrate
npm run dev:backend
npm run dev:crm
```
