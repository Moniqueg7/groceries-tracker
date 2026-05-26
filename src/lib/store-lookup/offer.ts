import { confidenceLevel, scoreProductMatch } from "./match-score";
import { extractCanonicalSize, normalizeProduct } from "./normalize";
import { pricePerUnit } from "./unit-price";
import type { StoreOffer } from "./types";

export function createStoreOffer(input: {
  store: string;
  title: string;
  price: number;
  regularPrice?: number;
  isPromo: boolean;
  specialLabel?: string;
  productUrl: string;
  storeSku: string;
  query: string;
  collectedAt: string;
  sourceName?: string;
}): StoreOffer {
  const confidence = scoreProductMatch(input.query, input.title);
  const normalized = normalizeProduct(input.title);

  return {
    store: input.store,
    title: input.title,
    price: input.price,
    regularPrice: input.regularPrice,
    promotionalPrice: input.isPromo ? input.price : undefined,
    isPromo: input.isPromo,
    specialLabel: input.specialLabel,
    productUrl: input.productUrl,
    storeSku: input.storeSku,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    size: extractCanonicalSize(input.title),
    pricePerUnit: pricePerUnit(input.price, input.title),
    collectedAt: input.collectedAt,
    sourceName: input.sourceName ?? input.store,
    normalizedProductKey: normalized.key,
  };
}
