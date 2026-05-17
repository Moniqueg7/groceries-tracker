"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; unit: string };
type Store = { id: string; name: string };

export default function LogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [catalog, setCatalog] = useState<Record<string, Record<string, number>>>({});
  const [form, setForm] = useState({
    productId: "",
    storeId: "",
    quantity: "1",
    unitPrice: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
    ]).then(([prods, strs, cat]) => {
      setProducts(prods);
      setStores(strs);
      setCatalog(cat);
    });
  }, []);

  useEffect(() => {
    if (form.productId && form.storeId && catalog[form.productId]?.[form.storeId]) {
      setForm((f) => ({
        ...f,
        unitPrice: String(catalog[form.productId][form.storeId]),
      }));
    }
  }, [form.productId, form.storeId, catalog]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const qty = parseFloat(form.quantity) || 1;
    const unitPrice = parseFloat(form.unitPrice);
    await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        storeId: form.storeId,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
        date: form.date,
      }),
    });
    router.push("/");
    router.refresh();
  };

  const lineTotal =
    (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Log a purchase</h2>
        <p className="page-sub">Price fills from the catalog — adjust if you paid differently.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">What did you buy?</label>
          <select
            className="select"
            required
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Choose product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Which store?</label>
          <select
            className="select"
            required
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
          >
            <option value="">Choose store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantity</label>
            <input
              className="input"
              type="number"
              min="0.1"
              step="0.1"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Price each (R)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {lineTotal > 0 && (
          <p className="text-center font-semibold text-accent-bright">
            Total: R{lineTotal.toFixed(2)}
          </p>
        )}

        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save purchase"}
        </button>
      </form>
    </div>
  );
}
