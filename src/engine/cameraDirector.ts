import { CameraKeyframe, ObsEvent } from '../types/timeline';

export interface CameraDirectorConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomInRate?: number; // How quickly camera zooms in when staying in the same region
  arcFlyDistanceKm?: number; // Threshold distance for pulling back during long transitions
}

export interface WalkClusterInfo {
  isWalkCluster: boolean;
  count: number;
  spanKm: number;
  center: [number, number];
  recommendedZoom: number;
}

// Detekuje sekvenci po sobě jdoucích pozorování v okruhu do maxSpanKm (výchozí 5 km)
export function detectWalkCluster(
  events: ObsEvent[],
  startIndex = 0,
  maxSpanKm = 5.0,
  minCount = 8
): WalkClusterInfo {
  if (events.length === 0 || startIndex >= events.length) {
    return {
      isWalkCluster: false,
      count: 0,
      spanKm: 0,
      center: [15.47, 49.81],
      recommendedZoom: 10.5,
    };
  }

  const firstCoord = events[startIndex].coordinates;
  let minLng = firstCoord[0];
  let maxLng = firstCoord[0];
  let minLat = firstCoord[1];
  let maxLat = firstCoord[1];

  let clusterCount = 1;

  for (let i = startIndex + 1; i < events.length; i++) {
    const coord = events[i].coordinates;
    const testMinLng = Math.min(minLng, coord[0]);
    const testMaxLng = Math.max(maxLng, coord[0]);
    const testMinLat = Math.min(minLat, coord[1]);
    const testMaxLat = Math.max(maxLat, coord[1]);

    const diagonalKm = calculateDistanceKm([testMinLng, testMinLat], [testMaxLng, testMaxLat]);

    if (diagonalKm <= maxSpanKm) {
      minLng = testMinLng;
      maxLng = testMaxLng;
      minLat = testMinLat;
      maxLat = testMaxLat;
      clusterCount++;
    } else {
      break;
    }
  }

  const isWalkCluster = clusterCount >= minCount;
  const spanKm = calculateDistanceKm([minLng, minLat], [maxLng, maxLat]);
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  // Pro detailní zobrazení pěší vycházky (do 2–5 km) volíme detailní přiblížení
  let recommendedZoom = 10.5;
  if (isWalkCluster) {
    if (spanKm <= 1.5) {
      recommendedZoom = 14.8;
    } else if (spanKm <= 3.0) {
      recommendedZoom = 14.2;
    } else if (spanKm <= 5.0) {
      recommendedZoom = 13.5;
    } else {
      recommendedZoom = 12.8;
    }
  }

  return {
    isWalkCluster,
    count: clusterCount,
    spanKm,
    center,
    recommendedZoom,
  };
}

export function calculateFlightDuration(distKm: number): number {
  if (distKm < 15) return 0;
  if (distKm <= 50) {
    // 15-50 km: Velmi rychlý, svižný přesun (0.9 s až 1.4 s)
    const t = 0.9 + 0.5 * ((distKm - 15) / 35);
    return Math.round(t * 10) / 10;
  }
  if (distKm <= 100) {
    // 50-100 km: Rychlý přesun (1.4 s až 2.2 s)
    const t = 1.4 + 0.8 * ((distKm - 50) / 50);
    return Math.round(t * 10) / 10;
  }
  if (distKm <= 250) {
    // 100-250 km: Meziměstský přelet přes republiku (2.2 s až 5.2 s)
    const t = 2.2 + 3.0 * ((distKm - 100) / 150);
    return Math.round(t * 10) / 10;
  }
  if (distKm <= 1000) {
    // 250-1000 km: Vnitrostátní až celoevropský přelet (5.2 s až 6.2 s)
    const t = 5.2 + 1.0 * ((distKm - 250) / 750);
    return Math.round(t * 10) / 10;
  }
  // 1000+ km: Mezistátní a kontinentální přelet (6.2 s až max 7.2 s)
  const t = 6.2 + 1.0 * Math.min(1.0, Math.log10(distKm / 1000) / Math.log10(10));
  return Math.round(t * 10) / 10;
}

