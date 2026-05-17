import { NextResponse } from "next/server";
import { isDatabaseConfigured, DATABASE_SETUP_HINT } from "@/lib/db-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, database: false, message: DATABASE_SETUP_HINT },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: true });
  } catch {
    return NextResponse.json(
      { ok: false, database: false, message: "DATABASE_URL is set but connection failed. Check Neon and run db:push." },
      { status: 503 }
    );
  }
}
