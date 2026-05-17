/** True when a database URL is configured (required on Vercel at runtime). */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  // Prisma generate / Next build can use a placeholder; real URLs connect at runtime.
  if (url.includes("placeholder") && process.env.VERCEL === "1") return false;
  return true;
}

export const DATABASE_SETUP_HINT =
  "Database not configured. On Vercel, add DATABASE_URL (Postgres, e.g. Neon) in Project → Settings → Environment Variables, then run db:push once from your PC.";
