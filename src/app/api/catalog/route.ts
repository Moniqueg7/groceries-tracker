import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** productId -> storeId -> price */
export async function GET() {
  const rows = await prisma.catalogPrice.findMany();
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!map[r.productId]) map[r.productId] = {};
    map[r.productId][r.storeId] = r.price;
  }
  return NextResponse.json(map);
}
