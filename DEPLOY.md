# Deploy to Vercel

## Build (automatic)

Vercel runs:

```bash
npm run vercel-build
```

which is only:

```bash
prisma generate && next build
```

**No `prisma db push` during build** — schema changes are applied manually (see below).

## 1. Postgres database (required on Vercel)

Vercel cannot use SQLite. Use free **[Neon](https://neon.tech)**:

1. Create a project → copy the **connection string** (pooled).
2. In Vercel: **Project → Settings → Environment Variables**
3. Add **`DATABASE_URL`** = your Neon URL (Production, Preview, Development).
4. Redeploy.

## 2. Create tables (once, from your PC)

After the first successful deploy, on your computer:

```bash
# Use the same DATABASE_URL as Vercel (paste into .env)
npm install
npx prisma db push
npm run db:seed
```

Or use migrations:

```bash
npx prisma migrate deploy
npm run db:seed
```

## 3. Push code & deploy

```bash
git push
```

Vercel builds automatically. Open your `https://….vercel.app` URL on your phone → **Add to Home Screen**.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Build fails on `db push` | Ensure `vercel-build` is only `prisma generate && next build` |
| App loads but APIs error | Set `DATABASE_URL` on Vercel and run `db:push` + `db:seed` once |
| Works locally, not on Vercel | Local may use SQLite; Vercel needs Postgres `DATABASE_URL` |

## Optional

`SERPAPI_API_KEY` — live web prices in the Search tab.
