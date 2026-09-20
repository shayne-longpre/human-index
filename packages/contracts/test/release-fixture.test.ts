import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aggregatePrevalence,
  assertSupportedYear,
  validatePublishedMetrics,
  type AtlasEntity,
  type AtlasReleaseManifest,
  type ElectricityDataset,
  type HistoricalContextIndex,
  type HistoricalPopulationDataset,
  type PopulationDataset,
} from '../src';

const releaseRoot = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-09-20-r2');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(releaseRoot, name), 'utf8')) as T;
}

const manifest = readJson<AtlasReleaseManifest & {
  artifacts: Record<string, { bytes: number; sha256: string }>;
}>('manifest.json');
const population = readJson<PopulationDataset>('population.json');
const electricity = readJson<ElectricityDataset>('electricity.json');
const historicalPopulation = readJson<HistoricalPopulationDataset>('historical-population.json');
const historicalContext = readJson<HistoricalContextIndex>('historical-context.json');
const entities = readJson<{ entities: AtlasEntity[] }>('entities.json').entities;
const sourceRegistry = JSON.parse(
  readFileSync(resolve('data/registry/sources.json'), 'utf8'),
) as { sources: Array<{ id: string; urls: string[]; blockers: string[]; release_ready: boolean }> };

const populationByYear = new Map<number, typeof population.observations>();
for (const observation of population.observations) {
  const group = populationByYear.get(observation.year) ?? [];
  group.push(observation);
  populationByYear.set(observation.year, group);
}

const electricityByYear = new Map<number, typeof electricity.observations>();
for (const observation of electricity.observations) {
  const group = electricityByYear.get(observation.year) ?? [];
  group.push(observation);
  electricityByYear.set(observation.year, group);
}

