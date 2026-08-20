"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CanvasMediaItem, MediaResizeOverlay } from "@/components/canvas/canvas-media";
import { EditorBar } from "@/components/canvas/editor-bar";
import { SocialBar } from "@/components/canvas/social-bar";
import {
  GRID_GAP,
  clampCamera,
  panCamera,
  screenFromWorld,
  worldFromScreen,
  zoomAtPoint,
  type Camera,
} from "@/lib/canvas/camera";
import {
  isAllowedMediaFile,
  resizeMediaKeepAspect,
  type ResizeCorner,
} from "@/lib/canvas/media";
import {
  loadInstalledRedactionFonts,
  pickNextFont,
  REDACTION_CYCLE_MS,
} from "@/lib/canvas/redaction-fonts";
import { prepareDroppedMedia } from "@/lib/canvas/prepare-media";
import {
  cameraFromStartView,
  clampTextOpacity,
  sceneContentBounds,
  startViewFromCamera,
  textFontWeight,
  type CanvasText,
  type Scene,
} from "@/lib/canvas/scene";

type Mode = "view" | "edit";
type Tool = "select" | "text";
type SaveState = "saved" | "unsaved" | "saving" | "error";
type Hit =
  | { kind: "text"; id: string }
  | { kind: "media"; id: string };

const DEFAULT_BODY_SIZE = 32;
const DRAG_THRESHOLD = 3;

