import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Item = {
  name: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

function matchProduct(
  name: string,
  products: { id: string; name: string }[]
): string | null {
  const lower = name.toLowerCase();
  const exact = products.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = products.find(
    (p) => lower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lower)
  );
  return partial?.id ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { storeId, date, items } = body as {
    storeId: string;
    date?: string;
    items: Item[];
  };

  if (!storeId || !items?.length) {
    return NextResponse.json({ error: "storeId and items required" }, { status: 400 });
  }

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const purchaseDate = date ? new Date(date) : new Date();
  let created = 0;

  for (const item of items) {
    if (!item.name?.trim()) continue;

    let productId = item.productId;
    if (!productId) {
      productId = matchProduct(item.name, products) ?? undefined;
    }
    if (!productId) {
      const createdProduct = await prisma.product.create({
        data: { name: item.name.trim(), category: "From receipt", unit: "each" },
      });
      productId = createdProduct.id;
      products.push({ id: createdProduct.id, name: createdProduct.name });
    }

    await prisma.purchase.create({
      data: {
        productId,
        storeId,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: item.total || item.unitPrice * (item.quantity || 1),
        date: purchaseDate,
      },
    });
    created++;
  }

  return NextResponse.json({ created }, { status: 201 });
}
