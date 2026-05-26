/** Product metadata seed. Prices are intentionally not invented here. */

export type StorePrice =
  | number
  | {
      price: number;
      specialPrice?: number;
      regularPrice?: number;
      specialLabel?: string;
      listingName?: string;
      image?: string;
    };

export type CatalogProduct = {
  name: string;
  brand?: string;
  department?: string;
  category: string;
  size?: string;
  unit: string;
  aliases?: string[];
  barcode?: string;
  image?: string;
  searchTerms?: string;
  prices?: Record<string, StorePrice>;
};

export function parseStorePrice(entry: StorePrice): {
  price: number;
  specialPrice?: number;
  regularPrice?: number;
  specialLabel?: string;
  listingName?: string;
  image?: string;
} {
  if (typeof entry === "number") return { price: entry };
  return {
    price: entry.price,
    specialPrice: entry.specialPrice,
    regularPrice: entry.regularPrice,
    specialLabel: entry.specialLabel,
    listingName: entry.listingName,
    image: entry.image,
  };
}

const p = (
  name: string,
  category: string,
  unit: string,
  options: Omit<Partial<CatalogProduct>, "name" | "category" | "unit"> = {}
): CatalogProduct => ({
  name,
  department: options.department,
  category,
  unit,
  brand: options.brand,
  size: options.size,
  aliases: options.aliases,
  barcode: options.barcode,
  image: options.image,
  searchTerms: options.searchTerms,
  prices: options.prices ?? {},
});

type Family = {
  department?: string;
  category: string;
  base: string;
  brand?: string;
  sizes: string[];
  unit?: string;
  aliases?: string[];
};

