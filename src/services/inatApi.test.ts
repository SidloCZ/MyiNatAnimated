import { describe, it, expect } from 'vitest';
import { isObservationObscured, getInatPhotoUrl, getObservationPhotoUrl } from './inatApi';
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

describe('getInatPhotoUrl and getObservationPhotoUrl', () => {
  it('converts square.jpg to medium.jpg', () => {
    const squareUrl = 'https://static.inaturalist.org/photos/759007061/square.jpg';
    expect(getInatPhotoUrl(squareUrl, 'medium')).toBe(
      'https://static.inaturalist.org/photos/759007061/medium.jpg'
    );
    expect(getInatPhotoUrl(squareUrl, 'large')).toBe(
      'https://static.inaturalist.org/photos/759007061/large.jpg'
    );
  });

  it('preserves query strings when converting photo size', () => {
    const squareUrlWithQuery = 'https://static.inaturalist.org/photos/123/square.jpeg?1700000000';
    expect(getInatPhotoUrl(squareUrlWithQuery, 'medium')).toBe(
      'https://static.inaturalist.org/photos/123/medium.jpeg?1700000000'
    );
  });

  it('uses medium_url if already provided on InatPhoto object', () => {
    const photo = {
      id: 1,
      url: 'https://demo.com/square.jpg',
      medium_url: 'https://demo.com/custom_medium.jpg',
    };
    expect(getInatPhotoUrl(photo, 'medium')).toBe('https://demo.com/custom_medium.jpg');
  });

  it('extracts medium photo from observation photos array', () => {
    const obs: InatObservation = {
      id: 1,
      uuid: 'uuid-1',
      observed_on: '2024-05-10',
      created_at: '2024-05-10T10:00:00Z',
      quality_grade: 'research',
      photos: [
        {
          id: 10,
          url: 'https://static.inaturalist.org/photos/10/square.jpg',
        },
      ],
      geojson: { type: 'Point', coordinates: [16.6, 49.2] },
      faves_count: 0,
      comments_count: 0,
      identifications_count: 1,
    };

    expect(getObservationPhotoUrl(obs, 'medium')).toBe(
      'https://static.inaturalist.org/photos/10/medium.jpg'
    );
  });

  it('falls back to taxon default_photo if observation has no photos', () => {
    const obs: InatObservation = {
      id: 2,
      uuid: 'uuid-2',
      observed_on: '2024-05-10',
      created_at: '2024-05-10T10:00:00Z',
      quality_grade: 'research',
      photos: [],
      taxon: {
        id: 100,
        name: 'Formica rufa',
        rank: 'species',
        default_photo: {
          id: 50,
          url: 'https://static.inaturalist.org/photos/50/square.jpg',
        },
      },
      geojson: { type: 'Point', coordinates: [16.6, 49.2] },
      faves_count: 0,
      comments_count: 0,
      identifications_count: 1,
    };

    expect(getObservationPhotoUrl(obs, 'medium')).toBe(
      'https://static.inaturalist.org/photos/50/medium.jpg'
    );
  });
});
