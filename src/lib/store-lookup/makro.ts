import { storeFetch } from "@/lib/store-fetch";
import { MIN_MATCH_CONFIDENCE, scoreProductMatch } from "./match-score";
import { createStoreOffer } from "./offer";
import type { StoreOffer } from "./types";

const BASE = "https://www.makro.co.za";

function parseMakroSearchHtml(html: string, query: string): StoreOffer[] {
  const offers: StoreOffer[] = [];
  const seen = new Set<string>();
  const collectedAt = new Date().toISOString();

  for (const m of html.matchAll(/"itemName":"([^"]+)"[\s\S]{0,1200}?"fsp":"(\d+)"/g)) {
    const title = m[1].replace(/\\u0026/g, "&");
    const price = parseInt(m[2], 10) / 100;
    if (!Number.isFinite(price) || price <= 0) continue;

    const confidence = scoreProductMatch(query, title);
    if (confidence < MIN_MATCH_CONFIDENCE) continue;

    const key = `${title}-${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const slugMatch = html.match(
      new RegExp(
        `"itemName":"${m[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]{0,2000}?/([^/]+)/p/([^"?]+)`,
        "i"
      )
    );

    let productUrl = `${BASE}/search?q=${encodeURIComponent(query)}`;
    if (slugMatch) {
      productUrl = `${BASE}/${slugMatch[1]}/p/${slugMatch[2]}`;
    }

    offers.push(createStoreOffer({
      store: "Makro",
      title,
      price,
      isPromo: false,
      productUrl,
      storeSku: slugMatch?.[2] ?? title,
      query,
      collectedAt,
      sourceName: "Makro",
    }));
  }

  // JSON-LD fallback for URLs when tracking blob is sparse
  const listMatch = html.match(
    /\{"@context":"http:\/\/schema\.org","@type":"ItemList","itemListElement":(\[[\s\S]*?\])\}/
  );
  if (listMatch) {
    try {
      const items = JSON.parse(listMatch[1]) as {
        name?: string;
        url?: string;
      }[];
      for (const item of items) {
        if (!item.name || !item.url) continue;
        const existing = offers.find(
          (o) => o.title.toLowerCase() === item.name!.toLowerCase()
        );
        if (existing) {
          existing.productUrl = item.url;
        }
      }
    } catch {
      /* ignore */
    }
  }

  offers.sort((a, b) => b.confidence - a.confidence || a.price - b.price);
  return offers;
}

export async function fetchMakroOffers(query: string): Promise<StoreOffer[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const res = await storeFetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return [];
  return parseMakroSearchHtml(await res.text(), query);
}
