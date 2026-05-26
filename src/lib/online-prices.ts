export type OnlinePriceHit = {
  store: string;
  price: number;
  title: string;
  link?: string;
  source: "live" | "cache";
  listingName?: string;
  regularPrice?: number;
  isSpecial?: boolean;
  specialLabel?: string;
  confidence?: number;
  confidenceLevel?: "high" | "medium" | "low";
  storeSku?: string;
  size?: string;
  pricePerUnit?: { value: number; unit: "kg" | "l" | "each" };
  collectedAt?: string;
  sourceName?: string;
};

export type SpecialOffer = {
  store: string;
  productName: string;
  listingName?: string;
  price: number;
  regularPrice: number;
  specialLabel?: string;
  saveAmount: number;
  savePercent: number;
};

export type StoreComparisonHit =
  | {
      store: string;
      status: "matched";
      title: string;
      price: number;
      link?: string;
      confidence?: number;
      confidenceLevel?: "high" | "medium" | "low";
      isSpecial?: boolean;
      specialLabel?: string;
      size?: string;
      pricePerUnit?: { value: number; unit: "kg" | "l" | "each" };
      collectedAt?: string;
      sourceName?: string;
    }
  | {
      store: string;
      status: "unavailable";
      message: string;
    };

export type PriceRankings = {
  cheapestOverall?: OnlinePriceHit;
  pricePerUnitWinner?: OnlinePriceHit;
  specials: OnlinePriceHit[];
  nearestPriceDifferences: {
    fromStore: string;
    toStore: string;
    difference: number;
  }[];
};

export type PriceSearchResult = {
  query: string;
  productName: string | null;
  unit: string | null;
  category: string | null;
  top5: OnlinePriceHit[];
  comparison?: StoreComparisonHit[];
  otherMatches: { name: string; bestPrice: number; store: string; onSpecial?: boolean }[];
  specials: SpecialOffer[];
  rankings?: PriceRankings;
  webUsed: boolean;
  live?: boolean;
  fetchedAt?: string;
  cacheHit?: boolean;
  storesUnavailable?: string[];
  noMatch?: boolean;
  noMatchMessage?: string;
};

