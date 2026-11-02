import { InatObservation } from '../types/inat';
import { TimelineData, ObsEvent, SoundCue } from '../types/timeline';
import { getTaxonVisuals } from '../assets/icons/taxaIcons';
import { generateCameraKeyframes, calculateDistanceKm, calculateFlightDuration } from './cameraDirector';
import { filterIsolatedObservations } from '../services/spatialFilter';

export interface TimelineBuilderOptions {
  targetDurationSeconds?: number;
  highlightPauseSeconds?: number;
  selectedHighlightIds?: Set<number>;
  sequenceType?: 'observed' | 'created';
  filterIsolated?: boolean;
  isolatedDistanceKm?: number;
}

// Pentatonic scale frequencies in Hz (C major pentatonic across 3 octaves)
const PENTATONIC_SCALE = [
  261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
  523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
  1046.50, 1174.66, 1318.51               // C6, D6, E6
];

export function buildTimeline(
  observations: InatObservation[],
  options: TimelineBuilderOptions = {}
): TimelineData {
  const {
    targetDurationSeconds = 30,
    highlightPauseSeconds = 1.8,
    selectedHighlightIds = new Set<number>(),
    sequenceType = 'observed',
    filterIsolated = false,
    isolatedDistanceKm = 150,
  } = options;

    const effectiveObservations = filterIsolated
      ? filterIsolatedObservations(observations, { sequenceType, minDistanceKm: isolatedDistanceKm })
      : observations;

    if (effectiveObservations.length === 0) {
      return {
        duration: 5,
        realStartDate: '',
        realEndDate: '',
        events: [],
        cameraKeyframes: [],
        soundCues: [],
        stats: {
          totalObservations: 0,
          totalSpecies: 0,
          totalPhotos: 0,
          totalFaves: 0,
          totalComments: 0,
        }
      };
    }

    // 1. Gather timestamps and sort by selected sequence
      const parsed = effectiveObservations.map(obs => {
        let rawTime = obs.time_observed_at || obs.observed_on || obs.created_at;
        if (sequenceType === 'created') {
          rawTime = obs.created_at || rawTime;
        }
        const timeMs = new Date(rawTime).getTime() || 0;
        return { obs, timeMs };
      });

      parsed.sort((a, b) => a.timeMs - b.timeMs);

      const realStartDate = parsed[0].obs.observed_on || parsed[0].obs.created_at || '';
      const realEndDate = parsed[parsed.length - 1].obs.observed_on || parsed[parsed.length - 1].obs.created_at || '';

      // Stats calculation
      const speciesSet = new Set<string>();
      let totalPhotos = 0;
      let totalFaves = 0;
      let totalComments = 0;

      for (const { obs } of parsed) {
        if (obs.taxon?.name) speciesSet.add(obs.taxon.name);
        totalPhotos += (obs.photos?.length || 0);
        totalFaves += (obs.faves_count || 0);
        totalComments += (obs.comments_count || 0);
      }

      // 2. Non-linear time distribution
      // We want to allocate a budget for normal points + highlight pauses
      const highlightCount = parsed.filter(p => selectedHighlightIds.has(p.obs.id)).length;
      const highlightBudget = highlightCount * highlightPauseSeconds;
      const normalBudget = Math.max(8, targetDurationSeconds - highlightBudget);

      const stepSec = normalBudget / Math.max(1, parsed.length);
      const minStep = 0.08;
      const maxStep = 0.65;
      const actualStep = Math.min(maxStep, Math.max(minStep, stepSec));

      let currentAnimTime = 0.5; // Start at 0.5s for initial camera settle
      const events: ObsEvent[] = [];
      const soundCues: SoundCue[] = [];

      let lastSoundTime = -1;
      const minSoundInterval = 0.09; // Don't overwhelm audio if hundreds of points

      // Throttle flying SVG icons (~2/3 fewer, 1 per 5 for identical taxa)
      const lastFlownTaxonTime: Record<string, number> = {};
      const countSinceLastFlown: Record<string, number> = {};
      let lastAnyIconTime = -1;

      for (let i = 0; i < parsed.length; i++) {
        const { obs } = parsed[i];
        const prev = i > 0 ? parsed[i - 1] : null;

        const isHighlight = selectedHighlightIds.has(obs.id);
        const coords: [number, number] = obs.geojson?.coordinates || [15.47, 49.81];
        const visuals = getTaxonVisuals(obs.taxon?.iconic_taxon_name, obs.taxon);

        // If distant jump, allocate smooth flight time and schedule whoosh sound
        if (prev && prev.obs.geojson?.coordinates) {
          const dist = calculateDistanceKm(prev.obs.geojson.coordinates, coords);
          const flightDuration = calculateFlightDuration(dist);
          if (flightDuration > 0) {
            currentAnimTime += flightDuration;
            // Whoosh sound plays at peak cruise altitude / midpoint
            soundCues.push({
              t: currentAnimTime - flightDuration * 0.5,
              type: 'whoosh',
              gain: 0.3,
            });
          }
        }

        const eventTime = currentAnimTime;

        // Determine if flying SVG icon should appear (about 2/3 fewer to prevent spam)
        const taxonKey = (obs.taxon?.rank === 'order' ? obs.taxon.name : obs.taxon?.iconic_taxon_name || 'unknown').toLowerCase();
        const count = (countSinceLastFlown[taxonKey] || 0) + 1;
        countSinceLastFlown[taxonKey] = count;

        const timeSinceSame = eventTime - (lastFlownTaxonTime[taxonKey] ?? -999);
        const timeSinceAny = eventTime - lastAnyIconTime;

        let shouldFlyIcon = false;
        if (isHighlight) {
          shouldFlyIcon = true;
        } else if (timeSinceAny >= 0.45) {
          if (count >= 5 || timeSinceSame >= 2.5) {
            shouldFlyIcon = true;
          }
        }

        if (shouldFlyIcon) {
          lastFlownTaxonTime[taxonKey] = eventTime;
          countSinceLastFlown[taxonKey] = 0;
          lastAnyIconTime = eventTime;
        }

        events.push({
          id: obs.id,
          t: eventTime,
          observation: obs,
          coordinates: coords,
          iconicTaxon: obs.taxon?.iconic_taxon_name || 'unknown',
          orderName: obs.taxon?.rank === 'order' ? obs.taxon.name : undefined,
          color: visuals.color,
          favesCount: obs.faves_count || 0,
          commentsCount: obs.comments_count || 0,
          isHighlight,
          shouldFlyIcon,
        });

        // Sound cues
        if (isHighlight) {
          soundCues.push({
            t: eventTime,
            type: 'highlight',
            gain: 0.6,
          });
          currentAnimTime += highlightPauseSeconds;
        } else {
          if (eventTime - lastSoundTime >= minSoundInterval) {
            const pitchIndex = (i * 2 + (obs.faves_count || 0)) % PENTATONIC_SCALE.length;
            soundCues.push({
              t: eventTime,
              type: 'pop',
              pitchFrequency: PENTATONIC_SCALE[pitchIndex],
              gain: 0.35,
            });
            lastSoundTime = eventTime;
          }

          // If observation has likes, trigger star sound
          if ((obs.faves_count || 0) > 0) {
            soundCues.push({
              t: eventTime + 0.12,
              type: 'star',
              pitchFrequency: 880,
              gain: 0.2,
            });
          }

          // If observation has comments, trigger bubble sound
          if ((obs.comments_count || 0) > 0) {
            soundCues.push({
              t: eventTime + 0.18,
              type: 'bubble',
              pitchFrequency: 440,
              gain: 0.25,
            });
          }

          currentAnimTime += actualStep;
        }
      }

      const finalDuration = currentAnimTime + 2.0; // 2s outro hold

      // 3. Precompute cumulative counts and date for O(log N) live playback querying
      const seenSpecies = new Set<string>();
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.observation.taxon?.name) {
          seenSpecies.add(ev.observation.taxon.name);
        }
        ev.cumObsCount = i + 1;
        ev.cumSpeciesCount = seenSpecies.size;
        ev.dateStr = ev.observation.observed_on || ev.observation.time_observed_at || ev.observation.created_at || '';
      }

      // 4. Generate smooth camera keyframes
      const cameraKeyframes = generateCameraKeyframes(events, finalDuration);

      return {
        duration: finalDuration,
        realStartDate,
        realEndDate,
        events,
        cameraKeyframes,
        soundCues,
        stats: {
          totalObservations: effectiveObservations.length,
          totalSpecies: speciesSet.size,
          totalPhotos,
          totalFaves,
          totalComments,
        }
      };
    }

