import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DATABASE_SETUP_HINT, isDatabaseConfigured } from "@/lib/db-config";
import { mergeTop5, type OnlinePriceHit, type PriceSearchResult } from "@/lib/online-prices";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Enter at least 2 characters" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: DATABASE_SETUP_HINT }, { status: 503 });
  }

  const products = await prisma.product.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      unit: true,
      category: true,
      catalogPrices: {
        select: { price: true, store: { select: { name: true } } },
        orderBy: { price: "asc" },
        take: 6,
      },
    },
    orderBy: { name: "asc" },
    take: 5,
  });

  if (!products.length) {
    return NextResponse.json({
      query: q,
      productName: null,
      unit: null,
      category: null,
      top5: [],
      otherMatches: [],
      webUsed: false,
    } satisfies PriceSearchResult);
  }

  const primary = products[0];
  const catalogHits: OnlinePriceHit[] = primary.catalogPrices.map((cp) => ({
    store: cp.store.name,
    price: cp.price,
    title: primary.name,
    source: "catalog" as const,
  }));

  const top5 = mergeTop5(catalogHits, []).slice(0, 5);

  const otherMatches = products.slice(1, 5).map((p) => {
    const best = p.catalogPrices[0];
    return {
      name: p.name,
      bestPrice: best?.price ?? 0,
      store: best?.store.name ?? "—",
    };
  });

  const result: PriceSearchResult = {
    query: q,
    productName: primary.name,
    unit: primary.unit,
    category: primary.category,
    top5,
    otherMatches,
    webUsed: false,
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
