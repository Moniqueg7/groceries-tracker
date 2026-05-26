import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const OCR_BUDGET_MS = 30_000;
const MAX_RETRIES = 0;

type OcrLine = {
  text: string;
  confidence: number;
};

function now() {
  return performance.now();
}

function ms(start: number) {
  return Math.round(performance.now() - start);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<{ value?: T; timedOut: boolean }> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeout) clearTimeout(timeout);

  if (result === "timeout") {
    promise.catch(() => {});
    return { timedOut: true };
  }

  return { value: result as T, timedOut: false };
}

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

export async function POST(request: Request) {
  const startedAt = now();
  const scanId = request.headers.get("x-receipt-scan-id") ?? "scan_unknown";
  const log = (message: string, meta?: Record<string, unknown>) => {
    console.log(`[${new Date().toISOString()}] [${scanId}] [receipt-ocr] ${message}`, meta ?? "");
  };
  const requestTimer = `[receipt-ocr] [${scanId}] request ${Date.now()}`;
  console.time(requestTimer);
  log("request received");
  const formStartedAt = now();
  const formData = await request.formData();
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);
  const labels = formData.getAll("labels").map((value) => String(value));
  const formMs = ms(formStartedAt);
  log("upload parsed", {
    files: files.length,
    totalKb: Math.round(files.reduce((sum, file) => sum + file.size, 0) / 1024),
    formMs,
  });

  if (!files.length) {
    return NextResponse.json({ error: "No receipt photos uploaded." }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Please upload ${MAX_FILES} photos or fewer at once.` }, { status: 400 });
  }

  const importStartedAt = now();
  const Tesseract = await import("tesseract.js");
  const importMs = ms(importStartedAt);
  log("OCR library ready", { importMs });
  const texts: string[] = [];
  const ocrLines: OcrLine[] = [];
  const failureMap = new Map<string, string>();
  const fileTimings: Array<{ file: string; sizeKb: number; ocrMs: number; attempts: number; timedOut: boolean }> = [];
  let partial = false;
  let reason: string | undefined;

  for (const [index, file] of files.entries()) {
    const label = labels[index] || `photo ${index + 1}`;
    const elapsed = ms(startedAt);
    const remainingMs = OCR_BUDGET_MS - elapsed;

    if (remainingMs < 1000) {
      partial = true;
      reason = "OCR timeout reached before all photos were read.";
      failureMap.set(label, `${label} skipped because OCR timed out`);
      continue;
    }

    if (file.size > MAX_FILE_BYTES) {
      failureMap.set(label, `${label} is too large`);
      continue;
    }

    if (/hei[cf]/i.test(file.type) || /\.(hei[cf])$/i.test(file.name)) {
      failureMap.set(label, `${label} is HEIC/HEIF; please use JPEG or PNG`);
      continue;
    }

    const ocrStartedAt = now();
    const buffer = Buffer.from(await file.arrayBuffer());
    let recognizedText = "";
    let timedOut = false;
    let lastError: string | undefined;
    let attempts = 0;

    log("OCR started", {
      file: label,
      sizeKb: Math.round(file.size / 1024),
      remainingMs,
      maxAttempts: MAX_RETRIES + 1,
    });

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
      attempts = attempt;
      const attemptStartedAt = now();
      const attemptRemainingMs = OCR_BUDGET_MS - ms(startedAt);
      if (attemptRemainingMs < 1000) {
        timedOut = true;
        lastError = `${label} OCR timed out after ${attempt - 1 || 1} attempt${attempt - 1 === 1 ? "" : "s"}`;
        log("timeout reached; stopping retries", {
          file: label,
          attempt,
          elapsedMs: ms(startedAt),
        });
        break;
      }

      const attemptTimer = `[receipt-ocr] [${scanId}] ${label} attempt ${attempt}`;
      console.time(attemptTimer);
      log("attempt started", {
        file: label,
        attempt,
        remainingMs: attemptRemainingMs,
      });

      let ocr: { value?: Awaited<ReturnType<typeof Tesseract.recognize>>; timedOut: boolean };
      try {
        ocr = await withTimeout(
          Tesseract.recognize(buffer, "eng", {
            logger: () => {},
          }),
          Math.max(1000, attemptRemainingMs)
        );
      } catch (error) {
        lastError = `${label} OCR failed on attempt ${attempt}`;
        log("attempt failed", {
          file: label,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        console.timeEnd(attemptTimer);
        if (attempt <= MAX_RETRIES) {
          log("retrying OCR", { file: label, nextAttempt: attempt + 1 });
          continue;
        }
        log("stopping retries", { file: label, attempts: attempt });
        break;
      }

      if (ocr.timedOut || !ocr.value) {
        partial = true;
        timedOut = true;
        lastError = `${label} OCR timed out after ${attempt} attempt${attempt === 1 ? "" : "s"}`;
        log("attempt timed out", {
          file: label,
          attempt,
          attemptMs: ms(attemptStartedAt),
        });
        console.timeEnd(attemptTimer);
        if (attempt <= MAX_RETRIES) {
          log("retrying OCR", { file: label, nextAttempt: attempt + 1 });
          continue;
        }
        log("stopping retries", { file: label, attempts: attempt });
        break;
      }

      const { data } = ocr.value;
      recognizedText = data.text;
      ocrLines.push(...extractLines(data));
      console.timeEnd(attemptTimer);
      log("OCR completed", {
        file: label,
        attempt,
        chars: data.text.length,
        ocrMs: ms(ocrStartedAt),
      });
      break;
    }

    fileTimings.push({
      file: label,
      sizeKb: Math.round(file.size / 1024),
      ocrMs: ms(ocrStartedAt),
      attempts,
      timedOut,
    });

    if (recognizedText.trim()) {
      texts.push(recognizedText);
    } else if (lastError) {
      reason = lastError;
      failureMap.set(label, lastError);
    } else {
      failureMap.set(label, `${label} could not be read`);
    }
  }

  const failures = [...failureMap.values()];

  const aiStartedAt = now();
  log("AI started", { mode: "skipped" });
  log("AI completed", {
    mode: "unavailable",
    fallback: "OCR-only",
    aiMs: ms(aiStartedAt),
  });

  if (!texts.length) {
    log("failed", {
      files: files.length,
      failures,
      timings: { formMs, importMs, totalMs: ms(startedAt), files: fileTimings },
    });
    console.timeEnd(requestTimer);
    return NextResponse.json(
      {
        error: failures.length
          ? `Could not read the receipt photos: ${failures.join(", ")}.`
          : "Could not read any text from the receipt photos.",
        partial,
        reason,
      },
      { status: partial ? 408 : 422 }
    );
  }

  const timings = { formMs, importMs, aiMs: ms(aiStartedAt), totalMs: ms(startedAt), files: fileTimings };
  log("complete", {
    files: files.length,
    scanned: texts.length,
    failed: failures.length,
    partial,
    reason,
    timings,
  });

  console.timeEnd(requestTimer);
  return NextResponse.json({
    text: texts.join("\n\n"),
    lines: ocrLines,
    scanned: texts.length,
    failed: failures,
    partial,
    reason,
    timings,
  });
}
