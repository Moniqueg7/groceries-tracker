import { formatZAR } from "@/lib/currency";
import { getSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { ListEditor } from "./ListEditor";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const [settings, needs, products] = await Promise.all([
    getSettings(),
    prisma.monthlyNeed.findMany({
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Monthly list</h2>
        <p className="page-sub">Plan your regular items. Live list pricing will only show once sourced per item.</p>
      </div>

      <section className="card card-highlight">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Live pricing status</p>
        <p className="text-sm text-muted mt-2">
          Monthly list totals are hidden until each item has live sourced prices. This prevents fake
          cheapest-store recommendations.
        </p>
        <p className="text-xs text-muted mt-2">Budget: {formatZAR(settings.monthlyBudget)}</p>
      </section>

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
