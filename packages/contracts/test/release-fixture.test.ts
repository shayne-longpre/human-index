import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aggregatePrevalence,
  assertSupportedYear,
  buildEvidenceTimelineYears,
  nearestTimelineIndex,
  resolveHistoricalSnapshot,
  validateAtlasReleaseManifest,
  validatePublishedMetrics,
  type AtlasEntity,
  type AtlasReleaseManifest,
  type ElectricityDataset,
  type HistoricalContextIndex,
  type HistoricalCityDataset,
  type HistoricalPopulationDataset,
  type PopulationDataset,
  type PopulationOutlookDataset,
  type LifeExpectancyDataset,
} from '../src';

const releaseRoot = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-09-22-r6');

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(releaseRoot, name), 'utf8')) as T;
}

const manifest = readJson<AtlasReleaseManifest & {
  artifacts: Record<string, { bytes: number; sha256: string }>;
}>('manifest.json');
const population = readJson<PopulationDataset>('population.json');
const populationOutlook = readJson<PopulationOutlookDataset>('population-outlook.json');
const electricity = readJson<ElectricityDataset>('electricity.json');
const historicalPopulation = readJson<HistoricalPopulationDataset>('historical-population.json');
const historicalContext = readJson<HistoricalContextIndex>('historical-context.json');
const historicalCities = readJson<HistoricalCityDataset>('historical-cities.json');
const lifeExpectancy = readJson<LifeExpectancyDataset>('life-expectancy.json');
const entities = readJson<{ entities: AtlasEntity[] }>('entities.json').entities;
const sourceRegistry = JSON.parse(
  readFileSync(resolve('data/registry/sources.json'), 'utf8'),
) as {
  sources: Array<{
    id: string;
    label: string;
    urls: string[];
    blockers: string[];
    downloaded: boolean;
    release_ready: boolean;
  }>;
  verticals: Array<{
    id: string;
    sources: Array<{ source_id: string; release_ids: string[] }>;
  }>;
};
const wppProfile = JSON.parse(
  readFileSync(resolve('data/review/un-wpp-2024-profile.json'), 'utf8'),
) as {
  review_status: string;
  artifact: { sha256: string };
  profile: {
    rows: number;
    iso3_codes: number;
    duplicate_location_year_variant_keys: number;
    rows_by_period: Record<string, number>;
  };
};
const cityCrosswalkReview = JSON.parse(
  readFileSync(resolve('data/review/historical-city-crosswalk-candidates.json'), 'utf8'),
) as {
  review_status: string;
  candidate_records: Record<string, unknown>;
  candidates: Array<{
    review_status: string;
    candidate_basis: string;
    left_record_id: string;
    right_record_id: string;
  }>;
};
const cliopatriaTopologyReview = JSON.parse(
  readFileSync(resolve('data/review/cliopatria-topology-pilot.json'), 'utf8'),
) as {
  review_status: string;
  summary: { active_intersecting_polity_features: number; reported_overlap_candidates: number };
  overlap_candidates: Array<{ review_status: string }>;
};
const cshapesProfile = JSON.parse(
  readFileSync(resolve('data/review/cshapes-2.0-profile.json'), 'utf8'),
) as {
  review_status: string;
  profile: { features: number; invalid_geometries: number; start_date: string; end_date: string };
  publication_blockers: string[];
};
const hydeProfile = JSON.parse(
  readFileSync(resolve('data/review/hyde-3.5-sample-profile.json'), 'utf8'),
) as {
  review_status: string;
  population_count_grid_profile: { sum_inhabitants: number; populated_cells: number };
  terms_conflict: { archive_license_file: string; readme_statement: string; status: string };
};
const maddisonStatus = JSON.parse(
  readFileSync(resolve('data/review/maddison-2023-acquisition-status.json'), 'utf8'),
) as {
  review_status: string;
  acquisition_attempt: { direct_http_result: string; bypass_attempted: boolean };
};
const reviewQueue = JSON.parse(
  readFileSync(resolve('apps/web/public/atlas/review/review-queue.json'), 'utf8'),
) as {
  status: string;
  decision_set: { id: string; summary: Record<string, unknown> };
  source_policies: unknown[];
  border_overlaps: { candidates: Array<{ decision: { disposition: string } }> };
  city_identities: { candidates: Array<{ decision: { disposition: string } }> };
};
const reconciliationDecisions = JSON.parse(
  readFileSync(resolve('data/decisions/reconciliation-decisions-v1.json'), 'utf8'),
) as {
  decision_set_id: string;
  status: string;
  summary: {
    city_candidates: number;
    city_dispositions: Record<string, number>;
    canonical_place_clusters: number;
    border_candidates: number;
    border_dispositions: Record<string, number>;
    source_policies: number;
  };
  place_clusters: Array<{ canonical_place_id: string; source_record_ids: string[] }>;
  city_identity_decisions: Array<{
    candidate_id: string;
    disposition: string;
    canonical_place_id: string | null;
    observation_policy: string;
  }>;
  border_overlap_decisions: Array<{
    candidate_key: string;
    disposition: string;
    population_allocation: string;
  }>;
};

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
  it('publishes four valid, taxonomy-bound metrics with explicit time support', () => {
    expect(() => validateAtlasReleaseManifest(manifest)).not.toThrow();
    expect(() => validatePublishedMetrics(manifest.metrics)).not.toThrow();
    expect(manifest.metrics.map((metric) => metric.id)).toEqual([
      'population_total',
      'population_outlook',
      'access_to_electricity',
      'life_expectancy_at_birth',
    ]);
    expect(manifest.metrics[0].available_years[0]).toBe(-9999);
    expect(manifest.metrics[0].available_years).toContain(1950);
    expect(manifest.metrics[0].available_years).not.toContain(1951);
    expect(population.years).toEqual(Array.from({ length: 66 }, (_, index) => 1960 + index));
    expect(electricity.years).toEqual(Array.from({ length: 35 }, (_, index) => 1990 + index));
    expect(lifeExpectancy.years).toEqual(Array.from({ length: 65 }, (_, index) => 1960 + index));
    expect(populationOutlook.years).toEqual(Array.from({ length: 151 }, (_, index) => 1950 + index));
    expect(() => assertSupportedYear(manifest.metrics[2], 2025)).toThrow(RangeError);
  });

  it('builds one shared time control while resolving each evidence layer independently', () => {
    const years = buildEvidenceTimelineYears(manifest, historicalContext, historicalCities);
    expect(years[0]).toBe(-9999);
    expect(years.at(-1)).toBe(2100);
    expect(years).toContain(-3399);
    expect(years).toContain(-3699);
    expect(years).toContain(1991);
    expect(nearestTimelineIndex(years, -3400)).toBe(years.indexOf(-3399));

    expect(resolveHistoricalSnapshot(historicalContext, -9999)).toBeNull();
    expect(resolveHistoricalSnapshot(historicalContext, 2025)).toBeNull();
    expect(resolveHistoricalSnapshot(historicalContext, 1967)?.atlas_year).toBe(1960);
    expect(resolveHistoricalSnapshot(historicalContext, 1970)?.atlas_year).toBe(1970);
  });

  it('rejects dangling taxonomy, source, universe, and artifact references', () => {
    const withUnknownFamily = structuredClone(manifest);
    withUnknownFamily.metrics[0].taxonomy_ids = ['not-a-published-family'];
    expect(() => validateAtlasReleaseManifest(withUnknownFamily)).toThrow(/unknown taxonomy family/);

    const withUnknownSource = structuredClone(manifest);
    withUnknownSource.historical_context.source_release_id = 'not-a-published-source';
    expect(() => validateAtlasReleaseManifest(withUnknownSource)).toThrow(/unknown source release/);

    const withUnknownMetricSource = structuredClone(manifest);
    withUnknownMetricSource.metrics[0].source_release_ids = ['not-a-published-source'];
    expect(() => validateAtlasReleaseManifest(withUnknownMetricSource)).toThrow(/unknown source release/);

    const withUnknownUniverse = structuredClone(manifest);
    withUnknownUniverse.metrics[1].population_universe_id = 'not-a-published-universe';
    expect(() => validateAtlasReleaseManifest(withUnknownUniverse)).toThrow(/unknown population universe/);

    const withMissingArtifact = structuredClone(manifest);
    delete withMissingArtifact.artifacts[withMissingArtifact.metrics[1].data_file];
    expect(() => validateAtlasReleaseManifest(withMissingArtifact)).toThrow(/missing artifact/);

    const withOverlappingUniversePeriods = structuredClone(manifest);
    const populationPeriods = withOverlappingUniversePeriods.metrics[0].population_universe_periods;
    if (!populationPeriods) throw new Error('Population fixture needs date-specific universe periods');
    populationPeriods[1].start_year = 1950;
    expect(() => validateAtlasReleaseManifest(withOverlappingUniversePeriods)).toThrow(/overlapping/);

    const withUniverseGap = structuredClone(manifest);
    const gappedPeriods = withUniverseGap.metrics[0].population_universe_periods;
    if (!gappedPeriods) throw new Error('Population fixture needs date-specific universe periods');
    gappedPeriods[1].start_year = 1961;
    expect(() => validateAtlasReleaseManifest(withUniverseGap)).toThrow(/does not resolve one population universe for 1960/);

    const withTwoUniverseModes = structuredClone(manifest);
    withTwoUniverseModes.metrics[0].population_universe_id = manifest.population_universes[0].id;
    expect(() => validateAtlasReleaseManifest(withTwoUniverseModes)).toThrow(/both primary and date-specific/);
  });

  it('publishes sparse ancient-city points at exact source dates only', () => {
    expect(historicalCities.cities).toHaveLength(154);
    expect(historicalCities.observations).toHaveLength(621);
    expect(historicalCities.years).toHaveLength(41);
    expect(historicalCities.years[0]).toBe(-3699);
    expect(historicalCities.years.at(-1)).toBe(1000);
    expect(historicalCities.temporal_policy).toBe('exact_only');
    expect(historicalCities.spatial_support).toBe('source_geocoded_city_point_not_extent');
    expect(historicalCities.observations.every((observation) => observation.population > 0)).toBe(true);
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
    expect(
      historicalContext.snapshots.every(
        (snapshot) => snapshot.quality.duplicate_source_feature_ids === 0
          && snapshot.quality.nonpositive_source_areas === 0
          && snapshot.quality.unclosed_rings === 0
          && snapshot.quality.invalid_coordinate_positions === 0,
      ),
    ).toBe(true);
    expect(
      historicalContext.snapshots.every(
        (snapshot) => snapshot.quality.topology_overlap_review
          === 'bounded_decision_set_applied_unresolved_overlaps_preserved',
      ),
    ).toBe(true);
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
    const reconciled = readJson<{
      reconciliation_decision_set_id: string;
      features: Array<{ properties: {
        source_relation_role: string;
        reconciliation_status: string;
        unresolved_overlap_count: number;
        overlap_decisions: Array<{
          decision_id: string;
          counterpart_name: string;
          disposition: string;
        }>;
      } }>;
    }>(historicalContext.snapshots.find((snapshot) => snapshot.source_year === 1500)?.file ?? '');
    expect(reconciled.reconciliation_decision_set_id).toBe('atlas-reconciliation-2026-09-22-v1');
    expect(reconciled.features.some((feature) => feature.properties.source_relation_role === 'composite'))
      .toBe(true);
    expect(reconciled.features.some((feature) => feature.properties.unresolved_overlap_count > 0))
      .toBe(true);
    expect(
      reconciled.features
        .filter((feature) => feature.properties.unresolved_overlap_count > 0)
        .every((feature) => feature.properties.overlap_decisions.some(
          (decision) => decision.disposition === 'unresolved_overlap'
            && decision.counterpart_name.length > 0
            && decision.decision_id.startsWith('border:'),
        )),
    ).toBe(true);
    const transformation = manifest.transformations.find(
      (candidate) => candidate.id === 'cliopatria-display-snapshots-v2',
    );
    expect(transformation?.parameters.archive_member).toBe('cliopatria_polities_only.geojson');
    expect(transformation?.parameters.archive_member_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps published release sources and the wider research registry inspectable', () => {
    expect(manifest.source_releases.map((source) => source.id)).toContain('world-bank-wdi-2026-07-13');
    expect(manifest.source_releases.map((source) => source.id)).toContain('natural-earth-v5.1.2');
    expect(manifest.source_releases.map((source) => source.id)).toContain('cliopatria-v0.2.0');
    expect(manifest.source_releases.map((source) => source.id)).toContain('reba-modelski-ancient-v2');
    expect(manifest.source_releases.map((source) => source.id)).toContain(
      'us-census-historical-world-population-2026-09-20',
    );
    expect(manifest.source_releases.map((source) => source.id)).toContain(
      'un-wpp-2024-medium-demographic-indicators',
    );
    expect(manifest.citations.every((citation) => citation.url.startsWith('https://'))).toBe(true);
    expect(new Set(sourceRegistry.sources.map((source) => source.id)).size).toBe(
      sourceRegistry.sources.length,
    );
    expect(sourceRegistry.sources.every((source) => source.urls.length > 0)).toBe(true);
    expect(sourceRegistry.sources.every((source) => source.label.trim().length > 0)).toBe(true);
    expect(
      sourceRegistry.sources
        .filter((source) => !source.release_ready)
        .every((source) => source.blockers.length > 0),
    ).toBe(true);

    const registryIds = new Set(sourceRegistry.sources.map((source) => source.id));
    const releaseIds = new Set(manifest.source_releases.map((source) => source.id));
    expect(new Set(sourceRegistry.verticals.map((vertical) => vertical.id)).size).toBe(
      sourceRegistry.verticals.length,
    );
    const referencedRegistryIds = new Set<string>();
    const referencedReleaseIds = new Set<string>();
    for (const vertical of sourceRegistry.verticals) {
      const verticalSourceIds = vertical.sources.map((source) => source.source_id);
      expect(new Set(verticalSourceIds).size).toBe(verticalSourceIds.length);
      for (const source of vertical.sources) {
        expect(registryIds.has(source.source_id)).toBe(true);
        referencedRegistryIds.add(source.source_id);
        for (const releaseId of source.release_ids) {
          expect(releaseIds.has(releaseId)).toBe(true);
          referencedReleaseIds.add(releaseId);
        }
        if (source.release_ids.length > 0) {
          expect(sourceRegistry.sources.find((item) => item.id === source.source_id)?.downloaded).toBe(true);
        }
      }
    }
    expect(referencedRegistryIds).toEqual(registryIds);
    expect(referencedReleaseIds).toEqual(releaseIds);
  });

  it('covers every candidate with a versioned decision without inventing unresolved history', () => {
    expect(wppProfile.review_status).toBe('acquired_profiled_and_fixture_published');
    expect(wppProfile.artifact.sha256).toBe(
      '286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc',
    );
    expect(wppProfile.profile).toMatchObject({
      rows: 84_360,
      iso3_codes: 237,
      duplicate_location_year_variant_keys: 0,
    });
    expect(wppProfile.profile.rows_by_period).toEqual({
      estimates_1950_2023: 41_070,
      projections_2024_2100: 42_735,
      boundary_rows_2101: 555,
    });

    expect(cityCrosswalkReview.review_status).toBe(
      'candidate_generation_complete_human_review_outstanding',
    );
    expect(cityCrosswalkReview.candidates).toHaveLength(353);
    expect(
      cityCrosswalkReview.candidates.every(
        (candidate) => candidate.review_status === 'unreviewed_candidate'
          && candidate.left_record_id in cityCrosswalkReview.candidate_records
          && candidate.right_record_id in cityCrosswalkReview.candidate_records,
      ),
    ).toBe(true);

    expect(cliopatriaTopologyReview.review_status).toBe(
      'bounded_automated_pilot_complete_historian_review_outstanding',
    );
    expect(cliopatriaTopologyReview.summary).toEqual({
      active_intersecting_polity_features: 57,
      invalid_source_geometries: 0,
      geometries_repaired_for_measurement: 0,
      reported_overlap_candidates: 28,
      near_containment_candidates: 12,
      material_overlap_candidates: 2,
    });
    expect(
      cliopatriaTopologyReview.overlap_candidates.every(
        (candidate) => candidate.review_status === 'automated_candidate_historian_review_outstanding',
      ),
    ).toBe(true);

    expect(reconciliationDecisions.status).toBe(
      'complete_for_all_current_candidates_with_unresolved_history_preserved',
    );
    expect(reconciliationDecisions.summary).toEqual({
      city_candidates: 353,
      city_dispositions: {
        accepted_same_place: 336,
        rejected_distinct_place: 15,
        unresolved_identity: 2,
      },
      canonical_place_clusters: 300,
      border_candidates: 28,
      border_dispositions: {
        source_declared_hierarchy: 8,
        unresolved_overlap: 20,
      },
      source_policies: 6,
    });
    expect(new Set(reconciliationDecisions.city_identity_decisions.map((decision) => decision.candidate_id)).size)
      .toBe(353);
    expect(
      reconciliationDecisions.city_identity_decisions
        .filter((decision) => decision.disposition === 'accepted_same_place')
        .every((decision) => decision.canonical_place_id !== null
          && decision.observation_policy === 'keep_source_values_and_locators_separate'),
    ).toBe(true);
    expect(
      reconciliationDecisions.city_identity_decisions
        .filter((decision) => decision.disposition !== 'accepted_same_place')
        .every((decision) => decision.canonical_place_id === null),
    ).toBe(true);
    expect(new Set(reconciliationDecisions.border_overlap_decisions.map((decision) => decision.candidate_key)).size)
      .toBe(28);
    expect(
      reconciliationDecisions.border_overlap_decisions
        .every((decision) => decision.population_allocation === 'prohibited'),
    ).toBe(true);
    expect(manifest.reconciliation).toMatchObject({
      decision_set_id: reconciliationDecisions.decision_set_id,
      city_candidates: 353,
      border_candidates: 28,
      unresolved_city_identities: 2,
      unresolved_border_overlaps: 20,
    });
    expect(historicalCities.reconciliation_decision_set_id).toBe(reconciliationDecisions.decision_set_id);
    expect(
      historicalCities.cities.some(
        (city) => city.reconciliation_status === 'linked_across_sources'
          && city.canonical_place_id !== null
          && city.linked_source_record_count >= 2,
      ),
    ).toBe(true);

    expect(reviewQueue.status).toBe('versioned_decisions_applied_unresolved_evidence_preserved');
    expect(reviewQueue.decision_set.id).toBe(reconciliationDecisions.decision_set_id);
    expect(reviewQueue.source_policies).toHaveLength(6);
    expect(reviewQueue.border_overlaps.candidates).toHaveLength(28);
    expect(reviewQueue.city_identities.candidates).toHaveLength(353);
    expect(
      reviewQueue.border_overlaps.candidates.filter(
        (candidate) => candidate.decision.disposition === 'source_declared_hierarchy',
      ),
    ).toHaveLength(8);
    expect(
      reviewQueue.city_identities.candidates.filter(
        (candidate) => candidate.decision.disposition === 'unresolved_identity',
      ),
    ).toHaveLength(2);
  });

  it('records bounded source acquisition findings without promoting blocked data', () => {
    expect(cshapesProfile.review_status).toBe('acquired_profiled_comparison_only_not_published');
    expect(cshapesProfile.profile).toMatchObject({
      features: 710,
      invalid_geometries: 11,
      start_date: '1886-01-01',
      end_date: '2019-12-31',
    });
    expect(cshapesProfile.publication_blockers.length).toBeGreaterThan(0);

    expect(hydeProfile.review_status).toBe(
      'documentation_and_one_baseline_population_bundle_profiled_not_published',
    );
    expect(hydeProfile.population_count_grid_profile.populated_cells).toBe(2_215_829);
    expect(hydeProfile.population_count_grid_profile.sum_inhabitants).toBeCloseTo(4_487_003.996, 3);
    expect(hydeProfile.terms_conflict).toEqual({
      archive_license_file: 'CC BY-NC 4.0',
      readme_statement: 'CC BY 3.0',
      status: 'provider_clarification_required',
    });

    expect(maddisonStatus.review_status).toBe('official_release_verified_workbook_not_acquired');
    expect(maddisonStatus.acquisition_attempt).toMatchObject({
      direct_http_result: 'HTTP_200_anti_bot_HTML_not_workbook',
      bypass_attempted: false,
    });
  });

  it('publishes WPP estimates and projections separately while conserving its source universe', () => {
    expect(populationOutlook.entities).toHaveLength(237);
    expect(populationOutlook.observations).toHaveLength(237 * 151);
    expect(populationOutlook.observations.find((observation) => observation.year === 2023)?.evidence_state)
      .toBe('estimate');
    expect(populationOutlook.observations.find((observation) => observation.year === 2024)?.evidence_state)
      .toBe('medium_projection');
    expect(populationOutlook.observations.every((observation) => observation.year <= 2100)).toBe(true);
    for (const summary of populationOutlook.summaries) {
      const observations = populationOutlook.observations.filter(
        (observation) => observation.year === summary.year,
      );
      expect(observations).toHaveLength(237);
      expect(observations.reduce((sum, observation) => sum + observation.value, 0))
        .toBe(summary.total_population);
      expect(summary.total_population + summary.world_reference_rounding_residual)
        .toBe(summary.world_reference_population);
      expect(summary.mapped_population + summary.unplaced_population).toBe(summary.total_population);
    }
  });

  it('conserves the life-expectancy context distribution without creating person-level values', () => {
    for (const summary of lifeExpectancy.summaries) {
      const distributed = summary.bins.reduce((sum, bin) => sum + bin.population, 0);
      expect(distributed + summary.unknown_condition_population).toBe(summary.population);
      expect(summary.bins).toHaveLength(6);
    }
    const metric = manifest.metrics.find((candidate) => candidate.id === 'life_expectancy_at_birth');
    expect(metric?.aggregation_kind).toBe('context_distribution');
    expect(metric?.prohibited_interpretations).toContain('a person-level distribution');
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

  it('exports life expectancy with population weights and city points with their source coordinates', () => {
    const lifeLines = readFileSync(resolve(releaseRoot, 'life-expectancy.csv'), 'utf8').trim().split('\n');
    expect(lifeLines[0]).toBe(
      'code,year,value_years,status,population,population_status,original_record_locator,population_record_locator',
    );
    expect(lifeLines).toHaveLength(entities.length * lifeExpectancy.years.length + 1);
    const cityLines = readFileSync(resolve(releaseRoot, 'historical-cities.csv'), 'utf8').trim().split('\n');
    expect(cityLines).toHaveLength(historicalCities.observations.length + 1);
    expect(cityLines[0]).toContain('geocode_certainty_code');
  });
});
