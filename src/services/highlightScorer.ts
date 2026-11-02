import { InatObservation, HighlightItem } from '../types/inat';

export function calculateObservationScore(obs: InatObservation): number {
  let score = 0;
  score += (obs.faves_count || 0) * 3;
  score += (obs.comments_count || 0) * 2;
  if (obs.quality_grade === 'research') score += 2;
  if (obs.photos && obs.photos.length > 0) score += 3;
  if (obs.taxon?.preferred_common_name) score += 1;
  return score;
}

export function pickSuggestedHighlights(observations: InatObservation[], maxHighlights = 8): HighlightItem[] {
  if (observations.length === 0) return [];

  // Calculate scores for all with photos
  const scored: HighlightItem[] = observations
    .filter(obs => obs.photos && obs.photos.length > 0)
    .map(obs => ({
      observation: obs,
      score: calculateObservationScore(obs),
    }));

  if (scored.length <= maxHighlights) {
    return scored.sort((a, b) => {
      const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
      const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
      return timeA - timeB;
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Time distributed selection: pick the very best first, then diversify across time
  const selected: HighlightItem[] = [];
  const minTimeDiffMs = 24 * 60 * 60 * 1000; // at least 1 day between automatic highlights if possible

  // Always include top 2
  for (const item of scored) {
    if (selected.length >= maxHighlights) break;

    const itemTime = new Date(item.observation.observed_on || item.observation.created_at).getTime();
    const isTooClose = selected.some(s => {
      const sTime = new Date(s.observation.observed_on || s.observation.created_at).getTime();
      return Math.abs(sTime - itemTime) < minTimeDiffMs;
    });

    if (!isTooClose || selected.length < 3) {
      selected.push(item);
    }
  }

  // Fill up if still room
  for (const item of scored) {
    if (selected.length >= maxHighlights) break;
    if (!selected.some(s => s.observation.id === item.observation.id)) {
      selected.push(item);
    }
  }

  // Sort selected items chronologically by observation date
  return selected.sort((a, b) => {
    const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
    const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
    return timeA - timeB;
  });
}
