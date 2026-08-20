export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 8;
export const GRID_GAP = 48;
export const CONTENT_PADDING = 230;

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type WorldBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function expandBounds(
  bounds: WorldBounds | null,
  left: number,
  top: number,
  right: number,
  bottom: number,
): WorldBounds {
  if (!bounds) return { left, top, right, bottom };
  return {
    left: Math.min(bounds.left, left),
    top: Math.min(bounds.top, top),
    right: Math.max(bounds.right, right),
    bottom: Math.max(bounds.bottom, bottom),
  };
}

function padBounds(bounds: WorldBounds, padding: number): WorldBounds {
  return {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
  };
}

function clampAxis(
  position: number,
  viewSize: number,
  zoom: number,
  minWorld: number,
  maxWorld: number,
): number {
  const minPosition = viewSize - maxWorld * zoom;
  const maxPosition = -minWorld * zoom;
  if (minPosition > maxPosition) return (minPosition + maxPosition) / 2;
  return Math.min(maxPosition, Math.max(minPosition, position));
}

export function clampCamera(
  camera: Camera,
  viewWidth: number,
  viewHeight: number,
  content: WorldBounds | null,
): Camera {
  const zoom = clampZoom(camera.zoom);
  if (!content || viewWidth <= 0 || viewHeight <= 0) {
    return { x: camera.x, y: camera.y, zoom };
  }

  const padded = padBounds(content, CONTENT_PADDING);
  return {
    x: clampAxis(camera.x, viewWidth, zoom, padded.left, padded.right),
    y: clampAxis(camera.y, viewHeight, zoom, padded.top, padded.bottom),
    zoom,
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return {
    x: camera.x + dx,
    y: camera.y + dy,
    zoom: camera.zoom,
  };
}

export function zoomAtPoint(
  camera: Camera,
  screenX: number,
  screenY: number,
  nextZoom: number,
): Camera {
  const zoom = clampZoom(nextZoom);
  const worldX = (screenX - camera.x) / camera.zoom;
  const worldY = (screenY - camera.y) / camera.zoom;

  return {
    x: screenX - worldX * zoom,
    y: screenY - worldY * zoom,
    zoom,
  };
}

export function screenFromWorld(
  camera: Camera,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
}

export function worldFromScreen(
  camera: Camera,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}
