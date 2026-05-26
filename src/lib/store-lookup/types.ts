export type ConfidenceLevel = "high" | "medium" | "low";

export type PricePerUnit = {
  value: number;
  unit: "kg" | "l" | "each";
};

export type StoreOffer = {
  store: string;
  title: string;
  price: number;
  regularPrice?: number;
  promotionalPrice?: number;
  isPromo: boolean;
  specialLabel?: string;
  productUrl: string;
  storeSku: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  size?: string;
  pricePerUnit?: PricePerUnit;
  collectedAt: string;
  sourceName: string;
  normalizedProductKey: string;
};

export type StoreComparisonRow =
  | {
      store: string;
      status: "matched";
      offer: StoreOffer;
    }
  | {
      store: string;
      status: "unavailable";
      message: string;
    };

export type StoreRankings = {
  cheapestOverall?: StoreOffer;
  pricePerUnitWinner?: StoreOffer;
  specials: StoreOffer[];
  nearestPriceDifferences: {
    fromStore: string;
    toStore: string;
    difference: number;
  }[];
};

export type StoreLookupResult = {
  query: string;
  normalizedProductKey: string;
  offers: StoreOffer[];
  comparison: StoreComparisonRow[];
  rankings: StoreRankings;
  matchedProduct: string | null;
  storesChecked: string[];
  storesUnavailable: string[];
  fetchedAt: string;
  cacheHit: boolean;
};
