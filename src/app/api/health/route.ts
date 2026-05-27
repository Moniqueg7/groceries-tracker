import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { databaseGuard, DATABASE_CONNECTION_HINT } from "@/lib/db-api";
import {
  DATABASE_SETUP_HINT,
  DATABASE_SQLITE_ON_VERCEL_HINT,
  isPostgres,
  isSqlite,
  isVercelRuntime,
} from "@/lib/db-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = databaseGuard();
  if (!guard.ok) {
    return NextResponse.json(
      {
        ok: false,
        database: false,
        message: DATABASE_SETUP_HINT,
        vercel: isVercelRuntime(),
        provider: isPostgres() ? "postgresql" : isSqlite() ? "sqlite" : "unknown",
      },
      { status: 503 }
    );
  }

  if (isVercelRuntime() && isSqlite()) {
    return NextResponse.json(
      {
        ok: false,
        database: false,
        message: DATABASE_SQLITE_ON_VERCEL_HINT,
        vercel: true,
        provider: "sqlite",
      },
      { status: 503 }
    );
  }

  try {
    const purchases = await prisma.purchase.count();
    return NextResponse.json({
      ok: true,
      database: true,
      purchases,
      vercel: isVercelRuntime(),
      provider: isPostgres() ? "postgresql" : isSqlite() ? "sqlite" : "unknown",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[health] database error", message);
    return NextResponse.json(
      {
        ok: false,
        database: false,
        message: DATABASE_CONNECTION_HINT,
        detail: message,
        vercel: isVercelRuntime(),
        provider: isPostgres() ? "postgresql" : isSqlite() ? "sqlite" : "unknown",
      },
      { status: 503 }
    );
  }
}
