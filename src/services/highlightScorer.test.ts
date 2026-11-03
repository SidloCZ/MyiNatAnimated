import { describe, it, expect } from 'vitest';
import { calculateObservationScore, pickSuggestedHighlights, getRecommendedHighlightCounts } from './highlightScorer';
import { InatObservation } from '../types/inat';

describe('highlightScorer', () => {
  it('correctly calculates observation score based solely on faves, comments, identifications and research grade', () => {
    const obs: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 4,
      comments_count: 2,
      identifications_count: 5, // 5 identifications: 5 - 2 = 3 * 0.5 = 1.5 points
      quality_grade: 'research',
      photos: [],
      taxon: {
        id: 10,
        name: 'Formica rufa',
        rank: 'species',
        preferred_common_name: 'Mravenec lesní',
      },
    };

    // score = (4 * 3) + (2 * 2) + ((5 - 2) * 0.5) + 2 (research) = 12 + 4 + 1.5 + 2 = 19.5
    const score = calculateObservationScore(obs);
    expect(score).toBe(19.5);
  });

  it('does not give identification bonus for 2 or fewer identifications', () => {
    const obs: InatObservation = {
      id: 2,
      uuid: 'uuid-2',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 1,
      comments_count: 0,
      identifications_count: 2, // 2 is base, no bonus
      quality_grade: 'casual',
      photos: [],
    };

    // score = (1 * 3) + 0 + 0 = 3
    expect(calculateObservationScore(obs)).toBe(3);
  });

  it('includes observations without photos as highlights', () => {
    const soundObs: InatObservation = {
      id: 1,
      uuid: 'uuid-sound',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 10,
      comments_count: 5,
      identifications_count: 1,
      quality_grade: 'casual',
      photos: [], // sound recording without photos
    };

    const photoObs: InatObservation = {
      id: 2,
      uuid: 'uuid-photo',
      observed_on: '2024-05-02',
      created_at: '2024-05-02',
      faves_count: 1,
      comments_count: 0,
      identifications_count: 1,
      quality_grade: 'research',
      photos: [{ id: 1, url: 'https://example.com/p1.jpg' }],
    };

    const highlights = pickSuggestedHighlights([soundObs, photoObs], 1);
    expect(highlights.length).toBe(1);
    // Sound observation with high community engagement is selected
    expect(highlights[0].observation.id).toBe(1);
  });

  it('selects up to 12 top highlights and prioritizes items with favorites or comments', () => {
    const observations: InatObservation[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      uuid: `uuid-${i + 1}`,
      observed_on: `2024-05-${String(i + 1).padStart(2, '0')}`,
      created_at: `2024-05-${String(i + 1).padStart(2, '0')}`,
      faves_count: i < 12 ? (12 - i) : 0,
      comments_count: i === 0 ? 3 : 0,
      identifications_count: 2,
      quality_grade: 'casual',
      photos: [],
    }));

    const highlights = pickSuggestedHighlights(observations, 12);
    expect(highlights.length).toBe(12);
    // The top 12 with favorites are selected
    expect(highlights.every(h => h.observation.faves_count > 0)).toBe(true);
  });

  it('selects top highlights without artificial 24h separation', () => {
    // Both observations happened on the very same day
    const obs1: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-01T10:00:00',
      created_at: '2024-05-01T10:00:00',
      faves_count: 8,
      comments_count: 4,
      identifications_count: 2,
      quality_grade: 'research',
      photos: [],
    };

    const obs2: InatObservation = {
      id: 2,
      uuid: 'uuid-2',
      observed_on: '2024-05-01T11:00:00',
      created_at: '2024-05-01T11:00:00',
      faves_count: 12,
      comments_count: 6,
      identifications_count: 3,
      quality_grade: 'research',
      photos: [],
    };

    const obsLow: InatObservation = {
      id: 3,
      uuid: 'uuid-3',
      observed_on: '2024-05-15T12:00:00',
      created_at: '2024-05-15T12:00:00',
      faves_count: 0,
      comments_count: 0,
      identifications_count: 1,
      quality_grade: 'casual',
      photos: [],
    };

    const highlights = pickSuggestedHighlights([obs1, obs2, obsLow], 2);
    expect(highlights.length).toBe(2);
    const ids = highlights.map(h => h.observation.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  describe('getRecommendedHighlightCounts', () => {
    it('returns zero for 0 or negative observations', () => {
      expect(getRecommendedHighlightCounts(0)).toEqual({ recommendedCount: 0, maxPoolSize: 0 });
      expect(getRecommendedHighlightCounts(-5)).toEqual({ recommendedCount: 0, maxPoolSize: 0 });
    });

    it('scales progressively based on observation counts', () => {
      // 1 observation: minimum 1
      const count1 = getRecommendedHighlightCounts(1);
      expect(count1.recommendedCount).toBe(1);
      expect(count1.maxPoolSize).toBe(1);

      // 10 observations: 1-2 highlights
      const count10 = getRecommendedHighlightCounts(10);
      expect(count10.recommendedCount).toBeGreaterThanOrEqual(1);
      expect(count10.recommendedCount).toBeLessThanOrEqual(2);
      expect(count10.maxPoolSize).toBeGreaterThanOrEqual(count10.recommendedCount);

      // 20 observations: exactly 2 highlights as requested
      const count20 = getRecommendedHighlightCounts(20);
      expect(count20.recommendedCount).toBe(2);
      expect(count20.maxPoolSize).toBeGreaterThan(count20.recommendedCount);

      // 100 observations: 5-8 highlights (e.g. 7)
      const count100 = getRecommendedHighlightCounts(100);
      expect(count100.recommendedCount).toBeGreaterThanOrEqual(5);
      expect(count100.recommendedCount).toBeLessThanOrEqual(8);
      expect(count100.maxPoolSize).toBeGreaterThan(count100.recommendedCount);

      // 500 observations: 15-20 highlights
      const count500 = getRecommendedHighlightCounts(500);
      expect(count500.recommendedCount).toBeGreaterThanOrEqual(15);
      expect(count500.recommendedCount).toBeLessThanOrEqual(22);

      // 1000 observations: ~25-30 highlights
      const count1000 = getRecommendedHighlightCounts(1000);
      expect(count1000.recommendedCount).toBeGreaterThanOrEqual(25);
      expect(count1000.recommendedCount).toBeLessThanOrEqual(32);
    });
  });
});
