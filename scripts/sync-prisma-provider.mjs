import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../prisma/schema.prisma");
const url = (process.env.DATABASE_URL ?? "").trim();

const provider =
  process.env.VERCEL === "1" || url.startsWith("postgres://") || url.startsWith("postgresql://")
    ? "postgresql"
    : "sqlite";

let schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${provider}"`);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[prisma] datasource provider → ${provider}`);
} else if (!schema.includes(`provider = "${provider}"`)) {
  console.warn(`[prisma] could not set provider to ${provider}`);
}
