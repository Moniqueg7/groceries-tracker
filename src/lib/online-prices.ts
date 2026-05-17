export type OnlinePriceHit = {
  store: string;
  price: number;
  title: string;
  link?: string;
  source: "catalog" | "web";
};

export type PriceSearchResult = {
  query: string;
  productName: string | null;
  unit: string | null;
  category: string | null;
  top5: OnlinePriceHit[];
  otherMatches: { name: string; bestPrice: number; store: string }[];
  webUsed: boolean;
};

/** Optional SerpAPI Google Shopping (set SERPAPI_API_KEY on Vercel) */
export async function fetchWebShoppingPrices(query: string): Promise<OnlinePriceHit[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];

  const q = `${query} buy south africa`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", q);
  url.searchParams.set("location", "South Africa");
  url.searchParams.set("gl", "za");
  url.searchParams.set("hl", "en");
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    shopping_results?: {
      title?: string;
      source?: string;
      price?: string;
      extracted_price?: number;
      link?: string;
    }[];
  };

  const hits: OnlinePriceHit[] = [];
  for (const item of data.shopping_results ?? []) {
    const price =
      item.extracted_price ??
      parseZarFromText(item.price ?? "");
    if (!price || price <= 0) continue;
    hits.push({
      store: item.source ?? "Online",
      price,
      title: item.title ?? query,
      link: item.link,
      source: "web",
    });
  }

  return hits.sort((a, b) => a.price - b.price).slice(0, 5);
}

function parseZarFromText(text: string): number | null {
  const m = text.replace(/,/g, "").match(/R?\s*(\d+(?:\.\d{2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function mergeTop5(
  catalog: OnlinePriceHit[],
  web: OnlinePriceHit[]
): OnlinePriceHit[] {
  const combined = [...catalog, ...web];
  combined.sort((a, b) => a.price - b.price);
  const seen = new Set<string>();
  const out: OnlinePriceHit[] = [];
  for (const row of combined) {
    const key = `${row.store}-${row.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= 5) break;
  }
  return out;
}
