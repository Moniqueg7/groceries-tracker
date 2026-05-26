"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { parseReceiptTextAsync, detectStore, type OcrTextLine, type ReceiptParseStep } from "@/lib/receipt-parser";
import { formatZAR } from "@/lib/currency";
import { Plus } from "lucide-react";

const ImageCapture = dynamic(() => import("@/components/ImageCapture").then((m) => m.ImageCapture), {
  ssr: false,
});
const OcrScanner = dynamic(() => import("@/components/OcrScanner").then((m) => m.OcrScanner), {
  ssr: false,
  loading: () => null,
});

type Store = { id: string; name: string };
type Product = { id: string; name: string };

type Line = {
  raw?: string;
  cleaned?: string;
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  selected: boolean;
  matching?: boolean;
  confidence?: number;
  needsReview?: boolean;
  score?: number;
};

type MatchResponse = {
  matches?: Array<{ name: string; productId: string | null; score: number; source: "cache" | "database" }>;
  timings?: {
    cacheMs: number;
    databaseMs: number;
    matchingMs: number;
    totalMs: number;
  };
};

type ParserDebug = { error?: string; lastStep?: string; rawText?: string };

export default function ScanReceiptPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);
  const [receiptText, setReceiptText] = useState("");
  const [progress, setProgress] = useState("");
  const [parserDebug, setParserDebug] = useState<ParserDebug>({});
  const [saving, setSaving] = useState(false);
  const activeScanIdRef = useRef<string | null>(null);
  const matchAbortRef = useRef<AbortController | null>(null);

  const logScan = useCallback((scanId: string, message: string, meta?: Record<string, unknown>) => {
    console.log(`[${new Date().toISOString()}] [${scanId}] ${message}`, meta ?? "");
  }, []);

  useEffect(() => {
    console.time("[receipt-scan] Load stores");
    fetch("/api/stores")
      .then((r) => r.json())
      .then((s) => {
        setStores(s);
        console.info("[receipt-scan] Stores loaded", { count: Array.isArray(s) ? s.length : 0 });
      })
      .catch((error) => {
        console.warn("[receipt-scan] Store load failed", error);
      })
      .finally(() => console.timeEnd("[receipt-scan] Load stores"));

    console.time("[receipt-scan] Load products");
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((p) => {
        setProducts(p);
        console.info("[receipt-scan] Products loaded", { count: Array.isArray(p) ? p.length : 0 });
      })
      .catch((error) => {
        console.warn("[receipt-scan] Product load failed", error);
      })
      .finally(() => console.timeEnd("[receipt-scan] Load products"));
  }, []);

  const isActiveScan = useCallback((scanId: string) => activeScanIdRef.current === scanId, []);

  const handleScanStart = useCallback(
    (scanId: string) => {
      activeScanIdRef.current = scanId;
      matchAbortRef.current?.abort();
      matchAbortRef.current = null;
      logScan(scanId, "scan state reset");
      setReceiptText("");
      setProgress("");
      setParserDebug({});
      setLines([]);
    },
    [logScan]
  );

  const handleProgress = useCallback(
    (message: string, scanId: string) => {
      if (scanId !== "reset" && scanId !== "cancel" && !isActiveScan(scanId)) return;
      setProgress(message);
      if (message) logScan(scanId, "state progress", { message });
    },
    [isActiveScan, logScan]
  );

  const matchProducts = useCallback(async (parsedLines: Line[], scanId: string) => {
    if (!parsedLines.length) {
      return;
    }
    if (!isActiveScan(scanId)) {
      logScan(scanId, "stale match skipped before request");
      return;
    }

    logScan(scanId, "item matching start", { items: parsedLines.length });
    const startedAt = performance.now();
    const controller = new AbortController();
    matchAbortRef.current?.abort();
    matchAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/receipts/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ items: parsedLines.map((line) => ({ name: line.name })) }),
      });
      const data = (await response.json()) as MatchResponse;
      logScan(scanId, "item matching response", {
        clientMs: Math.round(performance.now() - startedAt),
        serverTimings: data.timings,
      });

      if (!isActiveScan(scanId)) {
        logScan(scanId, "stale match skipped after response");
        return;
      }

      if (!response.ok || !data.matches) {
        setLines((prev) => prev.map((line) => ({ ...line, matching: false })));
        return;
      }

      setLines((prev) =>
        prev.map((line, index) => ({
          ...line,
          productId: data.matches?.[index]?.productId ?? line.productId,
          matching: false,
        }))
      );

    } catch (error) {
      logScan(scanId, "item matching failed", { error: error instanceof Error ? error.message : String(error) });
      if (!isActiveScan(scanId)) return;
      setLines((prev) => prev.map((line) => ({ ...line, matching: false })));
    } finally {
      window.clearTimeout(timeout);
      if (matchAbortRef.current === controller) {
        matchAbortRef.current = null;
      }
      logScan(scanId, "item matching complete");
    }
  }, [isActiveScan, logScan]);

  const parseWithTimeout = useCallback(async (text: string, ocrLines: OcrTextLine[] | undefined, scanId: string) => {
    const parsePromise = parseReceiptTextAsync(text, ocrLines, {
      timeoutMs: 15_000,
      onStep: (step: ReceiptParseStep, meta) => {
        if (!isActiveScan(scanId)) return;
        logScan(scanId, "parser step", { step, ...meta });
        setParserDebug((prev) => ({ ...prev, lastStep: step }));
      },
    });

    let timeout: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = window.setTimeout(() => reject(new Error("Parser timed out after 15 seconds")), 15_000);
    });

    try {
      return await Promise.race([parsePromise, timeoutPromise]);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
    }
  }, [isActiveScan, logScan]);

  const onOcr = useCallback(async (text: string, ocrTimings: unknown, ocrLines: OcrTextLine[] | undefined, scanId: string) => {
    if (!isActiveScan(scanId)) {
      logScan(scanId, "stale OCR result ignored", { chars: text.length, ocrLines: ocrLines?.length ?? 0 });
      return;
    }

    logScan(scanId, "OCR raw text received", { chars: text.length, ocrLines: ocrLines?.length ?? 0, ocrTimings });
    setReceiptText(text);
    setParserDebug({ rawText: text.slice(0, 3000) });
    setProgress("Parsing items...");
    logScan(scanId, "parse start");
    console.time(`[receipt-scan] [${scanId}] Parse receipt`);
    try {
      const hint = detectStore(text);
      if (hint) {
        const match = stores.find(
          (s) => s.name.toLowerCase().includes(hint) || hint.includes(s.name.toLowerCase())
        );
        if (match) setStoreId(match.id);
      }
      const parsed = await parseWithTimeout(text, ocrLines, scanId);
      if (!isActiveScan(scanId)) {
        logScan(scanId, "stale parse result ignored", { items: parsed.length });
        return;
      }

      logScan(scanId, "parse done", { parserRows: parsed.length });
      const parsedLines = parsed.map((row) => ({
        raw: row.raw,
        cleaned: row.cleaned,
        name: row.name,
        productId: "",
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        total: row.total,
        selected: true,
        matching: true,
        confidence: row.confidence,
        needsReview: row.needsReview,
        score: row.score,
      }));
      logScan(scanId, "items count", { items: parsedLines.length });
      setLines(parsedLines);
      setProgress("");
      if (parsedLines.length) {
        void matchProducts(parsedLines, scanId);
      }
    } catch (error) {
      if (!isActiveScan(scanId)) {
        logScan(scanId, "stale parse error ignored", { error: error instanceof Error ? error.message : String(error) });
        return;
      }
      logScan(scanId, "parse failed", { error: error instanceof Error ? error.message : String(error) });
      setParserDebug((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        rawText: text.slice(0, 3000),
      }));
      setLines([]);
      setProgress("");
    } finally {
      console.timeEnd(`[receipt-scan] [${scanId}] Parse receipt`);
      if (isActiveScan(scanId)) {
        setProgress((current) => (current === "Parsing items..." ? "" : current));
        logScan(scanId, "loading false");
      }
    }
  }, [isActiveScan, logScan, matchProducts, parseWithTimeout, stores]);

  const onImages = useCallback((nextFiles: File[]) => {
    activeScanIdRef.current = null;
    matchAbortRef.current?.abort();
    matchAbortRef.current = null;
    setFiles(nextFiles);
    setReceiptText("");
    setProgress("");
    setParserDebug({});
    setLines([]);
  }, []);

  useEffect(() => {
    const scanId = activeScanIdRef.current;
    if (!scanId) return;
    logScan(scanId, "render complete", { items: lines.length, progress: Boolean(progress), parserStep: parserDebug.lastStep });
  }, [lines.length, logScan, parserDebug.lastStep, progress]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { name: "", productId: "", quantity: 1, unitPrice: 0, total: 0, selected: true },
    ]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = lines.filter((l) => l.selected && l.name.trim());
    if (!selected.length || !storeId) return;

    setSaving(true);
    await fetch("/api/purchases/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        date,
        receipt: {
          rawText: receiptText,
          photoCount: files.length,
        },
        items: selected.map((l) => ({
          name: l.name,
          productId: l.productId || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total || l.unitPrice * l.quantity,
        })),
      }),
    });
    router.push("/");
    router.refresh();
  };

  const selectedTotal = lines
    .filter((l) => l.selected)
    .reduce((s, l) => s + (l.total || l.unitPrice * l.quantity), 0);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="page-title">Scan receipt</h2>
        <p className="page-sub">Photo one or more slip sections, review items, save.</p>
      </div>

      <ImageCapture onImages={onImages} />
      <OcrScanner files={files} onText={onOcr} onProgress={handleProgress} onScanStart={handleScanStart} />

      {progress && (
        <section className="card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{progress}</p>
            <span className="text-xs text-muted">Partial results appear as soon as text is parsed.</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
        </section>
      )}

      {(parserDebug.error || parserDebug.lastStep) && (
        <section className="card space-y-2">
          <h3 className="font-semibold">Parser debug</h3>
          {parserDebug.lastStep && <p className="text-sm text-muted">Last step: {parserDebug.lastStep}</p>}
          {parserDebug.error && <p className="text-sm text-warn">Parser error: {parserDebug.error}</p>}
          {parserDebug.rawText && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Show raw OCR text</summary>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-xs">
                {parserDebug.rawText}
              </pre>
            </details>
          )}
        </section>
      )}

      <form onSubmit={save} className="space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="label">Store</label>
            <select className="select" required value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Which store?</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {lines.length > 0 && (
          <section className="card space-y-3">
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-semibold">Items</h3>
              <span className="text-sm font-bold text-accent-bright">{formatZAR(selectedTotal)}</span>
            </div>
            <ul className="space-y-3">
              {lines.map((line, i) => (
                <li
                  key={i}
                  className={`rounded-xl border border-[var(--border)] p-3 space-y-2 ${line.selected ? "bg-black/20" : "opacity-40"}`}
                >
                  <label className="flex gap-3 items-center touch-manipulation">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={(e) => updateLine(i, { selected: e.target.checked })}
                      className="w-5 h-5 shrink-0"
                    />
                    <input
                      className="input flex-1 min-h-[44px] py-2"
                      value={line.name}
                      onChange={(e) => updateLine(i, { name: e.target.value })}
                      placeholder="Item name"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Price (R)</label>
                      <input
                        className="input py-2 min-h-[44px]"
                        type="number"
                        inputMode="decimal"
                        value={line.unitPrice || ""}
                        onChange={(e) => {
                          const unitPrice = parseFloat(e.target.value) || 0;
                          updateLine(i, { unitPrice, total: unitPrice * line.quantity });
                        }}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Qty</label>
                      <input
                        className="input py-2 min-h-[44px]"
                        type="number"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(e) => {
                          const quantity = parseFloat(e.target.value) || 1;
                          updateLine(i, { quantity, total: line.unitPrice * quantity });
                        }}
                      />
                    </div>
                  </div>
                  <details className="text-sm">
                    <summary className="text-muted cursor-pointer">
                      Link to product (optional)
                      {line.matching && <span className="ml-2 text-xs text-accent">matching...</span>}
                      {typeof line.confidence === "number" && (
                        <span className={`ml-2 text-xs ${line.needsReview ? "text-warn" : "text-muted"}`}>
                          OCR {line.confidence}%{line.needsReview ? " - Needs review" : ""}
                        </span>
                      )}
                    </summary>
                    {(line.raw || line.cleaned) && (
                      <div className="mt-2 rounded-lg border border-[var(--border)] bg-black/20 p-2 text-xs text-muted">
                        {line.raw && <p>Raw OCR: {line.raw}</p>}
                        {line.cleaned && <p>Cleaned OCR: {line.cleaned}</p>}
                        <p>
                          Final product: {line.name}
                          {typeof line.score === "number" ? ` · score ${line.score}` : ""}
                        </p>
                      </div>
                    )}
                    <select
                      className="select mt-2"
                      value={line.productId}
                      onChange={(e) => updateLine(i, { productId: e.target.value })}
                    >
                      <option value="">Auto-create on save</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </details>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addLine} className="btn-outline text-sm w-full">
              <Plus className="w-4 h-4 inline mr-1" /> Add line
            </button>
          </section>
        )}

        {files.length > 0 && lines.length === 0 && (
          <p className="text-sm text-warn card-warn p-3 rounded-xl">
            Tap Scan receipt above after adding all photos, or add lines manually.
          </p>
        )}

        {files.length === 0 && lines.length === 0 && (
          <button type="button" onClick={addLine} className="btn-outline w-full">
            Add items without photo
          </button>
        )}

        <div className="sticky-save sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:static -mx-4 px-4 py-3 md:mx-0 md:px-0 md:py-0">
          <button
            type="submit"
            className="btn shadow-lg"
            disabled={saving || !storeId || !lines.some((l) => l.selected && l.name.trim())}
          >
            {saving ? "Saving…" : `Save ${formatZAR(selectedTotal)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