describe('genuine-data MVP release', () => {
  it('publishes two valid, taxonomy-bound metrics with explicit time support', () => {
    expect(() => validatePublishedMetrics(manifest.metrics)).not.toThrow();
    expect(manifest.metrics.map((metric) => metric.id)).toEqual([
      'population_total',
      'access_to_electricity',
    ]);
    expect(manifest.metrics[0].available_years[0]).toBe(-9999);
    expect(manifest.metrics[0].available_years).toContain(1950);
    expect(manifest.metrics[0].available_years).not.toContain(1951);
    expect(population.years).toEqual(Array.from({ length: 66 }, (_, index) => 1960 + index));
    expect(electricity.years).toEqual(Array.from({ length: 35 }, (_, index) => 1990 + index));
    expect(() => assertSupportedYear(manifest.metrics[1], 2025)).toThrow(RangeError);
  });

  it('publishes exact deep-time world estimates without silently choosing within source ranges', () => {
    expect(historicalPopulation.observations).toHaveLength(39);
    const earliest = historicalPopulation.observations[0];
    expect(earliest).toMatchObject({
      year: -9999,
      source_year_label: '10000 BCE',
      lower: 1_000_000,
      upper: 10_000_000,
      status: 'source_disagreement_range',
      statistical_support: 'world',
    });
    expect(historicalPopulation.observations.some((observation) => observation.year === -8999)).toBe(false);
    expect(historicalPopulation.observations.every((observation) => observation.lower > 0)).toBe(true);
    expect(
      historicalPopulation.observations.every(
        (observation) => observation.upper === null || observation.upper >= observation.lower,
      ),
    ).toBe(true);
  });

  it('publishes changing Cliopatria polity snapshots independently of population', () => {
    expect(historicalContext.snapshots).toHaveLength(36);
    expect(historicalContext.snapshots[0]).toMatchObject({ atlas_year: -3399, source_year: -3400 });
    expect(historicalContext.snapshots.at(-1)).toMatchObject({ atlas_year: 2024, source_year: 2024 });
    expect(historicalContext.snapshots.every((snapshot) => snapshot.source_year !== 0)).toBe(true);
    expect(historicalContext.snapshots.every((snapshot) => snapshot.feature_count > 0)).toBe(true);
    for (let index = 1; index < historicalContext.snapshots.length; index += 1) {
      expect(historicalContext.snapshots[index].atlas_year).toBeGreaterThan(
        historicalContext.snapshots[index - 1].atlas_year,
      );
    }

    const ancient = readJson<{ excluded_feature_types: string[]; features: Array<{ properties: { name: string } }> }>(
      historicalContext.snapshots.find((snapshot) => snapshot.source_year === -1000)?.file ?? '',
    );
    const medieval = readJson<{ excluded_feature_types: string[]; features: Array<{ properties: { name: string } }> }>(
      historicalContext.snapshots.find((snapshot) => snapshot.source_year === 1000)?.file ?? '',
    );
    expect(ancient.excluded_feature_types).toEqual(['RELATION']);
    expect(medieval.excluded_feature_types).toEqual(['RELATION']);
    expect(new Set(ancient.features.map((feature) => feature.properties.name))).not.toEqual(
      new Set(medieval.features.map((feature) => feature.properties.name)),
    );
    const transformation = manifest.transformations.find(
      (candidate) => candidate.id === 'cliopatria-display-snapshots-v1',
    );
    expect(transformation?.parameters.archive_member).toBe('cliopatria_polities_only.geojson');
    expect(transformation?.parameters.archive_member_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps published release sources and the wider research registry inspectable', () => {
    expect(manifest.source_releases.map((source) => source.id)).toContain('world-bank-wdi-2026-07-13');
    expect(manifest.source_releases.map((source) => source.id)).toContain('natural-earth-v5.1.2');
    expect(manifest.source_releases.map((source) => source.id)).toContain('cliopatria-v0.2.0');
    expect(manifest.source_releases.map((source) => source.id)).toContain(
      'us-census-historical-world-population-2026-09-20',
    );
    expect(manifest.citations.every((citation) => citation.url.startsWith('https://'))).toBe(true);
    expect(new Set(sourceRegistry.sources.map((source) => source.id)).size).toBe(
      sourceRegistry.sources.length,
    );
    expect(sourceRegistry.sources.every((source) => source.urls.length > 0)).toBe(true);
    expect(
      sourceRegistry.sources
        .filter((source) => !source.release_ready)
        .every((source) => source.blockers.length > 0),
    ).toBe(true);
  });

  it('reproduces every annual population summary and keeps residuals explicit', () => {
    const mapStatus = new Map(entities.map((entity) => [entity.code, entity.map_status]));
    for (const expected of population.summaries) {
      const observations = populationByYear.get(expected.year) ?? [];
      const known = observations.filter((observation) => observation.value !== null);
      const covered = known.reduce((sum, observation) => sum + (observation.value ?? 0), 0);
      const unplaced = known
        .filter((observation) => mapStatus.get(observation.code) === 'unplaced')
        .reduce((sum, observation) => sum + (observation.value ?? 0), 0);
      expect(observations).toHaveLength(entities.length);
      expect(known).toHaveLength(expected.known_entities);
      expect(covered).toBe(expected.covered_population);
      expect(unplaced).toBe(expected.unplaced_population);
      expect(expected.world_reference_population - covered).toBe(expected.reference_residual);
      expect(expected.reference_residual).toBeGreaterThanOrEqual(0);
    }
  });

  it('reproduces every electricity summary with population mass conserved', () => {
    for (const expected of electricity.summaries) {
      const populations = new Map(
        (populationByYear.get(expected.year) ?? []).map((observation) => [observation.code, observation.value]),
      );
      const observations = electricityByYear.get(expected.year) ?? [];
      const summary = aggregatePrevalence(observations.map((observation) => ({
        id: observation.code,
        population: populations.get(observation.code) ?? null,
        rate: observation.value_percent === null ? null : observation.value_percent / 100,
      })));
      expect(observations).toHaveLength(entities.length);
      expect(observations.filter((observation) => observation.status === 'known')).toHaveLength(
        expected.known_condition_entities,
      );
      expect(summary.population).toBe(expected.population);
      expect(summary.withCondition).toBeCloseTo(expected.with_access, 5);
      expect(summary.withoutCondition).toBeCloseTo(expected.without_access, 5);
      expect(summary.unknownCondition).toBe(expected.unknown_condition);
    }
  });

  it('keeps map placement coverage separate from condition missingness', () => {
    const unplacedCodes = new Set(
      entities.filter((entity) => entity.map_status === 'unplaced').map((entity) => entity.code),
    );
    const population2024 = populationByYear.get(2024) ?? [];
    const electricity2024 = electricityByYear.get(2024) ?? [];
    const unplacedPopulation = population2024
      .filter((observation) => unplacedCodes.has(observation.code))
      .reduce((sum, observation) => sum + (observation.value ?? 0), 0);
    const populationByCode = new Map(population2024.map((observation) => [observation.code, observation.value]));
    const unknownPopulation = electricity2024
      .filter((observation) => observation.status === 'unknown')
      .reduce((sum, observation) => sum + (populationByCode.get(observation.code) ?? 0), 0);
    expect(unplacedPopulation).toBe(population.summaries.find((summary) => summary.year === 2024)?.unplaced_population);
    expect(unknownPopulation).toBe(electricity.summaries.find((summary) => summary.year === 2024)?.unknown_condition);
    expect(unplacedPopulation).not.toBe(unknownPopulation);
  });

  it('matches every published artifact checksum', () => {
    for (const [name, expected] of Object.entries(manifest.artifacts)) {
      const bytes = readFileSync(resolve(releaseRoot, name));
      expect(bytes.byteLength).toBe(expected.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected.sha256);
    }
  });

  it('exports electricity values with the exact population denominator records', () => {
    const lines = readFileSync(resolve(releaseRoot, 'electricity.csv'), 'utf8').trim().split('\n');
    expect(lines[0]).toBe(
      'code,year,value_percent,status,population,population_status,original_record_locator,population_record_locator',
    );
    expect(lines).toHaveLength(entities.length * electricity.years.length + 1);
    expect(lines[1]).toContain('World Bank API EG.ELC.ACCS.ZS/');
    expect(lines[1]).toContain('World Bank API SP.POP.TOTL/');
  });
});
