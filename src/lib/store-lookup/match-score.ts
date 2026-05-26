import { extractCanonicalSize, normalizeProductText } from "./normalize";

function normalize(text: string): string {
  return normalizeProductText(text).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 1);
}

/** Canonical size key e.g. "350g", "500ml", "2l" */
export function extractSize(text: string): string | null {
  return extractCanonicalSize(text) ?? null;
}

const PENALTY_WORDS: { word: string; unlessQueryHas: string }[] = [
  { word: "frozen", unlessQueryHas: "frozen" },
  { word: "mix", unlessQueryHas: "mix" },
  { word: "mccain", unlessQueryHas: "mccain" },
  { word: "gourmade", unlessQueryHas: "gourmade" },
  { word: "ready meal", unlessQueryHas: "meal" },
  { word: "salad", unlessQueryHas: "salad" },
];

/** 0–1 confidence that `title` is the product the user searched for. */
export function scoreProductMatch(query: string, title: string): number {
  const qNorm = normalize(query);
  const tNorm = normalize(title);

  const qSize = extractSize(query);
  const tSize = extractSize(title);
  if (qSize && tSize && qSize !== tSize) return 0;

  const qTok = tokens(query);
  const tTok = new Set(tokens(title));

  if (!qTok.length) return 0;

  let matched = 0;
  for (const t of qTok) {
    if (tTok.has(t)) matched += 1;
  }
  let score = matched / qTok.length;

  // Strong boost when normalized title contains full query (or vice versa)
  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) score += 0.25;

  for (const { word, unlessQueryHas } of PENALTY_WORDS) {
    if (tNorm.includes(word) && !qNorm.includes(unlessQueryHas)) score -= 0.35;
  }

  return Math.max(0, Math.min(1, score));
}

export function confidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.88) return "high";
  if (score >= 0.68) return "medium";
  return "low";
}

export const MIN_MATCH_CONFIDENCE = 0.5;