const CATEGORY_FAMILIES: Family[] = [
  { category: "Fruit & vegetables", base: "Broccoli florets", sizes: ["350g", "550g"], aliases: ["brocoli", "broccoli flowers"] },
  { category: "Fruit & vegetables", base: "Broccoli head", sizes: ["each"], aliases: ["whole broccoli"] },
  { category: "Fruit & vegetables", base: "Tomatoes", sizes: ["1kg", "500g"], aliases: ["tomato"] },
  { category: "Fruit & vegetables", base: "Potatoes", sizes: ["2kg", "5kg"], aliases: ["spuds"] },
  { category: "Fruit & vegetables", base: "Onions", sizes: ["1kg", "2kg"] },
  { category: "Fruit & vegetables", base: "Carrots", sizes: ["1kg", "500g"] },
  { category: "Fruit & vegetables", base: "Bananas", sizes: ["1kg"] },
  { category: "Fruit & vegetables", base: "Apples", sizes: ["1.5kg", "each"] },
  { category: "Fruit & vegetables", base: "Oranges", sizes: ["1.5kg", "3kg"] },
  { category: "Fruit & vegetables", base: "Avocados", sizes: ["4 pack", "each"] },
  { category: "Fruit & vegetables", base: "Spinach", sizes: ["bunch", "300g"] },
  { category: "Fruit & vegetables", base: "Lettuce", sizes: ["each"] },
  { category: "Fruit & vegetables", base: "Cucumber", sizes: ["each"] },
  { category: "Fruit & vegetables", base: "Mushrooms", sizes: ["250g"] },
  { category: "Fruit & vegetables", base: "Sweet peppers", sizes: ["3 pack"] },
  { category: "Fruit & vegetables", base: "Strawberries", sizes: ["250g"] },
  { category: "Fruit & vegetables", base: "Blueberries", sizes: ["125g"] },
  { category: "Fruit & vegetables", base: "Baby potatoes", sizes: ["1kg", "1.5kg"] },

  { category: "Meat", base: "Chicken breast fillets", sizes: ["500g", "1kg"], aliases: ["chicken breast", "chicken fillets", "chikn"] },
  { category: "Meat", base: "Chicken thighs", sizes: ["1kg"] },
  { category: "Meat", base: "Chicken drumsticks", sizes: ["1kg"] },
  { category: "Meat", base: "Chicken strips", sizes: ["500g"] },
  { category: "Meat", base: "Beef mince", sizes: ["500g", "1kg"] },
  { category: "Meat", base: "Lean beef mince", sizes: ["500g", "1kg"] },
  { category: "Meat", base: "Beef stew", sizes: ["1kg"] },
  { category: "Meat", base: "Boerewors", sizes: ["500g", "1kg"] },
  { category: "Meat", base: "Pork sausages", sizes: ["500g", "1kg"] },
  { category: "Meat", base: "Bacon", sizes: ["200g", "500g"] },
  { category: "Meat", base: "Hake fillets", sizes: ["500g"] },
  { category: "Meat", base: "Tuna cans", sizes: ["170g"] },

  { category: "Frozen", base: "Frozen chips", sizes: ["750g", "1kg", "2kg"] },
  { category: "Frozen", base: "Fish fingers", sizes: ["400g", "600g"] },
  { category: "Frozen", base: "Chicken nuggets", sizes: ["400g", "1kg"] },
  { category: "Frozen", base: "Frozen mixed vegetables", sizes: ["1kg"] },
  { category: "Frozen", base: "Frozen broccoli", sizes: ["750g"] },
  { category: "Frozen", base: "Frozen spinach", sizes: ["400g"] },
  { category: "Frozen", base: "Frozen pizza", sizes: ["each"] },
  { category: "Frozen", base: "Ice cream", sizes: ["1.8L", "2L"] },

  { category: "Dairy", base: "Full cream milk", sizes: ["1L", "2L"] },
  { category: "Dairy", base: "Low fat milk", sizes: ["1L", "2L"] },
  { category: "Dairy", base: "Long life milk", sizes: ["1L", "6 pack"] },
  { category: "Dairy", base: "Plain yoghurt", sizes: ["500g", "1kg"] },
  { category: "Dairy", base: "Greek yoghurt", sizes: ["500g", "1kg"] },
  { category: "Dairy", base: "High protein yoghurt", sizes: ["450g", "1kg"], aliases: ["protein yoghurt"] },
  { category: "Dairy", base: "Cheddar cheese", sizes: ["250g", "500g"] },
  { category: "Dairy", base: "Mozzarella cheese", sizes: ["250g", "500g"] },
  { category: "Dairy", base: "Butter", sizes: ["500g"] },
  { category: "Dairy", base: "Margarine", sizes: ["500g", "1kg"] },
  { category: "Dairy", base: "Large eggs", sizes: ["6 pack", "18 pack", "30 pack"] },

  { category: "Bread", base: "White bread", sizes: ["loaf"] },
  { category: "Bread", base: "Brown bread", sizes: ["loaf"] },
  { category: "Bread", base: "Wholewheat bread", sizes: ["loaf"] },
  { category: "Bread", base: "Burger rolls", sizes: ["6 pack"] },
  { category: "Bread", base: "Hotdog rolls", sizes: ["6 pack"] },
  { category: "Bread", base: "Wraps", sizes: ["6 pack", "8 pack"] },
  { category: "Bread", base: "English muffins", sizes: ["6 pack"] },

  { category: "Drinks", base: "Coca Cola Original", brand: "Coca-Cola", sizes: ["300ml", "500ml", "1L", "2L"], aliases: ["coke", "coca cola", "coca-cola", "cok"] },
  { category: "Drinks", base: "Coke Zero", brand: "Coca-Cola", sizes: ["500ml", "2L"], aliases: ["coca cola zero"] },
  { category: "Drinks", base: "Pepsi Original", brand: "Pepsi", sizes: ["500ml", "2L"], aliases: ["pepsi"] },
  { category: "Drinks", base: "Pepsi Max", brand: "Pepsi", sizes: ["500ml", "2L"], aliases: ["pepsi zero"] },
  { category: "Drinks", base: "Fanta Orange", brand: "Fanta", sizes: ["500ml", "2L"] },
  { category: "Drinks", base: "Sprite", brand: "Sprite", sizes: ["500ml", "2L"] },
  { category: "Drinks", base: "Appletiser", brand: "Appletiser", sizes: ["330ml", "1L"] },
  { category: "Drinks", base: "Still water", sizes: ["500ml", "1.5L", "5L", "6 pack"] },
  { category: "Drinks", base: "Sparkling water", sizes: ["500ml", "1L"] },
  { category: "Drinks", base: "Orange juice", sizes: ["1L", "2L"] },
  { category: "Drinks", base: "Powerade", sizes: ["500ml"], aliases: ["sports drink"] },
  { category: "Drinks", base: "Energade", sizes: ["500ml"], aliases: ["sports drink"] },
  { category: "Drinks", base: "Red Bull", brand: "Red Bull", sizes: ["250ml", "4 pack"] },

  { category: "Snacks", base: "Lay's chips", brand: "Lay's", sizes: ["120g", "150g"], aliases: ["crisps"] },
  { category: "Snacks", base: "Doritos", brand: "Doritos", sizes: ["145g"] },
  { category: "Snacks", base: "Simba chips", brand: "Simba", sizes: ["120g"] },
  { category: "Snacks", base: "NikNaks", brand: "NikNaks", sizes: ["135g"] },
  { category: "Snacks", base: "Popcorn kernels", sizes: ["500g"] },
  { category: "Snacks", base: "Chocolate slab", sizes: ["80g", "150g"] },
  { category: "Snacks", base: "Biscuits", sizes: ["200g"] },
  { category: "Snacks", base: "Rusks", sizes: ["450g"] },
  { category: "Snacks", base: "Peanuts", sizes: ["400g"] },
  { category: "Snacks", base: "Biltong", sizes: ["100g", "200g"] },

  { category: "Cleaning", base: "Dishwashing liquid", sizes: ["750ml"] },
  { category: "Cleaning", base: "Dishwasher tablets", sizes: ["15 pack", "30 pack"], aliases: ["dishwasher tabs"] },
  { category: "Cleaning", base: "Washing powder", sizes: ["2kg", "3kg"] },
  { category: "Cleaning", base: "Laundry detergent liquid", sizes: ["1.5L", "2L"], aliases: ["washing liquid"] },
  { category: "Cleaning", base: "Fabric softener", sizes: ["2L"] },
  { category: "Cleaning", base: "Bleach", sizes: ["750ml", "2L"] },
  { category: "Cleaning", base: "All purpose cleaner", sizes: ["750ml"] },
  { category: "Cleaning", base: "Toilet cleaner", sizes: ["750ml"] },
  { category: "Cleaning", base: "Sponges", sizes: ["3 pack", "6 pack"] },
  { category: "Cleaning", base: "Surface wipes", sizes: ["pack"] },
  { category: "Cleaning", base: "Refuse bags", sizes: ["20 pack"] },

  { category: "Baby", base: "Baby wipes", sizes: ["64 pack", "3 pack"] },
  { category: "Baby", base: "Disposable nappies", sizes: ["size 3", "size 4", "size 5"] },
  { category: "Baby", base: "Baby formula", sizes: ["400g", "800g"] },
  { category: "Baby", base: "Baby cereal", sizes: ["500g"] },
  { category: "Baby", base: "Baby shampoo", sizes: ["500ml"] },

  { category: "Pet", base: "Dog food", sizes: ["2kg", "8kg"] },
  { category: "Pet", base: "Cat food", sizes: ["1kg", "2kg"] },
  { category: "Pet", base: "Cat litter", sizes: ["5kg"] },
  { category: "Pet", base: "Dog treats", sizes: ["500g"] },
  { category: "Pet", base: "Cat treats", sizes: ["60g"] },

  { category: "Household", base: "Toilet paper", sizes: ["9 roll", "18 roll"] },
  { category: "Household", base: "Paper towels", sizes: ["2 roll"] },
  { category: "Household", base: "Foil", sizes: ["10m"] },
  { category: "Household", base: "Cling wrap", sizes: ["30m"] },
  { category: "Household", base: "Storage bags", sizes: ["20 pack", "50 pack"], aliases: ["zip bags", "freezer bags"] },
  { category: "Household", base: "Bin bags", sizes: ["20 pack", "40 pack"], aliases: ["refuse bags", "black bags"] },
  { category: "Household", base: "Batteries", sizes: ["AA 4 pack", "AAA 4 pack"] },
  { category: "Household", base: "Light bulbs", sizes: ["each"] },

  { category: "Health", base: "Vitamin C", sizes: ["30 tablets"] },
  { category: "Health", base: "Multivitamins", sizes: ["30 tablets"] },
  { category: "Health", base: "Pain tablets", sizes: ["24 pack"] },
  { category: "Health", base: "Cough syrup", sizes: ["100ml"] },
  { category: "Health", base: "Hand sanitiser", sizes: ["500ml"] },

  { category: "Protein & gym", base: "Whey protein", sizes: ["900g", "2kg"] },
  { category: "Protein & gym", base: "Protein bar", sizes: ["60g"] },
  { category: "Protein & gym", base: "Protein shake", sizes: ["330ml"] },
  { category: "Protein & gym", base: "Creatine", sizes: ["300g"] },
  { category: "Protein & gym", base: "Electrolyte drink", sizes: ["500ml"] },
  { category: "Protein & gym", base: "High protein oats", sizes: ["500g"] },

  { category: "Personal care", base: "Toothpaste", sizes: ["100ml"] },
  { category: "Personal care", base: "Mouthwash", sizes: ["500ml"], aliases: ["mouth wash"] },
  { category: "Personal care", base: "Toothbrush", sizes: ["each"] },
  { category: "Personal care", base: "Shampoo", sizes: ["400ml"] },
  { category: "Personal care", base: "Conditioner", sizes: ["400ml"] },
  { category: "Personal care", base: "Soap bar", sizes: ["100g", "175g"], aliases: ["soap"] },
  { category: "Personal care", base: "Shower gel", sizes: ["400ml"] },
  { category: "Personal care", base: "Roll-on deodorant", sizes: ["50ml"] },
  { category: "Personal care", base: "Body lotion", sizes: ["400ml"] },
  { category: "Personal care", base: "Skincare face cream", sizes: ["50ml"], aliases: ["face cream", "moisturiser"] },
  { category: "Personal care", base: "Makeup foundation", sizes: ["30ml"], aliases: ["foundation", "make up"] },
  { category: "Personal care", base: "Makeup mascara", sizes: ["each"], aliases: ["mascara", "make up"] },
  { category: "Personal care", base: "Razors", sizes: ["3 pack", "5 pack"], aliases: ["shaving razors"] },
  { category: "Personal care", base: "Shaving gel", sizes: ["200ml"], aliases: ["shaving cream"] },
  { category: "Personal care", base: "Sanitary pads", sizes: ["pack"] },
  { category: "Personal care", base: "Tampons", sizes: ["pack"] },
  { category: "Personal care", base: "Face wash", sizes: ["150ml"] },

  { category: "Pantry", base: "Tastic rice", brand: "Tastic", sizes: ["1kg", "2kg", "5kg"], aliases: ["rice", "white rice"] },
  { category: "Pantry", base: "White rice", sizes: ["1kg", "2kg", "5kg"], aliases: ["rice"] },
  { category: "Pantry", base: "Maize meal", sizes: ["2.5kg", "5kg", "10kg"] },
  { category: "Pantry", base: "Pasta", sizes: ["500g"] },
  { category: "Pantry", base: "2-minute noodles", sizes: ["5 pack"], aliases: ["instant noodles"] },
  { category: "Pantry", base: "Baked beans", sizes: ["410g"] },
  { category: "Pantry", base: "Tomato sauce", sizes: ["700ml"], aliases: ["ketchup"] },
  { category: "Pantry", base: "Chutney", sizes: ["470g"] },
  { category: "Pantry", base: "Mayonnaise", sizes: ["750g"] },
  { category: "Pantry", base: "Peanut butter", sizes: ["400g"] },
  { category: "Pantry", base: "Instant coffee", sizes: ["200g"] },
  { category: "Pantry", base: "Tea bags", sizes: ["80 pack"] },
  { category: "Pantry", base: "Sugar", sizes: ["1kg", "2.5kg"] },
  { category: "Pantry", base: "Sunflower oil", sizes: ["750ml", "2L", "5L"] },
  { category: "Pantry", base: "Flour", sizes: ["1kg", "2.5kg"] },
  { category: "Pantry", base: "Oats", sizes: ["1kg"] },
];

