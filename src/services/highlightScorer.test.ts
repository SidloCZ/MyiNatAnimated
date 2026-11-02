import { describe, it, expect } from 'vitest';
import { calculateObservationScore, pickSuggestedHighlights } from './highlightScorer';
import { InatObservation } from '../types/inat';

describe('highlightScorer', () => {
  it('correctly calculates observation score', () => {
    const obs: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 4,
      comments_count: 2,
      identifications_count: 2,
      quality_grade: 'research',
      photos: [{ id: 1, url: 'https://example.com/p1.jpg' }],
      taxon: {
        id: 10,
        name: 'Formica rufa',
        rank: 'species',
        preferred_common_name: 'Mravenec lesní',
      },
    };

    // score = (4 * 3) + (2 * 2) + 2 (research) + 3 (photos) + 1 (common name) = 12 + 4 + 2 + 3 + 1 = 22
    const score = calculateObservationScore(obs);
    expect(score).toBe(22);
  });

  it('selects and sorts top suggested highlights', () => {
    const obs1: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-01',
      created_at: '2024-05-01',
      faves_count: 1,
      comments_count: 0,
      identifications_count: 1,
      quality_grade: 'casual',
      photos: [{ id: 1, url: 'p1' }],
    };

    const obs2: InatObservation = {
      id: 2,
      uuid: 'uuid-2',
      observed_on: '2024-05-05',
      created_at: '2024-05-05',
      faves_count: 10,
      comments_count: 3,
      identifications_count: 2,
      quality_grade: 'research',
      photos: [{ id: 2, url: 'p2' }],
    };

    const highlights = pickSuggestedHighlights([obs1, obs2], 2);
    expect(highlights.length).toBe(2);
    // Chronologically sorted in return value
    expect(highlights[0].observation.id).toBe(1);
    expect(highlights[1].observation.id).toBe(2);
    expect(highlights[1].score).toBeGreaterThan(highlights[0].score);
  });
});

