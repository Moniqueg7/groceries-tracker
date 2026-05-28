/**
 * Ensures prisma/schema.prisma uses PostgreSQL (never SQLite).
 * Validates DATABASE_URL on Vercel builds.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../prisma/schema.prisma");
const url = (process.env.DATABASE_URL ?? "").trim();
const onVercel = process.env.VERCEL === "1";
const provider = "postgresql";

if (onVercel) {
  if (!url) {
    console.error(
      "[prisma] DATABASE_URL is required on Vercel. Add your Neon Postgres URL in Project → Settings → Environment Variables."
    );
    process.exit(1);
  }
  if (url.startsWith("file:")) {
    console.error(
      "[prisma] SQLite DATABASE_URL cannot run on Vercel. Use a Neon or Supabase Postgres connection string."
    );
    process.exit(1);
  }
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    console.error("[prisma] DATABASE_URL must be a PostgreSQL connection string on Vercel.");
    process.exit(1);
  }
} else if (url.startsWith("file:")) {
  console.warn(
    "[prisma] DATABASE_URL points to SQLite (file:). This project uses PostgreSQL only. " +
      "Set DATABASE_URL to your Neon connection string in .env (see .env.example)."
  );
}

let schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${provider}"`);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[prisma] datasource provider → ${provider}`);
}

export { provider, onVercel };
