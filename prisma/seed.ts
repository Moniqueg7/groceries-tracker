import { PrismaClient } from "../src/generated/prisma-household";
import { CATALOG_PRODUCTS, parseStorePrice } from "./products-catalog";

const prisma = new PrismaClient();

const STORES = [
  { name: "Checkers", color: "#e11d48" },
  { name: "Pick n Pay", color: "#2563eb" },
  { name: "Makro", color: "#dc2626" },
  { name: "Shoprite", color: "#f59e0b" },
  { name: "Woolworths", color: "#059669" },
  { name: "Spar", color: "#16a34a" },
  { name: "Clicks", color: "#38bdf8" },
  { name: "Dis-Chem", color: "#22c55e" },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", monthlyBudget: 5000 },
    update: {},
  });

  const storeMap = new Map<string, string>();
  for (const s of STORES) {
    const store = await prisma.store.upsert({
      where: { name: s.name },
      create: { name: s.name, color: s.color },
      update: { color: s.color },
    });
    storeMap.set(s.name, store.id);
  }

  for (const p of CATALOG_PRODUCTS) {
    const aliases = p.aliases ?? [];
    const searchTerms = [p.searchTerms, p.brand, p.size, ...aliases].filter(Boolean).join(" ");
    let product = await prisma.product.findFirst({
      where: p.barcode ? { OR: [{ barcode: p.barcode }, { name: p.name }] } : { name: p.name },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          brand: p.brand ?? null,
          department: p.department ?? null,
          category: p.category,
          size: p.size ?? null,
          unit: p.unit,
          aliases: aliases.length ? JSON.stringify(aliases) : null,
          barcode: p.barcode ?? null,
          image: p.image ?? null,
          searchTerms: searchTerms || null,
        },
      });
    } else {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          brand: p.brand ?? null,
          department: p.department ?? null,
          category: p.category,
          size: p.size ?? null,
          unit: p.unit,
          aliases: aliases.length ? JSON.stringify(aliases) : null,
          barcode: p.barcode ?? product.barcode,
          image: p.image ?? null,
          searchTerms: searchTerms || null,
        },
      });
    }

    for (const [storeName, entry] of Object.entries(p.prices ?? {})) {
      const storeId = storeMap.get(storeName);
      if (!storeId) continue;
      const parsed = parseStorePrice(entry);
      await prisma.catalogPrice.upsert({
        where: {
          productId_storeId: { productId: product.id, storeId },
        },
        create: {
          productId: product.id,
          storeId,
          price: parsed.price,
          specialPrice: parsed.specialPrice ?? null,
          regularPrice: parsed.regularPrice ?? null,
          specialLabel: parsed.specialLabel ?? null,
          listingName: parsed.listingName ?? null,
          image: parsed.image ?? null,
        },
        update: {
          price: parsed.price,
          specialPrice: parsed.specialPrice ?? null,
          regularPrice: parsed.regularPrice ?? null,
          specialLabel: parsed.specialLabel ?? null,
          listingName: parsed.listingName ?? null,
          image: parsed.image ?? null,
        },
      });
    }
  }

  console.log(`Seeded ${CATALOG_PRODUCTS.length} products across ${STORES.length} stores.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
