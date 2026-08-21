import {
  mediaKind,
  videoMimeType,
  type CanvasMedia,
  type MediaRung,
} from "@/lib/canvas/media";

export const IMAGE_LADDER_WIDTHS = [480, 720, 1080, 1600, 2560];
export const VIDEO_LADDER_WIDTHS = [480, 720, 1080];

const DOWN_HYSTERESIS = 1.5;
const CONSERVE_CSS_PX = 160;

export function mediaRungs(item: CanvasMedia): MediaRung[] {
  const bySrc = new Map<string, number>();
  bySrc.set(item.src, 3840);
  for (const rung of item.rungs ?? []) {
    if (!rung.src) continue;
    const width = Number.isFinite(rung.width) && rung.width > 0 ? rung.width : 3840;
    const previous = bySrc.get(rung.src);
    bySrc.set(rung.src, previous ? Math.max(previous, width) : width);
  }

  return [...bySrc.entries()]
    .map(([src, width]) => ({ src, width }))
    .sort((a, b) => a.width - b.width);
}

export function rungIsPlayable(src: string): boolean {
  if (typeof document === "undefined") return true;
  if (mediaKind(src) === "image") return true;
  const probe = document.createElement("video");
  return probe.canPlayType(videoMimeType(src)) !== "";
}

export function playableRungs(item: CanvasMedia): MediaRung[] {
  return mediaRungs(item).filter((rung) => rungIsPlayable(rung.src));
}

export function pickRung(
  rungs: MediaRung[],
  paintedCssPx: number,
  dpr: number,
  currentWidth: number | null,
  conserve = false,
): MediaRung {
  const sorted =
    rungs.length > 0
      ? rungs
      : [{ src: "", width: 3840 }];
  const needed = Math.max(
    1,
    (conserve ? CONSERVE_CSS_PX : paintedCssPx) * Math.max(dpr, 1),
  );

  let target = sorted[sorted.length - 1]!;
  for (const rung of sorted) {
    if (rung.width >= needed) {
      target = rung;
      break;
    }
  }

  if (currentWidth == null) return target;

  const current =
    sorted.find((rung) => rung.width === currentWidth) ??
    sorted.find((rung) => rung.src && rungs.some((entry) => entry.src === rung.src)) ??
    null;
  if (!current) return target;

  if (current.width < needed) return target;

  const smaller = sorted.find(
    (rung) => rung.width >= needed && rung.width < current.width,
  );
  if (smaller && current.width > needed * DOWN_HYSTERESIS) {
    return smaller;
  }

  return current;
}