/**
 * Binary search to find live playback statistics (observation count, species count, date)
 * at any animation time t in O(log N).
 */
export function getPlaybackStatsAtTime(
  events: ObsEvent[],
  t: number
): { obsCount: number; speciesCount: number; dateStr: string } {
  if (events.length === 0) {
    return { obsCount: 0, speciesCount: 0, dateStr: '' };
  }

  if (t < events[0].t) {
    return {
      obsCount: 0,
      speciesCount: 0,
      dateStr: events[0].dateStr || events[0].observation.observed_on || '',
    };
  }

  const last = events[events.length - 1];
  if (t >= last.t) {
    return {
      obsCount: last.cumObsCount || events.length,
      speciesCount: last.cumSpeciesCount || 0,
      dateStr: last.dateStr || last.observation.observed_on || '',
    };
  }

  let low = 0;
  let high = events.length - 1;
  let best = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (events[mid].t <= t) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const ev = events[best];
  return {
    obsCount: ev.cumObsCount || (best + 1),
    speciesCount: ev.cumSpeciesCount || 0,
    dateStr: ev.dateStr || ev.observation.observed_on || '',
  };
}

/**
 * Formats an ISO / YYYY-MM-DD date string into Czech microtypographic format (e.g. 15. 5. 2024).
 * Uses regex extraction to prevent UTC/local timezone day shifts.
 */
export function formatCzechDate(dateStr?: string): string {
  if (!dateStr) return '';

  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return `${day}.\u00A0${month}.\u00A0${year}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}.\u00A0${month}.\u00A0${year}`;
  }

  return dateStr;
}

