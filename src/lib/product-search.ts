import { isPostgres } from "./db-config";

/** Case-insensitive on Postgres; contains on SQLite. */
export function productNameFilter(q: string) {
  if (isPostgres()) {
    return { name: { contains: q, mode: "insensitive" as const } };
  }
  return { name: { contains: q } };
}
