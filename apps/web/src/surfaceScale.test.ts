import { describe, expect, it } from 'vitest';
import { surfaceColor, surfaceElevation } from './surfaceScale';

describe('population-grid display scale', () => {
  it('keeps color tied to count and height tied to physical density', () => {
    expect(surfaceColor(1000)).toEqual(surfaceColor(1000));
    expect(surfaceColor(1_000_000)).not.toEqual(surfaceColor(1000));
    expect(surfaceElevation(1000, 100)).toBeGreaterThan(surfaceElevation(1000, 1000));
    expect(surfaceElevation(0, 100)).toBe(0);
  });
});
