import { CameraKeyframe, ObsEvent } from '../types/timeline';

export interface CameraDirectorConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomInRate?: number; // How quickly camera zooms in when staying in the same region
  arcFlyDistanceKm?: number; // Threshold distance for pulling back during long transitions
}

export function calculateFlightDuration(distKm: number): number {
  if (distKm < 25) return 0;
  if (distKm < 70) return 1.8;
  if (distKm < 200) return 2.6;
  if (distKm < 500) return 3.2;
  return 3.8; // Long distance or cross-country flights
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
    minZoom = 6.5,
    maxZoom = 13.5,
    zoomInRate = 0.08,
    arcFlyDistanceKm = 40,
  } = config;

  if (events.length === 0) {
    return [
      { t: 0, center: [15.47, 49.81], zoom: 7, pitch: 0, bearing: 0 },
      { t: totalDuration, center: [15.47, 49.81], zoom: 7, pitch: 0, bearing: 0 }
    ];
  }

  // Calculate overall bounds to set a sensible starting and ending view
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const ev of events) {
    const [lng, lat] = ev.coordinates;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const keyframes: CameraKeyframe[] = [];

  // Initial keyframe: slightly pulled back on overall center
  keyframes.push({
    t: 0,
    center: [events[0].coordinates[0], events[0].coordinates[1]],
    zoom: Math.max(minZoom, 8),
    pitch: 20,
    bearing: 0,
  });

  let currentCenter: [number, number] = [events[0].coordinates[0], events[0].coordinates[1]];
  let currentZoom = Math.max(minZoom, 8.5);
  let timeInCurrentRegion = 0;

  // Window of recent points for weighted centroid
  const recentPoints: { coord: [number, number]; t: number }[] = [];
  const windowDurationSec = 3.5;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prevEv = i > 0 ? events[i - 1] : null;

    // Prune old points from centroid window
    while (recentPoints.length > 0 && ev.t - recentPoints[0].t > windowDurationSec) {
      recentPoints.shift();
    }
    recentPoints.push({ coord: ev.coordinates, t: ev.t });

    // Calculate weighted centroid of recent points
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
    const targetCenter: [number, number] = [sumLng / weightSum, sumLat / weightSum];

    // Check distance to previous location
    const distToPrev = prevEv ? calculateDistanceKm(prevEv.coordinates, ev.coordinates) : 0;
    const timeDelta = prevEv ? Math.max(0.01, ev.t - prevEv.t) : 0.5;

    if (distToPrev > arcFlyDistanceKm) {
      // Cinematic arc flight: smooth takeoff, accelerated cruise at high altitude, smooth landing
      const flightDuration = Math.max(1.5, ev.t - (prevEv ? prevEv.t : ev.t - 2.0));
      const flightStart = ev.t - flightDuration;

      const startCenter: [number, number] = [currentCenter[0], currentCenter[1]];
      const startZoom = currentZoom;
      const targetZoom = Math.min(maxZoom, Math.max(minZoom + 2.0, 9.8));

      // Calculate how much we pull back zoom based on distance
      const zoomDip = Math.min(
        startZoom - minZoom,
        Math.max(2.2, Math.log2(distToPrev / 15) * 1.35)
      );

      // Intermediate steps using quintic smootherstep for position and parabolic curve for altitude
      const uSteps = [0.15, 0.35, 0.50, 0.70, 0.88];
      for (const u of uSteps) {
        // Quintic smootherstep s(u) = 6u^5 - 15u^4 + 10u^3 (smooth acceleration & deceleration)
        const s = u * u * u * (u * (u * 6 - 15) + 10);

        const stepLng = startCenter[0] + (targetCenter[0] - startCenter[0]) * s;
        const stepLat = startCenter[1] + (targetCenter[1] - startCenter[1]) * s;

        // Inverted parabolic zoom dip: 4 * u * (1 - u) is 1.0 at midpoint u=0.5
        const stepZoom = startZoom + (targetZoom - startZoom) * s - zoomDip * (4 * u * (1 - u));

        // Pitch flattens to 12 deg at peak altitude, then tilts back up on descent
        const stepPitch = 24 - 12 * (4 * u * (1 - u));

        keyframes.push({
          t: flightStart + flightDuration * u,
          center: [stepLng, stepLat],
          zoom: Math.max(minZoom, stepZoom),
          pitch: Math.max(10, stepPitch),
          bearing: 0,
        });
      }

      // Reset dwell timer
      timeInCurrentRegion = 0;
      currentZoom = targetZoom;
    } else {
      // In same general area: increase dwell time and slowly zoom in
      timeInCurrentRegion += timeDelta;
      currentZoom = Math.min(maxZoom, currentZoom + zoomInRate * timeDelta);
    }

    currentCenter = targetCenter;

    // Add keyframe for observation
    keyframes.push({
      t: ev.t,
      center: [currentCenter[0], currentCenter[1]],
      zoom: currentZoom,
      pitch: ev.isHighlight ? 35 : 25,
      bearing: ev.isHighlight ? 10 : 0,
    });
  }

  // Final keyframe: stay on last center
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

  // Find surrounding keyframes
  let idx = 0;
  while (idx < keyframes.length - 1 && keyframes[idx + 1].t < t) {
    idx++;
  }

  const k1 = keyframes[idx];
  const k2 = keyframes[idx + 1];

  const span = k2.t - k1.t;
  const progress = span > 0 ? (t - k1.t) / span : 0;

  // Smooth cubic ease-in-out
  const ease = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const lng = k1.center[0] + (k2.center[0] - k1.center[0]) * ease;
  const lat = k1.center[1] + (k2.center[1] - k1.center[1]) * ease;
  const zoom = k1.zoom + (k2.zoom - k1.zoom) * ease;
  const pitch = k1.pitch + (k2.pitch - k1.pitch) * ease;
  const bearing = k1.bearing + (k2.bearing - k1.bearing) * ease;

  return {
    t,
    center: [lng, lat],
    zoom,
    pitch,
    bearing,
  };
}
