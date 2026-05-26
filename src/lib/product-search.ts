import { isPostgres } from "./db-config";

/** Match product name or searchTerms (aliases like "pepsi", "checkers florets"). */
export function productSearchWhere(q: string) {
  const term = q.trim();
  if (!term) return {};

  if (isPostgres()) {
    return {
      OR: [
        { name: { contains: term, mode: "insensitive" as const } },
        { searchTerms: { contains: term, mode: "insensitive" as const } },
      ],
    };
  }

  return {
    OR: [{ name: { contains: term } }, { searchTerms: { contains: term } }],
  };
}
