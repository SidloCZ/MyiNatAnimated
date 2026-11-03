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

/**
 * Vypočítá doporučený počet předvybraných highlightů pro animaci a maximální
 * velikost nabídky (kandidátů k výběru) na základě celkového počtu pozorování.
 *
 * Progresivní křivka (sublineární mocninná f(N) = 0.38 * N^0.62):
 *  - 1–10 pozorování:   1–2 highlighty (nabídka 1–5)
 *  - 20 pozorování:     2 highlighty (nabídka 7)
 *  - 50 pozorování:     4 highlighty (nabídka 11)
 *  - 100 pozorování:    7 highlightů (nabídka 16)
 *  - 250 pozorování:    12 highlightů (nabídka 25)
 *  - 500 pozorování:    18 highlightů (nabídka 36)
 *  - 1 000 pozorování:  28 highlightů (nabídka 50)
 *  - 2 500 pozorování:  48 highlightů (nabídka 86)
 */
export function getRecommendedHighlightCounts(totalObservations: number): {
  recommendedCount: number;
  maxPoolSize: number;
} {
  if (totalObservations <= 0) {
    return { recommendedCount: 0, maxPoolSize: 0 };
  }
  if (totalObservations === 1) {
    return { recommendedCount: 1, maxPoolSize: 1 };
  }

  // Cílový doporučený počet vybraných highlightů pro plynulou animaci
  const rawTarget = Math.round(0.38 * Math.pow(totalObservations, 0.62));
  const recommendedCount = Math.max(1, Math.min(totalObservations, rawTarget));

  // Velikost nabídky pro uživatelský výběr v mřížce (kandidátský pool)
  const rawPool = Math.round(Math.max(recommendedCount * 1.8, Math.sqrt(totalObservations) * 1.6));
  const maxPoolSize = Math.max(recommendedCount, Math.min(totalObservations, rawPool));

  return { recommendedCount, maxPoolSize };
}

export function pickSuggestedHighlights(observations: InatObservation[], maxHighlights?: number): HighlightItem[] {
  if (observations.length === 0) return [];

  const limit = maxHighlights !== undefined
    ? maxHighlights
    : getRecommendedHighlightCounts(observations.length).maxPoolSize;

  // Všechna pozorování (včetně zvukových) jsou rovnocenně ohodnocena
  const scored: HighlightItem[] = observations.map(obs => ({
    observation: obs,
    score: calculateObservationScore(obs),
  }));

  if (scored.length <= limit) {
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

  // Výběr nejvýznamnějších pozorování až do limitu
  const selected = scored.slice(0, limit);

  // Výsledné highlighty seřadíme chronologicky pro timeline animace
  return selected.sort((a, b) => {
    const timeA = new Date(a.observation.observed_on || a.observation.created_at).getTime();
    const timeB = new Date(b.observation.observed_on || b.observation.created_at).getTime();
    return timeA - timeB;
  });
}
