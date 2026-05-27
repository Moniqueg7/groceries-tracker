# Deploy to Vercel

## Why Postgres is required

Vercel runs **serverless** functions with a **read-only filesystem**. SQLite (`file:./dev.db`) only works on your PC. Production must use **Neon** or **Supabase Postgres**.

## 1. Create Postgres (Neon recommended)

1. Sign up at [neon.tech](https://neon.tech) (or [supabase.com](https://supabase.com))
2. Create a project
3. Copy the **pooled** connection string (`postgresql://…?sslmode=require`)

## 2. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Your Postgres connection string (Production + Preview) |

Redeploy after saving.

## 3. Build (automatic)

```bash
npm run vercel-build
```

This runs:

1. `sync-prisma-provider` — forces **postgresql** on Vercel
2. `verify-vercel-database` — fails build if `DATABASE_URL` is SQLite on Vercel
3. `prisma generate` — generates client into `src/generated/prisma-household`
4. `next build`

No `db push` during build — apply schema separately (step 4).

## 4. Create tables (once, from your PC)

Paste the **same** `DATABASE_URL` into your local `.env`, then:

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:migrate` runs `prisma migrate deploy` against your production database.

## 5. Push code

```bash
git push
```

## Verify

- Open `https://your-app.vercel.app/api/health` — should return `{ "ok": true, "database": true }`
- Homepage should load without `PrismaClientInitializationError`

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `PrismaClientInitializationError` | Set `DATABASE_URL` to Postgres on Vercel, redeploy |
| Build fails on SQLite URL | Remove `file:` URLs from Vercel env; use Neon/Supabase |
| App loads, empty data | Run `npm run db:migrate` and `npm run db:seed` with production URL |
| Works locally, not Vercel | Local uses SQLite; production needs Postgres |
