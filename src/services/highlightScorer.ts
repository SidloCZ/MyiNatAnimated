import { InatObservation, HighlightItem } from '../types/inat';

export function calculateObservationScore(obs: InatObservation): number {
  let score = 0;
  // Počty oblíbení (hvězdičky) a komentáře od komunity
  score += (obs.faves_count || 0) * 3;
  score += (obs.comments_count || 0) * 2;
  // Drobný bonus za potvrzenou vědeckou kvalitu (Research Grade)
  if (obs.quality_grade === 'research') {
    score += 2;
  }
  return score;
}

export function pickSuggestedHighlights(observations: InatObservation[], maxHighlights = 8): HighlightItem[] {
  if (observations.length === 0) return [];

  // Všechna pozorování (včetně zvuků a bez fotografií) jsou rovnocenně bodována
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

  // Seřazení čistě sestupně podle skóre
  scored.sort((a, b) => b.score - a.score);

  // Výběr nejlepších pozorování čistě podle jejich bodového významu
  const selected = scored.slice(0, maxHighlights);

  // Výsledné highlighty seřadíme chronologicky pro plynulé přehrávání na časové ose
  return selected.sort((a, b) => {
    const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
    const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
    return timeA - timeB;
  });
}
