import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, interpolateCamera } from './cameraDirector';
import { CameraKeyframe } from '../types/timeline';

describe('cameraDirector', () => {
  it('accurately calculates distance between Prague and Brno', () => {
    const prague: [number, number] = [14.42, 50.08];
    const brno: [number, number] = [16.61, 49.19];
    const dist = calculateDistanceKm(prague, brno);

    // Approximate distance is ~180-190 km
    expect(dist).toBeGreaterThan(170);
    expect(dist).toBeLessThan(200);
  });

  it('interpolates camera between keyframes smoothly', () => {
    const keyframes: CameraKeyframe[] = [
      { t: 0, center: [14.0, 50.0], zoom: 8, pitch: 0, bearing: 0 },
      { t: 10, center: [16.0, 48.0], zoom: 12, pitch: 30, bearing: 10 },
    ];

    const mid = interpolateCamera(keyframes, 5);
    // Midpoint should be halfway between 14 and 16, 50 and 48
    expect(mid.center[0]).toBeCloseTo(15.0, 1);
    expect(mid.center[1]).toBeCloseTo(49.0, 1);
    expect(mid.zoom).toBeCloseTo(10.0, 1);
    expect(mid.pitch).toBeCloseTo(15.0, 1);
  });
});

