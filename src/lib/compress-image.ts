function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

export function isHeicFile(file: File): boolean {
  return /hei[cf]/i.test(file.type) || /\.(hei[cf])$/i.test(file.name);
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  console.time(`[receipt-scan] HEIC conversion ${file.name}`);
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  console.timeEnd(`[receipt-scan] HEIC conversion ${file.name}`);

  return new File([blob], file.name.replace(/\.(hei[cf])$/i, ".jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export async function getImageDetails(file: File): Promise<{
  width: number;
  height: number;
  sizeKb: number;
  type: string;
}> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadImage(file);
  }

  const width = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  if ("close" in source) source.close();

  return {
    width,
    height,
    sizeKb: Math.round(file.size / 1024),
    type: file.type || "unknown",
  };
}

function enhanceImageData(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const grays = new Uint8ClampedArray(width * height);
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grays[i / 4] = gray;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }

  const range = Math.max(1, max - min);
  const normalized = new Uint8ClampedArray(grays.length);
  for (let i = 0; i < grays.length; i += 1) {
    const lifted = ((grays[i] - min) / range) * 255;
    normalized[i] = Math.max(0, Math.min(255, (lifted - 128) * 1.35 + 128));
  }

  const sharpened = new Uint8ClampedArray(normalized);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const value =
        normalized[idx] * 5 -
        normalized[idx - 1] -
        normalized[idx + 1] -
        normalized[idx - width] -
        normalized[idx + width];
      sharpened[idx] = Math.max(0, Math.min(255, value));
    }
  }

  for (let i = 0; i < sharpened.length; i += 1) {
    const value = sharpened[i];
    const dataIndex = i * 4;
    data[dataIndex] = value;
    data[dataIndex + 1] = value;
    data[dataIndex + 2] = value;
  }

  ctx.putImageData(image, 0, 0);
}

export async function prepareReceiptImageForOcr(file: File, maxWidth = 2000, quality = 0.82): Promise<File> {
  const input = await convertHeicToJpeg(file);
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(input);
  } catch {
    source = await loadImage(input);
  }

  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  const shouldRotate = sourceWidth > sourceHeight * 1.2;
  const orientedWidth = shouldRotate ? sourceHeight : sourceWidth;
  const orientedHeight = shouldRotate ? sourceWidth : sourceHeight;
  const scale = Math.min(1, maxWidth / orientedWidth);
  const width = Math.round(orientedWidth * scale);
  const height = Math.round(orientedHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return input;

  if (shouldRotate) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(source, -height / 2, -width / 2, height, width);
  } else {
    ctx.drawImage(source, 0, 0, width, height);
  }
  if ("close" in source) source.close();

  enhanceImageData(ctx, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return input;

  return new File([blob], input.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: input.lastModified,
  });
}

export type ReceiptImageSection = {
  file: File;
  label: string;
};

export type ReceiptPreprocessResult = {
  sections: ReceiptImageSection[];
  timings: {
    decodeMs: number;
    cropMs: number;
    enhanceMs: number;
    splitMs: number;
    totalMs: number;
  };
  original: {
    width: number;
    height: number;
    sizeKb: number;
  };
  processed: {
    width: number;
    height: number;
    sections: number;
    sizeKb: number;
  };
};

function elapsed(start: number) {
  return Math.round(performance.now() - start);
}

function luminance(data: Uint8ClampedArray, index: number) {
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
}

function detectReceiptBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const index = (y * width + x) * 4;
      const light = luminance(data, index);
      const alpha = data[index + 3];
      if (alpha > 0 && light > 125) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { x: 0, y: 0, width, height };
  }

  const pad = Math.round(Math.min(width, height) * 0.02);
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    width: Math.min(width - minX, maxX - minX + pad * 2),
    height: Math.min(height - minY, maxY - minY + pad * 2),
  };
}

function enhanceReceipt(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const light = luminance(data, i);
    const contrasted = Math.max(0, Math.min(255, (light - 128) * 1.55 + 128));
    const value = contrasted > 235 ? 255 : contrasted < 35 ? 0 : contrasted;
    gray[i / 4] = value;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  const sharpened = new Uint8ClampedArray(gray);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const value =
        gray[idx] * 5 -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - width] -
        gray[idx + width];
      sharpened[idx] = Math.max(0, Math.min(255, value));
    }
  }

  for (let i = 0; i < sharpened.length; i += 1) {
    const value = sharpened[i];
    const dataIndex = i * 4;
    data[dataIndex] = value;
    data[dataIndex + 1] = value;
    data[dataIndex + 2] = value;
  }

  ctx.putImageData(image, 0, 0);
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not compress receipt image"));
        return;
      }
      resolve(new File([blob], name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
    }, "image/jpeg", quality);
  });
}

