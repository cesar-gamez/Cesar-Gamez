import { safeMediaFileName } from "@/lib/canvas/media";

const MAX_POSTER_EDGE = 2560;

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not capture this frame")),
      "image/jpeg",
      quality,
    );
  });
}

export function posterFileFromBlob(blob: Blob): File {
  return new File([blob], safeMediaFileName("poster.jpg"), {
    type: "image/jpeg",
  });
}

export function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      video.crossOrigin = "anonymous";
    }
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("Could not read this video"));
    video.src = src;
    video.load();
  });
}

export function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const next =
    duration > 0
      ? Math.min(Math.max(time, 0), Math.max(duration - 0.04, 0))
      : Math.max(time, 0);
  if (video.readyState >= 2 && Math.abs(video.currentTime - next) < 0.04) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("Could not seek this video"));
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = next;
  });
}

export function frameToJpeg(
  video: HTMLVideoElement,
  maxEdge = MAX_POSTER_EDGE,
  quality = 0.86,
): Promise<Blob> {
  const sourceW = video.videoWidth || 1;
  const sourceH = video.videoHeight || 1;
  const scale = Math.min(1, maxEdge / Math.max(sourceW, sourceH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceW * scale));
  canvas.height = Math.max(1, Math.round(sourceH * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not capture this frame");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas, quality);
}

export function frameToDataUrl(video: HTMLVideoElement, maxEdge = 720): string {
  const sourceW = video.videoWidth || 1;
  const sourceH = video.videoHeight || 1;
  const scale = Math.min(1, maxEdge / Math.max(sourceW, sourceH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceW * scale));
  canvas.height = Math.max(1, Math.round(sourceH * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function capturePosterFromSrc(
  src: string,
  time: number,
): Promise<{ blob: Blob; time: number }> {
  const video = await loadVideoElement(src);
  try {
    await seekVideo(video, time);
    const blob = await frameToJpeg(video);
    return { blob, time: video.currentTime };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function capturePosterFromFile(
  file: File,
  time = 0,
): Promise<{ blob: Blob; time: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await capturePosterFromSrc(url, time);
  } finally {
    URL.revokeObjectURL(url);
  }
}
