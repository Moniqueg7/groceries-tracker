import { prisma } from "@/lib/prisma";
import { ComparePicker } from "./ComparePicker";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      catalogPrices: { include: { store: true }, orderBy: { price: "asc" } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Store prices</h2>
        <p className="page-sub">Checkers, Pick n Pay, Spar, Shoprite, Woolworths & Makro.</p>
      </div>

      <ComparePicker
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          prices: p.catalogPrices.map((c) => ({
            store: c.store.name,
            color: c.store.color,
            price: c.price,
          })),
        }))}
      />
    </div>
  );
}
