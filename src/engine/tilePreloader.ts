import maplibregl from 'maplibre-gl';
import { CameraKeyframe } from '../types/timeline';

export async function preloadMapTiles(
  keyframes: CameraKeyframe[],
  mapStyle: string | maplibregl.StyleSpecification,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (keyframes.length === 0) {
    if (onProgress) onProgress(1);
    return;
  }

  // Create an offscreen container with viewport size
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
    });

    // Wait for map load
    await new Promise<void>((resolve) => {
      if (map!.loaded()) {
        resolve();
      } else {
        map!.once('load', () => resolve());
        setTimeout(resolve, 3000); // Safety fallback
      }
    });

    // Subsample keyframes to efficiently cover all viewports without redundant checks
    const sampledKeyframes: CameraKeyframe[] = [];
    const step = Math.max(1, Math.floor(keyframes.length / 18));
    for (let i = 0; i < keyframes.length; i += step) {
      sampledKeyframes.push(keyframes[i]);
    }
    // Always include first and last keyframe
    if (sampledKeyframes[sampledKeyframes.length - 1] !== keyframes[keyframes.length - 1]) {
      sampledKeyframes.push(keyframes[keyframes.length - 1]);
    }

    const total = sampledKeyframes.length;
    for (let i = 0; i < total; i++) {
      const kf = sampledKeyframes[i];
      map.jumpTo({
        center: kf.center,
        zoom: kf.zoom,
        pitch: kf.pitch,
        bearing: kf.bearing,
      });

      // Wait for tiles to load at this keyframe position
      await waitForTilesIdle(map, 1400);

      if (onProgress) {
        onProgress((i + 1) / total);
      }
    }
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

function waitForTilesIdle(map: maplibregl.Map, maxWaitMs = 1400): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve();
      }
    }, maxWaitMs);

    if (map.areTilesLoaded()) {
      clearTimeout(timer);
      done = true;
      resolve();
      return;
    }

    map.once('idle', () => {
      if (!done) {
        clearTimeout(timer);
        done = true;
        resolve();
      }
    });
  });
}

