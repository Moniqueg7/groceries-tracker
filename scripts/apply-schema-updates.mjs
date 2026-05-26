import { PrismaClient } from "../src/generated/prisma-household/index.js";
import { resolveSqliteUrl } from "../src/lib/resolve-sqlite-url.ts";

resolveSqliteUrl();
const prisma = new PrismaClient();

const alters = [
  `ALTER TABLE Product ADD COLUMN searchTerms TEXT`,
  `ALTER TABLE Product ADD COLUMN brand TEXT`,
  `ALTER TABLE Product ADD COLUMN department TEXT`,
  `ALTER TABLE Product ADD COLUMN size TEXT`,
  `ALTER TABLE Product ADD COLUMN aliases TEXT`,
  `ALTER TABLE Product ADD COLUMN barcode TEXT`,
  `ALTER TABLE Product ADD COLUMN image TEXT`,
  `ALTER TABLE Product ADD COLUMN updatedAt DATETIME`,
  `ALTER TABLE CatalogPrice ADD COLUMN regularPrice REAL`,
  `ALTER TABLE CatalogPrice ADD COLUMN specialPrice REAL`,
  `ALTER TABLE CatalogPrice ADD COLUMN pricePerUnit REAL`,
  `ALTER TABLE CatalogPrice ADD COLUMN pricePerUnitUnit TEXT`,
  `ALTER TABLE CatalogPrice ADD COLUMN specialLabel TEXT`,
  `ALTER TABLE CatalogPrice ADD COLUMN specialUntil DATETIME`,
  `ALTER TABLE CatalogPrice ADD COLUMN listingName TEXT`,
  `ALTER TABLE CatalogPrice ADD COLUMN image TEXT`,
];

for (const sql of alters) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate column")) {
      console.log("skip (exists):", sql);
    } else {
      console.error("fail:", sql, msg);
    }
  }
}

await prisma.$executeRawUnsafe(`UPDATE Product SET updatedAt = CURRENT_TIMESTAMP WHERE updatedAt IS NULL`);
console.log("Backfilled Product.updatedAt where missing.");

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS Receipt (
    id TEXT NOT NULL PRIMARY KEY,
    storeId TEXT NOT NULL,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rawText TEXT,
    photoCount INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Receipt_storeId_fkey FOREIGN KEY (storeId) REFERENCES Store (id) ON DELETE CASCADE ON UPDATE CASCADE
  )
`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS Receipt_storeId_idx ON Receipt(storeId)`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS Receipt_date_idx ON Receipt(date)`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS ReceiptItem (
    id TEXT NOT NULL PRIMARY KEY,
    receiptId TEXT NOT NULL,
    productId TEXT,
    purchaseId TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unitPrice REAL NOT NULL,
    total REAL NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReceiptItem_receiptId_fkey FOREIGN KEY (receiptId) REFERENCES Receipt (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ReceiptItem_productId_fkey FOREIGN KEY (productId) REFERENCES Product (id) ON DELETE SET NULL ON UPDATE CASCADE
  )
`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ReceiptItem_receiptId_idx ON ReceiptItem(receiptId)`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ReceiptItem_productId_idx ON ReceiptItem(productId)`);
console.log("Receipt capture tables ready.");

await prisma.$disconnect();
console.log("Schema updates done.");
