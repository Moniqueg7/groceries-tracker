import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { databaseGuard, DATABASE_CONNECTION_HINT } from "@/lib/db-api";
import { DATABASE_SETUP_HINT } from "@/lib/db-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = databaseGuard();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, database: false, message: DATABASE_SETUP_HINT },
      { status: 503 }
    );
  }

  try {
    await prisma.product.count();
    return NextResponse.json({ ok: true, database: true });
  } catch {
    return NextResponse.json(
      { ok: false, database: false, message: DATABASE_CONNECTION_HINT },
      { status: 503 }
    );
  }
}
