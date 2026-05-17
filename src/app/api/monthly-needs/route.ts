import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { productId, quantityPerMonth } = await request.json();
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  const need = await prisma.monthlyNeed.upsert({
    where: { productId },
    create: { productId, quantityPerMonth: Number(quantityPerMonth) || 1 },
    update: { quantityPerMonth: Number(quantityPerMonth) || 1 },
  });
  return NextResponse.json(need);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.monthlyNeed.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
