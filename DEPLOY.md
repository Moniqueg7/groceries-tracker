# Deploy to Vercel

## Database: PostgreSQL only (Neon)

This project uses **PostgreSQL** for local development and production. SQLite is not supported.

### 1. Create Neon Postgres

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project
3. In **Connect**, copy **both** strings:
   - **Pooled** → `DATABASE_URL` (has `-pooler` in the host)
   - **Direct** → `DIRECT_URL` (no `-pooler`; required for `prisma migrate`)

### 2. Environment variables

**Local `.env`:**

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |

**Vercel** (Project → Settings → Environment Variables):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** URL (Production + Preview) |

`DIRECT_URL` is only needed on your PC when running `npm run db:migrate` / `db:setup`.

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
| `P1001` Can't reach database server (pooler host) | Add `DIRECT_URL` with Neon's **direct** string (no `-pooler`). Wake the project in the Neon console if it was idle. |
| `P3019` sqlite does not match postgresql | Ensure `prisma/schema.prisma` has `provider = "postgresql"` and `migration_lock.toml` says `postgresql`. Do not use `file:` URLs. Run `npm run db:migrate` with Postgres URLs. |
| `PrismaClientInitializationError` | Set Postgres `DATABASE_URL` on Vercel, redeploy |
| Build fails on SQLite URL | Remove `file:./dev.db` from Vercel env; use Neon URL |
| App loads, empty data | Run `npm run db:setup` with production `DATABASE_URL` |
| Migrate fails on existing broken DB | In Neon console, reset the branch or drop schema `public` and re-run `npm run db:setup` |

## Migration history

Baseline migration: `prisma/migrations/20260527140000_init/`. Regenerate with `node scripts/create-init-migration.mjs` (writes UTF-8 without BOM).

If a migration fails with `syntax error at or near ""` / `\u{feff}`, the SQL file had a UTF-8 BOM — recreate the migration with the script above.
