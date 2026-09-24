import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aggregatePrevalence,
  buildEvidenceTimelineYears,
  createAtlasViewBundle,
  validateAtlasViewBundle,
  type AtlasEntity,
  type AtlasReleaseManifest,
  type ElectricityDataset,
  type HistoricalCityDataset,
  type HistoricalContextIndex,
  type HistoricalPopulationDataset,
  type PopulationDataset,
  type PopulationOutlookDataset,
} from '../src';
import type { CountryFeatureCollection, ReleaseBase } from '../../../apps/web/src/data';
import { buildViewRows } from '../../../apps/web/src/viewRows';
import {
  atlasViewSearch,
  parseAtlasViewState,
  type AtlasUrlViewState,
} from '../../../apps/web/src/viewState';

const releaseRoot = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-09-23-r7');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(releaseRoot, name), 'utf8')) as T;
}

const manifest = readJson<AtlasReleaseManifest>('manifest.json');
const release: ReleaseBase = {
  manifest,
  entities: readJson<{ entities: AtlasEntity[] }>('entities.json').entities,
  geometry: readJson<CountryFeatureCollection>('countries.geojson'),
  population: readJson<PopulationDataset>('population.json'),
  historicalPopulation: readJson<HistoricalPopulationDataset>('historical-population.json'),
  historicalContext: readJson<HistoricalContextIndex>('historical-context.json'),
  historicalCities: readJson<HistoricalCityDataset>('historical-cities.json'),
};
const electricity = readJson<ElectricityDataset>('electricity.json');
const populationOutlook = readJson<PopulationOutlookDataset>('population-outlook.json');
const reconciliation = readJson<Record<string, unknown>>('reconciliation.json');
const timelineYears = buildEvidenceTimelineYears(manifest, release.historicalContext, release.historicalCities);
const entityCodes = new Set(release.entities.map((entity) => entity.code));

describe('pinned Atlas view state', () => {
  it('round-trips the release, layers, selected support, scale, and camera', () => {
    const state: AtlasUrlViewState = {
      metricId: 'access_to_electricity',
      year: 2024,
      selectedCode: 'USA',
      historicalEnabled: false,
      citiesEnabled: true,
      scaleMode: 'published',
      camera: { longitude: -74.123456, latitude: 40.765432, zoom: 3.4567, pitch: 22.222, bearing: -4.444 },
    };
    const search = atlasViewSearch(manifest, state);
    expect(search).toContain(`release=${manifest.release_id}`);
    expect(parseAtlasViewState(search, manifest, timelineYears, entityCodes)).toEqual({
      ...state,
      camera: { longitude: -74.12346, latitude: 40.76543, zoom: 3.457, pitch: 22.22, bearing: -4.44 },
    });
    expect(() => parseAtlasViewState(
      '?release=another-release&metric=population_total&year=2024',
      manifest,
      timelineYears,
      entityCodes,
    )).toThrow(/not available in this build/);
    expect(parseAtlasViewState('', manifest, timelineYears, entityCodes).year).toBe(
      manifest.default_view.year,
    );

    const outlookOnlyCode = populationOutlook.entities.find((entity) => !entityCodes.has(entity.code))?.code;
    expect(outlookOnlyCode).toBeDefined();
    expect(parseAtlasViewState(
      `?release=${manifest.release_id}&metric=population_outlook&year=2024&place=${outlookOnlyCode}`,
      manifest,
      timelineYears,
      entityCodes,
    ).selectedCode).toBe(outlookOnlyCode);
  });
});

describe('reproducible view bundle', () => {
  it('exports the exact electricity rows, weights, displayed calculation, decisions, and provenance', () => {
    const metric = manifest.metrics.find((candidate) => candidate.id === 'access_to_electricity');
    if (!metric) throw new Error('Electricity metric missing from fixture');
    const rows = buildViewRows(release, metric, electricity, 2024);
    const prevalence = aggregatePrevalence(rows.map((row) => ({
      id: row.entity.code,
      population: row.population?.value ?? null,
      rate: row.metricValue === null ? null : row.metricValue / 100,
    })));
    const state: AtlasUrlViewState = {
      metricId: metric.id,
      year: 2024,
      selectedCode: 'USA',
      historicalEnabled: true,
      citiesEnabled: true,
      scaleMode: 'published',
      camera: { longitude: 8, latitude: 14, zoom: 1.12, pitch: 18, bearing: 0 },
    };
    const snapshot = release.historicalContext.snapshots.find((candidate) => candidate.atlas_year === 2024) ?? null;
    const bundle = createAtlasViewBundle({
      manifest,
      metric,
      requestedYear: 2024,
      metricSupported: true,
      selectedSupportCode: 'USA',
      historicalBordersEnabled: true,
      historicalCitiesEnabled: true,
      camera: state.camera,
      effectiveMetricYear: 2024,
      historicalSnapshot: snapshot,
      historicalCityEffectiveYear: null,
      pinnedQuery: atlasViewSearch(manifest, state),
      rows,
      displayedSummary: { prevalence },
      historicalPopulationObservation: null,
      historicalCities: [],
      selectedHistoricalFeatureId: null,
      selectedHistoricalCityId: null,
      reconciliationDecisions: reconciliation,
    });

    expect(() => validateAtlasViewBundle(bundle)).not.toThrow();
    expect(bundle.view.camera).toEqual({ longitude: 8, latitude: 14, zoom: 1.12, pitch: 18, bearing: 0 });
    expect(bundle.rows).toHaveLength(217);
    expect(bundle.rows.map((row) => row.entity.code)).toEqual(
      [...bundle.rows.map((row) => row.entity.code)].sort(),
    );
    expect(bundle.provenance.reconciliation_decisions).toMatchObject({
      decision_set_id: manifest.reconciliation.decision_set_id,
    });
    expect(bundle.historical_context.artifact?.sha256).toMatch(/^[a-f0-9]{64}$/);
    const recomputed = aggregatePrevalence(bundle.rows.map((row) => ({
      id: row.entity.code,
      population: row.population_weight.value,
      rate: row.metric.value === null ? null : row.metric.value / 100,
    })));
    expect(recomputed).toEqual(prevalence);
  });
});
