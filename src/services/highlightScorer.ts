import { InatObservation, HighlightItem } from '../types/inat';

export function calculateObservationScore(obs: InatObservation): number {
  let score = 0;
  // Počty oblíbení (hvězdičky) a komentáře od komunity
  score += (obs.faves_count || 0) * 3;
  score += (obs.comments_count || 0) * 2;

  // Počet potvrzení určení nad základní 2, každé za 0,5 bodu
  const idCount = obs.identifications_count || 0;
  if (idCount > 2) {
    score += (idCount - 2) * 0.5;
  }

  // Drobný bonus za potvrzenou vědeckou kvalitu (Research Grade)
  if (obs.quality_grade === 'research') {
    score += 2;
  }

  return score;
}

export function pickSuggestedHighlights(observations: InatObservation[], maxHighlights = 12): HighlightItem[] {
  if (observations.length === 0) return [];

  // Všechna pozorování (včetně zvukových) jsou rovnocenně ohodnocena
  const scored: HighlightItem[] = observations.map(obs => ({
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

  // Seřazení: přednostně pozorování s alespoň jedním oblíbením či komentářem, následně podle skóre
  scored.sort((a, b) => {
    const hasEngagementA = (a.observation.faves_count || 0) > 0 || (a.observation.comments_count || 0) > 0;
    const hasEngagementB = (b.observation.faves_count || 0) > 0 || (b.observation.comments_count || 0) > 0;
    if (hasEngagementA !== hasEngagementB) {
      return hasEngagementA ? -1 : 1;
    }
    return b.score - a.score;
  });

  // Výběr nejvýznamnějších pozorování (až do maxHighlights, výchozí 12)
  const selected = scored.slice(0, maxHighlights);

  // Výsledné highlighty seřadíme chronologicky pro timeline animace
  return selected.sort((a, b) => {
    const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
    const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
    return timeA - timeB;
  });
}
