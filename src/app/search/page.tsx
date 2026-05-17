"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Loader2, Trophy } from "lucide-react";
import { formatZAR } from "@/lib/currency";
import type { PriceSearchResult } from "@/lib/online-prices";

type ProductOption = { id: string; name: string; category: string };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/products")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Could not load product list.");
          return;
        }
        const list = data as { id: string; name: string; category: string }[];
        setProducts(list.map((p) => ({ id: p.id, name: p.name, category: p.category })));
      })
      .catch(() => setError("Could not load product list."));
  }, []);

  const suggestions = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (t.length < 1) return [];
    return products.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 8);
  }, [query, products]);

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
        <p className="page-sub">Top 5 cheapest across Checkers, PnP, Spar, Shoprite, Woolworths & Makro.</p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-3">
        <label className="label" htmlFor="price-search">
          What are you looking for?
        </label>

        {/* Full-width input — stacks above button on all screen sizes */}
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10"
            aria-hidden
          />
          <input
            ref={inputRef}
            id="price-search"
            type="search"
            enterKeyHint="search"
            className="input pl-11 w-full min-w-0 box-border"
            style={{ width: "100%", maxWidth: "100%" }}
            placeholder="e.g. broccoli, protein yoghurt…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setResult(null);
            }}
            onFocus={() => setShowSuggestions(true)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {showSuggestions && suggestions.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-lg overflow-hidden max-h-56 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-blue-500/10 active:bg-blue-500/20 border-b border-[var(--border)] last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickProduct(p.name)}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted text-xs ml-2">{p.category}</span>
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
          {result.top5.length === 0 ? (
            <div className="card text-center py-8 text-muted">
              <p>No prices for &ldquo;{result.query}&rdquo;.</p>
              <p className="text-sm mt-2">Pick a suggestion above or try another word.</p>
            </div>
          ) : (
            <>
              <section className="card card-highlight">
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

                <p className="text-xs text-muted mb-2">Top 5 cheapest</p>

                <ul className="space-y-2">
                  {result.top5.map((row, i) => (
                    <li
                      key={`${row.store}-${i}`}
                      className={`flex items-center justify-between gap-2 py-3 px-3 rounded-xl ${
                        i === 0 ? "bg-blue-500/15 border border-blue-500/30" : "bg-black/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {i === 0 ? (
                          <Trophy className="w-5 h-5 text-gold shrink-0" />
                        ) : (
                          <span className="w-5 text-center text-xs text-muted font-bold shrink-0">
                            {i + 1}
                          </span>
                        )}
                        <span className="font-semibold truncate">{row.store}</span>
                      </div>
                      <span
                        className={`font-bold shrink-0 ${i === 0 ? "text-accent-bright text-lg" : ""}`}
                      >
                        {formatZAR(row.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

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
