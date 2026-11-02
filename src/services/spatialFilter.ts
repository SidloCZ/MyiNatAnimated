import { InatObservation } from '../types/inat';
import { calculateDistanceKm } from '../engine/cameraDirector';

export interface SpatialFilterOptions {
  sequenceType?: 'observed' | 'created';
  minDistanceKm?: number; // default: 150 km
  maxClusterSize?: number; // default: 2 observations
}

/**
 * Extracts [lng, lat] coordinates from an observation if valid and non-obscured/present.
 */
export function getObservationCoords(obs: InatObservation): [number, number] | null {
  if (obs.geojson?.coordinates && Array.isArray(obs.geojson.coordinates) && obs.geojson.coordinates.length >= 2) {
    const [lng, lat] = obs.geojson.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
      return [lng, lat];
    }
  }

  if (obs.location && typeof obs.location === 'string') {
    const parts = obs.location.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lng, lat];
      }
    }
  }

  return null;
}

/**
 * Identifies isolated distant observations in the chronological sequence.
 * An observation or small group (<= maxClusterSize, default 2) is considered isolated
 * if it is separated from the rest of the sequence by >= minDistanceKm (default 150 km),
 * and the dataset contains a larger primary body of observations (>= 3).
 *
 * Returns a Set of observation IDs to omit.
 */
export function findIsolatedObservationIds(
  observations: InatObservation[],
  options: SpatialFilterOptions = {}
): Set<number> {
  const {
    sequenceType = 'observed',
    minDistanceKm = 150,
    maxClusterSize = 2,
  } = options;

  if (observations.length <= maxClusterSize) {
    return new Set<number>();
  }

  // 1. Sort observations according to the chosen timeline sequence
  const items = observations.map((obs, originalIndex) => {
    let rawTime = obs.time_observed_at || obs.observed_on || obs.created_at;
    if (sequenceType === 'created') {
      rawTime = obs.created_at || rawTime;
    }
    const timeMs = new Date(rawTime).getTime() || 0;
    return { obs, timeMs, originalIndex };
  });

  items.sort((a, b) => a.timeMs - b.timeMs || a.originalIndex - b.originalIndex);

  // 2. Extract coordinates for all items
  const coordsList = items.map(item => getObservationCoords(item.obs));

  // 3. Segment items into contiguous runs separated by >= minDistanceKm
  interface Segment {
    startIndex: number;
    endIndex: number;
    items: typeof items;
  }

  const segments: Segment[] = [];
  let currentSegment: typeof items = [items[0]];
  let currentStart = 0;
  let lastValidCoords = coordsList[0];

  for (let i = 1; i < items.length; i++) {
    const currCoords = coordsList[i];
    let isDistant = false;

    if (lastValidCoords && currCoords) {
      const dist = calculateDistanceKm(lastValidCoords, currCoords);
      if (dist >= minDistanceKm) {
        isDistant = true;
      }
    }

    if (isDistant) {
      segments.push({
        startIndex: currentStart,
        endIndex: i - 1,
        items: currentSegment,
      });
      currentSegment = [items[i]];
      currentStart = i;
    } else {
      currentSegment.push(items[i]);
    }

    if (currCoords) {
      lastValidCoords = currCoords;
    }
  }

  if (currentSegment.length > 0) {
    segments.push({
      startIndex: currentStart,
      endIndex: items.length - 1,
      items: currentSegment,
    });
  }

  // If there are no distant jumps in the entire sequence, nothing to filter
  if (segments.length <= 1) {
    return new Set<number>();
  }

  // 4. Verify that there is at least one primary cluster with > maxClusterSize observations
  const maxSegmentSize = Math.max(...segments.map(s => s.items.length));
  if (maxSegmentSize <= maxClusterSize) {
    // All segments are small (e.g. road trip of stops with 1-2 points each). Do not filter out the journey.
    return new Set<number>();
  }

  // 5. Identify isolated segments (size <= maxClusterSize)
  const candidateIds = new Set<number>();

  for (let k = 0; k < segments.length; k++) {
    const seg = segments[k];
    if (seg.items.length > maxClusterSize) {
      continue;
    }

    // Only filter if the segment actually has valid coordinates that made it distant
    const hasCoords = seg.items.some(item => getObservationCoords(item.obs) !== null);
    if (!hasCoords) {
      continue;
    }

    let isIsolated = false;

    if (k > 0 && k < segments.length - 1) {
      // Detour in the middle of the timeline: jump in >= minDistanceKm AND jump out >= minDistanceKm
      isIsolated = true;
    } else if (k === 0) {
      // Small cluster at the very beginning of the animation, far from the rest
      const remainingCount = items.length - seg.items.length;
      if (remainingCount >= 3) {
        isIsolated = true;
      }
    } else if (k === segments.length - 1) {
      // Small cluster at the very end of the animation, far from the rest
      const precedingCount = items.length - seg.items.length;
      if (precedingCount >= 3) {
        isIsolated = true;
      }
    }

    if (isIsolated) {
      for (const item of seg.items) {
        candidateIds.add(item.obs.id);
      }
    }
  }

  // Safety check: ensure we never wipe out all observations or leave fewer than 2
  const remainingCount = observations.length - candidateIds.size;
  if (candidateIds.size >= observations.length || remainingCount < 2) {
    return new Set<number>();
  }

  return candidateIds;
}

/**
 * Returns observations with isolated distant points removed.
 */
export function filterIsolatedObservations(
  observations: InatObservation[],
  options: SpatialFilterOptions = {}
): InatObservation[] {
  const isolatedIds = findIsolatedObservationIds(observations, options);
  if (isolatedIds.size === 0) {
    return observations;
  }
  const filtered = observations.filter(obs => !isolatedIds.has(obs.id));
  return filtered.length >= 2 ? filtered : observations;
}

