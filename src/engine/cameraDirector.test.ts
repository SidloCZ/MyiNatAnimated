import { describe, it, expect } from 'vitest';
import { calculateDistanceKm, interpolateCamera, detectWalkCluster, generateCameraKeyframes } from './cameraDirector';
import { CameraKeyframe, ObsEvent } from '../types/timeline';
import { DEMO_OBSERVATIONS } from '../services/demoData';
import { buildTimeline } from './timelineBuilder';

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
    expect(mid.center[0]).toBeCloseTo(15.0, 1);
    expect(mid.center[1]).toBeCloseTo(49.0, 1);
    expect(mid.zoom).toBeCloseTo(10.0, 1);
    expect(mid.pitch).toBeCloseTo(15.0, 1);
  });

  it('generates strictly smooth, continuous zoom transitions without abrupt jumps', () => {
    const obs = DEMO_OBSERVATIONS;
    const tl = buildTimeline(obs, { targetDurationSeconds: 30 });

    // Sample along the timeline at fine 50ms intervals
    const sampleInterval = 0.05;
    let prevZoom: number | null = null;
    let maxZoomStep = 0;

    for (let t = 0; t <= tl.duration; t += sampleInterval) {
      const cam = interpolateCamera(tl.cameraKeyframes, t);
      if (prevZoom !== null) {
        const step = Math.abs(cam.zoom - prevZoom);
        if (step > maxZoomStep) maxZoomStep = step;
        expect(step).toBeLessThan(0.20);
      }
      prevZoom = cam.zoom;
    }

    expect(maxZoomStep).toBeGreaterThan(0);
  });

  it('pulls back camera into stratosphere during long-distance flights (Google Earth style)', () => {
    const obs = DEMO_OBSERVATIONS;
    const tl = buildTimeline(obs, { targetDurationSeconds: 30 });

    const ev105 = tl.events.find(e => e.id === 105)!;
    const ev106 = tl.events.find(e => e.id === 106)!;

    expect(ev105).toBeDefined();
    expect(ev106).toBeDefined();

    const flightStart = ev105.t;
    const flightEnd = ev106.t;
    const flightMid = (flightStart + flightEnd) / 2;

    const camStart = interpolateCamera(tl.cameraKeyframes, flightStart);
    const camMid = interpolateCamera(tl.cameraKeyframes, flightMid);
    const camEnd = interpolateCamera(tl.cameraKeyframes, flightEnd);

    expect(camStart.zoom).toBeGreaterThan(10);
    expect(camMid.zoom).toBeLessThanOrEqual(6.5);
    expect(camMid.zoom).toBeGreaterThanOrEqual(2.5);
    expect(camEnd.zoom).toBeGreaterThan(10);
  });

  it('detects a tight walk cluster when more than 8 observations occur sequentially within 2-5 km', () => {
    // 10 points along a 2.5 km walking trail in Stromovka park, Prague
    const startLng = 14.415;
    const startLat = 50.105;

    const walkEvents: ObsEvent[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      t: i * 1.5,
      coordinates: [startLng + i * 0.0025, startLat + i * 0.0015], // total span ~2.5 km
      color: '#74ac00',
      iconicTaxon: 'Plantae',
      favesCount: 0,
      commentsCount: 0,
      isHighlight: false,
      observation: {} as any,
    }));

    const cluster = detectWalkCluster(walkEvents, 0, 5.0, 8);
    expect(cluster.isWalkCluster).toBe(true);
    expect(cluster.count).toBe(10);
    expect(cluster.spanKm).toBeLessThanOrEqual(5.0);
    expect(cluster.recommendedZoom).toBeGreaterThanOrEqual(13.5);

    // Initial keyframe should automatically adopt this detailed walk zoom
    const keyframes = generateCameraKeyframes(walkEvents, 15);
    expect(keyframes[0].zoom).toBeGreaterThanOrEqual(13.5);
    expect(keyframes[0].zoom).toBeLessThanOrEqual(15.5);
  });

  it('does not trigger walk cluster zoom when initial points are distant', () => {
    const scatteredEvents: ObsEvent[] = [
      { id: 1, t: 0, coordinates: [14.42, 50.08], color: '#74ac00', iconicTaxon: 'Aves', favesCount: 0, commentsCount: 0, isHighlight: false, observation: {} as any },
      { id: 2, t: 2, coordinates: [14.90, 50.40], color: '#74ac00', iconicTaxon: 'Aves', favesCount: 0, commentsCount: 0, isHighlight: false, observation: {} as any },
    ];

    const cluster = detectWalkCluster(scatteredEvents, 0, 5.0, 8);
    expect(cluster.isWalkCluster).toBe(false);

    const keyframes = generateCameraKeyframes(scatteredEvents, 4);
    // Standard regional zoom
    expect(keyframes[0].zoom).toBeCloseTo(10.5, 0.5);
  });
});
