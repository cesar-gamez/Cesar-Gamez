const CACHE_NAME = "canvas-media-v1";
const CDN_HIT_STATUSES = new Set([
  "HIT",
  "STALE",
  "REVALIDATED",
  "REVALIDATED",
  "UPDATING",
]);

const inflight = new Map<string, Promise<Blob>>();

function mediaFileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function logMediaCache(kind: string, url: string, extra?: string) {
  if (process.env.NODE_ENV !== "development") return;
  const detail = extra ? ` ${extra}` : "";
  console.log(`[canvas media] ${kind} ${mediaFileName(url)}${detail}`);
}

export async function readCachedMediaBlob(url: string): Promise<Blob> {
  const pending = inflight.get(url);
  if (pending) return pending;

  const task = loadBlob(url);
  inflight.set(url, task);
  try {
    return await task;
  } finally {
    inflight.delete(url);
  }
}

async function loadBlob(url: string): Promise<Blob> {
  const cache = await openMediaCache();
  if (cache) {
    const hit = await cache.match(url);
    if (hit?.ok) {
      const bytes = Number(hit.headers.get("content-length")) || 0;
      logMediaCache("disk", url, bytes ? `${(bytes / 1_048_576).toFixed(2)} MB` : "");
      return hit.blob();
    }
  }

  const response = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`Media fetch failed (${response.status})`);
  }

  const cfStatus = (
    response.headers.get("cf-cache-status") ??
    response.headers.get("x-cache") ??
    "UNKNOWN"
  ).toUpperCase();
  const bytes = Number(response.headers.get("content-length")) || 0;
  const mb = bytes ? `${(bytes / 1_048_576).toFixed(2)} MB` : "size unknown";
  if (CDN_HIT_STATUSES.has(cfStatus)) {
    logMediaCache("CDN HIT", url, `${cfStatus} ${mb} — counts as cached egress`);
  } else {
    logMediaCache("CDN MISS", url, `${cfStatus} ${mb}`);
  }

  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch {
      // Quota or opaque response — still play from the in-memory blob.
    }
  }

  return response.blob();
}

async function openMediaCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

let watchingCdn = false;

export function watchCanvasCdnInDev() {
  if (process.env.NODE_ENV !== "development") return;
  if (watchingCdn || typeof PerformanceObserver === "undefined") return;
  watchingCdn = true;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.name.includes("/storage/v1/object/")) continue;
      const resource = entry as PerformanceResourceTiming;
      const bytes = resource.transferSize;
      const fromBrowserCache =
        resource.transferSize === 0 && resource.decodedBodySize > 0;
      if (fromBrowserCache) {
        logMediaCache("browser HTTP cache", entry.name);
        continue;
      }
      if (bytes > 0) {
        logMediaCache(
          "CDN transfer",
          entry.name,
          `${(bytes / 1_048_576).toFixed(2)} MB (resource timing)`,
        );
      }
    }
  });
  observer.observe({ type: "resource", buffered: true });
}
