# Deploy to Vercel

## Database: PostgreSQL only (Neon)

This project uses **PostgreSQL** for local development and production. SQLite is not supported.

### 1. Create Neon Postgres

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project
3. Copy the **pooled** connection string (`postgresql://…?sslmode=require`)

### 2. Environment variables

**Local:** copy `.env.example` to `.env` and paste your Neon `DATABASE_URL`.

**Vercel:** Project → Settings → Environment Variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Same Neon Postgres URL (Production + Preview) |

Redeploy after saving.

### 3. Apply schema and seed (once per database)

From your PC, with the Neon URL in `.env`:

```bash
npm install
npm run db:setup
```

This runs `prisma migrate deploy` then seeds stores and catalog products.

### 4. Build on Vercel (automatic)

```bash
npm run vercel-build
```

Runs provider check, `verify-vercel-database`, `prisma generate`, and `next build`. Schema is applied via `db:migrate` (step 3), not during the Vercel build.

### 5. Push code

```bash
git push
```

## Verify

- `https://your-app.vercel.app/api/health` → `{ "ok": true, "database": true }`
- Homepage loads without `PrismaClientInitializationError`

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `P3019` sqlite does not match postgresql | Ensure `prisma/schema.prisma` has `provider = "postgresql"` and `migration_lock.toml` says `postgresql`. Do not use `file:` URLs. Run `npm run db:migrate` with a Postgres `DATABASE_URL`. |
| `PrismaClientInitializationError` | Set Postgres `DATABASE_URL` on Vercel, redeploy |
| Build fails on SQLite URL | Remove `file:./dev.db` from Vercel env; use Neon URL |
| App loads, empty data | Run `npm run db:setup` with production `DATABASE_URL` |
| Migrate fails on existing broken DB | In Neon console, reset the branch or drop schema `public` and re-run `npm run db:setup` |

## Migration history

A single baseline migration lives in `prisma/migrations/20260327120000_init/`. If you previously applied SQLite migrations to Neon, reset the Neon database before running `db:migrate`.
