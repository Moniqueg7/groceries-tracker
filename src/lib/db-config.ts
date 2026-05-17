/** True when a database URL is configured (required on Vercel at runtime). */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (url.includes("placeholder")) return false;
  return true;
}

export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export const DATABASE_SETUP_HINT =
  "Database not configured. Add DATABASE_URL in .env (SQLite: file:./dev.db) or on Vercel use Neon Postgres, then run npm run db:push and npm run db:seed.";

export const DATABASE_CONNECTION_HINT =
  "Could not connect to the database. Run npm run db:push and npm run db:seed, or check DATABASE_URL.";
