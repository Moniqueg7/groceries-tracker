import type { OnlinePriceHit, SpecialOffer } from "./online-prices";

export type { SpecialOffer };

type CatalogRow = {
  price: number;
  regularPrice: number | null;
  specialLabel: string | null;
  listingName: string | null;
  store: { name: string };
};

export function isOnSpecial(regularPrice: number | null | undefined, price: number): boolean {
  return regularPrice != null && regularPrice > price;
}

export function catalogRowToHit(row: CatalogRow, productName: string): OnlinePriceHit {
  const onSpecial = isOnSpecial(row.regularPrice, row.price);
  return {
    store: row.store.name,
    price: row.price,
    title: productName,
    source: "cache",
    listingName: row.listingName ?? undefined,
    regularPrice: onSpecial ? row.regularPrice! : undefined,
    isSpecial: onSpecial,
    specialLabel: onSpecial ? row.specialLabel ?? "Special" : undefined,
  };
}

const catalogSelect = {
  price: true,
  regularPrice: true,
  specialLabel: true,
  listingName: true,
  store: { select: { name: true } },
} as const;

export { catalogSelect };

export function collectSpecials(
  products: {
    name: string;
    catalogPrices: CatalogRow[];
  }[]
): SpecialOffer[] {
  const offers: SpecialOffer[] = [];

  for (const product of products) {
    for (const cp of product.catalogPrices) {
      if (!isOnSpecial(cp.regularPrice, cp.price)) continue;
      const regularPrice = cp.regularPrice!;
      const saveAmount = regularPrice - cp.price;
      offers.push({
        store: cp.store.name,
        productName: product.name,
        listingName: cp.listingName ?? undefined,
        price: cp.price,
        regularPrice,
        specialLabel: cp.specialLabel ?? undefined,
        saveAmount,
        savePercent: Math.round((saveAmount / regularPrice) * 100),
      });
    }
  }

  return offers.sort((a, b) => b.savePercent - a.savePercent || a.price - b.price);
}