/**
 * Progresivní výpočet zdvihu kamery (zoomDip / odzoomování) podle vzdálenosti:
 * - Do 50 km: minimální zdvih (0.4 až 1.0 úrovně zoomu) pro zachování kontextu terénu
 * - 50-100 km: mírný nadhled (1.0 až 2.0 úrovně zoomu)
 * - 100-200 km: přechod do celostátního nadhledu (2.0 až 5.2 úrovně zoomu)
 * - 200+ km: vysoký kontinentální / globální přelet (5.2 až 6.6 úrovně zoomu)
 */
export function calculateProgressiveZoomDip(
  distKm: number,
  midBaseZoom: number,
  minZoom = 2.5
): number {
  if (distKm < 15) return 0;

  let dip: number;
  if (distKm <= 50) {
    // 15-50 km: Velmi malý, decentní zdvih kamery (0.4 až 1.0 úrovně zoomu)
    dip = 0.4 + 0.6 * ((distKm - 15) / 35);
  } else if (distKm <= 100) {
    // 50-100 km: Mírný zdvih (1.0 až 2.0 úrovně zoomu)
    dip = 1.0 + 1.0 * ((distKm - 50) / 50);
  } else if (distKm <= 200) {
    // 100-200 km: Plynulý přechod do celostátního nadhledu (2.0 až 5.8)
    dip = 2.0 + 3.8 * ((distKm - 100) / 100);
  } else if (distKm <= 250) {
    // 200-250 km: Celostátní nadhled (5.8 až 6.2)
    dip = 5.8 + 0.4 * ((distKm - 200) / 50);
  } else if (distKm <= 800) {
    // 250-800 km: Celoevropský přelet (6.2 až 7.0)
    dip = 6.2 + 0.8 * ((distKm - 250) / 550);
  } else {
    // 800+ km: Globální nadhled
    dip = 7.0 + 1.2 * Math.min(1.0, Math.log10(distKm / 800) / Math.log10(10));
  }

  // Omezení, aby odzoomování nikdy nepřekročilo globální minZoom
  const maxAllowedDip = Math.max(0.2, midBaseZoom - minZoom);
  return Math.min(dip, maxAllowedDip);
}

