"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatZAR } from "@/lib/currency";
import { Plus } from "lucide-react";
import type { ParsedLine } from "@/lib/receipt-parser";

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
  confidence?: number;
  needsReview?: boolean;
};

export default function ScanReceiptPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);
  const [receiptText, setReceiptText] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((s) => setStores(s))
      .catch(() => {});

    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((p) => setProducts(p))
      .catch(() => {});
  }, []);

  const resetScanState = useCallback(() => {
    setLines([]);
    setReceiptText("");
    setScanError(null);
  }, []);

  const onImages = useCallback(
    (nextFiles: File[]) => {
      resetScanState();
      setFiles(nextFiles);
    },
    [resetScanState]
  );

  const onScanComplete = useCallback(
    (result: { receiptText: string; items: ParsedLine[]; storeHint: string | null }) => {
      setReceiptText(result.receiptText);
      setScanError(null);
      setLines(
        result.items.map((row) => ({
          raw: row.raw,
          cleaned: row.cleaned,
          name: row.name,
          productId: "",
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          total: row.total,
          selected: true,
          confidence: row.confidence,
          needsReview: row.needsReview,
        }))
      );

      if (result.storeHint) {
        const match = stores.find(
          (s) =>
            s.name.toLowerCase().includes(result.storeHint!) ||
            result.storeHint!.includes(s.name.toLowerCase())
        );
        if (match) setStoreId(match.id);
      }
    },
    [stores]
  );

  const onScanError = useCallback((message: string) => {
    setScanError(message);
    setLines([]);
  }, []);

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
        <p className="page-sub">Photo your slip, review items, save.</p>
      </div>

      <ImageCapture onImages={onImages} />
      <OcrScanner
        files={files}
        onScanStart={resetScanState}
        onComplete={onScanComplete}
        onError={onScanError}
      />

      {scanError && (
        <p className="text-sm text-warn card-warn p-3 rounded-xl">{scanError}</p>
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
                  key={`${line.name}-${i}`}
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
                    <summary className="text-muted cursor-pointer">Link to product (optional)</summary>
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

        {files.length > 0 && lines.length === 0 && !scanError && (
          <p className="text-sm text-muted card p-3 rounded-xl">
            Tap Scan receipt above after adding your photos.
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
