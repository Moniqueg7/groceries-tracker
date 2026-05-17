"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  products: { id: string; name: string; unit: string }[];
  needs: {
    id: string;
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
  }[];
};

export function ListEditor({ products, needs: initial }: Props) {
  const router = useRouter();
  const [needs, setNeeds] = useState(initial);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/monthly-needs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantityPerMonth: parseFloat(quantity) }),
    });
    setProductId("");
    setQuantity("1");
    router.refresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/monthly-needs?id=${id}`, { method: "DELETE" });
    setNeeds((n) => n.filter((x) => x.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card space-y-3">
        <h3 className="font-semibold text-sm">Add to monthly list</h3>
        <select className="select" required value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Pick a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div>
          <label className="label">How many per month?</label>
          <input
            className="input"
            type="number"
            min="0.1"
            step="0.1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <button type="submit" className="btn">
          Add to list
        </button>
      </form>

      {needs.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Your list is empty. Add items you buy every month.</p>
      ) : (
        <ul className="space-y-2">
          {needs.map((n) => (
            <li key={n.id} className="card flex justify-between items-center gap-2">
              <div>
                <p className="font-medium">{n.productName}</p>
                <p className="text-xs text-muted">
                  {n.quantity} × {n.unit} / month
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(n.id)}
                className="p-2 text-danger rounded-lg active:bg-white/5"
                aria-label="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
