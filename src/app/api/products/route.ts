import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDatabase } from "@/lib/db-api";
import { parseAliases, productSearchScore } from "@/lib/fuzzy-product-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const department = url.searchParams.get("department")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "60"), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);

  const result = await withDatabase(async () => {
    const products = await prisma.product.findMany({
      where: {
        ...(department ? { department } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        department: true,
        category: true,
        size: true,
        unit: true,
        aliases: true,
        barcode: true,
        image: true,
        searchTerms: true,
        updatedAt: true,
      },
      take: q ? 1200 : limit,
      skip: q ? 0 : offset,
    });

    const ranked = q
      ? products
          .map((product) => ({ product, score: productSearchScore(q, product) }))
          .filter((row) => row.score >= 45)
          .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
          .slice(offset, offset + limit)
      : products.map((product) => ({ product, score: undefined }));

    return ranked.map(({ product, score }) => ({
      ...product,
      aliases: parseAliases(product.aliases),
      score,
    }));
  });

  if (!result.ok) return result.response;
  return NextResponse.json(result.data);
}
