"use client";

import { useEffect, useState, type RefObject } from "react";
import { mediaContentType } from "@/lib/canvas/media";
import { readCachedMediaBlob } from "@/lib/canvas/media-cache";

export function useNearViewport(ref: RefObject<Element | null>) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const root = node.closest("[data-canvas-viewport]");
    const observer = new IntersectionObserver(
      ([entry]) => setNear(Boolean(entry?.isIntersecting)),
      {
        root: root instanceof Element ? root : null,
        rootMargin: "160px",
        threshold: 0.01,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return near;
}

export function useCachedMediaSrc(url: string, enabled: boolean) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void readCachedMediaBlob(url)
      .then((blob) => {
        const typed =
          blob.type && blob.type !== "application/octet-stream"
            ? blob
            : new Blob([blob], { type: mediaContentType(url) });
        const next = URL.createObjectURL(typed);
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setSrc(next);
      })
      .catch(() => {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[canvas media] CDN fallback ${url} — fetch failed, using remote src`,
            );
          }
          setSrc(url);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);

  return src;
}
