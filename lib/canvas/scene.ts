import {
  clampZoom,
  expandBounds,
  MIN_ZOOM,
  type Camera,
  type WorldBounds,
} from "@/lib/canvas/camera";
import {
  DEFAULT_MEDIA_BODY,
  DEFAULT_MEDIA_TITLE,
  type CanvasMedia,
} from "@/lib/canvas/media";

export type TextRole = "title" | "body";

export type CanvasText = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  role: TextRole;
  bold: boolean;
  italic: boolean;
  opacity: number;
};

export function clampTextOpacity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function textFontWeight(item: CanvasText): number {
  if (!item.bold) return 400;
  return item.role === "title" ? 900 : 700;
}

export type StartView = {
  cx: number;
  cy: number;
  zoom: number;
};

export type Scene = {
  startView: StartView | null;
  texts: CanvasText[];
  media: CanvasMedia[];
};

export function cameraFromStartView(
  startView: StartView | null,
  viewportWidth: number,
  viewportHeight: number,
): Camera {
  const zoomOut = viewportWidth < 700;

  if (!startView) {
    const zoom = zoomOut ? MIN_ZOOM : 1;
    return {
      x: viewportWidth / 2,
      y: viewportHeight / 2,
      zoom,
    };
  }

  const zoom = zoomOut ? MIN_ZOOM : clampZoom(startView.zoom);
  return {
    x: viewportWidth / 2 - startView.cx * zoom,
    y: viewportHeight / 2 - startView.cy * zoom,
    zoom,
  };
}

export function startViewFromCamera(
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): StartView {
  return {
    cx: (viewportWidth / 2 - camera.x) / camera.zoom,
    cy: (viewportHeight / 2 - camera.y) / camera.zoom,
    zoom: camera.zoom,
  };
}

export const DEFAULT_SCENE: Scene = {
  startView: null,
  texts: [
    {
      id: "name",
      text: "Cesar Gamez",
      x: 0,
      y: 0,
      fontSize: 96,
      role: "title",
      bold: true,
      italic: false,
      opacity: 1,
    },
  ],
  media: [],
};

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeScene(input: unknown): Scene {
  const raw =
    input && typeof input === "object" ? (input as Partial<Scene>) : {};
  const startView =
    raw.startView && typeof raw.startView === "object"
      ? {
          cx: asNumber(raw.startView.cx, 0),
          cy: asNumber(raw.startView.cy, 0),
          zoom: asNumber(raw.startView.zoom, 1),
        }
      : null;

  return {
    startView,
    texts: Array.isArray(raw.texts)
      ? raw.texts.map((item, index) => ({
          id: asString(item?.id, `text-${index}`),
          text: asString(item?.text, "Text"),
          x: asNumber(item?.x, 0),
          y: asNumber(item?.y, 0),
          fontSize: asNumber(item?.fontSize, 32),
          role: item?.role === "title" ? "title" : "body",
          bold:
            typeof item?.bold === "boolean"
              ? item.bold
              : item?.role === "title",
          italic: item?.italic === true,
          opacity: clampTextOpacity(asNumber(item?.opacity, 1)),
        }))
      : DEFAULT_SCENE.texts,
    media: Array.isArray(raw.media)
      ? raw.media.map((item, index) => ({
          id: asString(item?.id, `media-${index}`),
          src: asString(item?.src, ""),
          x: asNumber(item?.x, 0),
          y: asNumber(item?.y, 0),
          width: asNumber(item?.width, 420),
          height:
            typeof item?.height === "number" &&
            Number.isFinite(item.height) &&
            item.height > 0
              ? item.height
              : undefined,
          title: asString(item?.title, DEFAULT_MEDIA_TITLE),
          body: asString(item?.body, DEFAULT_MEDIA_BODY),
          detailEnabled: item?.detailEnabled !== false,
          muted: item?.muted !== false,
          rungs: Array.isArray(item?.rungs)
            ? item.rungs
                .map((rung) => ({
                  src: asString(rung?.src, ""),
                  width: asNumber(rung?.width, 0),
                }))
                .filter((rung) => rung.src && rung.width > 0)
            : [],
        }))
      : [],
  };
}

function mediaHeight(item: CanvasMedia): number {
  return typeof item.height === "number" && item.height > 0
    ? item.height
    : Math.max(item.width * 0.75, 48);
}

function textWorldSize(
  item: CanvasText,
  textLayer: HTMLElement | null | undefined,
  zoom: number,
): { width: number; height: number } {
  const node = textLayer?.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
  if (node instanceof HTMLElement && zoom > 0) {
    const width = node.offsetWidth / zoom;
    const height = node.offsetHeight / zoom;
    if (width > 0 && height > 0) return { width, height };
  }

  return {
    width: Math.max(item.fontSize, item.text.length * item.fontSize * 0.55),
    height: item.fontSize * 1.2,
  };
}

export function sceneContentBounds(
  scene: Scene,
  textLayer?: HTMLElement | null,
  zoom = 1,
): WorldBounds | null {
  let bounds: WorldBounds | null = null;

  for (const item of scene.media) {
    const height = mediaHeight(item);
    bounds = expandBounds(
      bounds,
      item.x,
      item.y,
      item.x + item.width,
      item.y + height,
    );
  }

  for (const item of scene.texts) {
    const size = textWorldSize(item, textLayer, zoom);
    bounds = expandBounds(
      bounds,
      item.x - size.width / 2,
      item.y - size.height / 2,
      item.x + size.width / 2,
      item.y + size.height / 2,
    );
  }

  return bounds;
}