function applyCamera(
  viewport: HTMLDivElement,
  world: HTMLDivElement,
  textLayer: HTMLDivElement,
  camera: Camera,
) {
  const gap = GRID_GAP;
  const texts = [
    ...textLayer.querySelectorAll<HTMLElement>("[data-world-x]"),
  ];

  viewport.style.backgroundSize = `${gap}px ${gap}px`;
  viewport.style.backgroundPosition = `${camera.x}px ${camera.y}px`;
  world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;

  for (const node of texts) {
    const worldX = Number(node.dataset.worldX);
    const worldY = Number(node.dataset.worldY);
    const fontSize = Number(node.dataset.fontSize);
    const screen = screenFromWorld(camera, worldX, worldY);

    node.style.visibility = "visible";
    node.style.fontSize = `${fontSize * camera.zoom}px`;
    node.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
  }
}

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function filesFromDrop(dataTransfer: DataTransfer): File[] {
  const listed = [...dataTransfer.files];
  if (listed.length > 0) return listed;
  return [...dataTransfer.items]
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

function clampFontSize(size: number) {
  if (!Number.isFinite(size)) return DEFAULT_BODY_SIZE;
  return Math.min(400, Math.max(8, size));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function PortfolioCanvas({
  mode,
  initialScene,
}: {
  mode: Mode;
  initialScene: Scene;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const textsRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const sceneRef = useRef(initialScene);
  const paintRef = useRef<() => void>(() => {});
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const resizeOverlayRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<Tool>("select");
  const editingIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const editingModeRef = useRef(mode === "edit");

  const [scene, setScene] = useState(initialScene);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = mode === "edit";
  sceneRef.current = scene;
  toolRef.current = tool;
  editingIdRef.current = editingId;
  selectedIdRef.current = selectedId;
  editingModeRef.current = editing;

  const selectedText =
    scene.texts.find((item) => item.id === selectedId) ?? null;

  const markUnsaved = (next: Scene) => {
    sceneRef.current = next;
    setScene(next);
    setSaveState("unsaved");
  };
  const markUnsavedRef = useRef(markUnsaved);
  markUnsavedRef.current = markUnsaved;
  const deleteSelectedRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    const textLayer = textsRef.current;
    if (!viewport || !world || !textLayer) return;

    cameraRef.current = cameraFromStartView(
      sceneRef.current.startView,
      viewport.clientWidth,
      viewport.clientHeight,
    );

    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinch: {
      dist: number;
      midX: number;
      midY: number;
    } | null = null;
    let panning = false;
    let spaceHeld = false;
    let raf = 0;
    let moving:
      | { kind: "text" | "media"; id: string; lastX: number; lastY: number }
      | null = null;
    let resizing: {
      id: string;
      corner: ResizeCorner;
      start: { x: number; y: number; width: number; height: number };
    } | null = null;
    let dragMoved = false;

    const updateResizeOverlay = () => {
      const overlay = resizeOverlayRef.current;
      if (!overlay) return;

      const id = selectedIdRef.current;
      const media = id
        ? sceneRef.current.media.find((item) => item.id === id)
        : null;
      const node = media
        ? world.querySelector<HTMLElement>(`[data-media-id="${media.id}"]`)
        : null;

      if (!media || !node) {
        overlay.hidden = true;
        return;
      }

      const rect = node.getBoundingClientRect();
      const parent = viewport.getBoundingClientRect();
      overlay.hidden = false;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.transform = `translate(${rect.left - parent.left}px, ${rect.top - parent.top}px)`;
    };

    const applyMediaBox = (
      id: string,
      box: { x: number; y: number; width: number; height: number },
    ) => {
      const item = sceneRef.current.media.find((entry) => entry.id === id);
      const node = world.querySelector<HTMLElement>(`[data-media-id="${id}"]`);
      if (!item || !node) return;
      item.x = box.x;
      item.y = box.y;
      item.width = box.width;
      item.height = box.height;
      node.style.left = `${box.x}px`;
      node.style.top = `${box.y}px`;
      node.style.width = `${box.width}px`;
      node.style.height = `${box.height}px`;
      for (const el of node.querySelectorAll<HTMLElement>("div, picture, img, video")) {
        el.style.width = "100%";
        el.style.height = "100%";
      }
      for (const el of node.querySelectorAll<HTMLElement>("img, video")) {
        el.style.objectFit = "cover";
      }
      updateResizeOverlay();
    };

    let currentTitleFamily = "";
    const applyTitleFamily = () => {
      if (!currentTitleFamily) return;
      for (const node of textLayer.querySelectorAll<HTMLElement>(
        '[data-role="title"]',
      )) {
        if (node.dataset.id === editingIdRef.current) continue;
        node.style.fontFamily = `"${currentTitleFamily}"`;
      }
    };

    const constrainCamera = () => {
      cameraRef.current = clampCamera(
        cameraRef.current,
        viewport.clientWidth,
        viewport.clientHeight,
        sceneContentBounds(
          sceneRef.current,
          textLayer,
          cameraRef.current.zoom,
        ),
      );
    };

    const paint = () => {
      raf = 0;
      applyCamera(viewport, world, textLayer, cameraRef.current);
      constrainCamera();
      applyCamera(viewport, world, textLayer, cameraRef.current);
      applyTitleFamily();
      updateResizeOverlay();
      if (zoomLabelRef.current) {
        zoomLabelRef.current.textContent = `${Math.round(cameraRef.current.zoom * 100)}%`;
      }
    };
    paintRef.current = paint;

    const schedulePaint = () => {
      if (raf) return;
      raf = requestAnimationFrame(paint);
    };

    const localPoint = (event: PointerEvent | WheelEvent) => {
      const rect = viewport.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const hitTest = (clientX: number, clientY: number): Hit | null => {
      const texts = [...textLayer.querySelectorAll<HTMLElement>("[data-id]")];
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const node = texts[i]!;
        if (pointInRect(clientX, clientY, node.getBoundingClientRect())) {
          return { kind: "text", id: node.dataset.id! };
        }
      }

      const media = [...world.querySelectorAll<HTMLElement>("[data-media-id]")];
      for (let i = media.length - 1; i >= 0; i -= 1) {
        const node = media[i]!;
        if (pointInRect(clientX, clientY, node.getBoundingClientRect())) {
          return { kind: "media", id: node.dataset.mediaId! };
        }
      }

      return null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 1) event.preventDefault();
      if (event.button !== 0 && event.button !== 1) return;
      if ((event.target as HTMLElement).closest("[data-canvas-chrome]")) return;
      if (
        editingIdRef.current &&
        (event.target as HTMLElement).closest("[data-id]")
      ) {
        return;
      }

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.setPointerCapture(event.pointerId);

      const handle = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-resize-handle]",
      );
      if (
        editingModeRef.current &&
        handle?.dataset.resizeHandle &&
        event.button === 0 &&
        !spaceHeld
      ) {
        const mediaId = selectedIdRef.current;
        const item = mediaId
          ? sceneRef.current.media.find((entry) => entry.id === mediaId)
          : null;
        const node = item
          ? world.querySelector<HTMLElement>(`[data-media-id="${item.id}"]`)
          : null;
        if (item && node) {
          event.preventDefault();
          const rect = node.getBoundingClientRect();
          resizing = {
            id: item.id,
            corner: handle.dataset.resizeHandle as ResizeCorner,
            start: {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height ?? rect.height / cameraRef.current.zoom,
            },
          };
          dragMoved = false;
          panning = false;
          moving = null;
        }
        return;
      }

      const panGesture = event.button === 1 || spaceHeld || pointers.size === 2;
      const hit =
        editingModeRef.current && !panGesture
          ? hitTest(event.clientX, event.clientY)
          : null;

      if (
        editingModeRef.current &&
        toolRef.current === "text" &&
        event.button === 0 &&
        !spaceHeld
      ) {
        const point = localPoint(event);
        const worldPoint = worldFromScreen(
          cameraRef.current,
          point.x,
          point.y,
        );
        const nextText: CanvasText = {
          id: crypto.randomUUID(),
          text: "Text",
          x: worldPoint.x,
          y: worldPoint.y,
          fontSize: DEFAULT_BODY_SIZE,
          role: "body",
          bold: false,
          italic: false,
          opacity: 1,
        };
        markUnsavedRef.current({
          ...sceneRef.current,
          texts: [...sceneRef.current.texts, nextText],
        });
        setSelectedId(nextText.id);
        setTool("select");
        panning = false;
        moving = null;
        return;
      }

      if (hit && event.button === 0 && !spaceHeld) {
        setSelectedId(hit.id);
        setEditingId(null);
        moving = {
          kind: hit.kind,
          id: hit.id,
          lastX: event.clientX,
          lastY: event.clientY,
        };
        dragMoved = false;
        panning = false;
        viewport.style.cursor = "grabbing";
        return;
      }

      if (
        event.button === 0 &&
        editingModeRef.current &&
        !spaceHeld &&
        !hit
      ) {
        setSelectedId(null);
        setEditingId(null);
      }

      if (pointers.size === 1) {
        panning = true;
        moving = null;
        viewport.style.cursor = "grabbing";
      } else {
        panning = false;
        lastPinch = null;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;

      const previous = pointers.get(event.pointerId)!;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        const dist = pointerDistance(first, second);
        const midX = (first.x + second.x) / 2;
        const midY = (first.y + second.y) / 2;
        const rect = viewport.getBoundingClientRect();
        const screenMidX = midX - rect.left;
        const screenMidY = midY - rect.top;

        if (lastPinch) {
          const scale = dist / lastPinch.dist;
          Object.assign(
            cameraRef.current,
            zoomAtPoint(
              cameraRef.current,
              screenMidX,
              screenMidY,
              cameraRef.current.zoom * scale,
            ),
          );
          Object.assign(
            cameraRef.current,
            panCamera(
              cameraRef.current,
              midX - lastPinch.midX,
              midY - lastPinch.midY,
            ),
          );
          schedulePaint();
        }

        lastPinch = { dist, midX, midY };
        return;
      }

      if (resizing) {
        const point = localPoint(event);
        const worldPoint = worldFromScreen(
          cameraRef.current,
          point.x,
          point.y,
        );
        dragMoved = true;
        applyMediaBox(
          resizing.id,
          resizeMediaKeepAspect(resizing.corner, resizing.start, worldPoint),
        );
        return;
      }

      if (moving) {
        const dx = event.clientX - moving.lastX;
        const dy = event.clientY - moving.lastY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMoved = true;

        const worldDx = dx / cameraRef.current.zoom;
        const worldDy = dy / cameraRef.current.zoom;
        moving.lastX = event.clientX;
        moving.lastY = event.clientY;

        if (moving.kind === "media") {
          const node = world.querySelector<HTMLElement>(
            `[data-media-id="${moving.id}"]`,
          );
          const item = sceneRef.current.media.find((m) => m.id === moving!.id);
          if (node && item) {
            item.x += worldDx;
            item.y += worldDy;
            node.style.left = `${item.x}px`;
            node.style.top = `${item.y}px`;
            updateResizeOverlay();
          }
        } else {
          const item = sceneRef.current.texts.find((t) => t.id === moving!.id);
          const node = textLayer.querySelector<HTMLElement>(
            `[data-id="${moving.id}"]`,
          );
          if (item && node) {
            item.x += worldDx;
            item.y += worldDy;
            node.dataset.worldX = String(item.x);
            node.dataset.worldY = String(item.y);
            schedulePaint();
          }
        }
        return;
      }

      if (!panning) return;

      Object.assign(
        cameraRef.current,
        panCamera(
          cameraRef.current,
          event.clientX - previous.x,
          event.clientY - previous.y,
        ),
      );
      schedulePaint();
    };

    const endPointer = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      lastPinch = null;

      if ((moving || resizing) && dragMoved) {
        markUnsavedRef.current({
          ...sceneRef.current,
          texts: sceneRef.current.texts.map((item) => ({ ...item })),
          media: sceneRef.current.media.map((item) => ({ ...item })),
        });
      }

      moving = null;
      resizing = null;
      dragMoved = false;

      if (pointers.size === 0) {
        panning = false;
        viewport.style.cursor =
          toolRef.current === "text" ? "crosshair" : "grab";
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomInput = event.ctrlKey || event.metaKey;
      if (zoomInput) {
        const point = localPoint(event);
        Object.assign(
          cameraRef.current,
          zoomAtPoint(
            cameraRef.current,
            point.x,
            point.y,
            cameraRef.current.zoom * Math.exp(-event.deltaY * 0.01),
          ),
        );
        schedulePaint();
        return;
      }

      Object.assign(
        cameraRef.current,
        panCamera(cameraRef.current, -event.deltaX, -event.deltaY),
      );
      schedulePaint();
    };

    const onGesture = (event: Event) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.code === "Space") {
        spaceHeld = true;
        event.preventDefault();
      }

      if (!editingModeRef.current) return;

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelectedRef.current();
        return;
      }

      if (event.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
        setTool("select");
      }

      if (event.key.toLowerCase() === "t" && !event.metaKey && !event.ctrlKey) {
        setTool("text");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceHeld = false;
    };

    paint();

    let cancelled = false;
    let cycleId = 0;

    void loadInstalledRedactionFonts().then((families) => {
      if (cancelled || families.length === 0) return;

      const applyFamily = (family: string) => {
        currentTitleFamily = family;
        applyTitleFamily();
      };

      applyFamily(families[Math.floor(Math.random() * families.length)]!);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      cycleId = window.setInterval(() => {
        if (document.hidden) return;
        applyFamily(pickNextFont(families, currentTitleFamily));
      }, REDACTION_CYCLE_MS);

      if (cancelled) window.clearInterval(cycleId);
    });

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("gesturestart", onGesture);
    viewport.addEventListener("gesturechange", onGesture);
    viewport.addEventListener("gestureend", onGesture);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const resizeObserver = new ResizeObserver(() => {
      schedulePaint();
    });
    resizeObserver.observe(viewport);

    return () => {
      cancelled = true;
      window.clearInterval(cycleId);
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endPointer);
      viewport.removeEventListener("pointercancel", endPointer);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("gesturestart", onGesture);
      viewport.removeEventListener("gesturechange", onGesture);
      viewport.removeEventListener("gestureend", onGesture);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useLayoutEffect(() => {
    paintRef.current();
  }, [scene, selectedId]);

  const addMediaAt = async (
    files: FileList | File[],
    worldX: number,
    worldY: number,
  ) => {
    const list = [...files].filter((file) => isAllowedMediaFile(file));
    if (list.length === 0) {
      setError("Use jpeg, jpg, png, heic, mov, or mp4");
      setSaveState("error");
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewWidth = viewport.clientWidth / cameraRef.current.zoom;
    const viewHeight = viewport.clientHeight / cameraRef.current.zoom;

    try {
      const uploaded = await Promise.all(
        list.map(async (file, index) => {
          const prepared = await prepareDroppedMedia(file, viewWidth, viewHeight);
          const form = new FormData();
          form.append("file", prepared.file);
          const response = await fetch("/api/media", {
            method: "POST",
            body: form,
          });
          const payload = (await response.json().catch(() => ({}))) as {
            src?: string;
            error?: string;
          };
          if (!response.ok || !payload.src) {
            throw new Error(payload.error ?? "Upload failed");
          }
          return {
            id: crypto.randomUUID(),
            src: payload.src,
            x: worldX - prepared.width / 2 + index * 32,
            y: worldY - prepared.height / 2 + index * 32,
            width: prepared.width,
            height: prepared.height,
          };
        }),
      );

      markUnsaved({
        ...sceneRef.current,
        media: [...sceneRef.current.media, ...uploaded],
      });
      setSelectedId(uploaded.at(-1)?.id ?? null);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add media");
      setSaveState("error");
    }
  };

  const save = async () => {
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch("/api/scene", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sceneRef.current),
      });
      if (!response.ok) throw new Error("Save failed");
      setSaveState("saved");
    } catch {
      setError("Save failed");
      setSaveState("error");
    }
  };

  const deleteSelected = () => {
    const id = selectedIdRef.current;
    if (!id || editingIdRef.current) return;
    selectedIdRef.current = null;
    markUnsaved({
      ...sceneRef.current,
      texts: sceneRef.current.texts.filter((item) => item.id !== id),
      media: sceneRef.current.media.filter((item) => item.id !== id),
    });
    setSelectedId(null);
  };
  deleteSelectedRef.current = deleteSelected;

  return (
    <div
      ref={viewportRef}
      role="application"
      aria-label={editing ? "Portfolio editor" : "Portfolio canvas"}
      className={`relative h-dvh w-full overflow-hidden overscroll-none bg-white touch-none ${
        tool === "text" ? "cursor-crosshair" : "cursor-grab"
      } ${editingId ? "select-text" : "select-none"}`}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(0, 0, 0, 0.1) 1.25px, transparent 1.3px)",
        backgroundRepeat: "repeat",
      }}
      onDragOver={(event) => {
        if (!editing) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDropActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        if (!editing) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const worldPoint = worldFromScreen(
          cameraRef.current,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        void addMediaAt(
          filesFromDrop(event.dataTransfer),
          worldPoint.x,
          worldPoint.y,
        );
      }}
      onDoubleClick={(event) => {
        if (!editing) return;
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-id]",
        );
        if (!target?.dataset.id) return;
        setSelectedId(target.dataset.id);
        setEditingId(target.dataset.id);
        window.setTimeout(() => target.focus(), 0);
      }}
      onKeyDownCapture={(event) => {
        if (!editing) return;
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void save();
        }
        if (
          !editingId &&
          !isTypingTarget(event.target) &&
          (event.key === "Backspace" || event.key === "Delete")
        ) {
          event.preventDefault();
          deleteSelected();
        }
      }}
    >
      <div
        ref={worldRef}
        className="absolute top-0 left-0"
        style={{ transformOrigin: "0 0" }}
      >
        {scene.media.map((item) => (
          <CanvasMediaItem
            key={item.id}
            item={item}
            selected={editing && selectedId === item.id}
          />
        ))}
      </div>
      <div
        ref={textsRef}
        className="z-canvas-text pointer-events-none absolute inset-0 overflow-hidden"
      >
        {scene.texts.map((item) => (
          <p
            key={item.id}
            data-id={item.id}
            data-role={item.role}
            data-world-x={item.x}
            data-world-y={item.y}
            data-font-size={item.fontSize}
            contentEditable={editing && editingId === item.id}
            suppressContentEditableWarning
            tabIndex={editing ? 0 : -1}
            className={`absolute top-0 left-0 whitespace-nowrap text-black ${
              editing ? "pointer-events-auto" : ""
            } ${
              item.role === "title" ? "canvas-type" : "canvas-type-body"
            } ${editing && selectedId === item.id ? "canvas-selected" : ""}`}
            style={{
              visibility: "hidden",
              fontWeight: textFontWeight(item),
              fontStyle: item.italic ? "italic" : "normal",
              opacity: item.opacity,
              fontSynthesis: item.bold || item.italic ? "weight style" : "none",
            }}
            onBlur={(event) => {
              if (editingId !== item.id) return;
              const nextText =
                event.currentTarget.innerText.replace(/\n/g, " ").trim() ||
                "Text";
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((entry) =>
                  entry.id === item.id ? { ...entry, text: nextText } : entry,
                ),
              });
              setEditingId(null);
            }}
          >
            {item.text}
          </p>
        ))}
      </div>

      {editing ? <MediaResizeOverlay overlayRef={resizeOverlayRef} /> : null}

      {dropActive ? (
        <div className="z-canvas-drop pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-black">
          Drop jpeg, jpg, png, heic, mov, or mp4
        </div>
      ) : null}

      {editing ? (
        <div data-canvas-chrome>
          <EditorBar
            tool={tool}
            onTool={setTool}
            zoomLabelRef={zoomLabelRef}
            selectedText={selectedText}
            onFontSize={(size) => {
              if (!selectedText) return;
              const fontSize = clampFontSize(size);
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((item) =>
                  item.id === selectedText.id ? { ...item, fontSize } : item,
                ),
              });
            }}
            onBold={() => {
              if (!selectedText) return;
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((item) =>
                  item.id === selectedText.id
                    ? { ...item, bold: !item.bold }
                    : item,
                ),
              });
            }}
            onItalic={() => {
              if (!selectedText) return;
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((item) =>
                  item.id === selectedText.id
                    ? { ...item, italic: !item.italic }
                    : item,
                ),
              });
            }}
            onOpacity={(opacity) => {
              if (!selectedText) return;
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((item) =>
                  item.id === selectedText.id
                    ? { ...item, opacity: clampTextOpacity(opacity) }
                    : item,
                ),
              });
            }}
            onTextContent={(text) => {
              if (!selectedText) return;
              markUnsaved({
                ...sceneRef.current,
                texts: sceneRef.current.texts.map((item) =>
                  item.id === selectedText.id ? { ...item, text } : item,
                ),
              });
            }}
            onPickMedia={(files) => {
              const viewport = viewportRef.current;
              if (!viewport) return;
              const origin = worldFromScreen(
                cameraRef.current,
                viewport.clientWidth / 2,
                viewport.clientHeight / 2,
              );
              void addMediaAt(files, origin.x, origin.y);
            }}
            onSetStartView={() => {
              const viewport = viewportRef.current;
              if (!viewport) return;
              markUnsaved({
                ...sceneRef.current,
                startView: startViewFromCamera(
                  cameraRef.current,
                  viewport.clientWidth,
                  viewport.clientHeight,
                ),
              });
            }}
            onSave={() => {
              void save();
            }}
            saveState={saveState}
            error={error}
            startZoom={scene.startView?.zoom ?? null}
          />
        </div>
      ) : (
        <SocialBar />
      )}
    </div>
  );
}
