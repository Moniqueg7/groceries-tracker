import { NextRequest, NextResponse } from "next/server";
import { isLiveStoreLookupEnabled, lookupStorePrices } from "@/lib/store-lookup";
import type { OnlinePriceHit, PriceSearchResult, SpecialOffer } from "@/lib/online-prices";
import type { StoreOffer } from "@/lib/store-lookup/types";

export const dynamic = "force-dynamic";

function offerToHit(offer: StoreOffer, source: "live" | "cache"): OnlinePriceHit {
  return {
    store: offer.store,
    price: offer.price,
    title: offer.title,
    link: offer.productUrl,
    source,
    listingName: offer.title,
    regularPrice: offer.regularPrice,
    isSpecial: offer.isPromo,
    specialLabel: offer.specialLabel,
    confidence: offer.confidence,
    confidenceLevel: offer.confidenceLevel,
    storeSku: offer.storeSku,
    size: offer.size,
    pricePerUnit: offer.pricePerUnit,
    collectedAt: offer.collectedAt,
    sourceName: offer.sourceName,
  };
}

function liveOffersToHits(
  offers: Awaited<ReturnType<typeof lookupStorePrices>>["offers"],
  source: "live" | "cache"
): OnlinePriceHit[] {
  return offers.map((o) => ({
    ...offerToHit(o, source),
  }));
}

function liveOffersToSpecials(offers: Awaited<ReturnType<typeof lookupStorePrices>>["offers"]): SpecialOffer[] {
  return offers
    .filter((o) => o.regularPrice != null && o.regularPrice > o.price)
    .map((o) => ({
      store: o.store,
      productName: o.title,
      listingName: o.title,
      price: o.price,
      regularPrice: o.regularPrice!,
      specialLabel: o.specialLabel,
      saveAmount: o.regularPrice! - o.price,
      savePercent: Math.round(((o.regularPrice! - o.price) / o.regularPrice!) * 100),
    }));
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Enter at least 2 characters" }, { status: 400 });
  }

  if (!isLiveStoreLookupEnabled()) {
    return NextResponse.json({
      query: q,
      productName: null,
      unit: null,
      category: null,
      top5: [],
      comparison: [],
      otherMatches: [],
      specials: [],
      rankings: { specials: [], nearestPriceDifferences: [] },
      webUsed: false,
      live: false,
      noMatch: true,
      noMatchMessage: "Live price unavailable",
    } satisfies PriceSearchResult);
  }

  const live = await lookupStorePrices(q);
  const source = live.cacheHit ? "cache" : "live";
  const hits = liveOffersToHits(live.offers, source).slice(0, 5);

  const comparison = live.comparison.map((row) => {
    if (row.status === "matched") {
      const hit = offerToHit(row.offer, source);
      return {
        store: row.store,
        status: "matched" as const,
        title: hit.title,
        price: hit.price,
        link: hit.link,
        confidence: hit.confidence,
        confidenceLevel: hit.confidenceLevel,
        isSpecial: hit.isSpecial,
        specialLabel: hit.specialLabel,
        size: hit.size,
        pricePerUnit: hit.pricePerUnit,
        collectedAt: hit.collectedAt,
        sourceName: hit.sourceName,
      };
    }
    return { store: row.store, status: "unavailable" as const, message: "Live price unavailable" };
  });

  const result: PriceSearchResult = {
    query: q,
    productName: live.matchedProduct,
    unit: null,
    category: "Live lookup",
    top5: hits,
    comparison,
    otherMatches: [],
    specials: liveOffersToSpecials(live.offers),
    rankings: {
      cheapestOverall: live.rankings.cheapestOverall
        ? offerToHit(live.rankings.cheapestOverall, source)
        : undefined,
      pricePerUnitWinner: live.rankings.pricePerUnitWinner
        ? offerToHit(live.rankings.pricePerUnitWinner, source)
        : undefined,
      specials: live.rankings.specials.map((offer) => offerToHit(offer, source)),
      nearestPriceDifferences: live.rankings.nearestPriceDifferences,
    },
    webUsed: false,
    live: true,
    fetchedAt: live.fetchedAt,
    cacheHit: live.cacheHit,
    storesUnavailable: live.storesUnavailable,
    noMatch: live.offers.length === 0,
    noMatchMessage: live.offers.length === 0 ? "Live price unavailable" : undefined,
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
