import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma-household/index.js";
import { resolveSqliteUrl } from "../src/lib/resolve-sqlite-url.ts";

resolveSqliteUrl();
const prisma = new PrismaClient();

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run products:import -- path/to/products.csv|json");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted && ch === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (value || row.length) {
        row.push(value.trim());
        rows.push(row);
      }
      row = [];
      value = "";
      if (ch === "\r" && next === "\n") i += 1;
    } else {
      value += ch;
    }
  }

  if (value || row.length) {
    row.push(value.trim());
    rows.push(row);
  }

  const [headers, ...data] = rows;
  return data.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

function parseAliases(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/[|;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value) {
  if (value == null || value === "") return undefined;
  const parsed = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pricePerUnit(price, size) {
  if (!price || !size) return {};
  const m = String(size).toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\b/);
  if (!m) return {};
  let amount = Number(m[1]);
  let unit = m[2];
  if (unit === "g") {
    amount /= 1000;
    unit = "kg";
  } else if (unit === "ml") {
    amount /= 1000;
    unit = "l";
  }
  if (!amount) return {};
  return { pricePerUnit: price / amount, pricePerUnitUnit: unit };
}

function normalizeRow(row) {
  const aliases = parseAliases(row.aliases ?? row.alias ?? row.synonyms);
  return {
    product: {
      name: row.name ?? row.productName ?? row.title,
      brand: row.brand || undefined,
      department: row.department || row.group || undefined,
      category: row.category || "Uncategorised",
      size: row.size || undefined,
      unit: row.unit || row.size || "each",
      aliases,
      barcode: row.barcode || undefined,
      image: row.image || row.imageUrl || undefined,
      searchTerms: [row.searchTerms, row.brand, row.size, ...aliases].filter(Boolean).join(" "),
    },
    price: {
      store: row.store || row.storeName || undefined,
      price: parseNumber(row.price),
      specialPrice: parseNumber(row.specialPrice),
      regularPrice: parseNumber(row.regularPrice),
      specialLabel: row.specialLabel || undefined,
      listingName: row.listingName || row.name || undefined,
      image: row.priceImage || row.image || row.imageUrl || undefined,
    },
  };
}

const inputPath = resolve(file);
const raw = readFileSync(inputPath, "utf8");
const rows = extname(inputPath).toLowerCase() === ".json" ? JSON.parse(raw) : parseCsv(raw);

let productsImported = 0;
let pricesImported = 0;

for (const rawRow of rows) {
  const row = normalizeRow(rawRow);
  if (!row.product.name) continue;

  const existing = await prisma.product.findFirst({
    where: row.product.barcode
      ? { OR: [{ barcode: row.product.barcode }, { name: row.product.name }] }
      : { name: row.product.name },
  });

  const productData = {
    brand: row.product.brand,
    department: row.product.department,
    category: row.product.category,
    size: row.product.size,
    unit: row.product.unit,
    aliases: row.product.aliases.length ? JSON.stringify(row.product.aliases) : null,
    barcode: row.product.barcode,
    image: row.product.image,
    searchTerms: row.product.searchTerms || null,
  };

  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: productData,
      })
    : await prisma.product.create({
        data: {
          name: row.product.name,
          ...productData,
        },
      });
  productsImported += 1;

  if (row.price.store && row.price.price != null) {
    const store = await prisma.store.upsert({
      where: { name: row.price.store },
      create: { name: row.price.store },
      update: {},
    });

    await prisma.catalogPrice.upsert({
      where: { productId_storeId: { productId: product.id, storeId: store.id } },
      create: {
        productId: product.id,
        storeId: store.id,
        price: row.price.price,
        specialPrice: row.price.specialPrice,
        regularPrice: row.price.regularPrice,
        specialLabel: row.price.specialLabel,
        listingName: row.price.listingName,
        image: row.price.image,
        ...pricePerUnit(row.price.price, row.product.size),
      },
      update: {
        price: row.price.price,
        specialPrice: row.price.specialPrice,
        regularPrice: row.price.regularPrice,
        specialLabel: row.price.specialLabel,
        listingName: row.price.listingName,
        image: row.price.image,
        ...pricePerUnit(row.price.price, row.product.size),
      },
    });
    pricesImported += 1;
  }
}

await prisma.$disconnect();
console.log(`Imported ${productsImported} products and ${pricesImported} sourced price rows.`);
