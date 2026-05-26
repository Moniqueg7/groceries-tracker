"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Loader2, Trophy, Tag } from "lucide-react";
import { formatZAR } from "@/lib/currency";
import type { PriceSearchResult } from "@/lib/online-prices";

type ProductOption = {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  size?: string | null;
  unit: string;
  aliases?: string[];
  searchTerms?: string | null;
  score?: number;
};

function formatPricePerUnit(pricePerUnit?: { value: number; unit: "kg" | "l" | "each" }) {
  if (!pricePerUnit) return null;
  return `${formatZAR(pricePerUnit.value)}/${pricePerUnit.unit}`;
}

function formatUpdated(iso?: string) {
  if (!iso) return null;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Updated: just now";
  if (minutes === 1) return "Updated: 1 minute ago";
  if (minutes < 60) return `Updated: ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "Updated: 1 hour ago" : `Updated: ${hours} hours ago`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSearchIcon = !inputFocused && query.length === 0;

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Could not load product list.");
          return;
        }
        const list = data as ProductOption[];
        setProducts(list);
      })
      .catch(() => setError("Could not load product list."));
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 1) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(term)}&limit=20`, { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) return;
          const list = (await r.json()) as ProductOption[];
          setProducts(list);
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return;
        });
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const suggestions = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (t.length < 1) return [];
    return products.slice(0, 8);
  }, [query, products]);

  const showSuggestionList = showSuggestions && suggestions.length > 0;

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      let data: PriceSearchResult & { error?: string };
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? "Invalid response from server." : `Search failed (${res.status}).`);
        setResult(null);
        return;
      }
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Network error — check your connection and try again.");
      setResult(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const pickProduct = (name: string) => {
    setQuery(name);
    setShowSuggestions(false);
    inputRef.current?.blur();
    runSearch(name);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="page-title">Check price</h2>
        <p className="page-sub">
          Live prices side-by-side — Checkers, Shoprite & Makro today. More stores when their sites allow it.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="card space-y-3 overflow-visible [content-visibility:visible]"
      >
        <label className="label" htmlFor="price-search">
          What are you looking for?
        </label>

        <div className="relative z-50 w-full">
          <div
            className={`flex w-full min-h-[48px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[rgba(0,0,0,0.35)] px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--border-bright)] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.18)] ${
              showSearchIcon ? "" : "pl-1"
            }`}
          >
          <Search
            className={`h-5 w-5 shrink-0 text-muted transition-all duration-150 ${
              showSearchIcon ? "opacity-100" : "w-0 opacity-0"
            }`}
            aria-hidden
          />
          <input
            ref={inputRef}
            id="price-search"
            type="search"
            enterKeyHint="search"
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] [-webkit-appearance:none] [appearance:none]"
            style={{ width: "100%", maxWidth: "100%" }}
            placeholder="e.g. broccoli florets, pepsi 500ml…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setResult(null);
            }}
            onFocus={() => {
              setInputFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setInputFocused(false), 150);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          </div>

          {showSuggestionList && (
            <ul
              className="mt-2 max-h-[min(16rem,45dvh)] overflow-y-auto overscroll-y-contain rounded-xl border border-[var(--border-bright)] bg-[var(--surface-solid)] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] [-webkit-overflow-scrolling:touch]"
              role="listbox"
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3.5 text-sm hover:bg-blue-500/10 active:bg-blue-500/20 border-b border-[var(--border)] last:border-0 touch-manipulation"
                    onClick={() => pickProduct(p.name)}
                  >
                    <span className="font-medium block">{p.name}</span>
                    <span className="text-muted text-xs">{p.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className="btn w-full min-h-[52px] text-base"
          disabled={loading || query.trim().length < 2}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching…
            </span>
          ) : (
            "Search prices"
          )}
        </button>
      </form>

      {error && <p className="text-sm text-danger px-1">{error}</p>}

      {!loading && result && (
        <>
          {!(result.comparison?.some((r) => r.status === "matched") ?? result.top5.length > 0) ? (
            <div className="card text-center py-8 text-muted">
              <p>No confident match for &ldquo;{result.query}&rdquo;.</p>
              <p className="text-sm mt-2">
                {result.noMatchMessage ??
                  "Use the exact product name and size (e.g. broccoli florets 350g, pepsi 500ml)."}
              </p>
            </div>
          ) : (
            <>
              <section className="card card-highlight">
                {result.live && (
                  <p className="text-xs font-semibold text-accent mb-2">
                    Live store prices
                    {result.fetchedAt
                      ? ` · updated ${new Date(result.fetchedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </p>
                )}
                {result.productName && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">Best match</p>
                    <h3 className="text-lg font-bold mt-0.5 break-words">{result.productName}</h3>
                    {result.unit && (
                      <p className="text-sm text-muted">
                        {result.category} · {result.unit}
                      </p>
                    )}
                  </div>
                )}

                {result.comparison && result.comparison.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
                      Side-by-side · live prices
                    </p>
                    <ul className="space-y-2">
                      {[...result.comparison]
                        .sort((a, b) => {
                          if (a.status === "matched" && b.status !== "matched") return -1;
                          if (b.status === "matched" && a.status !== "matched") return 1;
                          if (a.status === "matched" && b.status === "matched") {
                            return a.price - b.price;
                          }
                          return 0;
                        })
                        .map((row, i) => {
                          const isCheapest =
                            row.status === "matched" &&
                            result.rankings?.cheapestOverall?.store === row.store;

                          if (row.status !== "matched") {
                            return (
                              <li
                                key={row.store}
                                className="py-2.5 px-3 rounded-xl bg-black/15 border border-[var(--border)] opacity-70"
                              >
                                <div className="flex justify-between gap-2 text-sm">
                                  <span className="font-semibold">{row.store}</span>
                                  <span className="text-muted text-xs text-right max-w-[55%]">
                                    {row.message}
                                  </span>
                                </div>
                              </li>
                            );
                          }

                          return (
                            <li
                              key={row.store}
                              className={`py-3 px-3 rounded-xl ${
                                isCheapest
                                  ? "bg-blue-500/15 border border-blue-500/30"
                                  : "bg-black/20"
                              } ${row.confidenceLevel === "low" ? "opacity-80" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {isCheapest && (
                                      <Trophy className="w-4 h-4 text-gold shrink-0" />
                                    )}
                                    <span className="font-semibold">{row.store}</span>
                                    {isCheapest && (
                                      <span className="text-xs text-gold font-semibold">Cheapest</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted mt-0.5 break-words">{row.title}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                                    {row.confidenceLevel && (
                                      <span>
                                        Confidence:{" "}
                                        {row.confidenceLevel === "low"
                                          ? "low (possible mismatch)"
                                          : row.confidenceLevel}
                                      </span>
                                    )}
                                    {formatPricePerUnit(row.pricePerUnit) && (
                                      <span>{formatPricePerUnit(row.pricePerUnit)}</span>
                                    )}
                                    {row.sourceName && <span>Source: {row.sourceName}</span>}
                                    {formatUpdated(row.collectedAt) && (
                                      <span>{formatUpdated(row.collectedAt)}</span>
                                    )}
                                  </div>
                                  {row.link && (
                                    <a
                                      href={row.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-accent underline mt-1 inline-block"
                                    >
                                      View product →
                                    </a>
                                  )}
                                </div>
                                <span
                                  className={`font-bold shrink-0 ${isCheapest ? "text-accent-bright text-lg" : ""}`}
                                >
                                  {formatZAR(row.price)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                    {result.rankings && (
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        {result.rankings.cheapestOverall && (
                          <div className="rounded-lg bg-black/20 p-3">
                            <span className="text-muted block">Cheapest overall</span>
                            <strong className="text-accent-bright">
                              {result.rankings.cheapestOverall.store} ·{" "}
                              {formatZAR(result.rankings.cheapestOverall.price)}
                            </strong>
                          </div>
                        )}
                        {result.rankings.pricePerUnitWinner && (
                          <div className="rounded-lg bg-black/20 p-3">
                            <span className="text-muted block">Best price per unit</span>
                            <strong className="text-accent-bright">
                              {result.rankings.pricePerUnitWinner.store} ·{" "}
                              {formatPricePerUnit(result.rankings.pricePerUnitWinner.pricePerUnit)}
                            </strong>
                          </div>
                        )}
                        {result.rankings.nearestPriceDifferences[0] && (
                          <div className="rounded-lg bg-black/20 p-3 sm:col-span-2">
                            <span className="text-muted block">Nearest price difference</span>
                            <strong>
                              {result.rankings.nearestPriceDifferences[0].toStore} is{" "}
                              {formatZAR(result.rankings.nearestPriceDifferences[0].difference)} above{" "}
                              {result.rankings.nearestPriceDifferences[0].fromStore}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-3">
                      Stores without a matched live result show &ldquo;Live price unavailable&rdquo;.
                    </p>
                  </div>
                )}

                <ul className="hidden">
                  {result.top5.map((row, i) => (
                    <li
                      key={`${row.store}-${i}`}
                      className={`py-3 px-3 rounded-xl ${
                        i === 0 ? "bg-blue-500/15 border border-blue-500/30" : "bg-black/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-start gap-2 min-w-0">
                          {i === 0 ? (
                            <Trophy className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                          ) : (
                            <span className="w-5 text-center text-xs text-muted font-bold shrink-0 mt-1">
                              {i + 1}
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold block">{row.store}</span>
                            {row.listingName && (
                              <span className="text-xs text-muted block truncate">{row.listingName}</span>
                            )}
                            {row.isSpecial && row.specialLabel && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-gold">
                                <Tag className="w-3 h-3" />
                                {row.specialLabel}
                              </span>
                            )}
                            {row.link && (
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent block mt-1 underline"
                              >
                                View on {row.store}
                              </a>
                            )}
                            {result.live && row.confidence != null && (
                              <span className="text-xs text-muted block mt-0.5">
                                Match {Math.round(row.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {row.isSpecial && row.regularPrice != null && (
                            <span className="text-xs text-muted line-through block">
                              {formatZAR(row.regularPrice)}
                            </span>
                          )}
                          <span
                            className={`font-bold ${i === 0 ? "text-accent-bright text-lg" : ""} ${row.isSpecial ? "text-gold" : ""}`}
                          >
                            {formatZAR(row.price)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

              </section>

              {result.specials && result.specials.length > 0 && (
                <section className="card card-warn">
                  <h3 className="text-sm font-semibold text-gold uppercase tracking-wide mb-1 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    On special
                  </h3>
                  <p className="text-xs text-muted mb-3">
                    Live specials for your search, when the store exposes a promotional price.
                  </p>
                  <ul className="space-y-2">
                    {result.specials.map((s) => (
                      <li
                        key={`${s.store}-${s.productName}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-[var(--border)] last:border-0"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-sm">{s.productName}</span>
                          <span className="text-muted text-xs block">
                            {s.store}
                            {s.listingName ? ` · ${s.listingName}` : ""}
                            {s.specialLabel ? ` · ${s.specialLabel}` : ""}
                          </span>
                        </div>
                        <div className="shrink-0 text-right text-sm">
                          <span className="text-muted line-through mr-2">{formatZAR(s.regularPrice)}</span>
                          <span className="font-bold text-gold">{formatZAR(s.price)}</span>
                          <span className="text-xs text-accent ml-2">−{s.savePercent}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.otherMatches.length > 0 && (
                <section className="card">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                    Similar items
                  </h3>
                  <ul className="space-y-1">
                    {result.otherMatches.map((m) => (
                      <li key={m.name}>
                        <button
                          type="button"
                          className="w-full text-left py-2.5 text-sm flex flex-col sm:flex-row sm:justify-between gap-0.5 active:text-accent"
                          onClick={() => pickProduct(m.name)}
                        >
                          <span>{m.name}</span>
                          <span className="text-muted text-xs sm:text-sm">
                            from {formatZAR(m.bestPrice)} · {m.store}
                            {m.onSpecial ? " · special" : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}

      {!loading && !result && query.length >= 2 && !showSuggestions && (
        <p className="text-sm text-muted text-center">Tap Search prices to compare stores.</p>
      )}
    </div>
  );
}
