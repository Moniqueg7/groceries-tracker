import { formatZAR } from "@/lib/currency";
import { getSettings, getPurchases, getCatalog } from "@/lib/data";
import {
  spendThisMonth,
  spendByStore,
  buyFrequency,
  risingCosts,
  cheapestStoreForList,
} from "@/lib/budget";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SimpleSpendChart } from "@/components/SimpleSpendChart";
import { startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, purchases, catalog, monthlyNeeds] = await Promise.all([
    getSettings(),
    getPurchases(),
    getCatalog(),
    prisma.monthlyNeed.findMany({ include: { product: true } }),
  ]);

  const spent = spendThisMonth(purchases);
  const remaining = settings.monthlyBudget - spent;
  const pct = Math.min(100, (spent / settings.monthlyBudget) * 100);

  const byStore = spendByStore(
    purchases.filter((p) => p.date >= startOfMonth(new Date()))
  );
  const frequent = buyFrequency(purchases);
  const rising = risingCosts(purchases);

  const storeTotals = cheapestStoreForList(
    monthlyNeeds.map((n) => ({ productId: n.productId, quantity: n.quantityPerMonth })),
    catalog
  );
  const bestStore = storeTotals[0];

  const monthlyTotals = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const key = format(d, "MMM");
    const start = startOfMonth(d);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const total = purchases
      .filter((p) => p.date >= start && p.date <= end)
      .reduce((s, p) => s + p.total, 0);
    return { month: key, total };
  });

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="label mb-1">Monthly budget</p>
        <p className="stat-big">{formatZAR(settings.monthlyBudget)}</p>
        <div className="progress-track mt-4">
          <div
            className={`progress-fill ${pct > 90 ? "danger" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-muted">
            Spent <strong className="text-[var(--text)]">{formatZAR(spent)}</strong>
          </span>
          <span className={remaining < 0 ? "text-danger font-semibold" : "text-accent font-semibold"}>
            Left {formatZAR(remaining)}
          </span>
        </div>
      </section>

      {bestStore && monthlyNeeds.length > 0 && (
        <section className="card card-highlight">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Best deal</p>
          <p className="text-lg font-bold mt-1 text-accent-bright">
            {bestStore.storeName} — {formatZAR(bestStore.total)}
          </p>
          <p className="text-xs text-muted mt-1">
            For {monthlyNeeds.length} items on your monthly list
          </p>
          <Link href="/list" className="link text-sm mt-2 inline-block">
            View list →
          </Link>
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold mb-3 tracking-tight">Spending · 6 months</h2>
        <SimpleSpendChart data={monthlyTotals} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold mb-2 text-sm text-muted uppercase tracking-wide">Top buys</h2>
          {frequent.length === 0 ? (
            <p className="text-sm text-muted">
              <Link href="/scan" className="link">Scan a receipt</Link> or{" "}
              <Link href="/log" className="link">log a purchase</Link>.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {frequent.map((f) => (
                <li key={f.name} className="flex justify-between gap-2">
                  <span className="truncate">{f.name}</span>
                  <span className="text-accent shrink-0">{f.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold mb-2 text-sm text-muted uppercase tracking-wide">By store</h2>
          {byStore.length === 0 ? (
            <p className="text-sm text-muted">No purchases this month yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {byStore.map((s) => (
                <li key={s.store} className="flex justify-between gap-2">
                  <span>{s.store}</span>
                  <span className="font-semibold text-accent-bright">{formatZAR(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {rising.length > 0 && (
        <section className="card">
          <h2 className="font-semibold mb-2 text-sm text-muted uppercase tracking-wide">Rising prices</h2>
          <ul className="space-y-2 text-sm">
            {rising.map((r) => (
              <li key={r.name} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="truncate">{r.name}</span>
                <span className="text-danger shrink-0 text-xs sm:text-sm">
                  {formatZAR(r.oldPrice)} → {formatZAR(r.newPrice)} (+{r.change.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/search" className="btn block text-center">
          Check prices
        </Link>
        <Link href="/scan" className="btn-outline block text-center">
          Scan receipt
        </Link>
      </div>
    </div>
  );
}
