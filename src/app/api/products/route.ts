import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDatabase } from "@/lib/db-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await withDatabase(() =>
    prisma.product.findMany({ orderBy: { name: "asc" } })
  );

  if (!result.ok) return result.response;
  return NextResponse.json(result.data);
}
