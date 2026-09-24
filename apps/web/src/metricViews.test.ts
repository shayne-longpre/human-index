import { describe, expect, it } from 'vitest';
import { metricColor } from './metricViews';

describe('GDP map colors', () => {
  it('clamps values above the published scale instead of extrapolating colors', () => {
    expect(metricColor('gdp_per_capita_constant_2015_usd', 1_000_000)).toEqual(
      metricColor('gdp_per_capita_constant_2015_usd', 250_000),
    );
  });
});
