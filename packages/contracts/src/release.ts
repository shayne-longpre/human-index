import type { AggregationKind, ValueStatus } from './types';

export type MvpMetricId = 'population_total' | 'access_to_electricity';

export interface AtlasEntity {
  code: string;
  name: string;
  region: string;
  income_group: string;
  support_type: string;
  map_status: 'placed' | 'unplaced';
}

export interface PublishedMetric {
  id: MvpMetricId;
  label: string;
  taxonomy_ids: string[];
  indicator: string;
  aggregation_kind: AggregationKind;
  unit: string;
  definition: string;
  available_years: number[];
  temporal_policy: 'exact_only' | 'valid_interval' | 'explicit_model';
  data_file: string;
  download_file: string;
  population_universe_id: string;
  support_type: string;
  display_scale: {
    transform: 'linear' | 'log1p' | 'categorical';
    fixed_domain?: [number, number];
    bins?: number[];
    scale_version: string;
  };
  safe_summary: string;
  prohibited_interpretations: string[];
}

export interface PopulationUniverse {
  id: string;
  label: string;
  entity_count: number;
  inclusion_rule: string;
  excluded_aggregate_count: number;
  reference_aggregate: string;
  review_status: string;
  reference_residual_range: [number, number];
  scope_label: string;
  notes: string[];
}

export interface AtlasReleaseManifest {
  schema_version: string;
  release_id: string;
  status: string;
  published_on: string;
  default_view: { metric_id: MvpMetricId; year: number };
  metrics: PublishedMetric[];
  population_universes: PopulationUniverse[];
  citations: Array<{ label: string; url: string; license: string }>;
  limitations: string[];
}

export interface PopulationObservation {
  code: string;
  year: number;
  value: number | null;
  status: Extract<ValueStatus, 'known' | 'unknown'>;
  original_record_locator: string;
}

export interface PopulationSummary {
  year: number;
  covered_population: number;
  known_entities: number;
  missing_population_entities: number;
  world_reference_population: number;
  reference_residual: number;
  unplaced_population: number;
}

export interface PopulationDataset {
  schema_version: string;
  metric_id: 'population_total';
  years: number[];
  observations: PopulationObservation[];
  summaries: PopulationSummary[];
}

export interface ElectricityObservation {
  code: string;
  year: number;
  value_percent: number | null;
  status: Extract<ValueStatus, 'known' | 'unknown'>;
  original_record_locator: string;
}

export interface ElectricitySummary {
  year: number;
  population: number;
  known_condition_entities: number;
  with_access: number;
  without_access: number;
  unknown_condition: number;
}

export interface ElectricityDataset {
  schema_version: string;
  metric_id: 'access_to_electricity';
  years: number[];
  observations: ElectricityObservation[];
  summaries: ElectricitySummary[];
}

export interface ViewRow {
  entity: AtlasEntity;
  year: number;
  population: PopulationObservation | null;
  metricValue: number | null;
  metricStatus: Extract<ValueStatus, 'known' | 'unknown'>;
  metricRecordLocator: string | null;
}

export function assertSupportedYear(metric: PublishedMetric, year: number): void {
  if (!metric.available_years.includes(year)) {
    throw new RangeError(`${metric.id} has no published observations for ${year}`);
  }
}

export function validatePublishedMetrics(metrics: readonly PublishedMetric[]): void {
  const ids = new Set<string>();
  for (const metric of metrics) {
    if (ids.has(metric.id)) throw new Error(`Duplicate published metric ${metric.id}`);
    ids.add(metric.id);
    if (metric.taxonomy_ids.length === 0) {
      throw new Error(`Published metric ${metric.id} needs at least one taxonomy`);
    }
    if (metric.available_years.length === 0) {
      throw new Error(`Published metric ${metric.id} has no available years`);
    }
    for (let index = 1; index < metric.available_years.length; index += 1) {
      if (metric.available_years[index] <= metric.available_years[index - 1]) {
        throw new Error(`Published metric ${metric.id} years are not strictly increasing`);
      }
    }
  }
}
