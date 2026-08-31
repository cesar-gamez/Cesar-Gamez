"use client";

import { useCachedMediaSrc } from "@/components/canvas/use-cached-media";
import {
  hasDetailCopy,
  mediaKind,
  mediaParagraphs,
  type CanvasMedia,
} from "@/lib/canvas/media";

export function MediaDetail({
  item,
  onClose,
}: {
  item: CanvasMedia;
  onClose: () => void;
}) {
  const video = mediaKind(item.src) === "video";
  const paragraphs = mediaParagraphs(item.body);
  const copy = hasDetailCopy(item);
  const cachedSrc = useCachedMediaSrc(item.src, video);

  return (
    <div
      data-canvas-chrome
      role="dialog"
      aria-modal="true"
      aria-labelledby={item.title.trim() ? "media-detail-title" : undefined}
      aria-label={item.title.trim() ? undefined : "Media"}
      className={`z-canvas-detail absolute inset-0 cursor-default bg-white ${
        copy
          ? "flex flex-col overflow-y-auto md:flex-row md:overflow-hidden"
          : "flex items-center justify-center overflow-hidden"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        className="canvas-type-body absolute z-canvas-detail flex h-8 items-center rounded-full border border-black/10 bg-white px-3 text-[12px] text-black outline-none transition duration-150 ease-out hover:bg-black/5 focus-visible:bg-black/5"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        ‹ esc
      </button>

      <div
        className={
          copy
            ? "flex shrink-0 items-center justify-center px-6 pt-16 pb-4 md:h-full md:min-h-0 md:flex-1 md:p-16"
            : "flex size-full items-center justify-center p-6 md:p-16"
        }
      >
        {video ? (
          cachedSrc ? (
            <video
              className={`h-auto w-full rounded-none object-contain md:w-auto md:max-w-full ${
                copy ? "max-h-[55dvh] md:max-h-full" : "max-h-[85dvh] md:max-h-full"
              }`}
              src={cachedSrc}
              autoPlay
              loop
              muted={item.muted}
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              onEnded={(event) => {
                const node = event.currentTarget;
                node.currentTime = 0;
                void node.play();
              }}
            />
          ) : item.poster ? (
            <img
              className={`h-auto w-full rounded-none object-contain md:w-auto md:max-w-full ${
                copy ? "max-h-[55dvh] md:max-h-full" : "max-h-[85dvh] md:max-h-full"
              }`}
              src={item.poster}
              alt=""
            />
          ) : null
        ) : (
          <img
            className={`h-auto w-full rounded-none object-contain md:w-auto md:max-w-full ${
              copy ? "max-h-[55dvh] md:max-h-full" : "max-h-[85dvh] md:max-h-full"
            }`}
            src={item.src}
            alt=""
          />
        )}
      </div>

      {copy ? (
        <aside className="flex w-full shrink-0 flex-col px-6 pb-8 md:h-full md:w-[22rem] md:overflow-y-auto md:px-8 md:py-16 lg:w-[24rem]">
          {item.title.trim() ? (
            <h1
              id="media-detail-title"
              className="canvas-type-body text-pretty text-[22px] text-black"
            >
              {item.title}
            </h1>
          ) : null}
          {paragraphs.map((paragraph, index) => (
            <p
              key={paragraph}
              className={`canvas-type-body text-pretty text-[13px] leading-relaxed text-black/70 ${
                index > 0 || item.title.trim() ? "mt-4" : ""
              }`}
            >
              {paragraph}
            </p>
          ))}
        </aside>
      ) : null}
    </div>
  );
}
