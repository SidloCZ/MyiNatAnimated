import { describe, it, expect } from 'vitest';
import { SPEED_PRESETS, getNearestSpeedIndex } from './SpeedSlider';

describe('SpeedSlider', () => {
  it('defines the correct presets ranging from 0.25x to 4x', () => {
    expect(SPEED_PRESETS).toEqual([0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);
  });

  it('maps speeds to the closest preset index', () => {
    expect(getNearestSpeedIndex(0.25)).toBe(0);
    expect(getNearestSpeedIndex(0.3)).toBe(0);
    expect(getNearestSpeedIndex(0.5)).toBe(1);
    expect(getNearestSpeedIndex(0.75)).toBe(2);
    expect(getNearestSpeedIndex(1.0)).toBe(3);
    expect(getNearestSpeedIndex(1.2)).toBe(3);
    expect(getNearestSpeedIndex(1.4)).toBe(4);
    expect(getNearestSpeedIndex(1.5)).toBe(4);
    expect(getNearestSpeedIndex(2.0)).toBe(5);
    expect(getNearestSpeedIndex(3.0)).toBe(6);
    expect(getNearestSpeedIndex(4.0)).toBe(7);
  });
});
