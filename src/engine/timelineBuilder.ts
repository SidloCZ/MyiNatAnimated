import { InatObservation } from '../types/inat';
import { TimelineData, ObsEvent, SoundCue } from '../types/timeline';
import { getTaxonVisuals } from '../assets/icons/taxaIcons';
import { generateCameraKeyframes, calculateDistanceKm, calculateFlightDuration } from './cameraDirector';

export interface TimelineBuilderOptions {
  targetDurationSeconds?: number;
  highlightPauseSeconds?: number;
  selectedHighlightIds?: Set<number>;
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
  } = options;

  if (observations.length === 0) {
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

  // 1. Gather timestamps
  const parsed = observations.map(obs => {
    const rawTime = obs.time_observed_at || obs.observed_on || obs.created_at;
    const timeMs = new Date(rawTime).getTime() || 0;
    return { obs, timeMs };
  });

  const realStartDate = observations[0].observed_on || '';
  const realEndDate = observations[observations.length - 1].observed_on || '';

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

    // 3. Generate smooth camera keyframes
    const cameraKeyframes = generateCameraKeyframes(events, finalDuration);

    return {
      duration: finalDuration,
      realStartDate,
      realEndDate,
      events,
      cameraKeyframes,
      soundCues,
      stats: {
        totalObservations: observations.length,
        totalSpecies: speciesSet.size,
        totalPhotos,
        totalFaves,
        totalComments,
      }
    };
  }

