"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ScanText } from "lucide-react";
import { getImageDetails, preprocessReceiptImage } from "@/lib/compress-image";
import type { ReceiptImageSection } from "@/lib/compress-image";

type OcrResponse = {
  text?: string;
  lines?: Array<{ text: string; confidence: number }>;
  error?: string;
  failed?: string[];
  timings?: unknown;
};

type DebugState = {
  currentStep: string;
  upload: "idle" | "running" | "ok" | "failed";
  ocr: "idle" | "running" | "ok" | "timeout" | "failed";
  elapsedSeconds: number;
  details: string[];
};

type Props = {
  files: File[];
  onText: (text: string, timings: unknown, lines: Array<{ text: string; confidence: number }>, scanId: string) => void | Promise<void>;
  onProgress?: (message: string, scanId: string) => void;
  onScanStart?: (scanId: string) => void;
};

const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function OcrScanner({ files, onText, onProgress, onScanStart }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [debug, setDebug] = useState<DebugState>({
    currentStep: "Idle",
    upload: "idle",
    ocr: "idle",
    elapsedSeconds: 0,
    details: [],
  });
  const abortRef = useRef<AbortController | null>(null);
  const scanRunRef = useRef(0);
  const scanCounterRef = useRef(0);
  const currentScanIdRef = useRef("scan_none");

  const log = (scanId: string, message: string, meta?: Record<string, unknown>) => {
    console.log(`[${new Date().toISOString()}] [${scanId}] ${message}`, meta ?? "");
  };

  useEffect(() => {
    const onVisibility = () => log(currentScanIdRef.current, "visibilitychange", { state: document.visibilityState });
    const onPageHide = () => log(currentScanIdRef.current, "pagehide");
    const onBeforeUnload = () => log(currentScanIdRef.current, "beforeunload");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    scanRunRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    currentScanIdRef.current = "scan_none";
    setError(null);
    setStatus("");
    setLoading(false);
    setDebug({ currentStep: "Idle", upload: "idle", ocr: "idle", elapsedSeconds: 0, details: [] });
    onProgress?.("", "reset");
  }, [files, onProgress]);

  useEffect(() => {
    if (!loading) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setDebug((prev) => ({ ...prev, elapsedSeconds: Math.round((performance.now() - startedAt) / 1000) }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  if (!files.length) return null;

  const setStep = (scanId: string, message: string, patch: Partial<DebugState> = {}) => {
    setStatus(message);
    onProgress?.(message, scanId);
    log(scanId, message);
    setDebug((prev) => ({ ...prev, currentStep: message, ...patch }));
  };

  const addDetail = (detail: string) => {
    setDebug((prev) => ({ ...prev, details: [...prev.details.slice(-5), detail] }));
  };

  const prepareFileForUpload = async (file: File, scanId: string): Promise<ReceiptImageSection[]> => {
    log(scanId, "image preprocess start", { name: file.name, sizeKb: Math.round(file.size / 1024), type: file.type || "unknown" });
    console.time(`[receipt-scan] [${scanId}] Compression ${file.name}`);
    let original: Awaited<ReturnType<typeof getImageDetails>> | null = null;

    try {
      console.time(`[receipt-scan] [${scanId}] Decode original ${file.name}`);
      original = await getImageDetails(file);
      console.timeEnd(`[receipt-scan] [${scanId}] Decode original ${file.name}`);
      log(scanId, "image preprocess original decoded", { name: file.name, ...original });
    } catch (error) {
      console.timeEnd(`[receipt-scan] [${scanId}] Decode original ${file.name}`);
      log(scanId, "local image decode failed before upload", {
        name: file.name,
        type: file.type || "unknown",
        sizeKb: Math.round(file.size / 1024),
        error: error instanceof Error ? error.message : String(error),
      });

      const isHeic = /hei[cf]/i.test(file.type) || /\.(hei[cf])$/i.test(file.name);
      if (isHeic) {
        throw new Error("This photo looks like HEIC/HEIF, which Android Chrome cannot decode here. Please retake as JPG/JPEG.");
      }

      if (file.size <= MAX_UPLOAD_BYTES) {
        addDetail(`${file.name}: local decode failed, uploading original ${Math.round(file.size / 1024)}KB`);
        log(scanId, "image preprocess fallback original", {
          source: "original file after local decode failed",
          upload: { sizeKb: Math.round(file.size / 1024), type: file.type || "unknown" },
        });
        console.timeEnd(`[receipt-scan] [${scanId}] Compression ${file.name}`);
        return [{ file, label: "original" }];
      }

      throw new Error("Could not decode this large photo on the phone, so it cannot be compressed. Please crop it or retake a closer JPG photo.");
    }

    if (file.size > MAX_ORIGINAL_BYTES) {
      throw new Error(`${file.name || "Image"} is too large. Please crop the receipt or take a closer photo.`);
    }

    setStep(scanId, "Resizing receipt for OCR...", { upload: "running" });
    console.time(`[receipt-scan] [${scanId}] OCR preprocessing ${file.name}`);
    const processed = await preprocessReceiptImage(file, {
      maxWidth: 1200,
      quality: 0.7,
      maxSectionHeight: 1600,
    });
    console.timeEnd(`[receipt-scan] [${scanId}] OCR preprocessing ${file.name}`);
    log(scanId, "image preprocess done", {
      source: "processed receipt sections",
      original,
      processed: processed.processed,
      timings: processed.timings,
    });
    console.timeEnd(`[receipt-scan] [${scanId}] Compression ${file.name}`);

    addDetail(`${file.name}: ${original.width}x${original.height}, ${original.sizeKb}KB -> ${processed.processed.sections} section(s), ${processed.processed.sizeKb}KB`);

    const tooLarge = processed.sections.find((section) => section.file.size > MAX_UPLOAD_BYTES);
    if (tooLarge) {
      throw new Error(`${file.name || "Image"} is still too large after compression. Please crop it into smaller photos.`);
    }

    return processed.sections;
  };

  const scan = async () => {
    abortRef.current?.abort();
    scanRunRef.current += 1;
    scanCounterRef.current += 1;
    const scanRun = scanRunRef.current;
    const scanId = `scan_${String(scanCounterRef.current).padStart(3, "0")}`;
    currentScanIdRef.current = scanId;
    const totalStartedAt = performance.now();
    const texts: string[] = [];
    const ocrLines: Array<{ text: string; confidence: number }> = [];
    const failures: string[] = [];
    let scanTimerEnded = false;
    const endScanTimer = () => {
      if (scanTimerEnded) return;
      console.timeEnd(`[receipt-scan] [${scanId}] Total scan`);
      scanTimerEnded = true;
    };

    log(scanId, "scan start");
    onScanStart?.(scanId);
    setLoading(true);
    setError(null);
    setDebug({ currentStep: "Image selected", upload: "idle", ocr: "idle", elapsedSeconds: 0, details: [] });

    try {
      console.time(`[receipt-scan] [${scanId}] Total scan`);
      log(scanId, "upload started", {
        files: files.map((file) => ({ name: file.name, type: file.type, sizeKb: Math.round(file.size / 1024) })),
      });

      for (const [index, file] of files.entries()) {
        if (scanRunRef.current !== scanRun) return;

        setStep(scanId, `Preparing image ${index + 1}/${files.length}...`, { upload: "running" });
        const sections = await prepareFileForUpload(file, scanId);

        for (const [sectionIndex, section] of sections.entries()) {
          if (scanRunRef.current !== scanRun) return;
          const formData = new FormData();
          formData.append("photos", section.file);
          formData.append("labels", `photo ${index + 1} ${section.label}`);
          formData.append("scanId", scanId);

          const controller = new AbortController();
          abortRef.current = controller;

          setStep(scanId, `Upload start ${index + 1}/${files.length} section ${sectionIndex + 1}/${sections.length}...`, { upload: "running", ocr: "idle" });
          log(scanId, "upload start", { photo: index + 1, section: section.label });
          console.time(`[receipt-scan] [${scanId}] Upload ${index + 1}-${sectionIndex + 1}`);
          log(scanId, "request sent", {
            photo: index + 1,
            section: section.label,
            sizeKb: Math.round(section.file.size / 1024),
            type: section.file.type,
          });

          let response: Response;
          try {
            response = await fetch("/api/receipts/ocr", {
              method: "POST",
              headers: { "x-receipt-scan-id": scanId },
              body: formData,
              signal: controller.signal,
            });
          } catch (err) {
            console.timeEnd(`[receipt-scan] [${scanId}] Upload ${index + 1}-${sectionIndex + 1}`);
            failures.push(`Photo ${index + 1} ${section.label} upload failed`);
            log(scanId, "upload failed", { error: err instanceof Error ? err.message : String(err) });
            continue;
          }
          console.timeEnd(`[receipt-scan] [${scanId}] Upload ${index + 1}-${sectionIndex + 1}`);
          log(scanId, "upload done", { ok: response.ok, status: response.status });
          setDebug((prev) => ({ ...prev, upload: response.ok ? "ok" : "failed", ocr: "running" }));

          setStep(scanId, `OCR running ${index + 1}/${files.length} section ${sectionIndex + 1}/${sections.length}...`, { upload: response.ok ? "ok" : "failed", ocr: "running" });
          log(scanId, "ocr start", { photo: index + 1, section: section.label });
          console.time(`[receipt-scan] [${scanId}] OCR response parse ${index + 1}-${sectionIndex + 1}`);
          const data = (await response.json()) as OcrResponse;
          console.timeEnd(`[receipt-scan] [${scanId}] OCR response parse ${index + 1}-${sectionIndex + 1}`);

          if (scanRunRef.current !== scanRun) return;

          if (!response.ok || !data.text) {
            failures.push(data.error ?? `Photo ${index + 1} ${section.label} OCR failed`);
            setDebug((prev) => ({ ...prev, ocr: response.status === 408 ? "timeout" : "failed" }));
            continue;
          }

          texts.push(data.text);
          if (data.lines?.length) ocrLines.push(...data.lines);
          setDebug((prev) => ({ ...prev, ocr: "ok" }));
          log(scanId, "ocr done", {
            photo: index + 1,
            section: section.label,
            elapsedMs: Math.round(performance.now() - totalStartedAt),
            serverTimings: data.timings,
          });
        }
      }

      if (!texts.length) {
        throw new Error(failures.length ? failures.join(", ") : "OCR failed. No receipt text was found.");
      }

      setStep(scanId, "Parsing items...", { upload: "ok", ocr: failures.length ? "failed" : "ok" });
      log(scanId, "OCR complete", { sections: texts.length, ocrLines: ocrLines.length });
      await onText(texts.join("\n\n"), { failures, totalMs: Math.round(performance.now() - totalStartedAt) }, ocrLines, scanId);
      if (failures.length) setError(`OCR-only partial results. Skipped: ${[...new Set(failures)].join(", ")}.`);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Could not read the receipt photos.";
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "Receipt scan cancelled. Start again when ready."
          : rawMessage === "Failed to fetch"
            ? "Upload failed. Your phone likely dropped the local dev-server connection. Keep this page open and try one photo."
            : rawMessage.includes("timeout")
              ? rawMessage
              : rawMessage;
      setDebug((prev) => ({ ...prev, upload: prev.upload === "running" ? "failed" : prev.upload, ocr: "failed" }));
      setError(message);
      onProgress?.("", scanId);
    } finally {
      endScanTimer();
      if (scanRunRef.current === scanRun) {
        setLoading(false);
        setStatus("");
        abortRef.current = null;
        onProgress?.("", scanId);
        log(scanId, "loading false");
      }
    }
  };

  const cancelScan = () => {
    const scanId = currentScanIdRef.current;
    scanRunRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    currentScanIdRef.current = "scan_none";
    setLoading(false);
    setStatus("");
    setError("Receipt scan cancelled. Start again when ready.");
    onProgress?.("", scanId);
    log(scanId, "cancelled by user");
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={scan}
        disabled={loading}
        className="btn min-h-[48px] flex items-center justify-center gap-2 touch-manipulation"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {status || `Reading ${files.length === 1 ? "receipt" : `${files.length} photos`}...`}
          </>
        ) : (
          <>
            <ScanText className="w-5 h-5" />
            Scan {files.length === 1 ? "receipt" : `${files.length} receipt photos`}
          </>
        )}
      </button>
      {(loading || debug.details.length > 0 || error) && (
        <div className="card space-y-2 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Debug</span>
            <span className="text-muted">{debug.elapsedSeconds}s</span>
          </div>
          <p>Step: {debug.currentStep}</p>
          <p>Upload: {debug.upload}</p>
          <p>OCR: {debug.ocr}</p>
          {debug.details.map((detail) => (
            <p key={detail} className="text-muted">
              {detail}
            </p>
          ))}
          {loading && (
            <button type="button" onClick={cancelScan} className="btn-outline text-sm w-full">
              Cancel scan
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
