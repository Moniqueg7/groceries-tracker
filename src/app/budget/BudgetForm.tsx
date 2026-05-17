"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BudgetForm({ current }: { current: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyBudget: parseFloat(amount) }),
    });
    router.refresh();
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="card space-y-4">
      <div>
        <label className="label">Monthly grocery budget (R)</label>
        <input
          className="input"
          type="number"
          min="100"
          step="50"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-xs text-muted mt-2">e.g. 5000 for R5,000 / month</p>
      </div>
      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Saving…" : "Update budget"}
      </button>
    </form>
  );
}
