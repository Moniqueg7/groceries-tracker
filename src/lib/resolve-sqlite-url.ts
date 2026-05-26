import path from "path";

/**
 * SQLite paths in .env are relative to the prisma/ folder (Prisma convention).
 * Next.js runs from the project root, so we resolve to an absolute path.
 */
export function resolveSqliteUrl(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url?.startsWith("file:")) return;

  let filePath = url.slice("file:".length);
  if (path.isAbsolute(filePath)) return;

  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  // file:./dev.db → prisma/dev.db (same file Prisma CLI uses)
  if (!normalized.startsWith("prisma/")) {
    filePath = path.join("prisma", normalized);
  } else {
    filePath = normalized;
  }

  const absolute = path.resolve(process.cwd(), filePath);
  process.env.DATABASE_URL = `file:${absolute.split(path.sep).join("/")}`;
}
