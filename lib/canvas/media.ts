const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov"]);

export const MEDIA_ACCEPT =
  ".jpg,.jpeg,.png,.heic,.heif,.mov,.mp4,.JPG,.JPEG,.PNG,.HEIC,.MOV,.MP4";

export type CanvasMediaKind = "image" | "video";

export type CanvasMedia = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  title: string;
  body: string;
  detailEnabled: boolean;
  muted: boolean;
};

export const DEFAULT_MEDIA_TITLE = "Untitled";
export const DEFAULT_MEDIA_BODY =
  "This is placeholder copy. Every work currently opens with the same title and text.\n\nWhen individual descriptions are ready, they will sit here: a title at the top, then short paragraphs underneath.";

export function mediaParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export function extensionOf(src: string): string {
  const path = src.split("?")[0] ?? src;
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

export function mediaKind(src: string): CanvasMediaKind {
  const ext = extensionOf(src);
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return "image";
}

export function imageMimeType(src: string): string {
  switch (extensionOf(src)) {
    case "png":
      return "image/png";
    case "heic":
    case "heif":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

export function videoMimeType(src: string): string {
  return extensionOf(src) === "mp4" ? "video/mp4" : "video/quicktime";
}

export function mediaContentType(src: string): string {
  return mediaKind(src) === "video" ? videoMimeType(src) : imageMimeType(src);
}

export function isAllowedMediaName(name: string): boolean {
  const ext = extensionOf(name);
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

export function isAllowedMediaFile(file: {
  name: string;
  type?: string;
}): boolean {
  if (isAllowedMediaName(file.name)) return true;
  const type = (file.type ?? "").toLowerCase();
  return (
    type === "image/jpeg" ||
    type === "image/png" ||
    type === "image/heic" ||
    type === "image/heif" ||
    type === "video/mp4" ||
    type === "video/quicktime"
  );
}

export function safeMediaFileName(name: string): string {
  const ext = extensionOf(name) || "bin";
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${Date.now()}-${base || "media"}.${ext}`;
}

const MIN_MEDIA_WIDTH = 48;

export function resizeMediaKeepAspect(
  corner: ResizeCorner,
  start: { x: number; y: number; width: number; height: number },
  pointer: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  const aspect = start.width / Math.max(start.height, 1);
  const anchor = {
    se: { x: start.x, y: start.y },
    sw: { x: start.x + start.width, y: start.y },
    ne: { x: start.x, y: start.y + start.height },
    nw: { x: start.x + start.width, y: start.y + start.height },
  }[corner];

  const widthFromX = Math.abs(pointer.x - anchor.x);
  const heightFromY = Math.abs(pointer.y - anchor.y);
  const width = Math.max(widthFromX, heightFromY * aspect, MIN_MEDIA_WIDTH);
  const height = width / aspect;
  const x = corner === "nw" || corner === "sw" ? anchor.x - width : anchor.x;
  const y = corner === "nw" || corner === "ne" ? anchor.y - height : anchor.y;

  return { x, y, width, height };
}
