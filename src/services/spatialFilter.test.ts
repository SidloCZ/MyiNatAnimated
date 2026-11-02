import { describe, it, expect } from 'vitest';
import { InatObservation } from '../types/inat';
import { findIsolatedObservationIds, filterIsolatedObservations } from './spatialFilter';

function createMockObs(
  id: number,
  lng: number,
  lat: number,
  dateStr: string
): InatObservation {
  return {
    id,
    uuid: `uuid-${id}`,
    observed_on: dateStr,
    time_observed_at: `${dateStr}T12:00:00Z`,
    created_at: `${dateStr}T12:00:00Z`,
    geojson: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    faves_count: 0,
    comments_count: 0,
    identifications_count: 0,
    quality_grade: 'research',
    photos: [],
  };
}

describe('spatialFilter', () => {
  it('returns empty set when observations list is small or empty', () => {
    expect(findIsolatedObservationIds([]).size).toBe(0);
    const single = [createMockObs(1, 14.42, 50.08, '2025-05-01')];
    expect(findIsolatedObservationIds(single).size).toBe(0);
    const pair = [
      createMockObs(1, 14.42, 50.08, '2025-05-01'),
      createMockObs(2, 16.60, 49.20, '2025-05-02'),
    ];
    expect(findIsolatedObservationIds(pair).size).toBe(0);
  });

  it('keeps observations when all are close together (e.g. within same region)', () => {
    const pragueObs: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.45, 50.09, '2025-05-04'),
    ];
    expect(findIsolatedObservationIds(pragueObs).size).toBe(0);
    expect(filterIsolatedObservations(pragueObs)).toHaveLength(4);
  });

  it('filters out 1 isolated distant observation (>= 150 km) in the middle of a trip', () => {
    // 5 points in Prague [14.42, 50.08]
    // 1 point in Brno [16.60, 49.20] (~185 km from Prague)
    // 5 points in Prague [14.42, 50.08]
    const obs: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.44, 50.08, '2025-05-04'),
      createMockObs(5, 14.45, 50.09, '2025-05-05'),
      // Isolated Brno point:
      createMockObs(99, 16.60, 49.20, '2025-05-06'),
      // Back in Prague:
      createMockObs(6, 14.41, 50.07, '2025-05-07'),
      createMockObs(7, 14.42, 50.08, '2025-05-08'),
      createMockObs(8, 14.43, 50.08, '2025-05-09'),
      createMockObs(9, 14.44, 50.08, '2025-05-10'),
      createMockObs(10, 14.45, 50.09, '2025-05-11'),
    ];

    const isolatedIds = findIsolatedObservationIds(obs);
    expect(isolatedIds.size).toBe(1);
    expect(isolatedIds.has(99)).toBe(true);

    const filtered = filterIsolatedObservations(obs);
    expect(filtered).toHaveLength(10);
    expect(filtered.some(o => o.id === 99)).toBe(false);
  });

  it('filters out 2 isolated distant observations (cluster of 2, >= 150 km)', () => {
    // 5 in Prague, 2 in Brno, 5 in Prague
    const obs: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.44, 50.08, '2025-05-04'),
      createMockObs(5, 14.45, 50.09, '2025-05-05'),
      // 2 isolated points in Brno:
      createMockObs(98, 16.60, 49.20, '2025-05-06'),
      createMockObs(99, 16.61, 49.21, '2025-05-06'),
      // Back in Prague:
      createMockObs(6, 14.41, 50.07, '2025-05-07'),
      createMockObs(7, 14.42, 50.08, '2025-05-08'),
      createMockObs(8, 14.43, 50.08, '2025-05-09'),
      createMockObs(9, 14.44, 50.08, '2025-05-10'),
      createMockObs(10, 14.45, 50.09, '2025-05-11'),
    ];

    const isolatedIds = findIsolatedObservationIds(obs);
    expect(isolatedIds.size).toBe(2);
    expect(isolatedIds.has(98)).toBe(true);
    expect(isolatedIds.has(99)).toBe(true);

    const filtered = filterIsolatedObservations(obs);
    expect(filtered).toHaveLength(10);
  });

  it('keeps cluster of 3 observations in distant location (> 2 points)', () => {
    // 5 in Prague, 3 in Brno, 5 in Prague
    const obs: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.44, 50.08, '2025-05-04'),
      createMockObs(5, 14.45, 50.09, '2025-05-05'),
      // 3 points in Brno (valid excursion with >= 3 observations):
      createMockObs(97, 16.59, 49.19, '2025-05-06'),
      createMockObs(98, 16.60, 49.20, '2025-05-06'),
      createMockObs(99, 16.61, 49.21, '2025-05-06'),
      // Back in Prague:
      createMockObs(6, 14.41, 50.07, '2025-05-07'),
      createMockObs(7, 14.42, 50.08, '2025-05-08'),
      createMockObs(8, 14.43, 50.08, '2025-05-09'),
      createMockObs(9, 14.44, 50.08, '2025-05-10'),
      createMockObs(10, 14.45, 50.09, '2025-05-11'),
    ];

    const isolatedIds = findIsolatedObservationIds(obs);
    expect(isolatedIds.size).toBe(0);
    expect(filterIsolatedObservations(obs)).toHaveLength(13);
  });

  it('filters out 1 or 2 isolated points at the start or end of the animation', () => {
    // 1 point in Paris at the start, followed by 5 in Prague
    const startObs: InatObservation[] = [
      createMockObs(100, 2.35, 48.85, '2025-01-01'), // Paris (~880 km from Prague)
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.44, 50.08, '2025-05-04'),
      createMockObs(5, 14.45, 50.09, '2025-05-05'),
    ];
    const isolatedStart = findIsolatedObservationIds(startObs);
    expect(isolatedStart.size).toBe(1);
    expect(isolatedStart.has(100)).toBe(true);

    // 5 in Prague, followed by 2 in Paris at the end
    const endObs: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 14.43, 50.08, '2025-05-03'),
      createMockObs(4, 14.44, 50.08, '2025-05-04'),
      createMockObs(5, 14.45, 50.09, '2025-05-05'),
      createMockObs(101, 2.35, 48.85, '2025-09-01'),
      createMockObs(102, 2.36, 48.86, '2025-09-02'),
    ];
    const isolatedEnd = findIsolatedObservationIds(endObs);
    expect(isolatedEnd.size).toBe(2);
    expect(isolatedEnd.has(101)).toBe(true);
    expect(isolatedEnd.has(102)).toBe(true);
  });

  it('does not filter if all segments are pairs (road trip across distant points)', () => {
    // 2 in Prague, 2 in Brno (190 km), 2 in Vienna (130 km)
    const roadTrip: InatObservation[] = [
      createMockObs(1, 14.41, 50.07, '2025-05-01'),
      createMockObs(2, 14.42, 50.08, '2025-05-02'),
      createMockObs(3, 16.60, 49.20, '2025-05-03'),
      createMockObs(4, 16.61, 49.21, '2025-05-04'),
    ];
    // Max segment size is 2, no single dominant cluster
    expect(findIsolatedObservationIds(roadTrip).size).toBe(0);
  });
});

