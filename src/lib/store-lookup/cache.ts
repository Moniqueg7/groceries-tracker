import { normalizeProduct } from "./normalize";
import type { StoreLookupResult } from "./types";

type CacheEntry = {
  expiresAt: number;
  result: StoreLookupResult;
};

const globalCache = globalThis as typeof globalThis & {
  __storeLookupCache?: Map<string, CacheEntry>;
};

const cache = globalCache.__storeLookupCache ?? new Map<string, CacheEntry>();
globalCache.__storeLookupCache = cache;

export function cacheKey(query: string): string {
  return normalizeProduct(query).key;
}

export function cacheTtlMs(): number {
  const hours = Number(process.env.STORE_LOOKUP_CACHE_HOURS ?? "6");
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 6;
  return safeHours * 60 * 60 * 1000;
}

export function getCachedLookup(query: string): StoreLookupResult | null {
  const entry = cache.get(cacheKey(query));
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(query));
    return null;
  }

  return {
    ...entry.result,
    cacheHit: true,
  };
}

export function setCachedLookup(query: string, result: StoreLookupResult): void {
  cache.set(cacheKey(query), {
    expiresAt: Date.now() + cacheTtlMs(),
    result: {
      ...result,
      cacheHit: false,
    },
  });
}
