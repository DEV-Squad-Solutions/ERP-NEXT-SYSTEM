import { lazy } from "react";

const KEY = "chunkReloadAt";
const WINDOW_MS = 15000;

export function isChunkError(error) {
  const msg = String(error?.message || error || "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

/** Reload once (guarded) after a deploy replaced the hashed assets. Returns true when a reload started. */
export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Drop-in for React.lazy that reloads once when the chunk is gone after a new deploy. */
export function lazyRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkError(error) && reloadOnceForNewVersion()) {
        return new Promise(() => {});
      }
      throw error;
    }),
  );
}
