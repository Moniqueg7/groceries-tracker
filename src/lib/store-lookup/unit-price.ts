import { extractCanonicalSize } from "./normalize";
import type { PricePerUnit } from "./types";

export function pricePerUnit(price: number, title: string): PricePerUnit | undefined {
  const size = extractCanonicalSize(title);
  if (!size) return undefined;

  const m = size.match(/^(\d+)(g|ml)$/);
  if (!m) return undefined;

  const amount = Number(m[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  if (m[2] === "g") {
    return { value: price / (amount / 1000), unit: "kg" };
  }

  return { value: price / (amount / 1000), unit: "l" };
}
