import { NextResponse } from "next/server";
import {
  DATABASE_CONNECTION_HINT,
  DATABASE_SETUP_HINT,
  isDatabaseConfigured,
} from "./db-config";

export { DATABASE_CONNECTION_HINT, DATABASE_SETUP_HINT };

export function databaseGuard():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: DATABASE_SETUP_HINT }, { status: 503 }),
    };
  }
  return { ok: true };
}

export async function withDatabase<T>(
  handler: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const guard = databaseGuard();
  if (!guard.ok) return guard;

  try {
    const data = await handler();
    return { ok: true, data };
  } catch (err) {
    console.error("[db]", err);
    return {
      ok: false,
      response: NextResponse.json({ error: DATABASE_CONNECTION_HINT }, { status: 503 }),
    };
  }
}
