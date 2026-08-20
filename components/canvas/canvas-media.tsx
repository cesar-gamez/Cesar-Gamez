"use client";

import { useState, type ReactNode, type RefObject } from "react";
import {
  mediaKind,
  videoMimeType,
  type CanvasMedia,
  type ResizeCorner,
} from "@/lib/canvas/media";

const CORNERS: { corner: ResizeCorner; cursor: string; label: string }[] = [
  { corner: "nw", cursor: "nwse-resize", label: "Resize from top left" },
  { corner: "ne", cursor: "nesw-resize", label: "Resize from top right" },
  { corner: "sw", cursor: "nesw-resize", label: "Resize from bottom left" },
  { corner: "se", cursor: "nwse-resize", label: "Resize from bottom right" },
];

function frameHeight(
  item: CanvasMedia,
  natural: { width: number; height: number } | null,
) {
  if (typeof item.height === "number" && item.height > 0) return item.height;
  if (natural && natural.width > 0) {
    return Math.max(item.width * (natural.height / natural.width), 48);
  }
  return Math.max(item.width * 0.75, 48);
}

function MediaFrame({
  item,
  selected,
  natural,
  children,
}: {
  item: CanvasMedia;
  selected: boolean;
  natural: { width: number; height: number } | null;
  children: ReactNode;
}) {
  const height = frameHeight(item, natural);

  return (
    <div
      data-media-id={item.id}
      className="pointer-events-none absolute overflow-hidden bg-white"
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height,
        borderRadius: 8,
        border: "1px solid rgba(0, 0, 0, 0.1)",
        boxShadow: selected ? "0 0 0 1px #000" : undefined,
      }}
    >
      <div className="size-full">{children}</div>
    </div>
  );
}

export function CanvasMediaItem({
  item,
  selected = false,
}: {
  item: CanvasMedia;
  selected?: boolean;
}) {
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);

  if (mediaKind(item.src) === "video") {
    return (
      <MediaFrame item={item} selected={selected} natural={natural}>
        <video
          className="block size-full object-cover"
          src={item.src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setNatural({
                width: video.videoWidth,
                height: video.videoHeight,
              });
            }
          }}
        >
          <source src={item.src} type={videoMimeType(item.src)} />
        </video>
      </MediaFrame>
    );
  }

  return (
    <MediaFrame item={item} selected={selected} natural={natural}>
      <img
        className="block size-full object-cover"
        src={item.src}
        alt=""
        draggable={false}
        decoding="async"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setNatural({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          }
        }}
      />
    </MediaFrame>
  );
}

export function MediaResizeOverlay({
  overlayRef,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={overlayRef}
      hidden
      className="z-canvas-resize pointer-events-none absolute top-0 left-0"
    >
      {CORNERS.map(({ corner, cursor, label }) => (
        <button
          key={corner}
          type="button"
          data-resize-handle={corner}
          aria-label={label}
          className="pointer-events-auto absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{
            left: corner.includes("e") ? "100%" : "0%",
            top: corner.includes("s") ? "100%" : "0%",
            cursor,
          }}
        >
          <span className="size-2 rounded-[1px] border border-black/50 bg-white" />
        </button>
      ))}
    </div>
  );
}
