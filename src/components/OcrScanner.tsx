"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanText } from "lucide-react";
import {
  runReceiptScan,
  SCAN_STATUS_LABEL,
  type ScanPhase,
} from "@/lib/receipt-scan";
import type { ParsedLine } from "@/lib/receipt-parser";

type ScanResult = {
  receiptText: string;
  items: ParsedLine[];
  storeHint: string | null;
};

type Props = {
  files: File[];
  onScanStart: () => void;
  onComplete: (result: ScanResult) => void;
  onError: (message: string) => void;
};

export function OcrScanner({ files, onScanStart, onComplete, onError }: Props) {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scanCounterRef = useRef(0);
  const activeScanIdRef = useRef<string | null>(null);

  const loading = phase !== "idle" && phase !== "complete" && phase !== "error";

  const cancelScan = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeScanIdRef.current = null;
    scanCounterRef.current += 1;
    setPhase("idle");
    setError("Scan cancelled");
    onError("Scan cancelled");
  }, [onError]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeScanIdRef.current = null;
    scanCounterRef.current += 1;
    setPhase("idle");
    setError(null);
  }, [files]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const scan = async () => {
    abortRef.current?.abort();
    scanCounterRef.current += 1;
    const scanToken = scanCounterRef.current;
    const scanId = `scan_${String(scanToken).padStart(3, "0")}`;
    activeScanIdRef.current = scanId;

    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    onScanStart();

    try {
      const result = await runReceiptScan(files, scanId, controller.signal, {
        onPhase: (next) => {
          if (scanCounterRef.current !== scanToken) return;
          setPhase(next);
        },
        isActive: () => scanCounterRef.current === scanToken && activeScanIdRef.current === scanId,
      });

      if (scanCounterRef.current !== scanToken) return;
      onComplete(result);
      setPhase("complete");
    } catch (err) {
      if (scanCounterRef.current !== scanToken) return;

      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "Scan cancelled"
          : err instanceof Error
            ? err.message
            : "Could not scan receipt";

      setPhase("error");
      setError(message);
      onError(message);
    } finally {
      if (scanCounterRef.current === scanToken) {
        abortRef.current = null;
        activeScanIdRef.current = null;
      }
    }
  };

  if (!files.length) return null;

  const statusLabel = SCAN_STATUS_LABEL[phase];

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
            {statusLabel}
          </>
        ) : (
          <>
            <ScanText className="w-5 h-5" />
            Scan {files.length === 1 ? "receipt" : `${files.length} receipt photos`}
          </>
        )}
      </button>

      {statusLabel && (
        <div className="card p-3 text-sm space-y-2">
          <p className="font-semibold">Status: {statusLabel}</p>
          {loading && (
            <button type="button" onClick={cancelScan} className="btn-outline text-sm w-full">
              Cancel scan
            </button>
          )}
        </div>
      )}

      {phase === "complete" && !error && (
        <p className="text-sm text-accent">Scan complete. Review items below.</p>
      )}

      {error && <p className="text-sm text-warn">{error}</p>}
    </div>
  );
}