// Haversine distance in km between two [lng, lat] points
export function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateCameraKeyframes(
  events: ObsEvent[],
  totalDuration: number,
  config: CameraDirectorConfig = {}
): CameraKeyframe[] {
  const {
    minZoom = 2.5,
    maxZoom = 15.5,
    zoomInRate = 0.08,
    arcFlyDistanceKm = 15,
  } = config;

  if (events.length === 0) {
    return [
      { t: 0, center: [15.47, 49.81], zoom: 7, pitch: 0, bearing: 0 },
      { t: totalDuration, center: [15.47, 49.81], zoom: 7, pitch: 0, bearing: 0 }
    ];
  }

  const keyframes: CameraKeyframe[] = [];

  // Zjištění, zda na začátku existuje sekvence po sobě jdoucích bodů z vycházky (více než 8 bodů v okruhu do 2–5 km)
  const initialCluster = detectWalkCluster(events, 0, 5.0, 8);

  const initialCenter: [number, number] = initialCluster.isWalkCluster
    ? initialCluster.center
    : [events[0].coordinates[0], events[0].coordinates[1]];

  const initialZoom = initialCluster.isWalkCluster
    ? Math.max(minZoom, Math.min(maxZoom, initialCluster.recommendedZoom))
    : Math.max(minZoom, 10.5);

  keyframes.push({
    t: 0,
    center: [initialCenter[0], initialCenter[1]],
    zoom: initialZoom,
    pitch: 20,
    bearing: 0,
  });

  let currentCenter: [number, number] = [initialCenter[0], initialCenter[1]];
  let currentZoom = initialZoom;
  let lastKeyframeTime = 0;

  // Window of recent points for weighted centroid in local tracking
  const recentPoints: { coord: [number, number]; t: number }[] = [];
  const windowDurationSec = 3.5;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prevEv = i > 0 ? events[i - 1] : null;

    const distToPrev = prevEv ? calculateDistanceKm(prevEv.coordinates, ev.coordinates) : 0;
    const timeDelta = prevEv ? Math.max(0.01, ev.t - prevEv.t) : 0.5;

    if (distToPrev >= arcFlyDistanceKm) {
      // Long-distance transition: smooth cinematic arc flight with progressive duration and zoomDip
      const flightDuration = Math.max(0.6, prevEv ? ev.t - prevEv.t : calculateFlightDuration(distToPrev));
      const flightStart = ev.t - flightDuration;

      const startCenter: [number, number] = [currentCenter[0], currentCenter[1]];
      const startZoom = currentZoom;
      const targetCenter: [number, number] = [ev.coordinates[0], ev.coordinates[1]];
      const arrivalCluster = detectWalkCluster(events, i, 5.0, 5);
      const targetZoom = arrivalCluster.isWalkCluster
        ? Math.max(minZoom, Math.min(maxZoom, arrivalCluster.recommendedZoom))
        : Math.min(maxZoom, 11.5);

      const midBaseZoom = (startZoom + targetZoom) / 2;
      const zoomDip = calculateProgressiveZoomDip(distToPrev, midBaseZoom, minZoom);

      // Record flight start with full flight parameters
      keyframes.push({
        t: flightStart,
        center: startCenter,
        zoom: startZoom,
        pitch: 20,
        bearing: 0,
        flight: {
          duration: flightDuration,
          targetCenter,
          targetZoom,
          zoomDip,
          targetPitch: 22,
        },
      });

      // Record flight arrival
      keyframes.push({
        t: ev.t,
        center: targetCenter,
        zoom: targetZoom,
        pitch: 22,
        bearing: 0,
      });

      currentCenter = targetCenter;
      currentZoom = targetZoom;
      lastKeyframeTime = ev.t;
      recentPoints.length = 0;
      recentPoints.push({ coord: ev.coordinates, t: ev.t });
    } else {
      // Local cluster tracking: maintain weighted centroid and gently zoom in
      while (recentPoints.length > 0 && ev.t - recentPoints[0].t > windowDurationSec) {
        recentPoints.shift();
      }
      recentPoints.push({ coord: ev.coordinates, t: ev.t });

      let weightSum = 0;
      let sumLng = 0;
      let sumLat = 0;
      for (let p = 0; p < recentPoints.length; p++) {
        const age = ev.t - recentPoints[p].t;
        const weight = Math.exp(-age / 1.5);
        sumLng += recentPoints[p].coord[0] * weight;
        sumLat += recentPoints[p].coord[1] * weight;
        weightSum += weight;
      }
      currentCenter = [sumLng / weightSum, sumLat / weightSum];
      currentZoom = Math.min(maxZoom, currentZoom + zoomInRate * timeDelta);

      // Only emit keyframe if enough time passed, or if it's a highlight or last point
      if (ev.t - lastKeyframeTime >= 0.35 || ev.isHighlight || i === events.length - 1) {
        keyframes.push({
          t: ev.t,
          center: [currentCenter[0], currentCenter[1]],
          zoom: currentZoom,
          pitch: ev.isHighlight ? 28 : 22,
          bearing: 0,
        });
        lastKeyframeTime = ev.t;
      }
    }
  }

  // Outro hold
  keyframes.push({
    t: totalDuration + 0.5,
    center: currentCenter,
    zoom: currentZoom,
    pitch: 20,
    bearing: 0,
  });

  return keyframes;
}

