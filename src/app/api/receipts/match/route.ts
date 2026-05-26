import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MatchRequestItem = {
  name: string;
};

type ProductCandidate = {
  id: string;
  name: string;
  aliases: string | null;
  searchTerms: string | null;
};

const recognizedCache = new Map<string, { productId: string; score: number }>();

function now() {
  return performance.now();
}

function ms(start: number) {
  return Math.round(performance.now() - start);
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/coca[-\s]?cola/g, "coke")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAliases(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  }
}

function scoreItem(itemName: string, product: ProductCandidate) {
  const item = normalize(itemName);
  const target = normalize([product.name, product.searchTerms, ...parseAliases(product.aliases)].filter(Boolean).join(" "));
  if (!item || !target) return 0;
  if (target.includes(item) || item.includes(target)) return 100;

  const itemTokens = new Set(item.split(" ").filter((token) => token.length > 1));
  const targetTokens = new Set(target.split(" ").filter((token) => token.length > 1));
  if (!itemTokens.size || !targetTokens.size) return 0;

  let hits = 0;
  for (const token of itemTokens) {
    if (targetTokens.has(token)) hits += 1;
  }
  return Math.round((hits / itemTokens.size) * 100);
}

function findBestMatch(itemName: string, products: ProductCandidate[]) {
  let best: { productId: string; score: number } | null = null;
  for (const product of products) {
    const score = scoreItem(itemName, product);
    if (!best || score > best.score) best = { productId: product.id, score };
  }
  return best && best.score >= 70 ? best : null;
}

export async function POST(request: Request) {
  const startedAt = now();
  const body = (await request.json()) as { items?: MatchRequestItem[] };
  const names = (body.items ?? []).map((item) => item.name?.trim()).filter(Boolean);

  if (!names.length) {
    return NextResponse.json({ matches: [], timings: { totalMs: ms(startedAt) } });
  }

  const matchingStartedAt = now();
  const matchByName = new Map<string, { productId: string | null; score: number; source: "cache" | "database" }>();
  const misses: string[] = [];

  for (const name of names) {
    const key = normalize(name);
    const cached = recognizedCache.get(key);
    if (cached) {
      matchByName.set(name, { productId: cached.productId, score: cached.score, source: "cache" });
    } else {
      misses.push(name);
    }
  }
  const cacheMs = ms(matchingStartedAt);

  let databaseMs = 0;
  if (misses.length) {
    const databaseStartedAt = now();
    const products = await prisma.product.findMany({
      select: { id: true, name: true, aliases: true, searchTerms: true },
    });
    databaseMs = ms(databaseStartedAt);

    for (const name of misses) {
      const match = findBestMatch(name, products);
      if (match) {
        recognizedCache.set(normalize(name), match);
        matchByName.set(name, { productId: match.productId, score: match.score, source: "database" });
      } else {
        matchByName.set(name, { productId: null, score: 0, source: "database" });
      }
    }
  }

  const matches = names.map((name) => ({
    name,
    ...(matchByName.get(name) ?? { productId: null, score: 0, source: "database" as const }),
  }));

  const timings = {
    cacheMs,
    databaseMs,
    matchingMs: ms(matchingStartedAt),
    totalMs: ms(startedAt),
  };

  console.info("[receipt-match] complete", {
    items: names.length,
    cacheHits: matches.filter((match) => match.source === "cache").length,
    timings,
  });

  return NextResponse.json({ matches, timings });
}
