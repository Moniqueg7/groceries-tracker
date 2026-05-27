/**
 * Warn during Vercel builds when DATABASE_URL is missing or SQLite (invalid on serverless).
 */
const url = (process.env.DATABASE_URL ?? "").trim();

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

if (!url) {
  console.warn(
    "[vercel] DATABASE_URL is not set for this build. Runtime will fail until you add a Postgres URL in Vercel → Settings → Environment Variables."
  );
  process.exit(0);
}

if (url.startsWith("file:")) {
  console.error(
    "[vercel] DATABASE_URL points to SQLite (file:). Vercel serverless cannot use SQLite. Use Neon or Supabase Postgres."
  );
  process.exit(1);
}

if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.warn(`[vercel] DATABASE_URL does not look like Postgres (${url.slice(0, 12)}…)`);
}

console.log("[vercel] DATABASE_URL looks like Postgres");
