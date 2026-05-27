import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const OCR_TIMEOUT_MS = 20_000;

type OcrLine = {
  text: string;
  confidence: number;
};

function extractLines(data: { text?: string; confidence?: number; lines?: unknown }): OcrLine[] {
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  if (rawLines.length) {
    return rawLines
      .map((line) => {
        const row = line as { text?: unknown; confidence?: unknown };
        return {
          text: typeof row.text === "string" ? row.text.trim() : "",
          confidence: typeof row.confidence === "number" ? Math.round(row.confidence) : Math.round(data.confidence ?? 0),
        };
      })
      .filter((line) => line.text);
  }

  const confidence = Math.round(data.confidence ?? 0);
  return (data.text ?? "")
    .split(/\r?\n/)
    .map((text) => ({ text: text.trim(), confidence }))
    .filter((line) => line.text);
}

async function recognize(buffer: Buffer, timeoutMs: number) {
  const Tesseract = await import("tesseract.js");
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const recognition = Tesseract.recognize(buffer, "eng", { logger: () => {} });
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  const result = await Promise.race([recognition, timeoutPromise]);
  if (timeout) clearTimeout(timeout);

  if (result === "timeout") {
    recognition.catch(() => {});
    return { timedOut: true as const };
  }

  return { timedOut: false as const, value: result };
}

export async function POST(request: Request) {
  const scanId = request.headers.get("x-receipt-scan-id") ?? "scan_unknown";
  const log = (message: string, meta?: Record<string, unknown>) => {
    console.log(`[${new Date().toISOString()}] [${scanId}] [receipt-ocr] ${message}`, meta ?? "");
  };

  log("request received");
  const formData = await request.formData();
  const file = formData.get("photos");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No receipt photo uploaded." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Photo is too large. Please use a closer crop." }, { status: 400 });
  }

  if (/hei[cf]/i.test(file.type) || /\.(hei[cf])$/i.test(file.name)) {
    return NextResponse.json({ error: "HEIC/HEIF not supported on server. Use JPEG from the app." }, { status: 400 });
  }

  log("OCR started", { sizeKb: Math.round(file.size / 1024) });
  const startedAt = performance.now();
  const buffer = Buffer.from(await file.arrayBuffer());
  const ocr = await recognize(buffer, OCR_TIMEOUT_MS);

  if (ocr.timedOut) {
    log("OCR timed out", { ms: Math.round(performance.now() - startedAt) });
    return NextResponse.json({ error: "OCR timed out after 20 seconds" }, { status: 408 });
  }

  const text = ocr.value.data.text?.trim() ?? "";
  if (!text) {
    log("OCR empty", { ms: Math.round(performance.now() - startedAt) });
    return NextResponse.json({ error: "No text found on receipt photo" }, { status: 422 });
  }

  log("OCR completed", {
    chars: text.length,
    ms: Math.round(performance.now() - startedAt),
  });

  return NextResponse.json({
    text,
    lines: extractLines(ocr.value.data),
  });
}