const STORE_NAMES = [
  "Checkers",
  "Pick n Pay",
  "Makro",
  "Woolworths",
  "Shoprite",
  "Spar",
  "Clicks",
  "Dis-Chem",
];

function unitFromSize(size: string) {
  const lower = size.toLowerCase();
  if (lower.includes("kg") || lower.includes("g")) return size;
  if (lower.includes("l") || lower.includes("ml")) return size;
  if (lower.includes("pack") || lower.includes("roll") || lower.includes("tablets")) return size;
  return "each";
}

function departmentFor(category: string) {
  if (["Fruit", "Vegetables", "Meat", "Frozen", "Dairy", "Bread", "Drinks", "Snacks", "Pantry"].includes(category)) {
    return "Food & Groceries";
  }
  if (
    [
      "Shampoo",
      "Conditioner",
      "Soap",
      "Body wash",
      "Deodorant",
      "Toothpaste",
      "Mouthwash",
      "Vitamins",
      "Skincare",
      "Makeup",
      "Razors",
      "Personal care",
      "Health",
    ].includes(category)
  ) {
    return "Health & Personal Care";
  }
  if (
    [
      "Laundry detergent",
      "Dishwashing liquid",
      "Dishwasher tablets",
      "Surface cleaners",
      "Toilet cleaner",
      "Bleach",
      "Sponges",
      "Cleaning",
    ].includes(category)
  ) {
    return "Cleaning";
  }
  if (["Toilet paper", "Paper towels", "Batteries", "Light bulbs", "Storage bags", "Foil", "Bin bags", "Household"].includes(category)) {
    return "Household";
  }
  if (["Nappies", "Wipes", "Formula", "Baby"].includes(category)) return "Baby";
  if (["Dog food", "Cat food", "Treats", "Litter", "Pet"].includes(category)) return "Pet";
  if (["Protein powder", "Bars", "Supplements", "Fitness", "Protein & gym"].includes(category)) return "Fitness";
  return "Food & Groceries";
}

