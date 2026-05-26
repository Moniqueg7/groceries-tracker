import { fetchCheckersOffers } from "./checkers";
import { getCachedLookup, setCachedLookup } from "./cache";
import { fetchMakroOffers } from "./makro";
import { normalizeProduct } from "./normalize";
import { fetchShopriteOffers } from "./shoprite";
import type { StoreComparisonRow, StoreLookupResult, StoreOffer, StoreRankings } from "./types";

export const ALL_STORES = [
  "Checkers",
  "Pick n Pay",
  "Makro",
  "Woolworths",
  "Shoprite",
  "Spar",
  "Clicks",
  "Dis-Chem",
] as const;

type Provider = {
  store: string;
  fetch: (query: string) => Promise<StoreOffer[]>;
};

/** Stores with server-side live price lookup (exact product match scoring). */
const LIVE_PROVIDERS: Provider[] = [
  { store: "Checkers", fetch: fetchCheckersOffers },
  { store: "Shoprite", fetch: fetchShopriteOffers },
  { store: "Makro", fetch: fetchMakroOffers },
];

const LIVE_STORE_SET = new Set(LIVE_PROVIDERS.map((p) => p.store));

export function isLiveStoreLookupEnabled(): boolean {
  return process.env.LIVE_STORE_LOOKUP !== "0";
}

function bestOfferPerStore(offers: StoreOffer[]): StoreOffer[] {
  const byStore = new Map<string, StoreOffer>();
  for (const offer of offers) {
    const existing = byStore.get(offer.store);
    if (
      !existing ||
      offer.confidence > existing.confidence ||
      (offer.confidence === existing.confidence && offer.price < existing.price)
    ) {
      byStore.set(offer.store, offer);
    }
  }
  return [...byStore.values()].sort((a, b) => a.price - b.price);
}

export function buildComparisonRows(
  offers: StoreOffer[]
): StoreComparisonRow[] {
  const bestByStore = new Map(offers.map((o) => [o.store, o]));

  return ALL_STORES.map((store) => {
    const offer = bestByStore.get(store);
    if (offer) {
      return { store, status: "matched" as const, offer };
    }
    return {
      store,
      status: "unavailable" as const,
      message: "Live price unavailable",
    };
  });
}

function buildRankings(offers: StoreOffer[]): StoreRankings {
  // Low-confidence rows are shown to the user as possible mismatches, but they
  // are not allowed to win rankings.
  const rankableOffers = offers.filter((o) => o.confidenceLevel !== "low");
  const byPrice = [...rankableOffers].sort((a, b) => a.price - b.price);
  const byUnitPrice = rankableOffers
    .filter((o) => o.pricePerUnit)
    .sort((a, b) => a.pricePerUnit!.value - b.pricePerUnit!.value);

  const nearestPriceDifferences = byPrice.slice(1).map((offer, index) => {
    const previous = byPrice[index];
    return {
      fromStore: previous.store,
      toStore: offer.store,
      difference: offer.price - previous.price,
    };
  });

  return {
    cheapestOverall: byPrice[0],
    pricePerUnitWinner: byUnitPrice[0],
    specials: rankableOffers
      .filter((o) => o.isPromo || (o.regularPrice != null && o.regularPrice > o.price))
      .sort((a, b) => a.price - b.price),
    nearestPriceDifferences,
  };
}

export async function lookupStorePrices(query: string): Promise<StoreLookupResult> {
  const trimmed = query.trim();
  const cached = getCachedLookup(trimmed);
  if (cached) return cached;

  const normalized = normalizeProduct(trimmed);
  const storesChecked: string[] = [];
  const allOffers: StoreOffer[] = [];

  await Promise.all(
    LIVE_PROVIDERS.map(async ({ store, fetch }) => {
      storesChecked.push(store);
      try {
        const offers = await fetch(normalized.text);
        allOffers.push(...offers);
      } catch (err) {
        console.error(`[store-lookup] ${store} failed:`, err);
      }
    })
  );

  const storesUnavailable = ALL_STORES.filter((s) => !LIVE_STORE_SET.has(s));
  const offers = bestOfferPerStore(allOffers);
  const comparison = buildComparisonRows(offers);
  const rankings = buildRankings(offers);

  const best = offers.reduce<StoreOffer | null>(
    (top, o) => (!top || o.confidence > top.confidence ? o : top),
    null
  );

  const result: StoreLookupResult = {
    query: trimmed,
    normalizedProductKey: normalized.key,
    offers,
    comparison,
    rankings,
    matchedProduct: best?.title ?? null,
    storesChecked,
    storesUnavailable,
    fetchedAt: new Date().toISOString(),
    cacheHit: false,
  };

  setCachedLookup(trimmed, result);
  return result;
}
