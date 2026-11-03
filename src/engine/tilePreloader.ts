import maplibregl from 'maplibre-gl';
import { CameraKeyframe } from '../types/timeline';
import { interpolateCamera } from './cameraDirector';

export interface WarmupOptions {
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  samples?: number;
  timeoutPerStepMs?: number;
}

/**
 * Reliably waits for MapLibre to settle and render all tiles in the current viewport.
 * Does not prematurely return on stale areTilesLoaded checks.
 */
export function waitForMapIdle(map: maplibregl.Map, timeoutMs = 1200): Promise<void> {
  return new Promise((resolve) => {
    let done = false;

    const cleanup = () => {
      if (!done) {
        done = true;
        map.off('idle', onIdle);
        clearTimeout(timer);
        resolve();
      }
    };

    const onIdle = () => cleanup();
    const timer = setTimeout(cleanup, timeoutMs);

    map.once('idle', onIdle);
  });
}

/**
 * Reliably waits for a MapLibre style to fully load, with fallbacks for in-memory specs and timeouts.
 */
export function waitForStyleLoad(map: maplibregl.Map, timeoutMs = 3500): Promise<void> {
  if (map.isStyleLoaded()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        map.off('style.load', onStyleLoad);
        map.off('styledata', onStyleData);
        map.off('error', onError);
        clearTimeout(timer);
        resolve();
      }
    };

    const onStyleLoad = () => cleanup();
    const onStyleData = () => {
      if (map.isStyleLoaded()) {
        cleanup();
      }
    };
    const onError = () => {
      cleanup();
    };

    const timer = setTimeout(cleanup, timeoutMs);

    map.once('style.load', onStyleLoad);
    map.on('styledata', onStyleData);
    map.once('error', onError);
  });
}

/**
 * Pre-warms map tiles directly on an active MapLibre instance along the camera trajectory.
 * Ensures vector/raster tiles are downloaded, decoded in workers, and retained in GPU/WebGL memory
 * before the animation begins.
 */
export async function warmupMapTiles(
  map: maplibregl.Map,
  keyframes: CameraKeyframe[],
  options?: WarmupOptions
): Promise<void> {
  if (!map || keyframes.length === 0) {
    options?.onProgress?.(1);
    return;
  }

  const totalTime = keyframes[keyframes.length - 1].t;
  const sampleCount = options?.samples || Math.min(12, Math.max(6, Math.round(totalTime / 2.5)));
  const sampledKeyframes: CameraKeyframe[] = [];

  for (let i = 0; i <= sampleCount; i++) {
    const sampleT = (i / sampleCount) * totalTime;
    sampledKeyframes.push(interpolateCamera(keyframes, sampleT));
  }

  const total = sampledKeyframes.length;
  const timeoutMs = options?.timeoutPerStepMs ?? 700;

  for (let i = 0; i < total; i++) {
    if (options?.shouldCancel?.()) {
      break;
    }

    const kf = sampledKeyframes[i];
    map.jumpTo({
      center: kf.center,
      zoom: kf.zoom,
      pitch: kf.pitch,
      bearing: kf.bearing,
    });
    map.triggerRepaint();

    await waitForMapIdle(map, timeoutMs);

    if (options?.onProgress) {
      options.onProgress((i + 1) / total);
    }
  }

  // Restore camera to initial keyframe position
  const initial = keyframes[0];
  map.jumpTo({
    center: initial.center,
    zoom: initial.zoom,
    pitch: initial.pitch,
    bearing: initial.bearing,
  });
  map.triggerRepaint();

  await waitForMapIdle(map, 800);
}

/**
 * Legacy offscreen helper kept for backward compatibility.
 */
export async function preloadMapTiles(
  keyframes: CameraKeyframe[],
  mapStyle: string | maplibregl.StyleSpecification,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (keyframes.length === 0) {
    if (onProgress) onProgress(1);
    return;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1280px';
  container.style.height = '720px';
  container.style.visibility = 'hidden';
  document.body.appendChild(container);

  let map: maplibregl.Map | null = null;

  try {
    const initial = keyframes[0];
    map = new maplibregl.Map({
      container,
      style: mapStyle,
      center: initial.center,
      zoom: initial.zoom,
      pitch: initial.pitch,
      bearing: initial.bearing,
      interactive: false,
      attributionControl: false,
      maxTileCacheSize: 3000,
      renderWorldCopies: false,
    });

    await new Promise<void>((resolve) => {
      if (map!.loaded()) {
        resolve();
      } else {
        map!.once('load', () => resolve());
        setTimeout(resolve, 3000);
      }
    });

    await warmupMapTiles(map, keyframes, { onProgress });
  } catch (err) {
    console.warn('Chyba při přednačítání mapových dlaždic:', err);
  } finally {
    if (map) {
      map.remove();
    }
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }
}