// Interpolate camera parameters for any arbitrary time t
export function interpolateCamera(keyframes: CameraKeyframe[], t: number): CameraKeyframe {
  if (keyframes.length === 0) {
    return { t, center: [15.47, 49.81], zoom: 7, pitch: 0, bearing: 0 };
  }
  if (t <= keyframes[0].t) {
    return keyframes[0];
  }
  if (t >= keyframes[keyframes.length - 1].t) {
    return keyframes[keyframes.length - 1];
  }

  // Find surrounding keyframe index
  let idx = 0;
  while (idx < keyframes.length - 1 && keyframes[idx + 1].t <= t) {
    idx++;
  }

  const k1 = keyframes[idx];
  const k2 = keyframes[idx + 1];

  // 1. Arc Flight mode: closed-form smootherstep + parabolic bell-curve (100% continuous, zero stepping)
  if (k1.flight && k1.flight.duration > 0) {
    const rawU = (t - k1.t) / k1.flight.duration;
    const u = Math.max(0, Math.min(1, rawU));

    // Ken Perlin's quintic smootherstep: 6u^5 - 15u^4 + 10u^3
    const s = u * u * u * (u * (u * 6 - 15) + 10);

    const startCenter = k1.center;
    const targetCenter = k1.flight.targetCenter;
    const lng = startCenter[0] + (targetCenter[0] - startCenter[0]) * s;
    const lat = startCenter[1] + (targetCenter[1] - startCenter[1]) * s;

    // Parabolic bell curve: 16 * u^2 * (1 - u)^2 = [4u(1-u)]^2
    // Exactly 0 at u=0 and u=1 with zero slope; exactly 1.0 at midpoint u=0.5 with zero slope
    const bell = Math.pow(4 * u * (1 - u), 2);

    const startZoom = k1.zoom;
    const targetZoom = k1.flight.targetZoom;
    const baseZoom = startZoom + (targetZoom - startZoom) * s;
    const zoom = Math.max(2.0, baseZoom - k1.flight.zoomDip * bell);

    const startPitch = k1.pitch;
    const targetPitch = k1.flight.targetPitch;
    const pitchDip = Math.min(10, k1.flight.zoomDip * 2.0);
    const pitch = Math.max(0, startPitch + (targetPitch - startPitch) * s - pitchDip * bell);

    return {
      t,
      center: [lng, lat],
      zoom,
      pitch,
      bearing: 0,
    };
  }

  // 2. Local Tracking mode: Cubic Hermite Spline with Catmull-Rom tangents for continuous C1 motion
  const h = k2.t - k1.t;
  if (h <= 0.0001) {
    return k1;
  }
  const u = (t - k1.t) / h;

  // Tangents at k1
  let v1Lng = 0, v1Lat = 0, v1Zoom = 0, v1Pitch = 0;
  if (idx > 0 && !keyframes[idx - 1].flight) {
    const dtPrev = k2.t - keyframes[idx - 1].t;
    if (dtPrev > 0) {
      v1Lng = (k2.center[0] - keyframes[idx - 1].center[0]) / dtPrev;
      v1Lat = (k2.center[1] - keyframes[idx - 1].center[1]) / dtPrev;
      v1Zoom = (k2.zoom - keyframes[idx - 1].zoom) / dtPrev;
      v1Pitch = (k2.pitch - keyframes[idx - 1].pitch) / dtPrev;
    }
  }

  // Tangents at k2
  let v2Lng = 0, v2Lat = 0, v2Zoom = 0, v2Pitch = 0;
  if (idx + 2 < keyframes.length && !k2.flight) {
    const dtNext = keyframes[idx + 2].t - k1.t;
    if (dtNext > 0) {
      v2Lng = (keyframes[idx + 2].center[0] - k1.center[0]) / dtNext;
      v2Lat = (keyframes[idx + 2].center[1] - k1.center[1]) / dtNext;
      v2Zoom = (keyframes[idx + 2].zoom - k1.zoom) / dtNext;
      v2Pitch = (keyframes[idx + 2].pitch - k1.pitch) / dtNext;
    }
  }

  // Cubic Hermite basis functions
  const h00 = (1 + 2 * u) * (1 - u) * (1 - u);
  const h10 = u * (1 - u) * (1 - u);
  const h01 = u * u * (3 - 2 * u);
  const h11 = u * u * (u - 1);

  const lng = h00 * k1.center[0] + h10 * h * v1Lng + h01 * k2.center[0] + h11 * h * v2Lng;
  const lat = h00 * k1.center[1] + h10 * h * v1Lat + h01 * k2.center[1] + h11 * h * v2Lat;
  const zoom = h00 * k1.zoom + h10 * h * v1Zoom + h01 * k2.zoom + h11 * h * v2Zoom;
  const pitch = h00 * k1.pitch + h10 * h * v1Pitch + h01 * k2.pitch + h11 * h * v2Pitch;

  return {
    t,
    center: [lng, lat],
    zoom,
    pitch,
    bearing: 0,
  };
}
