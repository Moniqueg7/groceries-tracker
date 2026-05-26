const BRAND_ALIASES: Record<string, string> = {
  coke: "coca cola",
  "coca-cola": "coca cola",
  coca: "coca cola",
};

const UNIT_ALIASES: Record<string, string> = {
  litre: "l",
  liter: "l",
  litres: "l",
  liters: "l",
};

export type NormalizedProduct = {
  key: string;
  text: string;
  size?: string;
};

export function normalizeProductText(input: string): string {
  let text = input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [from, to] of Object.entries(BRAND_ALIASES)) {
    text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }

  for (const [from, to] of Object.entries(UNIT_ALIASES)) {
    text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }

  return text.replace(/\s+/g, " ").trim();
}

export function extractCanonicalSize(input: string): string | undefined {
  const text = normalizeProductText(input);
  const m = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);
  if (!m) return undefined;

  let value = parseFloat(m[1]);
  let unit = m[2] as "kg" | "g" | "ml" | "l";

  if (unit === "kg") {
    value *= 1000;
    unit = "g";
  }

  if (unit === "l") {
    value *= 1000;
    unit = "ml";
  }

  return `${Math.round(value)}${unit}`;
}

export function normalizeProduct(input: string): NormalizedProduct {
  const text = normalizeProductText(input);
  const size = extractCanonicalSize(text);
  const key = text
    .replace(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/g, size ?? "")
    .replace(/\b(original|classic|soft drink|cold drink)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    key: size ? `${key} ${size}`.trim() : key,
    text,
    size,
  };
}
