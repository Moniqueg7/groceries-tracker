import { PrismaClient } from "@/generated/prisma-household";
import { isSqlite } from "./db-config";
import { resolveSqliteUrl } from "./resolve-sqlite-url";

if (isSqlite()) {
  resolveSqliteUrl();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse one client per serverless instance (Vercel) to avoid connection storms.
globalForPrisma.prisma = prisma;
