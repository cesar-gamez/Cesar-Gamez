"use client";

import { useEffect, useRef, useState } from "react";
import { useCachedMediaSrc } from "@/components/canvas/use-cached-media";
import { absoluteDetailUrl } from "@/lib/canvas/detail-url";
import {
  hasDetailCopy,
  mediaKind,
  mediaParagraphs,
  type CanvasMedia,
} from "@/lib/canvas/media";

function MuteGlyph({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M4.5 9.25h2.55L11 5.8v12.4L7.05 14.75H4.5z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="M15.25 9.25l5.5 5.5M20.75 9.25l-5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M15.35 9.4a3.6 3.6 0 0 1 0 5.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M17.7 7.15a6.6 6.6 0 0 1 0 9.7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const copiedTimer = useRef(0);
  const [muted, setMuted] = useState(item.muted);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => window.clearTimeout(copiedTimer.current);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    const node = videoRef.current;
    if (node) {
      node.muted = next;
      if (!next) void node.play();
    }
    setMuted(next);
  };

  const share = async () => {
    const url = absoluteDetailUrl(item.id);
    const title = item.title.trim() || "Cesar Gamez";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const mediaClass = `h-auto w-full rounded-none object-contain md:w-auto md:max-w-full ${
    copy ? "max-h-[55dvh] md:max-h-full" : "max-h-[85dvh] md:max-h-full"
  }`;

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

      <button
        type="button"
        onClick={() => {
          void share();
        }}
        className="canvas-type-body absolute z-canvas-detail flex h-8 items-center rounded-full border border-black/10 bg-white px-3 text-[12px] text-black outline-none transition duration-150 ease-out hover:bg-black/5 focus-visible:bg-black/5"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {copied ? "copied" : "share"}
      </button>

      <div
        className={`${
          copy
            ? "flex shrink-0 items-center justify-center px-6 pt-16 pb-4 md:h-full md:min-h-0 md:flex-1 md:p-16"
            : "flex size-full items-center justify-center p-6 md:p-16"
        } ${video && cachedSrc ? "cursor-pointer" : ""}`}
        onClick={video && cachedSrc ? toggleMute : undefined}
      >
        {video ? (
          cachedSrc ? (
            <video
              ref={videoRef}
              className={mediaClass}
              src={cachedSrc}
              autoPlay
              loop
              muted={muted}
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
            <img className={mediaClass} src={item.poster} alt="" />
          ) : null
        ) : (
          <img className={mediaClass} src={item.src} alt="" />
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

      {video ? (
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          onClick={(event) => {
            event.stopPropagation();
            toggleMute();
          }}
          className="absolute z-canvas-detail flex size-8 items-center justify-center rounded-full border border-black/10 bg-white text-black outline-none transition duration-150 ease-out hover:bg-black/5 focus-visible:bg-black/5"
          style={{
            bottom: "max(1rem, env(safe-area-inset-bottom))",
            right: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <MuteGlyph muted={muted} />
        </button>
      ) : null}
    </div>
  );
}