export async function preprocessReceiptImage(
  file: File,
  options: { maxWidth?: number; quality?: number; maxSectionHeight?: number } = {}
): Promise<ReceiptPreprocessResult> {
  const startedAt = performance.now();
  const maxWidth = options.maxWidth ?? 1000;
  const quality = options.quality ?? 0.72;
  const maxSectionHeight = options.maxSectionHeight ?? 1450;

  const decodeStartedAt = performance.now();
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadImage(file);
  }
  const decodeMs = elapsed(decodeStartedAt);

  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  const scale = Math.min(1, 1400 / sourceWidth);
  const scanWidth = Math.round(sourceWidth * scale);
  const scanHeight = Math.round(sourceHeight * scale);

  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = scanWidth;
  scanCanvas.height = scanHeight;
  const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });
  if (!scanCtx) throw new Error("Could not prepare receipt image");
  scanCtx.drawImage(source, 0, 0, scanWidth, scanHeight);
  if ("close" in source) source.close();

  const cropStartedAt = performance.now();
  const bounds = detectReceiptBounds(scanCtx, scanWidth, scanHeight);
  const cropMs = elapsed(cropStartedAt);

  const finalScale = Math.min(1, maxWidth / bounds.width);
  const processedWidth = Math.round(bounds.width * finalScale);
  const processedHeight = Math.round(bounds.height * finalScale);
  const processedCanvas = document.createElement("canvas");
  processedCanvas.width = processedWidth;
  processedCanvas.height = processedHeight;
  const processedCtx = processedCanvas.getContext("2d", { willReadFrequently: true });
  if (!processedCtx) throw new Error("Could not enhance receipt image");
  processedCtx.drawImage(
    scanCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    processedWidth,
    processedHeight
  );

  const enhanceStartedAt = performance.now();
  enhanceReceipt(processedCtx, processedWidth, processedHeight);
  const enhanceMs = elapsed(enhanceStartedAt);

  const splitStartedAt = performance.now();
  const sections: ReceiptImageSection[] = [];
  const shouldSplit = processedHeight > maxSectionHeight;
  const overlap = shouldSplit ? 120 : 0;
  const step = maxSectionHeight - overlap;
  const sectionCount = shouldSplit ? Math.ceil((processedHeight - overlap) / step) : 1;

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const y = shouldSplit ? sectionIndex * step : 0;
    const sectionHeight = shouldSplit
      ? Math.min(maxSectionHeight, processedHeight - y)
      : processedHeight;
    const sectionCanvas = document.createElement("canvas");
    sectionCanvas.width = processedWidth;
    sectionCanvas.height = sectionHeight;
    const sectionCtx = sectionCanvas.getContext("2d");
    if (!sectionCtx) continue;
    sectionCtx.drawImage(
      processedCanvas,
      0,
      y,
      processedWidth,
      sectionHeight,
      0,
      0,
      processedWidth,
      sectionHeight
    );
    sections.push({
      file: await canvasToFile(sectionCanvas, `${file.name}-section-${sectionIndex + 1}.jpg`, quality),
      label: sectionCount > 1 ? `section ${sectionIndex + 1}/${sectionCount}` : "section 1/1",
    });
  }
  const splitMs = elapsed(splitStartedAt);

  return {
    sections,
    timings: {
      decodeMs,
      cropMs,
      enhanceMs,
      splitMs,
      totalMs: elapsed(startedAt),
    },
    original: {
      width: sourceWidth,
      height: sourceHeight,
      sizeKb: Math.round(file.size / 1024),
    },
    processed: {
      width: processedWidth,
      height: processedHeight,
      sections: sections.length,
      sizeKb: Math.round(sections.reduce((sum, section) => sum + section.file.size, 0) / 1024),
    },
  };
}

/** Shrink photos before OCR/upload. Canvas output converts supported HEIC/HEIF to JPEG and strips metadata. */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.76): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadImage(file);
  }

  const width = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
  const scale = Math.min(1, maxWidth / width);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
