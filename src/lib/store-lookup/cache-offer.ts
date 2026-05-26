import { prisma } from "@/lib/prisma";
import type { StoreOffer } from "./types";

/** Save confident live matches so the app learns without hand-editing the seed file. */
export async function cacheLiveOffer(offer: StoreOffer): Promise<void> {
  if (offer.confidence < 0.75) return;

  const store = await prisma.store.findUnique({ where: { name: offer.store } });
  if (!store) return;

  let product = await prisma.product.findFirst({
    where: { name: offer.title },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: offer.title,
        category: "Live",
        unit: "each",
        searchTerms: offer.storeSku,
      },
    });
  }

  await prisma.catalogPrice.upsert({
    where: {
      productId_storeId: { productId: product.id, storeId: store.id },
    },
    create: {
      productId: product.id,
      storeId: store.id,
      price: offer.price,
      regularPrice: offer.regularPrice ?? null,
      listingName: offer.title,
      specialLabel: offer.isPromo ? offer.specialLabel ?? "Promo" : null,
    },
    update: {
      price: offer.price,
      regularPrice: offer.regularPrice ?? null,
      listingName: offer.title,
      specialLabel: offer.isPromo ? offer.specialLabel ?? "Promo" : null,
    },
  });
}
