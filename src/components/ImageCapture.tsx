"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Upload, X } from "lucide-react";

type Props = {
  onImage: (file: File) => void;
};

export function ImageCapture({ onImage }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImage(file);
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] max-h-64 bg-black/40 aspect-[3/4] w-full max-w-sm mx-auto">
          <Image src={preview} alt="Receipt" fill className="object-contain" unoptimized sizes="(max-width: 400px) 100vw" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white border border-white/20 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center space-y-3 bg-black/20">
          <Camera className="w-10 h-10 mx-auto text-accent opacity-80" />
          <p className="text-sm text-muted">Photo your till slip</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="btn-outline flex-1 min-h-[48px]"
              onClick={() => galleryRef.current?.click()}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Choose photo
            </button>
            <button
              type="button"
              className="btn flex-1 min-h-[48px] w-full sm:w-auto"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="w-4 h-4 inline mr-2" />
              Take photo
            </button>
          </div>
        </div>
      )}
      {/* Gallery: no capture — opens photos / files */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {/* Camera: capture only on this input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
