import { formatZAR } from "@/lib/currency";
import { getSettings, getCatalog } from "@/lib/data";
import { cheapestStoreForList } from "@/lib/budget";
import { prisma } from "@/lib/prisma";
import { ListEditor } from "./ListEditor";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const [settings, catalog, needs, products] = await Promise.all([
    getSettings(),
    getCatalog(),
    prisma.monthlyNeed.findMany({
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  const storeTotals = cheapestStoreForList(
    needs.map((n) => ({ productId: n.productId, quantity: n.quantityPerMonth })),
    catalog
  );
  const best = storeTotals[0];
  const worst = storeTotals[storeTotals.length - 1];
  const savings = worst && best ? worst.total - best.total : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Monthly list</h2>
        <p className="page-sub">We find the cheapest store for your regular items.</p>
      </div>

      {needs.length > 0 && best && (
        <section className="card card-highlight">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Shop here</p>
          <p className="text-xl font-bold text-accent-bright mt-1">{best.storeName}</p>
          <p className="text-lg font-bold text-accent-bright">{formatZAR(best.total)}</p>
          {savings > 0 && (
            <p className="text-sm text-muted mt-1">
              Save up to <span className="text-gold font-semibold">{formatZAR(savings)}</span> vs {worst?.storeName}
            </p>
          )}
          <p className="text-xs text-muted mt-2">
            Budget: {formatZAR(settings.monthlyBudget)}
          </p>
          {best.total > settings.monthlyBudget && (
            <p className="text-sm text-warn card-warn rounded-lg p-2 mt-3">
              Over budget — trim your list to stay under {formatZAR(settings.monthlyBudget)}.
            </p>
          )}
        </section>
      )}

      {storeTotals.length > 1 && (
        <section className="card">
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">All stores</h3>
          <ul className="space-y-0">
            {storeTotals.map((s, i) => (
              <li
                key={s.storeName}
                className={`flex justify-between text-sm py-3 border-b divider last:border-0 ${
                  i === 0 ? "text-accent-bright font-semibold" : ""
                }`}
              >
                <span>{i === 0 ? "★ " : ""}{s.storeName}</span>
                <span>{formatZAR(s.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ListEditor
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
        needs={needs.map((n) => ({
          id: n.id,
          productId: n.productId,
          productName: n.product.name,
          unit: n.product.unit,
          quantity: n.quantityPerMonth,
        }))}
      />
    </div>
  );
}
