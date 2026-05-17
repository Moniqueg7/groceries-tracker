"use client";

import { useState } from "react";
import { Loader2, ScanText } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

export function OcrScanner({ file, onText }: { file: File | null; onText: (t: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!file) return null;

  const scan = async () => {
    setLoading(true);
    setError(null);
    try {
      const smaller = await compressImage(file);
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(smaller, "eng", {
        logger: () => {},
      });
      onText(data.text);
    } catch {
      setError("Could not read the slip. Try a clearer photo or add items manually.");
    } finally {
      setLoading(false);
    }
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
            Reading slip… (may take 20–40 sec)
          </>
        ) : (
          <>
            <ScanText className="w-5 h-5" />
            Scan receipt
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
