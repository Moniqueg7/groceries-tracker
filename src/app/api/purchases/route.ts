import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, storeId, quantity, unitPrice, total, date } = body;

  if (!productId || !storeId || unitPrice == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const purchase = await prisma.purchase.create({
    data: {
      productId,
      storeId,
      quantity: quantity ?? 1,
      unitPrice: Number(unitPrice),
      total: total ?? Number(unitPrice) * (quantity ?? 1),
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(purchase, { status: 201 });
}
