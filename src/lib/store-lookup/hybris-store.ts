import { storeFetch } from "@/lib/store-fetch";
import { MIN_MATCH_CONFIDENCE, scoreProductMatch } from "./match-score";
import { createStoreOffer } from "./offer";
import type { StoreOffer } from "./types";

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function parseHybrisSearchHtml(
  html: string,
  query: string,
  store: string,
  baseUrl: string
): StoreOffer[] {
  const collectedAt = new Date().toISOString();
  const pricesByCode = new Map<string, { price: number; promo: boolean }>();
  for (const m of html.matchAll(
    /\{"code":"([^"]+)".*?"value":\s*([\d.]+).*?"promotionalPrice":(true|false)/g
  )) {
    pricesByCode.set(m[1], { price: parseFloat(m[2]), promo: m[3] === "true" });
  }

  const offers: StoreOffer[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(/href="([^"]*\/p\/(\d+EA))"/gi)) {
    const href = m[1];
    const code = m[2];
    if (seen.has(code)) continue;
    seen.add(code);

    const slugMatch = href.match(/\/([^/]+)\/p\//i);
    if (!slugMatch) continue;

    const name = slugToName(slugMatch[1]);
    const priceRow = pricesByCode.get(code);
    if (!priceRow) continue;

    const confidence = scoreProductMatch(query, name);
    if (confidence < MIN_MATCH_CONFIDENCE) continue;

    const path = href.startsWith("http") ? new URL(href).pathname : href;
    const productUrl = href.startsWith("http")
      ? href
      : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

    offers.push(createStoreOffer({
      store,
      title: name,
      price: priceRow.price,
      isPromo: priceRow.promo,
      specialLabel: priceRow.promo ? "Promo" : undefined,
      productUrl,
      storeSku: code,
      query,
      collectedAt,
      sourceName: store,
    }));
  }

  offers.sort((a, b) => b.confidence - a.confidence || a.price - b.price);
  return offers;
}

export async function fetchHybrisStoreOffers(
  store: string,
  baseUrl: string,
  searchPath: string,
  query: string
): Promise<StoreOffer[]> {
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}${searchPath}${encodeURIComponent(query)}`;
  const res = await storeFetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return [];
  const html = await res.text();
  return parseHybrisSearchHtml(html, query, store, base);
}
