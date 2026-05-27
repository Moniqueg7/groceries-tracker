export type ParsedLine = {
  raw: string;
  cleaned: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
  needsReview: boolean;
  score: number;
};

export type OcrTextLine = {
  text: string;
  confidence: number;
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
  "clicks",
  "dis-chem",
  "dischem",
];

export function detectStore(text: string): string | null {
  const lower = text.toLowerCase();
  for (const s of STORE_HINTS) {
    if (lower.includes(s)) return s;
  }
  return null;
}

const NORMALIZATION_MAP: Array<[RegExp, string]> = [
  [/\bTOILET\s*CLNR\b/gi, "TOILET CLEANER"],
  [/\bPARMALAT\s+\d{3,}\b/gi, "PARMALAT"],
  [/\bPARMLT\b/gi, "PARMALAT"],
  [/\bCHK\s*BRST\b/gi, "CHICKEN BREAST"],
  [/\bCHKN\s*BRST\b/gi, "CHICKEN BREAST"],
  [/\bCHICK\s*BRST\b/gi, "CHICKEN BREAST"],
  [/\bMCRNI\b/gi, "MACARONI"],
  [/\bBOOG\b/gi, "BOLOGNESE"],
  [/\bWHT\b/gi, "WHITE"],
  [/\bCHK\b/gi, "CHICKEN"],
  [/\bCLNR\b/gi, "CLEANER"],
  [/\bBRST\b/gi, "BREAST"],
];

const FUZZY_DICTIONARY = [
  "BOLOGNESE",
  "BREAST",
  "CHICKEN",
  "CLEANER",
  "MACARONI",
  "PARMALAT",
  "TOILET",
  "WHITE",
];

const KNOWN_PRODUCT_WORDS = [
  "BABY",
  "BEEF",
  "BOLOGNESE",
  "BREAD",
  "BREAST",
  "CHEESE",
  "CHICKEN",
  "CLEANER",
  "COKE",
  "DETERGENT",
  "EGGS",
  "MACARONI",
  "MILK",
  "NOODLES",
  "PARMALAT",
  "PEPSI",
  "RICE",
  "SOAP",
  "TOILET",
  "TUNA",
  "WHITE",
  "YOGHURT",
];

const BLACKLIST_PATTERNS = [
  /\btoday\b/i,
  /\bsaved\b/i,
  /\bvat\b/i,
  /\brate\b/i,
  /\bgross\b/i,
  /\bnet\b/i,
  /\btax\b/i,
  /\bpayment\b/i,
  /\belectronic\b/i,
  /\btrx\b/i,
  /\bsub\s*total\b/i,
  /\btotal\b/i,
  /\bchange\b/i,
  /\bcash\b/i,
  /\bcard\b/i,
  /\bthank\b/i,
  /\bseat\b/i,
  /\boffers\s+for\s+you\b/i,
  /\btender\b/i,
  /\bbalance\b/i,
  /\bslip\b/i,
];

const SECTION_STOP_PATTERNS = [
  /\btoday\s+you\s+saved\b/i,
  /\belectronic\s+payment\b/i,
  /\boffers\s+for\s+you\b/i,
  /\bthank\s+you\b/i,
  /\bsub\s*total\b/i,
  /\btotal\b/i,
  /\bvat\b/i,
  /\btax\b/i,
  /\btrx\b/i,
  /\brate\b/i,
  /\bgross\b/i,
  /\bnet\b/i,
  /\bchange\b/i,
];

const TAX_ROW_PATTERNS = [
  /\b\d{1,2}%\b/,
  /\b[A-Z]\s+\d{1,2}%\s+R?\d+[.,]\d{2}\s+R?\d+[.,]\d{2}\b/i,
];

function fuzzyCorrectToken(token: string): string {
  const upper = token.toUpperCase();
  if (upper.length < 3 || upper.length > 14 || /\d/.test(upper)) return token;
  if (FUZZY_DICTIONARY.includes(upper)) return upper;
  return token;
}

