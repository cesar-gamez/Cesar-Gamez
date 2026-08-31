"use client";

import { useEffect, useRef, useState } from "react";
import { useCachedMediaSrc } from "@/components/canvas/use-cached-media";
import {
  frameToDataUrl,
  frameToJpeg,
  seekVideo,
} from "@/lib/canvas/poster";

export function PosterPicker({
  src,
  time,
  poster,
  onPreview,
  onCommit,
}: {
  src: string;
  time: number;
  poster: string;
  onPreview: (url: string, time: number) => void;
  onCommit: (blob: Blob, time: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoRef = useRef(false);
  const previewRef = useRef(onPreview);
  const commitRef = useRef(onCommit);
  const cachedSrc = useCachedMediaSrc(src, true);
  const [duration, setDuration] = useState(0);
  const [value, setValue] = useState(time);
  previewRef.current = onPreview;
  commitRef.current = onCommit;

  useEffect(() => {
    autoRef.current = false;
    setValue(time);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    setValue(time);
  }, [time]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cachedSrc) return;
    video.src = cachedSrc;
    video.load();
  }, [cachedSrc]);

  const paint = (nextTime: number, commit: boolean) => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    void seekVideo(video, nextTime).then(async () => {
      const captured = video.currentTime;
      previewRef.current(frameToDataUrl(video), captured);
      if (!commit) return;
      const blob = await frameToJpeg(video);
      commitRef.current(blob, captured);
    });
  };

  useEffect(() => {
    if (autoRef.current || poster || !cachedSrc) return;
    autoRef.current = true;
    paint(time, true);
  }, [cachedSrc, poster, time]);

  return (
    <span className="flex items-center gap-2">
      <video
        ref={videoRef}
        className="sr-only"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(Number.isFinite(video.duration) ? video.duration : 0);
          void seekVideo(video, value).then(() => {
            previewRef.current(frameToDataUrl(video), video.currentTime);
          });
        }}
      />
      <label className="flex items-center gap-2">
        Frame
        <input
          type="range"
          aria-label="Thumbnail frame"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.04}
          value={Math.min(value, duration > 0 ? duration : value)}
          disabled={!cachedSrc}
          onChange={(event) => {
            const next = Number(event.currentTarget.value);
            setValue(next);
            paint(next, false);
          }}
          onPointerUp={(event) => {
            const next = Number(event.currentTarget.value);
            setValue(next);
            paint(next, true);
          }}
          onKeyUp={(event) => {
            const next = Number(event.currentTarget.value);
            setValue(next);
            paint(next, true);
          }}
          className="h-7 w-28"
        />
      </label>
    </span>
  );
}
