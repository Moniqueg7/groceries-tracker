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

export function isSqlite(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("file:");
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function validateDatabaseForRuntime(): void {
  if (!isDatabaseConfigured()) {
    throw new Error(DATABASE_SETUP_HINT);
  }
  if (isVercelRuntime() && isSqlite()) {
    throw new Error(DATABASE_SQLITE_ON_VERCEL_HINT);
  }
}

export const DATABASE_SETUP_HINT =
  "Database not configured. Add DATABASE_URL in Vercel (Neon or Supabase Postgres), then run npm run db:migrate and npm run db:seed.";

export const DATABASE_SQLITE_ON_VERCEL_HINT =
  "SQLite cannot run on Vercel serverless (no persistent disk). Set DATABASE_URL to a Postgres connection string from Neon or Supabase.";

export const DATABASE_CONNECTION_HINT =
  "Could not connect to the database. Run npm run db:migrate and npm run db:seed against your production DATABASE_URL, or check the connection string.";
