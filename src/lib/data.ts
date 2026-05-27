import { prisma } from "./prisma";
import {
  DATABASE_CONNECTION_HINT,
  DATABASE_SETUP_HINT,
  validateDatabaseForRuntime,
} from "./db-config";
import type { CatalogRow, PurchaseRow } from "./budget";

export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly code: "setup" | "connection" | "sqlite_on_vercel"
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function databaseErrorFromUnknown(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SQLite cannot run on Vercel") || message.includes("SQLite DATABASE_URL")) {
    return new DatabaseError(message, "sqlite_on_vercel");
  }
  if (message.includes("Database not configured") || message.includes("Environment variable not found: DATABASE_URL")) {
    return new DatabaseError(DATABASE_SETUP_HINT, "setup");
  }
  return new DatabaseError(DATABASE_CONNECTION_HINT, "connection");
}

async function withDatabase<T>(run: () => Promise<T>): Promise<T> {
  try {
    validateDatabaseForRuntime();
    return await run();
  } catch (error) {
    throw databaseErrorFromUnknown(error);
  }
}

export async function getSettings() {
  return withDatabase(async () => {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default", monthlyBudget: 5000 },
      });
    }
    return settings;
  });
}

export async function getCatalog(): Promise<CatalogRow[]> {
  return withDatabase(async () => {
    const rows = await prisma.catalogPrice.findMany({
      include: { store: true, product: true },
    });
    return rows.map((r) => ({
      productId: r.productId,
      storeId: r.storeId,
      storeName: r.store.name,
      storeColor: r.store.color,
      price: r.price,
    }));
  });
}

export async function getPurchases(): Promise<PurchaseRow[]> {
  return withDatabase(async () => {
    const rows = await prisma.purchase.findMany({
      orderBy: { date: "desc" },
      take: 400,
      include: { store: true, product: true },
    });
    return rows.map((p) => ({
      total: p.total,
      unitPrice: p.unitPrice,
      date: p.date,
      storeId: p.storeId,
      storeName: p.store.name,
      productId: p.productId,
      productName: p.product.name,
    }));
  });
}
