"use client";

import { useState } from "react";
import { formatZAR } from "@/lib/currency";

type Product = {
  id: string;
  name: string;
  unit: string;
  prices: { store: string; color: string; price: number }[];
};

export function ComparePicker({ products }: { products: Product[] }) {
  const [id, setId] = useState(products[0]?.id ?? "");
  const selected = products.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <select className="select" value={id} onChange={(e) => setId(e.target.value)}>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {selected && (
        <section className="card">
          <p className="text-sm text-muted mb-3">
            {selected.name} <span className="text-accent">({selected.unit})</span>
          </p>
          {selected.prices.length === 0 ? (
            <p className="text-sm text-muted">No prices loaded.</p>
          ) : (
            <ul className="space-y-0">
              {selected.prices.map((row, i) => (
                <li
                  key={row.store}
                  className={`flex justify-between items-center py-3 border-b divider last:border-0 ${
                    i === 0 ? "font-semibold" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {i === 0 && <span className="text-gold">★</span>}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/10"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="truncate">{row.store}</span>
                  </span>
                  <span className={i === 0 ? "text-accent-bright" : "text-[var(--text)]"}>
                    {formatZAR(row.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-xs text-muted text-center">
        Sample prices · refresh with <code className="code-inline">npm run db:seed</code>
      </p>
    </div>
  );
}
