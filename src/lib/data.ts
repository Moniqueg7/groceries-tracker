import { prisma } from "./prisma";
import type { CatalogRow, PurchaseRow } from "./budget";

export async function getSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: "default", monthlyBudget: 5000 },
    });
  }
  return settings;
}

export async function getCatalog(): Promise<CatalogRow[]> {
  const rows = await prisma.catalogPrice.findMany({
    include: { store: true, product: true },
  });
  return rows.map((r) => ({
    productId: r.productId,
    storeId: r.storeId,
    storeName: r.store.name,
    storeColor: r.store.color,
    price: r.price,
  }));
}

export async function getPurchases(): Promise<PurchaseRow[]> {
  const rows = await prisma.purchase.findMany({
    orderBy: { date: "desc" },
    take: 400,
    include: { store: true, product: true },
  });
  return rows.map((p) => ({
    total: p.total,
    unitPrice: p.unitPrice,
    date: p.date,
    storeId: p.storeId,
    storeName: p.store.name,
    productId: p.productId,
    productName: p.product.name,
  }));
}
