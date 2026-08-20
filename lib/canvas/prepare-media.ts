import { mediaKind, safeMediaFileName } from "@/lib/canvas/media";

const VIEW_FIT = 0.85;
const MIN_EDGE = 48;
const MAX_UPLOAD_EDGE = 2560;

export type PreparedDrop = {
  file: File;
  width: number;
  height: number;
};

export function fitInView(
  naturalWidth: number,
  naturalHeight: number,
  viewWidth: number,
  viewHeight: number,
): { width: number; height: number } {
  const srcW = Math.max(naturalWidth, 1);
  const srcH = Math.max(naturalHeight, 1);
  const maxW = Math.max(viewWidth * VIEW_FIT, MIN_EDGE);
  const maxH = Math.max(viewHeight * VIEW_FIT, MIN_EDGE);
  const scale = Math.min(maxW / srcW, maxH / srcH, 1);
  return {
    width: Math.max(MIN_EDGE, Math.round(srcW * scale)),
    height: Math.max(MIN_EDGE, Math.round(srcH * scale)),
  };
}

function isVideoFile(file: File): boolean {
  return (
    mediaKind(file.name) === "video" || file.type.startsWith("video/")
  );
}

function loadVideoSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const width = video.videoWidth || 16;
      const height = video.videoHeight || 9;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video could not be read"));
    };
    video.src = url;
  });
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("This image could not be read"));
        image.src = url;
      });
      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
      return await createImageBitmap(image);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      type,
      quality,
    );
  });
}

async function prepareImage(
  file: File,
  viewWidth: number,
  viewHeight: number,
): Promise<PreparedDrop> {
  const bitmap = await loadImageBitmap(file);
  try {
    const display = fitInView(
      bitmap.width,
      bitmap.height,
      viewWidth,
      viewHeight,
    );
    const longest = Math.max(bitmap.width, bitmap.height);
    const uploadScale = Math.min(1, MAX_UPLOAD_EDGE / longest);
    const uploadW = Math.max(1, Math.round(bitmap.width * uploadScale));
    const uploadH = Math.max(1, Math.round(bitmap.height * uploadScale));
    const canvas = document.createElement("canvas");
    canvas.width = uploadW;
    canvas.height = uploadH;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read this image");
    context.drawImage(bitmap, 0, 0, uploadW, uploadH);

    const png =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const blob = await canvasToBlob(
      canvas,
      png ? "image/png" : "image/jpeg",
      0.92,
    );
    const nextName = safeMediaFileName(
      file.name.replace(/\.[^.]+$/, png ? ".png" : ".jpg"),
    );
    return {
      file: new File([blob], nextName, { type: blob.type }),
      width: display.width,
      height: display.height,
    };
  } finally {
    bitmap.close();
  }
}

export async function prepareDroppedMedia(
  file: File,
  viewWidth: number,
  viewHeight: number,
): Promise<PreparedDrop> {
  if (isVideoFile(file)) {
    const natural = await loadVideoSize(file);
    const display = fitInView(
      natural.width,
      natural.height,
      viewWidth,
      viewHeight,
    );
    return { file, width: display.width, height: display.height };
  }

  try {
    return await prepareImage(file, viewWidth, viewHeight);
  } catch (error) {
    const heic =
      file.type.toLowerCase().includes("heic") ||
      file.type.toLowerCase().includes("heif") ||
      /\.(heic|heif)$/i.test(file.name);
    if (heic) {
      throw new Error("This browser could not read HEIC. Drop a JPEG or PNG instead.");
    }
    throw error;
  }
}