function categoryFor(family: Family) {
  if (family.category === "Fruit & vegetables") {
    const fruitTerms = ["Bananas", "Apples", "Oranges", "Avocados", "Strawberries", "Blueberries"];
    return fruitTerms.some((term) => family.base.includes(term)) ? "Fruit" : "Vegetables";
  }
  if (family.category === "Personal care") {
    if (/shampoo/i.test(family.base)) return "Shampoo";
    if (/conditioner/i.test(family.base)) return "Conditioner";
    if (/soap/i.test(family.base)) return "Soap";
    if (/shower gel|body wash/i.test(family.base)) return "Body wash";
    if (/deodorant/i.test(family.base)) return "Deodorant";
    if (/toothpaste/i.test(family.base)) return "Toothpaste";
    if (/toothbrush/i.test(family.base)) return "Toothpaste";
    if (/mouthwash/i.test(family.base)) return "Mouthwash";
    if (/makeup|foundation|mascara/i.test(family.base)) return "Makeup";
    if (/razors|shaving/i.test(family.base)) return "Razors";
    if (/sanitary|tampons/i.test(family.base)) return "Personal care";
    return "Skincare";
  }
  if (family.category === "Health") {
    if (/vitamin|multivitamin/i.test(family.base)) return "Vitamins";
    return "Health";
  }
  if (family.category === "Protein & gym") {
    if (/whey/i.test(family.base)) return "Protein powder";
    if (/bar/i.test(family.base)) return "Bars";
    return "Supplements";
  }
  if (family.category === "Cleaning") {
    if (/washing powder|laundry/i.test(family.base)) return "Laundry detergent";
    if (/dishwashing/i.test(family.base)) return "Dishwashing liquid";
    if (/dishwasher/i.test(family.base)) return "Dishwasher tablets";
    if (/surface|all purpose/i.test(family.base)) return "Surface cleaners";
    if (/toilet cleaner/i.test(family.base)) return "Toilet cleaner";
    if (/bleach/i.test(family.base)) return "Bleach";
    if (/sponge/i.test(family.base)) return "Sponges";
    if (/refuse|bin/i.test(family.base)) return "Bin bags";
  }
  if (family.category === "Household") {
    if (/toilet paper/i.test(family.base)) return "Toilet paper";
    if (/paper towels/i.test(family.base)) return "Paper towels";
    if (/batteries/i.test(family.base)) return "Batteries";
    if (/light bulbs/i.test(family.base)) return "Light bulbs";
    if (/storage/i.test(family.base)) return "Storage bags";
    if (/foil/i.test(family.base)) return "Foil";
    if (/refuse|bin/i.test(family.base)) return "Bin bags";
  }
  if (family.category === "Baby") {
    if (/napp/i.test(family.base)) return "Nappies";
    if (/wipes/i.test(family.base)) return "Wipes";
    if (/formula/i.test(family.base)) return "Formula";
  }
  if (family.category === "Pet") {
    if (/dog food/i.test(family.base)) return "Dog food";
    if (/cat food/i.test(family.base)) return "Cat food";
    if (/treat/i.test(family.base)) return "Treats";
    if (/litter/i.test(family.base)) return "Litter";
  }
  return family.category;
}

function productFromFamily(family: Family, size: string, store?: string): CatalogProduct {
  const storePrefix = store ? `${store} ` : "";
  const name = `${storePrefix}${family.brand ? `${family.brand} ` : ""}${family.base} ${size}`.replace(/\s+/g, " ").trim();
  const aliases = [
    ...(family.aliases ?? []),
    family.base,
    family.brand,
    store,
    size,
  ].filter(Boolean) as string[];

  const category = categoryFor(family);
  return p(name, category, family.unit ?? unitFromSize(size), {
    department: family.department ?? departmentFor(category),
    brand: family.brand,
    size,
    aliases: [...new Set(aliases)],
    searchTerms: [...new Set(aliases)].join(" "),
  });
}

export const CATALOG_PRODUCTS: CatalogProduct[] = CATEGORY_FAMILIES.flatMap((family) => {
  const genericProducts = family.sizes.map((size) => productFromFamily(family, size));
  // Store-labelled variants make suggestions useful for searches like "Clicks shampoo" or "Makro Pepsi 500ml".
  const storeSpecific = family.sizes.flatMap((size) =>
    STORE_NAMES.map((store) => productFromFamily(family, size, store))
  );
  return [...genericProducts, ...storeSpecific];
});
