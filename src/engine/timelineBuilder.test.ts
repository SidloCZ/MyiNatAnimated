import { describe, it, expect } from 'vitest';
import { buildTimeline } from './timelineBuilder';
import { InatObservation } from '../types/inat';

describe('timelineBuilder', () => {
  const createMockObs = (id: number, observedOn: string, createdAt: string, taxonName = 'Formica rufa'): InatObservation => ({
    id,
    uuid: `uuid-${id}`,
    observed_on: observedOn,
    time_observed_at: `${observedOn}T10:00:00Z`,
    created_at: `${createdAt}T12:00:00Z`,
    geojson: { type: 'Point', coordinates: [14.4 + id * 0.01, 50.0 + id * 0.01] },
    faves_count: 0,
    comments_count: 0,
    identifications_count: 1,
    quality_grade: 'casual',
    photos: [],
    taxon: {
      id: 100,
      name: taxonName,
      rank: 'species',
      iconic_taxon_name: 'Insecta',
    },
  });

  it('respects sequenceType for observed date vs created date', () => {
    // obs1: observed late (May 20), created early (May 1)
    const obs1 = createMockObs(1, '2024-05-20', '2024-05-01');
    // obs2: observed early (May 10), created late (May 15)
    const obs2 = createMockObs(2, '2024-05-10', '2024-05-15');

    // 1. Observed order: obs2 comes first
    const tlObserved = buildTimeline([obs1, obs2], { sequenceType: 'observed' });
    expect(tlObserved.events[0].id).toBe(2);
    expect(tlObserved.events[1].id).toBe(1);

    // 2. Created order: obs1 comes first
    const tlCreated = buildTimeline([obs1, obs2], { sequenceType: 'created' });
    expect(tlCreated.events[0].id).toBe(1);
    expect(tlCreated.events[1].id).toBe(2);
  });

  it('throttles flying SVG icons when identical taxa repeat in short sequence', () => {
    const list: InatObservation[] = [];
    for (let i = 1; i <= 6; i++) {
      list.push(createMockObs(i, `2024-05-0${i}`, `2024-05-0${i}`, 'Formica rufa'));
    }

    const tl = buildTimeline(list, { targetDurationSeconds: 15 });
    // Point 1 should fly (first sighting)
    expect(tl.events[0].shouldFlyIcon).toBe(true);

    // Points 2, 3, 4 of identical taxon should be throttled
    expect(tl.events[1].shouldFlyIcon).toBe(false);
    expect(tl.events[2].shouldFlyIcon).toBe(false);
    expect(tl.events[3].shouldFlyIcon).toBe(false);

    // Point 5 or 6 (5th sighting of identical taxon) should fly
    const flyingCount = tl.events.filter(e => e.shouldFlyIcon).length;
    // Out of 6 consecutive identical points, at most 2 should fly (reduction by ~67%)
    expect(flyingCount).toBeLessThanOrEqual(2);
  });

  it('filters isolated distant observations when filterIsolated is enabled', () => {
    // 5 in Prague
    const list: InatObservation[] = [];
    for (let i = 1; i <= 5; i++) {
      list.push(createMockObs(i, `2024-05-0${i}`, `2024-05-0${i}`));
    }
    // 1 isolated in Paris (~880 km away)
    const parisObs: InatObservation = {
      ...createMockObs(99, '2024-05-06', '2024-05-06'),
      geojson: { type: 'Point', coordinates: [2.35, 48.85] },
    };
    list.push(parisObs);
    // 5 more in Prague
    for (let i = 7; i <= 11; i++) {
      list.push(createMockObs(i, `2024-05-${i < 10 ? '0' + i : i}`, `2024-05-${i < 10 ? '0' + i : i}`));
    }

    // Default: filterIsolated is false
    const tlDefault = buildTimeline(list);
    expect(tlDefault.events).toHaveLength(11);
    expect(tlDefault.events.some(e => e.id === 99)).toBe(true);

    // Enabled: filterIsolated is true
    const tlFiltered = buildTimeline(list, { filterIsolated: true });
    expect(tlFiltered.events).toHaveLength(10);
    expect(tlFiltered.events.some(e => e.id === 99)).toBe(false);
  });
});

