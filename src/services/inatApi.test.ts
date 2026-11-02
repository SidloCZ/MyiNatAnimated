import { describe, it, expect } from 'vitest';
import { isObservationObscured } from './inatApi';
import { InatObservation } from '../types/inat';

describe('isObservationObscured', () => {
  const baseObs: InatObservation = {
    id: 1,
    uuid: 'uuid-1',
    observed_on: '2024-05-10',
    created_at: '2024-05-10T10:00:00Z',
    quality_grade: 'research',
    photos: [],
    geojson: { type: 'Point', coordinates: [16.6, 49.2] },
    faves_count: 0,
    comments_count: 0,
    identifications_count: 1,
  };

  it('identifies open and accurate observations as not obscured', () => {
    expect(isObservationObscured(baseObs)).toBe(false);
    expect(isObservationObscured({ ...baseObs, geoprivacy: 'open', positional_accuracy: 15 })).toBe(false);
  });

  it('detects obscured flag', () => {
    expect(isObservationObscured({ ...baseObs, obscured: true })).toBe(true);
  });

  it('detects geoprivacy obscured or private', () => {
    expect(isObservationObscured({ ...baseObs, geoprivacy: 'obscured' })).toBe(true);
    expect(isObservationObscured({ ...baseObs, geoprivacy: 'private' })).toBe(true);
  });

  it('detects taxon_geoprivacy obscured or private', () => {
    expect(isObservationObscured({ ...baseObs, taxon_geoprivacy: 'obscured' })).toBe(true);
    expect(isObservationObscured({ ...baseObs, taxon_geoprivacy: 'private' })).toBe(true);
  });

  it('detects missing or invalid coordinates', () => {
    expect(isObservationObscured({ ...baseObs, geojson: undefined as unknown as InatObservation['geojson'] })).toBe(true);
  });

  it('detects coarse grid uncertainty (positional_accuracy > 12000m)', () => {
    expect(isObservationObscured({ ...baseObs, positional_accuracy: 28000 })).toBe(true);
    expect(isObservationObscured({ ...baseObs, positional_accuracy: 5000 })).toBe(false);
  });
});
