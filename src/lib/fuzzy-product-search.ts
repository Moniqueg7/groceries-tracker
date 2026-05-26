export type ProductSearchRecord = {
  id: string;
  name: string;
  brand: string | null;
  department: string | null;
  category: string;
  size: string | null;
  unit: string;
  aliases: string | null;
  barcode: string | null;
  image: string | null;
  searchTerms: string | null;
  updatedAt?: Date | string;
};

export function parseAliases(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/coca[-\s]?cola/g, "coke")
    .replace(/tomato sauce/g, "ketchup")
    .replace(/chicken fillets/g, "chicken breast")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function tokenScore(queryToken: string, candidateToken: string): number {
  if (candidateToken === queryToken) return 1;
  if (
    (queryToken.length >= 3 && candidateToken.startsWith(queryToken)) ||
    (candidateToken.length >= 3 && queryToken.startsWith(candidateToken))
  ) {
    return 0.85;
  }
  const distance = levenshtein(queryToken, candidateToken);
  const maxLen = Math.max(queryToken.length, candidateToken.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.68 ? similarity : 0;
}

export function productSearchScore(query: string, product: ProductSearchRecord): number {
  const q = normalize(query);
  if (!q) return 0;

  const haystack = normalize(
    [
      product.name,
      product.brand,
      product.department,
      product.category,
      product.size,
      product.unit,
      product.searchTerms,
      product.barcode,
      ...parseAliases(product.aliases),
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (haystack.includes(q)) return 100;

  const queryTokens = q.split(" ").filter(Boolean);
  const candidateTokens = [...new Set(haystack.split(" ").filter(Boolean))];
  if (!queryTokens.length || !candidateTokens.length) return 0;

  const score = queryTokens.reduce((sum, token) => {
    const best = Math.max(...candidateTokens.map((candidate) => tokenScore(token, candidate)));
    return sum + best;
  }, 0);

  return (score / queryTokens.length) * 100;
}
