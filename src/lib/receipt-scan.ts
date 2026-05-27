import { prepareReceiptImageForOcr } from "@/lib/compress-image";
import { detectStore, parseReceiptText, type OcrTextLine, type ParsedLine } from "@/lib/receipt-parser";

export type ScanPhase = "idle" | "preparing" | "uploading" | "ocr" | "parsing" | "complete" | "error";

export const SCAN_STATUS_LABEL: Record<ScanPhase, string> = {
  idle: "",
  preparing: "Preparing image",
  uploading: "Uploading",
  ocr: "Running OCR",
  parsing: "Parsing",
  complete: "Complete",
  error: "Error",
};

export const OCR_TIMEOUT_MS = 20_000;
export const PARSE_TIMEOUT_MS = 10_000;

type OcrApiResponse = {
  text?: string;
  lines?: OcrTextLine[];
  error?: string;
};

function log(scanId: string, message: string, meta?: Record<string, unknown>) {
  console.log(`[${new Date().toISOString()}] [${scanId}] ${message}`, meta ?? "");
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException("Scan cancelled", "AbortError");
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  signal: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const onParentAbort = () => controller.abort();
  signal.addEventListener("abort", onParentAbort);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted) {
      throw new Error(`OCR timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal.removeEventListener("abort", onParentAbort);
  }
}

export async function compressForScan(file: File): Promise<File> {
  return prepareReceiptImageForOcr(file, 1200, 0.76);
}

export async function ocrCompressedPhoto(
  file: File,
  scanId: string,
  signal: AbortSignal
): Promise<{ text: string; lines: OcrTextLine[] }> {
  throwIfAborted(signal);

  const formData = new FormData();
  formData.append("photos", file);

  const response = await fetchWithTimeout(
    "/api/receipts/ocr",
    {
      method: "POST",
      headers: { "x-receipt-scan-id": scanId },
      body: formData,
      signal,
    },
    OCR_TIMEOUT_MS,
    signal
  );

  const data = (await response.json()) as OcrApiResponse;
  if (!response.ok || !data.text?.trim()) {
    throw new Error(data.error ?? "OCR could not read this photo");
  }

  return {
    text: data.text.trim(),
    lines: data.lines ?? [],
  };
}

export function parseReceiptWithTimeout(
  text: string,
  ocrLines: OcrTextLine[],
  signal: AbortSignal
): Promise<ParsedLine[]> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Parsing timed out after ${Math.round(PARSE_TIMEOUT_MS / 1000)} seconds`));
    }, PARSE_TIMEOUT_MS);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Scan cancelled", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    window.setTimeout(() => {
      try {
        throwIfAborted(signal);
        const items = parseReceiptText(text, ocrLines);
        window.clearTimeout(timeoutId);
        signal.removeEventListener("abort", onAbort);
        resolve(items);
      } catch (error) {
        window.clearTimeout(timeoutId);
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    }, 0);
  });
}

export type ScanCallbacks = {
  onPhase: (phase: ScanPhase) => void;
  isActive: () => boolean;
};

export async function runReceiptScan(
  files: File[],
  scanId: string,
  signal: AbortSignal,
  callbacks: ScanCallbacks
): Promise<{ receiptText: string; items: ParsedLine[]; storeHint: string | null }> {
  const { onPhase, isActive } = callbacks;
  const texts: string[] = [];
  const ocrLines: OcrTextLine[] = [];

  log(scanId, "scan start", { photos: files.length });

  for (const [index, file] of files.entries()) {
    throwIfAborted(signal);
    if (!isActive()) throw new DOMException("Scan superseded", "AbortError");

    onPhase("preparing");
    log(scanId, "image preprocess", { photo: index + 1, name: file.name });
    const compressed = await compressForScan(file);
    throwIfAborted(signal);

    onPhase("uploading");
    log(scanId, "upload start", { photo: index + 1, sizeKb: Math.round(compressed.size / 1024) });

    onPhase("ocr");
    log(scanId, "ocr start", { photo: index + 1 });
    const result = await ocrCompressedPhoto(compressed, scanId, signal);
    texts.push(result.text);
    ocrLines.push(...result.lines);
    log(scanId, "ocr done", { photo: index + 1, chars: result.text.length });
  }

  if (!texts.length) {
    throw new Error("No receipt text was found");
  }

  const receiptText = texts.join("\n\n");
  throwIfAborted(signal);
  if (!isActive()) throw new DOMException("Scan superseded", "AbortError");

  onPhase("parsing");
  log(scanId, "parse start", { chars: receiptText.length, ocrLines: ocrLines.length });
  const items = await parseReceiptWithTimeout(receiptText, ocrLines, signal);
  log(scanId, "parse done", { items: items.length });

  onPhase("complete");
  log(scanId, "complete", { items: items.length });

  return {
    receiptText,
    items,
    storeHint: detectStore(receiptText),
  };
}
