import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORES = [
  { name: "Checkers", color: "#e11d48" },
  { name: "Pick n Pay", color: "#2563eb" },
  { name: "Shoprite", color: "#f59e0b" },
  { name: "Woolworths", color: "#059669" },
  { name: "Spar", color: "#16a34a" },
  { name: "Makro", color: "#dc2626" },
];

/** Sample ZAR catalog prices — update seed when you refresh reference prices */
const PRODUCTS: {
  name: string;
  category: string;
  unit: string;
  prices: Record<string, number>;
}[] = [
  { name: "White bread loaf", category: "Bakery", unit: "loaf", prices: { Checkers: 14.99, "Pick n Pay": 15.49, Shoprite: 13.99, Spar: 14.49, Woolworths: 19.99, Makro: 13.49 } },
  { name: "Full cream milk 2L", category: "Dairy", unit: "2L", prices: { Checkers: 32.99, "Pick n Pay": 33.49, Shoprite: 31.99, Spar: 32.49, Woolworths: 38.99, Makro: 30.99 } },
  { name: "Large eggs (18)", category: "Dairy", unit: "pack", prices: { Checkers: 54.99, "Pick n Pay": 55.99, Shoprite: 52.99, Spar: 53.99, Woolworths: 62.99, Makro: 49.99 } },
  { name: "Maize meal 2.5kg", category: "Pantry", unit: "2.5kg", prices: { Checkers: 38.99, "Pick n Pay": 39.49, Shoprite: 37.49, Spar: 38.49, Woolworths: 44.99, Makro: 35.99 } },
  { name: "White rice 2kg", category: "Pantry", unit: "2kg", prices: { Checkers: 34.99, "Pick n Pay": 35.49, Shoprite: 33.99, Spar: 34.49, Woolworths: 42.99, Makro: 32.49 } },
  { name: "Sunflower oil 2L", category: "Pantry", unit: "2L", prices: { Checkers: 42.99, "Pick n Pay": 43.49, Shoprite: 41.49, Spar: 42.49, Woolworths: 48.99, Makro: 39.99 } },
  { name: "Chicken breast 1kg", category: "Meat", unit: "kg", prices: { Checkers: 89.99, "Pick n Pay": 91.99, Shoprite: 87.99, Spar: 88.99, Woolworths: 109.99, Makro: 84.99 } },
  { name: "Onions 1kg", category: "Produce", unit: "kg", prices: { Checkers: 18.99, "Pick n Pay": 19.49, Shoprite: 17.99, Spar: 18.49, Woolworths: 24.99, Makro: 16.99 } },
  { name: "Potatoes 2kg", category: "Produce", unit: "2kg", prices: { Checkers: 24.99, "Pick n Pay": 25.49, Shoprite: 23.99, Spar: 24.49, Woolworths: 29.99, Makro: 22.49 } },
  { name: "Tomatoes 1kg", category: "Produce", unit: "kg", prices: { Checkers: 22.99, "Pick n Pay": 23.49, Shoprite: 21.99, Spar: 22.49, Woolworths: 28.99, Makro: 20.99 } },
  { name: "Sugar 2.5kg", category: "Pantry", unit: "2.5kg", prices: { Checkers: 36.99, "Pick n Pay": 37.49, Shoprite: 35.99, Spar: 36.49, Woolworths: 41.99, Makro: 34.49 } },
  { name: "Washing powder 2kg", category: "Household", unit: "2kg", prices: { Checkers: 89.99, "Pick n Pay": 91.99, Shoprite: 87.99, Spar: 89.49, Woolworths: 99.99, Makro: 84.99 } },

  // Produce
  { name: "Broccoli head", category: "Produce", unit: "each", prices: { Checkers: 24.99, "Pick n Pay": 25.99, Shoprite: 22.99, Spar: 23.99, Woolworths: 32.99, Makro: 21.99 } },
  { name: "Carrots 1kg", category: "Produce", unit: "kg", prices: { Checkers: 16.99, "Pick n Pay": 17.49, Shoprite: 15.99, Spar: 16.49, Woolworths: 22.99, Makro: 14.99 } },
  { name: "Bananas 1kg", category: "Produce", unit: "kg", prices: { Checkers: 19.99, "Pick n Pay": 20.49, Shoprite: 18.99, Spar: 19.49, Woolworths: 26.99, Makro: 17.99 } },
  { name: "Spinach bunch", category: "Produce", unit: "bunch", prices: { Checkers: 14.99, "Pick n Pay": 15.49, Shoprite: 13.99, Spar: 14.49, Woolworths: 19.99, Makro: 12.99 } },
  { name: "Avocados (4 pack)", category: "Produce", unit: "pack", prices: { Checkers: 39.99, "Pick n Pay": 41.99, Shoprite: 37.99, Spar: 38.99, Woolworths: 49.99, Makro: 35.99 } },
  { name: "Cucumbers 1kg", category: "Produce", unit: "kg", prices: { Checkers: 18.99, "Pick n Pay": 19.49, Shoprite: 17.99, Spar: 18.49, Woolworths: 24.99, Makro: 16.99 } },

  // Dairy
  { name: "High protein yoghurt 450g", category: "Dairy", unit: "tub", prices: { Checkers: 34.99, "Pick n Pay": 35.99, Shoprite: 32.99, Spar: 33.99, Woolworths: 42.99, Makro: 31.99 } },
  { name: "Plain yoghurt 1kg", category: "Dairy", unit: "1kg", prices: { Checkers: 28.99, "Pick n Pay": 29.49, Shoprite: 27.49, Spar: 28.49, Woolworths: 36.99, Makro: 26.99 } },
  { name: "Cheddar cheese 500g", category: "Dairy", unit: "500g", prices: { Checkers: 54.99, "Pick n Pay": 56.99, Shoprite: 52.99, Spar: 53.99, Woolworths: 69.99, Makro: 49.99 } },
  { name: "Butter 500g", category: "Dairy", unit: "500g", prices: { Checkers: 49.99, "Pick n Pay": 51.99, Shoprite: 47.99, Spar: 48.99, Woolworths: 59.99, Makro: 45.99 } },

  // Cooldrinks
  { name: "Coca-Cola 2L", category: "Drinks", unit: "2L", prices: { Checkers: 22.99, "Pick n Pay": 23.49, Shoprite: 21.49, Spar: 22.49, Woolworths: 26.99, Makro: 19.99 } },
  { name: "Coke Zero 2L", category: "Drinks", unit: "2L", prices: { Checkers: 22.99, "Pick n Pay": 23.49, Shoprite: 21.49, Spar: 22.49, Woolworths: 26.99, Makro: 19.99 } },
  { name: "Fanta Orange 2L", category: "Drinks", unit: "2L", prices: { Checkers: 21.99, "Pick n Pay": 22.49, Shoprite: 20.99, Spar: 21.49, Woolworths: 25.99, Makro: 18.99 } },
  { name: "Sprite 2L", category: "Drinks", unit: "2L", prices: { Checkers: 21.99, "Pick n Pay": 22.49, Shoprite: 20.99, Spar: 21.49, Woolworths: 25.99, Makro: 18.99 } },
  { name: "Appletiser 1L", category: "Drinks", unit: "1L", prices: { Checkers: 32.99, "Pick n Pay": 33.99, Shoprite: 31.49, Spar: 32.49, Woolworths: 38.99, Makro: 29.99 } },
  { name: "Still water 6-pack (500ml)", category: "Drinks", unit: "6-pack", prices: { Checkers: 39.99, "Pick n Pay": 41.99, Shoprite: 37.99, Spar: 38.99, Woolworths: 49.99, Makro: 34.99 } },
  { name: "Orange juice 1L", category: "Drinks", unit: "1L", prices: { Checkers: 24.99, "Pick n Pay": 25.99, Shoprite: 23.49, Spar: 24.49, Woolworths: 32.99, Makro: 21.99 } },

  // Toiletries & personal care
  { name: "Toothpaste 100ml", category: "Toiletries", unit: "tube", prices: { Checkers: 24.99, "Pick n Pay": 25.99, Shoprite: 22.99, Spar: 23.99, Woolworths: 34.99, Makro: 21.99 } },
  { name: "Shampoo 400ml", category: "Toiletries", unit: "bottle", prices: { Checkers: 54.99, "Pick n Pay": 56.99, Shoprite: 51.99, Spar: 52.99, Woolworths: 69.99, Makro: 48.99 } },
  { name: "Shower gel 400ml", category: "Toiletries", unit: "bottle", prices: { Checkers: 39.99, "Pick n Pay": 41.99, Shoprite: 37.99, Spar: 38.99, Woolworths: 52.99, Makro: 35.99 } },
  { name: "Toilet paper 9-roll", category: "Toiletries", unit: "9-pack", prices: { Checkers: 79.99, "Pick n Pay": 82.99, Shoprite: 76.99, Spar: 78.99, Woolworths: 94.99, Makro: 72.99 } },
  { name: "Deodorant roll-on", category: "Toiletries", unit: "each", prices: { Checkers: 34.99, "Pick n Pay": 35.99, Shoprite: 32.99, Spar: 33.99, Woolworths: 44.99, Makro: 30.99 } },
  { name: "Hand soap 500ml", category: "Toiletries", unit: "bottle", prices: { Checkers: 29.99, "Pick n Pay": 31.99, Shoprite: 27.99, Spar: 28.99, Woolworths: 39.99, Makro: 26.99 } },
  { name: "Sanitary pads (regular)", category: "Toiletries", unit: "pack", prices: { Checkers: 44.99, "Pick n Pay": 46.99, Shoprite: 42.99, Spar: 43.99, Woolworths: 54.99, Makro: 39.99 } },

  // More groceries
  { name: "Beef mince 1kg", category: "Meat", unit: "kg", prices: { Checkers: 94.99, "Pick n Pay": 96.99, Shoprite: 91.99, Spar: 93.99, Woolworths: 119.99, Makro: 88.99 } },
  { name: "Beef stew 1kg", category: "Meat", unit: "kg", prices: { Checkers: 99.99, "Pick n Pay": 102.99, Shoprite: 96.99, Spar: 98.99, Woolworths: 124.99, Makro: 92.99 } },
  { name: "Pork sausages 1kg", category: "Meat", unit: "kg", prices: { Checkers: 64.99, "Pick n Pay": 66.99, Shoprite: 61.99, Spar: 63.99, Woolworths: 79.99, Makro: 58.99 } },
  { name: "Pasta 500g", category: "Pantry", unit: "500g", prices: { Checkers: 16.99, "Pick n Pay": 17.49, Shoprite: 15.49, Spar: 16.49, Woolworths: 21.99, Makro: 14.49 } },
  { name: "Baked beans 410g", category: "Pantry", unit: "can", prices: { Checkers: 12.99, "Pick n Pay": 13.49, Shoprite: 11.99, Spar: 12.49, Woolworths: 15.99, Makro: 10.99 } },
  { name: "Peanut butter 400g", category: "Pantry", unit: "jar", prices: { Checkers: 34.99, "Pick n Pay": 35.99, Shoprite: 32.99, Spar: 33.99, Woolworths: 44.99, Makro: 30.99 } },
  { name: "Instant coffee 200g", category: "Pantry", unit: "200g", prices: { Checkers: 89.99, "Pick n Pay": 92.99, Shoprite: 86.99, Spar: 88.99, Woolworths: 109.99, Makro: 82.99 } },
  { name: "Tea bags 80s", category: "Pantry", unit: "box", prices: { Checkers: 44.99, "Pick n Pay": 46.99, Shoprite: 42.99, Spar: 43.99, Woolworths: 54.99, Makro: 39.99 } },
  { name: "Frozen chips 1kg", category: "Frozen", unit: "1kg", prices: { Checkers: 39.99, "Pick n Pay": 41.99, Shoprite: 37.99, Spar: 38.99, Woolworths: 49.99, Makro: 35.99 } },
  { name: "Fish fingers 400g", category: "Frozen", unit: "400g", prices: { Checkers: 49.99, "Pick n Pay": 51.99, Shoprite: 47.99, Spar: 48.99, Woolworths: 59.99, Makro: 44.99 } },
  { name: "Dishwashing liquid 750ml", category: "Household", unit: "bottle", prices: { Checkers: 34.99, "Pick n Pay": 36.99, Shoprite: 32.99, Spar: 33.99, Woolworths: 44.99, Makro: 30.99 } },
  { name: "Bleach 2L", category: "Household", unit: "2L", prices: { Checkers: 24.99, "Pick n Pay": 25.99, Shoprite: 22.99, Spar: 23.99, Woolworths: 29.99, Makro: 21.99 } },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", monthlyBudget: 5000 },
    update: {},
  });

  const storeMap = new Map<string, string>();
  for (const s of STORES) {
    const store = await prisma.store.upsert({
      where: { name: s.name },
      create: { name: s.name, color: s.color },
      update: { color: s.color },
    });
    storeMap.set(s.name, store.id);
  }

  for (const p of PRODUCTS) {
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({
        data: { name: p.name, category: p.category, unit: p.unit },
      });
    }

    for (const [storeName, price] of Object.entries(p.prices)) {
      const storeId = storeMap.get(storeName);
      if (!storeId) continue;
      await prisma.catalogPrice.upsert({
        where: {
          productId_storeId: { productId: product.id, storeId },
        },
        create: { productId: product.id, storeId, price },
        update: { price },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
