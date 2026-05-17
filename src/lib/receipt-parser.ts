export type ParsedLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, ".").match(/\d+\.?\d*/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const STORE_HINTS = [
  "checkers",
  "pick n pay",
  "pnp",
  "shoprite",
  "woolworths",
  "makro",
  "spar",
];

export function detectStore(text: string): string | null {
  const lower = text.toLowerCase();
  for (const s of STORE_HINTS) {
    if (lower.includes(s)) return s;
  }
  return null;
}

export function parseReceiptText(ocrText: string): ParsedLine[] {
  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedLine[] = [];

  for (const line of lines) {
    if (/sub\s*total|vat|tax|change|tender|balance|thank|slip/i.test(line)) continue;

    const priceEnd = line.match(/^(.+?)\s+R?\s*(\d+[.,]\d{2})\s*$/i);
    if (priceEnd) {
      const name = priceEnd[1].trim();
      const total = parsePrice(priceEnd[2]);
      if (name.length > 2 && total) {
        items.push({ name: name.slice(0, 100), quantity: 1, unitPrice: total, total });
      }
    }
  }

  return items.slice(0, 50);
}
