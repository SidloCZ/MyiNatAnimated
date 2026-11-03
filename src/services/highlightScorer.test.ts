import { describe, it, expect } from 'vitest';
import { calculateObservationScore, pickSuggestedHighlights } from './highlightScorer';
import { InatObservation } from '../types/inat';

describe('highlightScorer', () => {
  it('correctly calculates observation score based solely on faves, comments and research grade', () => {
    const obs: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 4,
      comments_count: 2,
      identifications_count: 2,
      quality_grade: 'research',
      photos: [],
      taxon: {
        id: 10,
        name: 'Formica rufa',
        rank: 'species',
        preferred_common_name: 'Mravenec lesní',
      },
    };

    // score = (4 * 3) + (2 * 2) + 2 (research) = 12 + 4 + 2 = 18
    // No bonus for photo, no bonus for common name
    const score = calculateObservationScore(obs);
    expect(score).toBe(18);
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
    // Both high-scoring observations from the same day must be included over the distant low-scoring one
    const ids = highlights.map(h => h.observation.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });
});
