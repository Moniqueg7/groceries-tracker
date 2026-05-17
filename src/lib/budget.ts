import { startOfMonth, isWithinInterval, endOfMonth } from "date-fns";

export type PurchaseRow = {
  total: number;
  unitPrice: number;
  date: Date;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
};

export type CatalogRow = {
  productId: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  price: number;
};

export function spendThisMonth(purchases: PurchaseRow[]): number {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return purchases
    .filter((p) => isWithinInterval(p.date, { start, end }))
    .reduce((s, p) => s + p.total, 0);
}

export function spendByStore(purchases: PurchaseRow[]): { store: string; total: number }[] {
  const map = new Map<string, number>();
  for (const p of purchases) {
    map.set(p.storeName, (map.get(p.storeName) ?? 0) + p.total);
  }
  return [...map.entries()]
    .map(([store, total]) => ({ store, total }))
    .sort((a, b) => b.total - a.total);
}

export function buyFrequency(
  purchases: PurchaseRow[]
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of purchases) {
    map.set(p.productName, (map.get(p.productName) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function risingCosts(
  purchases: PurchaseRow[]
): { name: string; oldPrice: number; newPrice: number; change: number }[] {
  const byProduct = new Map<string, { date: Date; unitPrice: number; name: string }[]>();

  for (const p of purchases) {
    const list = byProduct.get(p.productId) ?? [];
    list.push({ date: p.date, unitPrice: p.unitPrice, name: p.productName });
    byProduct.set(p.productId, list);
  }

  const rising: { name: string; oldPrice: number; newPrice: number; change: number }[] = [];

  for (const [, history] of byProduct) {
    if (history.length < 2) continue;
    const sorted = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
    const oldPrice = sorted[0].unitPrice;
    const newPrice = sorted[sorted.length - 1].unitPrice;
    if (newPrice > oldPrice * 1.05) {
      rising.push({
        name: sorted[0].name,
        oldPrice,
        newPrice,
        change: ((newPrice - oldPrice) / oldPrice) * 100,
      });
    }
  }

  return rising.sort((a, b) => b.change - a.change).slice(0, 5);
}

/** Cheapest store total for a monthly shopping list using catalog prices */
export function cheapestStoreForList(
  needs: { productId: string; quantity: number }[],
  catalog: CatalogRow[]
): { storeName: string; storeColor: string; total: number }[] {
  const storeTotals = new Map<string, { name: string; color: string; total: number }>();

  for (const need of needs) {
    const prices = catalog.filter((c) => c.productId === need.productId);
    for (const row of prices) {
      const line = row.price * need.quantity;
      const existing = storeTotals.get(row.storeId);
      if (existing) {
        existing.total += line;
      } else {
        storeTotals.set(row.storeId, {
          name: row.storeName,
          color: row.storeColor,
          total: line,
        });
      }
    }
  }

  return [...storeTotals.values()]
    .map((s) => ({ storeName: s.name, storeColor: s.color, total: s.total }))
    .sort((a, b) => a.total - b.total);
}

export function compareProduct(
  productId: string,
  catalog: CatalogRow[]
): { storeName: string; storeColor: string; price: number }[] {
  return catalog
    .filter((c) => c.productId === productId)
    .map((c) => ({ storeName: c.storeName, storeColor: c.storeColor, price: c.price }))
    .sort((a, b) => a.price - b.price);
}
