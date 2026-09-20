import { describe, expect, it } from 'vitest';
import cases from '../../../tests/semantic_contract_cases.json';
import {
  UnverifiedYearZeroError,
  aggregateContextDistribution,
  aggregatePrevalence,
  calibratePopulationCells,
  formatAstronomicalYear,
  historicalYearToAstronomical,
  inclusiveHistoricalRange,
} from '../src';

describe('historical date conventions', () => {
  it('converts signed source years without a year zero', () => {
    for (const row of cases.date_convention.conversions) {
      expect(historicalYearToAstronomical(row.source)).toBe(row.internal);
      expect(formatAstronomicalYear(row.internal)).toBe(row.display);
    }
  });

  it('converts inclusive ranges to half-open astronomical ranges', () => {
    const fixture = cases.date_convention.inclusive_interval;
    expect(inclusiveHistoricalRange(fixture.source_start, fixture.source_end)).toEqual({
      start: fixture.internal_start,
      endExclusive: fixture.internal_end_exclusive,
    });
  });

  it('quarantines an unexpected source year zero', () => {
    expect(() => historicalYearToAstronomical(0)).toThrow(UnverifiedYearZeroError);
  });
});

describe('population accounting', () => {
  it('conserves the prevalence universe and keeps unknown visible', () => {
    const result = aggregatePrevalence(cases.prevalence.units);
    expect(result.population).toBe(cases.prevalence.expected.population);
    expect(result.withCondition).toBe(cases.prevalence.expected.with);
    expect(result.withoutCondition).toBe(cases.prevalence.expected.without);
    expect(result.unknownCondition).toBe(cases.prevalence.expected.unknown);
    expect(result.coverageFraction).toBeCloseTo(cases.prevalence.expected.coverage_fraction, 12);
    expect(result.withFractionFullUniverse).toBeCloseTo(
      cases.prevalence.expected.with_fraction_full_universe,
      12,
    );
    expect(result.withFractionKnown).toBeCloseTo(
      cases.prevalence.expected.with_fraction_known,
      12,
    );
  });

  it('does not treat missing population weights as zero-weight evidence', () => {
    const result = aggregatePrevalence([{ id: 'missing-weight', population: null, rate: 0.5 }]);
    expect(result.missingPopulationUnitIds).toEqual(['missing-weight']);
  });

  it('rejects rates outside the probability domain while preserving zero', () => {
    expect(aggregatePrevalence([{ id: 'zero', population: 10, rate: 0 }]).withoutCondition).toBe(10);
    expect(() => aggregatePrevalence([{ id: 'invalid', population: 10, rate: 1.01 }])).toThrow(
      RangeError,
    );
  });

  it('uses fixed bins for territorial context rather than personal outcomes', () => {
    const result = aggregateContextDistribution(
      cases.context_distribution.units.map((unit) => ({
        id: unit.id,
        population: unit.population,
        territorialMean: unit.territorial_mean,
      })),
      cases.context_distribution.bins.map((bin) => ({
        minInclusive: bin.min_inclusive,
        maxExclusive: bin.max_exclusive,
      })),
    );
    expect(result.binPopulations).toEqual(cases.context_distribution.expected.bin_populations);
    expect(result.unknown).toBe(cases.context_distribution.expected.unknown);
  });

  it('calibrates a positive surface and preserves the raw total', () => {
    const result = calibratePopulationCells(
      cases.calibration.raw_cell_counts,
      cases.calibration.target_statistical_population,
    );
    expect(result.calibratedCounts).toEqual(cases.calibration.expected_calibrated_cell_counts);
    expect(result.rawTotal).toBe(cases.calibration.expected_raw_preserved_total);
    expect(result.unplacedPopulation).toBe(0);
  });

  it('reports a zero-denominator target as unplaced', () => {
    const result = calibratePopulationCells(
      cases.zero_spatial_denominator.raw_cell_counts,
      cases.zero_spatial_denominator.target_statistical_population,
    );
    expect(result.calibratedCounts).toEqual([0, 0]);
    expect(result.unplacedPopulation).toBe(100);
  });
});
