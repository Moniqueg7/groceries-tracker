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

