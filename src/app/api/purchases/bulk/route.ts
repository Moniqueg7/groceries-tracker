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
  const { storeId, date, items, receipt } = body as {
    storeId: string;
    date?: string;
    items: Item[];
    receipt?: {
      rawText?: string;
      photoCount?: number;
    };
  };

  if (!storeId || !items?.length) {
    return NextResponse.json({ error: "storeId and items required" }, { status: 400 });
  }

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const purchaseDate = date ? new Date(date) : new Date();
  const receiptRecord = await prisma.receipt.create({
    data: {
      storeId,
      date: purchaseDate,
      rawText: receipt?.rawText?.trim() ? receipt.rawText.slice(0, 50_000) : null,
      photoCount: Math.max(1, Math.min(receipt?.photoCount ?? 1, 20)),
    },
  });
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

    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice;
    const total = item.total || unitPrice * quantity;
    const purchase = await prisma.purchase.create({
      data: {
        productId,
        storeId,
        quantity,
        unitPrice,
        total,
        date: purchaseDate,
      },
    });

    await prisma.receiptItem.create({
      data: {
        receiptId: receiptRecord.id,
        productId,
        purchaseId: purchase.id,
        name: item.name.trim(),
        quantity,
        unitPrice,
        total,
      },
    });

    if (unitPrice > 0) {
      await prisma.catalogPrice.upsert({
        where: {
          productId_storeId: { productId, storeId },
        },
        create: {
          productId,
          storeId,
          price: unitPrice,
          regularPrice: unitPrice,
          listingName: item.name.trim(),
        },
        update: {
          price: unitPrice,
          regularPrice: unitPrice,
          specialPrice: null,
          specialLabel: null,
          specialUntil: null,
          listingName: item.name.trim(),
        },
      });
    }
    created++;
  }

  return NextResponse.json({ created, receiptId: receiptRecord.id }, { status: 201 });
}