function cleanupName(name: string): string {
  let cleaned = name
    .replace(/\b\d+\s*@\s*\d+[.,]\d{2}\b/gi, "")
    .replace(/\b\d+\s*x\b/gi, "")
    .replace(/\bx\s*\d+\b/gi, "")
    .replace(/\b\d+\s+for\b/gi, "")
    .replace(/\bR?\s*\d+[.,]\d{2}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of NORMALIZATION_MAP) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned
    .split(/\s+/)
    .map(fuzzyCorrectToken)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function countPriceValues(line: string): number {
  return line.match(/\bR?\s*\d+[.,]\d{2}\b/gi)?.length ?? 0;
}

function hasBlacklistedText(line: string): boolean {
  return BLACKLIST_PATTERNS.some((pattern) => pattern.test(line));
}

function isSectionStop(line: string): boolean {
  return SECTION_STOP_PATTERNS.some((pattern) => pattern.test(line));
}

function hasTaxPattern(line: string): boolean {
  return TAX_ROW_PATTERNS.some((pattern) => pattern.test(line));
}

function hasQuantityPattern(line: string): boolean {
  return (
    /\b\d+(?:[.,]\d+)?\s*@\s*\d+[.,]\d{2}\b/i.test(line) ||
    /\b(?:x\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*x)\b/i.test(line) ||
    /\b\d+(?:[.,]\d+)?\s+for\b/i.test(line)
  );
}

function isGarbageLine(line: string): boolean {
  const compact = line.replace(/\s+/g, "");
  if (/^[A-Za-z0-9@]{1,4}$/.test(compact)) return true;
  const chars = compact.length;
  if (!chars) return true;
  const symbols = compact.replace(/[A-Za-z0-9]/g, "").length;
  const letters = compact.replace(/[^A-Za-z]/g, "").length;
  return symbols / chars > 0.35 || (letters === 0 && chars <= 8);
}

function isMostlyNumeric(line: string): boolean {
  const compact = line.replace(/\s+/g, "");
  const alnum = compact.replace(/[^A-Za-z0-9]/g, "");
  if (!alnum) return true;
  const digits = alnum.replace(/\D/g, "").length;
  const letters = alnum.replace(/[^A-Za-z]/g, "").length;
  return digits / alnum.length > 0.55 || (digits > 0 && letters === 0);
}

function countNumberGroups(line: string): number {
  return line.match(/\d+(?:[.,]\d+)?/g)?.length ?? 0;
}

function hasSuspiciousUnknownToken(name: string): boolean {
  const tokens = name.split(/\s+/).filter(Boolean);
  const words = tokens.filter((token) => /^[A-Za-z]{5,}$/.test(token));
  if (!words.length) return false;
  const unknown = words.filter((word) => !KNOWN_PRODUCT_WORDS.includes(word.toUpperCase()));
  return unknown.length > 0 && unknown.length >= words.length / 2;
}

function productScore(rawLine: string, name: string): number {
  const words = name.match(/[A-Za-z]{3,}/g) ?? [];
  const hasLetters = /[A-Za-z]/.test(name);
  const knownWords = words.filter((word) => KNOWN_PRODUCT_WORDS.includes(word.toUpperCase())).length;
  let score = 0;

  if (words.length > 0) score += 2;
  if (hasLetters) score += 1;
  if (knownWords > 0) score += 3;
  if (hasBlacklistedText(rawLine)) score -= 10;
  if (hasTaxPattern(rawLine)) score -= 10;
  if (countPriceValues(rawLine) > 1 && !hasQuantityPattern(rawLine)) score -= 5;
  if (isMostlyNumeric(name)) score -= 3;
  if (isGarbageLine(name)) score -= 3;
  if (hasSuspiciousUnknownToken(name)) score -= 4;
  if (/^\s*R\b/i.test(name)) score -= 3;
  if (countNumberGroups(name) >= 3) score -= 2;

  return score;
}

function quantityFrom(line: string, total: number): { quantity: number; unitPrice: number } {
  const qtyAt = line.match(/\b(\d+(?:[.,]\d+)?)\s*@\s*(\d+[.,]\d{2})\b/i);
  if (qtyAt) {
    const quantity = parseFloat(qtyAt[1].replace(",", "."));
    const unitPrice = parseFloat(qtyAt[2].replace(",", "."));
    if (quantity > 0 && unitPrice > 0) return { quantity, unitPrice };
  }

  const qtyX = line.match(/\b(?:x\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*x)\b/i);
  if (qtyX) {
    const quantity = parseFloat((qtyX[1] ?? qtyX[2]).replace(",", "."));
    if (quantity > 0) return { quantity, unitPrice: total / quantity };
  }

  const qtyFor = line.match(/\b(\d+(?:[.,]\d+)?)\s+for\b/i);
  if (qtyFor) {
    const quantity = parseFloat(qtyFor[1].replace(",", "."));
    if (quantity > 0) return { quantity, unitPrice: total / quantity };
  }

  return { quantity: 1, unitPrice: total };
}

export function parseReceiptText(ocrText: string, ocrLines?: OcrTextLine[]): ParsedLine[] {
  const hasLineConfidence = Boolean(ocrLines?.length);
  const lines = (ocrLines?.length
    ? ocrLines
    : ocrText.split(/\r?\n/).map((text) => ({ text, confidence: 0 }))
  )
    .slice(0, 160)
    .map((line) => ({
      text: line.text.trim().slice(0, 180),
      confidence: Math.max(0, Math.min(100, Math.round(line.confidence))),
    }))
    .filter((line) => line.text);
  const items: ParsedLine[] = [];

  for (const line of lines) {
    if (isSectionStop(line.text)) {
      continue;
    }
    if (hasLineConfidence && line.confidence < 50) continue;
    if (hasBlacklistedText(line.text)) continue;
    if (hasTaxPattern(line.text)) continue;
    if (isGarbageLine(line.text)) continue;
    if (countNumberGroups(line.text) > 2 && !hasQuantityPattern(line.text)) continue;
    if (countPriceValues(line.text) > 1 && !hasQuantityPattern(line.text)) continue;

    const priceEnd = line.text.match(/^(.+?)\s+R?\s*(\d+[.,]\d{2})\s*$/i);
    if (priceEnd) {
      const name = cleanupName(priceEnd[1].trim());
      const total = parsePrice(priceEnd[2]);
      const score = productScore(line.text, name);
      if (name.length > 2 && total && score >= 3) {
        const { quantity, unitPrice } = quantityFrom(line.text, total);
        items.push({
          raw: line.text,
          cleaned: name,
          name: name.slice(0, 100),
          quantity,
          unitPrice,
          total,
          confidence: line.confidence,
          needsReview: line.confidence > 0 && line.confidence < 50,
          score,
        });
      }
    }
  }

  return items.slice(0, 200);
}
