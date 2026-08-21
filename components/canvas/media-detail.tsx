"use client";

import {
  mediaKind,
  mediaParagraphs,
  videoMimeType,
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

  return (
    <div
      data-canvas-chrome
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-detail-title"
      className="z-canvas-detail absolute inset-0 flex cursor-default flex-col overflow-y-auto bg-white md:flex-row md:overflow-hidden"
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

      <div className="flex shrink-0 items-center justify-center px-6 pt-16 pb-4 md:h-full md:min-h-0 md:flex-1 md:p-16">
        {video ? (
          <video
            className="h-auto w-full max-h-[55dvh] rounded-none object-contain md:max-h-full md:w-auto md:max-w-full"
            src={item.src}
            autoPlay
            loop
            muted={item.muted}
            playsInline
            preload="auto"
            disablePictureInPicture
            controls={false}
          >
            <source src={item.src} type={videoMimeType(item.src)} />
          </video>
        ) : (
          <img
            className="h-auto w-full max-h-[55dvh] rounded-none object-contain md:max-h-full md:w-auto md:max-w-full"
            src={item.src}
            alt=""
          />
        )}
      </div>

      <aside className="flex w-full shrink-0 flex-col px-6 pb-8 md:h-full md:w-[22rem] md:overflow-y-auto md:px-8 md:py-16 lg:w-[24rem]">
        <h1
          id="media-detail-title"
          className="canvas-type-body text-pretty text-[22px] text-black"
        >
          {item.title}
        </h1>
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="canvas-type-body mt-4 text-pretty text-[13px] leading-relaxed text-black/70"
          >
            {paragraph}
          </p>
        ))}
      </aside>
    </div>
  );
}
