export const IMAGE_PRESETS = {
  banner: { maxWidth: 1600, maxHeight: 900, targetBytes: 250 * 1024 },
  logo: { maxWidth: 512, maxHeight: 512, targetBytes: 150 * 1024 },
  benefit: { maxWidth: 1280, maxHeight: 960, targetBytes: 250 * 1024 },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

type Dimensions = { width: number; height: number };

export function fitImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): Dimensions {
  if (![width, height, maxWidth, maxHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Dimensões de imagem inválidas.");
  }
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function optimizedImageName(name: string, mimeType: string) {
  const base = name.replace(/\.[^.]+$/, "") || "imagem";
  return `${base}.${mimeType === "image/webp" ? "webp" : "jpg"}`;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number) {
  const webp = await canvasBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return webp;

  // JPEG has no transparency; use a white backing only on browsers without WebP.
  const flattened = document.createElement("canvas");
  flattened.width = canvas.width;
  flattened.height = canvas.height;
  const context = flattened.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, flattened.width, flattened.height);
  context.drawImage(canvas, 0, 0);
  const jpeg = await canvasBlob(flattened, "image/jpeg", quality);
  if (!jpeg) throw new Error("Não foi possível codificar a imagem.");
  return jpeg;
}

function asImageFile(blob: Blob, original: File) {
  return new File([blob], optimizedImageName(original.name, blob.type), {
    type: blob.type,
    lastModified: original.lastModified,
  });
}

/** Compress phone photos in the browser before any network upload. */
export async function optimizeImageFile(file: File, presetName: ImagePreset) {
  if (!file.type.startsWith("image/") || ["image/gif", "image/svg+xml"].includes(file.type)) {
    return file;
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("Seu navegador não consegue otimizar esta imagem. Atualize-o e tente novamente.");
  }

  const preset = IMAGE_PRESETS[presetName];
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível ler esta imagem. Escolha outro arquivo JPG ou PNG.");
  }

  try {
    let dimensions = fitImageDimensions(
      bitmap.width,
      bitmap.height,
      preset.maxWidth,
      preset.maxHeight,
    );
    const wasResized = dimensions.width !== bitmap.width || dimensions.height !== bitmap.height;
    let smallest: Blob | null = null;

    for (let pass = 0; pass < 4; pass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponível.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

      const qualities = pass === 0 ? [0.82, 0.74, 0.66] : [0.7, 0.6];
      for (const quality of qualities) {
        const blob = await encodeCanvas(canvas, quality);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= preset.targetBytes) return asImageFile(blob, file);
      }

      dimensions = {
        width: Math.max(1, Math.round(dimensions.width * 0.8)),
        height: Math.max(1, Math.round(dimensions.height * 0.8)),
      };
    }

    if (!smallest) throw new Error("Não foi possível comprimir a imagem.");
    if (!wasResized && file.size <= smallest.size) return file;
    return asImageFile(smallest, file);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Não foi possível")) throw error;
    throw new Error("Não foi possível otimizar esta imagem. Tente novamente.");
  } finally {
    bitmap.close();
  }
}
