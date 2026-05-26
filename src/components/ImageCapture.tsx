"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { convertHeicToJpeg, getImageDetails, isHeicFile } from "@/lib/compress-image";

type Props = {
  onImages: (files: File[]) => void;
};

type Preview = {
  id: string;
  file: File;
  url: string;
};

export function ImageCapture({ onImages }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<Preview[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  const sync = (next: Preview[]) => {
    setPreviews(next);
    onImages(next.map((preview) => preview.file));
  };

  const isLikelyImage = (file: File) => {
    return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  };

  const addFiles = async (selected: FileList | null) => {
    const selectedFiles = Array.from(selected ?? []).filter(isLikelyImage);
    if (!selectedFiles.length) return;

    const files: File[] = [];
    for (const file of selectedFiles) {
      if (!isHeicFile(file)) {
        files.push(file);
        continue;
      }

      try {
        console.info("[receipt-scan] HEIC selected; converting before preview/OCR", {
          name: file.name,
          type: file.type || "unknown",
          sizeKb: Math.round(file.size / 1024),
        });
        files.push(await convertHeicToJpeg(file));
      } catch (error) {
        console.warn("[receipt-scan] HEIC conversion failed", {
          name: file.name,
          type: file.type || "unknown",
          sizeKb: Math.round(file.size / 1024),
          error,
        });
        files.push(file);
      }
    }

    console.time("[receipt-scan] Preview generated");
    const next = [
      ...previews,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ];
    sync(next);
    console.timeEnd("[receipt-scan] Preview generated");

    for (const file of files) {
      console.time(`[receipt-scan] Image selected ${file.name}`);
      getImageDetails(file)
        .then((details) => {
          console.info("[receipt-scan] Image selected", { name: file.name, ...details });
        })
        .catch((error) => {
          console.warn("[receipt-scan] Could not decode selected image for details", {
            name: file.name,
            type: file.type || "unknown",
            sizeKb: Math.round(file.size / 1024),
            error,
          });
        })
        .finally(() => {
          console.timeEnd(`[receipt-scan] Image selected ${file.name}`);
        });
    }
  };

  const remove = (id: string) => {
    const removed = previews.find((preview) => preview.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    sync(previews.filter((preview) => preview.id !== id));
  };

  const clearInputs = () => {
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div
              key={preview.id}
              className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-black/40 aspect-[3/4]"
            >
              <img
                src={preview.url}
                alt={`Receipt page ${index + 1}`}
                className="h-full w-full object-contain"
                onLoad={() => console.info("[receipt-scan] Preview loaded", { name: preview.file.name })}
                onError={() =>
                  console.warn("[receipt-scan] Preview failed to load", {
                    name: preview.file.name,
                    type: preview.file.type || "unknown",
                    sizeKb: Math.round(preview.file.size / 1024),
                  })
                }
              />
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(preview.id)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white border border-white/20 touch-manipulation"
                aria-label={`Remove receipt page ${index + 1}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center space-y-3 bg-black/20">
          <Camera className="w-10 h-10 mx-auto text-accent opacity-80" />
          <p className="text-sm text-muted">Photo each part of your till slip</p>
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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-outline min-h-[48px]"
            onClick={() => galleryRef.current?.click()}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Add photo
          </button>
          <button
            type="button"
            className="btn min-h-[48px]"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="w-4 h-4 inline mr-2" />
            Take another
          </button>
        </div>
      )}
      {/* Gallery: no capture — opens photos / files */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          clearInputs();
        }}
      />
      {/* Camera: capture only on this input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          clearInputs();
        }}
      />
    </div>
  );
}
