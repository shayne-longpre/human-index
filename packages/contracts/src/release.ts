import type { AggregationKind, ValueStatus } from './types';

export type MvpMetricId =
  | 'population_total'
  | 'population_outlook'
  | 'access_to_electricity'
  | 'life_expectancy_at_birth'
  | 'gdp_per_capita_constant_2015_usd';

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
  source_release_ids: string[];
  indicator: string;
  aggregation_kind: AggregationKind;
  unit: string;
  definition: string;
  available_years: number[];
  temporal_policy: 'exact_only' | 'valid_interval' | 'explicit_model';
  data_file: string;
  download_file: string;
  population_universe_id: string | null;
  population_universe_periods?: Array<{
    start_year: number;
    end_year: number;
    population_universe_id: string;
  }>;
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

export interface PublishedSourceRelease {
  id: string;
  publisher: string;
  retrieved_on: string;
  license: string;
  source_update?: string;
  profile?: Record<string, unknown>;
}

export interface AlternativeSource {
  id: string;
  role: string;
  status: string;
  url: string;
  coverage?: string;
  reason_deferred: string;
}

export interface PublishedTaxonomy {
  id: string;
  families: Array<{ id: string; label: string }>;
}

export interface PublishedTransformation {
  id: string;
  version: string;
  input_artifact_ids: string[];
  parameters: Record<string, unknown>;
  validation: Record<string, unknown>;
  output_artifacts: Record<string, { bytes: number; sha256: string }>;
}

export interface PopulationSurfaceReference {
  source_release_id: string;
  year: number;
  evidence_state: 'modeled_estimate' | 'projection';
  data_file: string;
  download_file: string;
  source_artifact_id: string;
  source_artifact_sha256: string;
  source_total_people: number;
  published_bin_total_people: number;
  unassigned_outside_grid_people: number;
  covered_bin_count: number;
}

export interface PopulationSurfaceDataset {
  schema_version: '0.1.0';
  source_release_id: string;
  source_year: number;
  statistical_support: string;
  display_geometry: string;
  cell_area_km2_by_row: number[];
  source_artifact: {
    filename: string;
    archive_member: string;
    bytes: number;
    sha256: string;
    crs: string;
    width: number;
    height: number;
    nodata: number;
  };
  transformation: {
    id: string;
    version: string;
    grid_degrees: 1;
    area_method: 'WGS84_ellipsoid_geodesic_1_degree_bin_area';
    temporal_policy: 'exact_source_year_only';
    political_allocation: 'none';
    source_positive_pixels: number;
    source_total_people: number;
    published_bin_total_people: number;
    unassigned_outside_grid_people: number;
    unassigned_outside_grid_pixels: number;
    floating_point_residual_people: number;
    covered_bin_count: number;
    known_zero_bin_count: number;
    no_data_bin_count: number;
  };
  cells: Array<[column: number, row: number, people: number]>;
}

export interface EconomicDatasetReference {
  id: string;
  source_release_id: string;
  source_artifact_id: string;
  source_artifact_sha256: string;
  indicator: string;
  label: string;
  unit: string;
  support_type: string;
  observation_grain?: 'survey_record';
  temporal_policy: 'exact_source_year_only';
  available_years: number[];
  source_row_count: number;
  known_value_count: number;
  data_file: string;
  download_file: string;
}

export interface EconomicEvidenceDataset {
  schema_version: '0.1.0';
  id: string;
  source_release_id: string;
  source_artifact_id: string;
  source_artifact_sha256: string;
  source_sheet: string;
  source_column?: string;
  indicator: string;
  label: string;
  unit: string;
  support_type: string;
  observation_grain?: 'survey_record';
  temporal_policy: 'exact_source_year_only';
  transformation: { id: string; version: string; policy: string };
  source_note: string;
  source_citation_url: string;
  source_supports: Array<{ code: string; name: string; region: string | null; country_code?: string; welfare_type?: string; reporting_year?: number }>;
  source_references: Array<{ source_sheet: string; source_row: number; countrycode: string | null; period_as_written: string | null; citation_as_written: string }>;
  global_source_note?: string;
  source_row_count: number;
  known_value_count: number;
  available_years: number[];
  known_by_year: Record<string, number>;
  observations: Array<[code: string, year: number, value: number, source_row: number, companion_population_thousands?: number | null]>;
}

export interface InstitutionalDatasetReference {
  id: string;
  domain: 'government_institutions' | 'religion_policy';
  source_release_id: string;
  source_artifact_id: string;
  source_artifact_sha256: string;
  source_variable: string;
  label: string;
  unit: string;
  kind: 'fraction' | 'ordinal';
  available_years: number[];
  source_row_count: number;
  known_value_count: number;
  data_file: string;
  download_file: string;
}

export interface ConflictDatasetReference {
  kind: 'acd' | 'cy';
  source_release_id: string;
  source_artifact_id: string;
  source_artifact_sha256: string;
  data_file: string;
  download_file: string;
  source_row_count: number;
  available_years: number[];
}

export interface ConflictAcdRow {
  conflict_id: number; year: number; location: string; side_a: string; side_b: string;
  gwno_loc: string; type_of_conflict: number; intensity_level: 1 | 2;
  original_record_locator: string;
}

export interface ConflictCountryYearRow {
  country_id: number; country: string; year: number;
  sb_exist: 0 | 1; ns_exist: 0 | 1; os_exist: 0 | 1;
  sb_total_deaths_best: number; ns_total_deaths_best: number; os_total_deaths_best: number;
  cumulative_total_deaths_in_orgvio_best: number;
  cumulative_total_deaths_in_orgvio_low: number;
  cumulative_total_deaths_in_orgvio_high: number;
  original_record_locator: string;
}

export interface ConflictEvidenceDataset {
  schema_version: '0.1.0';
  source_release_id: string;
  support: string;
  years: number[];
  rows: Array<ConflictAcdRow | ConflictCountryYearRow>;
  source_row_count: number;
  nonmonotonic_low_best_high_rows?: number;
}

export function validateConflictEvidenceDataset(dataset: ConflictEvidenceDataset, reference: ConflictDatasetReference): void {
  if (dataset.schema_version !== '0.1.0' || dataset.source_release_id !== reference.source_release_id
    || dataset.source_row_count !== reference.source_row_count || dataset.rows.length !== reference.source_row_count
    || JSON.stringify(dataset.years) !== JSON.stringify(reference.available_years)) {
    throw new Error(`Conflict dataset ${reference.source_release_id} does not match its release reference`);
  }
  const keys = new Set<string>();
  for (const row of dataset.rows) {
    if (!Number.isInteger(row.year) || !reference.available_years.includes(row.year)) {
      throw new Error('Conflict row has an invalid source year');
    }
    const key = reference.kind === 'acd'
      ? `${(row as ConflictAcdRow).conflict_id}:${row.year}`
      : `${(row as ConflictCountryYearRow).country_id}:${row.year}`;
    if (keys.has(key) || !row.original_record_locator) throw new Error('Conflict row has a duplicate key or missing locator');
    keys.add(key);
  }
}

export interface InstitutionalEvidenceDataset extends Omit<InstitutionalDatasetReference, 'data_file' | 'download_file'> {
  schema_version: '0.1.0';
  category_labels: Record<string, string> | null;
  codebook_page: number;
  meaning: string;
  support_type: string;
  temporal_policy: 'exact_source_year_only';
  transformation: { id: 'vdem-source-native-institutions-v1'; version: '1.0.0'; policy: string };
  source_citation_url: string;
  source_supports: Array<{ code: string; source_text_id: string; name: string }>;
  source_rows: Array<[support_id: string, year: number, source_row: number]>;
  known_by_year: Record<string, number>;
  observations: Array<[support_id: string, year: number, value: number, source_row: number]>;
}

export function validateInstitutionalEvidenceDataset(
  dataset: InstitutionalEvidenceDataset,
  reference: InstitutionalDatasetReference,
): void {
  if (dataset.schema_version !== '0.1.0' || dataset.id !== reference.id
    || dataset.domain !== reference.domain || dataset.source_release_id !== reference.source_release_id
    || dataset.source_artifact_id !== reference.source_artifact_id
    || dataset.source_artifact_sha256 !== reference.source_artifact_sha256
    || dataset.source_variable !== reference.source_variable || dataset.kind !== reference.kind
    || dataset.source_row_count !== reference.source_row_count
    || dataset.observations.length !== reference.known_value_count
    || JSON.stringify(dataset.available_years) !== JSON.stringify(reference.available_years)
    || dataset.temporal_policy !== 'exact_source_year_only'
    || dataset.transformation.id !== 'vdem-source-native-institutions-v1'
    || dataset.transformation.version !== '1.0.0') {
    throw new Error(`Institutional dataset ${reference.id} does not match its release reference`);
  }
  const supports = new Set(dataset.source_supports.map((item) => item.code));
  if (supports.size !== dataset.source_supports.length || dataset.source_rows.length !== reference.source_row_count) {
    throw new Error(`Invalid institutional supports or source rows in ${reference.id}`);
  }
  const sourceRows = new Map<string, number>();
  for (const [code, year, sourceRow] of dataset.source_rows) {
    const key = `${code}:${year}`;
    if (!supports.has(code) || sourceRows.has(key) || !Number.isInteger(year) || !Number.isInteger(sourceRow) || sourceRow < 1) {
      throw new Error(`Invalid institutional source row in ${reference.id}`);
    }
    sourceRows.set(key, sourceRow);
  }
  const seen = new Set<string>();
  const counts = new Map<number, number>();
  for (const [code, year, value, sourceRow] of dataset.observations) {
    const key = `${code}:${year}`;
    if (sourceRows.get(key) !== sourceRow || seen.has(key) || !Number.isInteger(year) || !Number.isInteger(sourceRow)
      || sourceRow < 1 || !Number.isFinite(value)
      || (reference.kind === 'fraction' && (value < 0 || value > 1))
      || (reference.kind === 'ordinal' && (!Number.isInteger(value) || !(String(value) in (dataset.category_labels ?? {}))))) {
      throw new Error(`Invalid institutional observation in ${reference.id}`);
    }
    seen.add(key);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  if (dataset.available_years.some((year) => counts.get(year) !== dataset.known_by_year[String(year)])) {
    throw new Error(`Institutional yearly coverage differs in ${reference.id}`);
  }
}

export function validateEconomicEvidenceDataset(dataset: EconomicEvidenceDataset, reference: EconomicDatasetReference): void {
  if (dataset.schema_version !== '0.1.0' || dataset.id !== reference.id
    || dataset.source_release_id !== reference.source_release_id
    || dataset.source_artifact_id !== reference.source_artifact_id
    || dataset.source_artifact_sha256 !== reference.source_artifact_sha256
    || dataset.temporal_policy !== 'exact_source_year_only'
    || !['economic-source-native-table-v1', 'pip-source-native-survey-table-v1', 'pwt-source-native-table-v1'].includes(dataset.transformation.id)
    || dataset.transformation.version !== '1.0.0'
    || dataset.observations.length !== reference.known_value_count
    || dataset.source_row_count !== reference.source_row_count
    || JSON.stringify(dataset.available_years) !== JSON.stringify(reference.available_years)) {
    throw new Error(`Economic dataset ${reference.id} does not match its release reference`);
  }
  const supports = new Set(dataset.source_supports.map((support) => support.code));
  if (supports.size !== dataset.source_supports.length || dataset.observation_grain !== reference.observation_grain) {
    throw new Error(`Economic dataset ${reference.id} has invalid supports or grain`);
  }
  const seen = new Set<string>();
  const counts = new Map<number, number>();
  for (const [code, year, value, row] of dataset.observations) {
    const key = `${code}:${year}`;
    if (!supports.has(code) || !Number.isInteger(year) || !Number.isFinite(value)
      || !Number.isInteger(row) || row < 1 || seen.has(key)) {
      throw new Error(`Economic dataset ${reference.id} has invalid or duplicate observations`);
    }
    seen.add(key);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  if (dataset.available_years.some((year) => counts.get(year) !== dataset.known_by_year[String(year)])) {
    throw new Error(`Economic dataset ${reference.id} has inconsistent yearly coverage`);
  }
}

export function validatePopulationSurfaceDataset(
  dataset: PopulationSurfaceDataset,
  reference: PopulationSurfaceReference,
): void {
  if (dataset.schema_version !== '0.1.0'
    || dataset.source_release_id !== reference.source_release_id
    || dataset.source_year !== reference.year
    || dataset.source_artifact.sha256 !== reference.source_artifact_sha256
    || dataset.transformation.version !== '1.0.0'
    || dataset.transformation.grid_degrees !== 1
    || dataset.transformation.political_allocation !== 'none') {
    throw new Error('Population surface does not match its release reference');
  }
  const seen = new Set<number>();
  if (dataset.cell_area_km2_by_row.length !== 180
    || dataset.cell_area_km2_by_row.some((area) => !Number.isFinite(area) || area <= 0)
    || dataset.transformation.area_method !== 'WGS84_ellipsoid_geodesic_1_degree_bin_area') {
    throw new Error('Population surface has invalid physical bin areas');
  }
  let total = 0;
  for (const [column, row, people] of dataset.cells) {
    const index = row * 360 + column;
    if (!Number.isInteger(column) || column < 0 || column >= 360
      || !Number.isInteger(row) || row < 0 || row >= 180
      || !Number.isFinite(people) || people < 0 || seen.has(index)) {
      throw new Error('Population surface has an invalid or duplicate cell');
    }
    seen.add(index);
    total += people;
  }
  if (seen.size !== reference.covered_bin_count
    || Math.abs(total - reference.published_bin_total_people) > 0.002
    || Math.abs(reference.source_total_people - total - reference.unassigned_outside_grid_people) > 0.002) {
    throw new Error('Population surface fails mass accounting');
  }
}

export interface AtlasReleaseManifest {
  schema_version: string;
  release_id: string;
  status: string;
  published_on: string;
  default_view: { metric_id: MvpMetricId; year: number };
  taxonomies: PublishedTaxonomy[];
  metrics: PublishedMetric[];
  population_universes: PopulationUniverse[];
  display_geometry: {
    source: string;
    version: string;
    scale: string;
    purpose: string;
    feature_count: number;
    crosswalks: Record<string, unknown>;
  };
  deep_time_population: {
    data_file: string;
    download_file: string;
    source_release_id: string;
    statistical_support: 'world';
    available_years: number[];
    coverage: string;
    interpretation: string;
  };
  historical_context: {
    index_file: string;
    source_release_id: string;
    coverage: string;
    purpose: 'display_only_not_population_accounting';
    snapshot_count: number;
    selection_policy: string;
    excluded_feature_types: string[];
    reconciliation_decision_set_id: string;
  };
  historical_cities: {
    data_file: string;
    download_file: string;
    source_release_id: string;
    coverage: string;
    temporal_policy: 'exact_only';
    spatial_support: string;
    interpretation: string;
    reconciliation_decision_set_id: string;
  };
  historical_city_companions?: Array<{
    source_release_id: string;
    data_file: string;
    download_file: string;
    source_artifact_sha256: string;
    city_count: number;
    observation_count: number;
    quarantined_zero_cells: number;
  }>;
  population_surfaces: {
    grid_degrees: 1;
    selection_policy: 'exact_source_year_only_no_splice_or_interpolation';
    default_source_release_id: string;
    snapshots: PopulationSurfaceReference[];
    interpretation: string;
  };
  economic_evidence?: {
    selection_policy: 'exact_source_year_only_no_geographic_or_release_splice';
    interpretation: string;
    datasets: EconomicDatasetReference[];
  };
  institutional_evidence?: {
    selection_policy: 'exact_source_year_only_no_geographic_or_release_splice';
    interpretation: string;
    datasets: InstitutionalDatasetReference[];
  };
  conflict_evidence?: {
    selection_policy: 'source_native_exact_year_no_geographic_join';
    interpretation: string;
    datasets: ConflictDatasetReference[];
  };
  reconciliation: {
    decision_set_id: string;
    data_file: string;
    status: string;
    city_candidates: number;
    border_candidates: number;
    unresolved_city_identities: number;
    unresolved_border_overlaps: number;
  };
  source_releases: PublishedSourceRelease[];
  alternative_sources: AlternativeSource[];
  transformations: PublishedTransformation[];
  artifacts: Record<string, { bytes: number; sha256: string }>;
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

export type PopulationEvidenceState = 'estimate' | 'medium_projection';

export interface PopulationOutlookEntity extends AtlasEntity {
  source_location_id: string;
}

export interface PopulationOutlookObservation extends PopulationObservation {
  value: number;
  status: 'known';
  evidence_state: PopulationEvidenceState;
  source_location_id: string;
}

export interface PopulationOutlookSummary {
  year: number;
  evidence_state: PopulationEvidenceState;
  source_country_area_count: number;
  total_population: number;
  world_reference_population: number;
  world_reference_rounding_residual: number;
  mapped_population: number;
  unplaced_population: number;
}

export interface PopulationOutlookDataset {
  schema_version: string;
  metric_id: 'population_outlook';
  source_release_id: string;
  population_universe_id: string;
  variant: 'Medium';
  reference_date: '1 July';
  source_unit: 'thousands of people';
  published_unit: 'people';
  estimate_years: [number, number];
  projection_years: [number, number];
  years: number[];
  entities: PopulationOutlookEntity[];
  observations: PopulationOutlookObservation[];
  summaries: PopulationOutlookSummary[];
}

export interface HistoricalPopulationObservation {
  year: number;
  source_year_label: string;
  lower: number;
  upper: number | null;
  status: 'point_estimate' | 'source_disagreement_range';
  source_method: 'historical_estimate_compilation';
  statistical_support: 'world';
  estimates: Record<string, { lower: number; upper?: number }>;
  original_record_locator: string;
}

export interface HistoricalPopulationDataset {
  schema_version: string;
  metric_id: 'population_total';
  statistical_support: 'world';
  source_release_id: string;
  temporal_policy: 'exact_only';
  observations: HistoricalPopulationObservation[];
}

export interface HistoricalContextSnapshotReference {
  atlas_year: number;
  source_year: number;
  file: string;
  feature_count: number;
  quality: HistoricalSnapshotQuality;
}

export interface HistoricalSnapshotQuality {
  duplicate_source_feature_ids: number;
  repeated_display_names: number;
  nonpositive_source_areas: number;
  geometry_type_counts: Record<string, number>;
  ring_count: number;
  unclosed_rings: number;
  invalid_coordinate_positions: number;
  topology_overlap_review: 'bounded_decision_set_applied_unresolved_overlaps_preserved';
  source_declared_composite_features: number;
  unresolved_overlap_features: number;
}

export interface HistoricalContextIndex {
  schema_version: string;
  source_release_id: string;
  feature_kind: 'political_context_not_statistical_support';
  selection_policy: string;
  source_profile: Record<string, unknown>;
  reconciliation_decision_set_id: string;
  snapshots: HistoricalContextSnapshotReference[];
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

export interface LifeExpectancyObservation {
  code: string;
  year: number;
  value_years: number | null;
  status: Extract<ValueStatus, 'known' | 'unknown'>;
  original_record_locator: string;
}

export interface LifeExpectancyBin {
  lower_inclusive: number;
  upper_exclusive: number;
  population: number;
}

export interface LifeExpectancySummary {
  year: number;
  population: number;
  known_condition_entities: number;
  missing_population_entities: number;
  unknown_condition_population: number;
  bins: LifeExpectancyBin[];
}

export interface LifeExpectancyDataset {
  schema_version: string;
  metric_id: 'life_expectancy_at_birth';
  years: number[];
  observations: LifeExpectancyObservation[];
  summaries: LifeExpectancySummary[];
}

export interface GdpPerCapitaObservation {
  code: string;
  year: number;
  value_constant_2015_usd: number | null;
  status: Extract<ValueStatus, 'known' | 'unknown'>;
  original_record_locator: string;
}

export interface GdpPerCapitaSummary {
  year: number;
  known_entities: number;
  unknown_entities: number;
  mapped_known_entities: number;
  unplaced_known_entities: number;
  aggregation_policy: 'coverage_counts_only_no_global_gdp_per_capita';
}

export interface GdpPerCapitaDataset {
  schema_version: string;
  metric_id: 'gdp_per_capita_constant_2015_usd';
  source_release_id: string;
  source_unit: 'constant 2015 US dollars per person';
  temporal_policy: 'exact_only';
  years: number[];
  observations: GdpPerCapitaObservation[];
  summaries: GdpPerCapitaSummary[];
}

export interface HistoricalCity {
  id: string;
  source_release_id?: string;
  source_record_id: string;
  name: string;
  other_name: string | null;
  modern_country_label: string;
  latitude: number;
  longitude: number;
  geocode_certainty_code: '1' | '2' | '3';
  canonical_place_id: string | null;
  reconciliation_status: 'linked_across_sources' | 'source_record_only';
  linked_source_record_count: number;
}

export interface HistoricalCityObservation {
  city_id: string;
  year: number;
  population: number;
  status: 'published_estimate';
  original_record_locator: string;
}

export interface HistoricalCityDataset {
  schema_version: string;
  layer_id: 'historical_city_population_points';
  source_release_id: string;
  temporal_policy: 'exact_only';
  spatial_support: 'source_geocoded_city_point_not_extent';
  reconciliation_decision_set_id: string;
  years: number[];
  cities: HistoricalCity[];
  observations: HistoricalCityObservation[];
  quarantined_cells?: Array<{ source_record_id: string; year: number; status: 'source_zero_unresolved'; original_record_locator: string }>;
}

export function validateHistoricalCityCompanionDataset(
  dataset: HistoricalCityDataset,
  reference: NonNullable<AtlasReleaseManifest['historical_city_companions']>[number],
): void {
  if (dataset.schema_version !== '0.5.0' || dataset.source_release_id !== reference.source_release_id
    || dataset.reconciliation_decision_set_id.length === 0 || dataset.temporal_policy !== 'exact_only'
    || dataset.cities.length !== reference.city_count || dataset.observations.length !== reference.observation_count
    || dataset.quarantined_cells?.length !== reference.quarantined_zero_cells) {
    throw new Error(`Historical city companion ${reference.source_release_id} does not match its release reference`);
  }
  const ids = new Set(dataset.cities.map((city) => city.id));
  if (ids.size !== dataset.cities.length || dataset.cities.some((city) => city.source_release_id !== reference.source_release_id
    || !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude))) {
    throw new Error(`Invalid historical city companion identities in ${reference.source_release_id}`);
  }
  const keys = new Set<string>();
  for (const observation of dataset.observations) {
    const key = `${observation.city_id}:${observation.year}`;
    if (!ids.has(observation.city_id) || keys.has(key) || !dataset.years.includes(observation.year)
      || !Number.isInteger(observation.population) || observation.population <= 0) {
      throw new Error(`Invalid historical city observation in ${reference.source_release_id}`);
    }
    keys.add(key);
  }
}

export interface ViewRow {
  entity: AtlasEntity;
  year: number;
  population: PopulationObservation | null;
  metricValue: number | null;
  metricStatus: Extract<ValueStatus, 'known' | 'unknown'>;
  metricRecordLocator: string | null;
  metricEvidenceState?: PopulationEvidenceState;
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

export function validateAtlasReleaseManifest(manifest: AtlasReleaseManifest): void {
  validatePublishedMetrics(manifest.metrics);

  const uniqueIds = (kind: string, ids: readonly string[]): Set<string> => {
    const result = new Set(ids);
    if (result.size !== ids.length) throw new Error(`Duplicate ${kind} id`);
    return result;
  };

  uniqueIds('taxonomy', manifest.taxonomies.map((taxonomy) => taxonomy.id));
  const familyIds = uniqueIds(
    'taxonomy family',
    manifest.taxonomies.flatMap((taxonomy) => taxonomy.families.map((family) => family.id)),
  );
  const universeIds = uniqueIds(
    'population universe',
    manifest.population_universes.map((universe) => universe.id),
  );
  const sourceReleaseIds = uniqueIds(
    'source release',
    manifest.source_releases.map((source) => source.id),
  );
  uniqueIds('transformation', manifest.transformations.map((transformation) => transformation.id));

  for (const metric of manifest.metrics) {
    if (new Set(metric.taxonomy_ids).size !== metric.taxonomy_ids.length) {
      throw new Error(`Published metric ${metric.id} repeats a taxonomy family`);
    }
    for (const taxonomyId of metric.taxonomy_ids) {
      if (!familyIds.has(taxonomyId)) {
        throw new Error(`Published metric ${metric.id} references unknown taxonomy family ${taxonomyId}`);
      }
    }
    if (metric.source_release_ids.length === 0) {
      throw new Error(`Published metric ${metric.id} does not declare a source release`);
    }
    if (new Set(metric.source_release_ids).size !== metric.source_release_ids.length) {
      throw new Error(`Published metric ${metric.id} repeats a source release`);
    }
    for (const sourceReleaseId of metric.source_release_ids) {
      if (!sourceReleaseIds.has(sourceReleaseId)) {
        throw new Error(`Published metric ${metric.id} references unknown source release ${sourceReleaseId}`);
      }
    }
    if (metric.population_universe_id !== null && metric.population_universe_periods?.length) {
      throw new Error(`Published metric ${metric.id} declares both primary and date-specific population universes`);
    }
    if (metric.population_universe_id !== null && !universeIds.has(metric.population_universe_id)) {
      throw new Error(`Published metric ${metric.id} references unknown population universe ${metric.population_universe_id}`);
    }
    if (metric.population_universe_id === null && !metric.population_universe_periods?.length) {
      throw new Error(`Published metric ${metric.id} does not declare a population universe`);
    }
    const periods = metric.population_universe_periods ?? [];
    for (const [index, period] of periods.entries()) {
      if (period.start_year > period.end_year) {
        throw new Error(`Published metric ${metric.id} has an inverted population-universe period`);
      }
      if (index > 0 && period.start_year <= periods[index - 1].end_year) {
        throw new Error(`Published metric ${metric.id} has overlapping population-universe periods`);
      }
      if (!universeIds.has(period.population_universe_id)) {
        throw new Error(
          `Published metric ${metric.id} references unknown population universe ${period.population_universe_id}`,
        );
      }
    }
    if (metric.population_universe_id === null) {
      for (const year of metric.available_years) {
        const matches = periods.filter((period) => year >= period.start_year && year <= period.end_year);
        if (matches.length !== 1) {
          throw new Error(`Published metric ${metric.id} does not resolve one population universe for ${year}`);
        }
      }
    }
    for (const file of [metric.data_file, metric.download_file]) {
      if (!(file in manifest.artifacts)) {
        throw new Error(`Published metric ${metric.id} references missing artifact ${file}`);
      }
    }
  }

  const defaultMetric = manifest.metrics.find((metric) => metric.id === manifest.default_view.metric_id);
  if (!defaultMetric) throw new Error(`Default metric ${manifest.default_view.metric_id} is not published`);
  if (!defaultMetric.available_years.includes(manifest.default_view.year)) {
    throw new Error('Default view year is not supported by its metric');
  }

  const layerSourceReferences = [
    manifest.deep_time_population.source_release_id,
    manifest.historical_context.source_release_id,
    manifest.historical_cities.source_release_id,
    ...(manifest.historical_city_companions ?? []).map((item) => item.source_release_id),
  ];
  for (const sourceReleaseId of layerSourceReferences) {
    if (!sourceReleaseIds.has(sourceReleaseId)) {
      throw new Error(`Published layer references unknown source release ${sourceReleaseId}`);
    }
  }

  const surfaces = manifest.population_surfaces;
  if (surfaces.grid_degrees !== 1 || surfaces.selection_policy !== 'exact_source_year_only_no_splice_or_interpolation') {
    throw new Error('Unknown population-surface selection contract');
  }
  if (!sourceReleaseIds.has(surfaces.default_source_release_id)) {
    throw new Error('Default population surface has an unknown source release');
  }
  const surfaceKeys = new Set<string>();
  for (const snapshot of surfaces.snapshots) {
    const key = `${snapshot.source_release_id}:${snapshot.year}`;
    if (surfaceKeys.has(key)) throw new Error(`Duplicate population surface ${key}`);
    surfaceKeys.add(key);
    if (!sourceReleaseIds.has(snapshot.source_release_id)) {
      throw new Error(`Population surface ${key} has an unknown source release`);
    }
    if (!manifest.artifacts[snapshot.data_file] || !manifest.artifacts[snapshot.download_file]) {
      throw new Error(`Population surface ${key} references a missing artifact`);
    }
    if (!/^[a-f0-9]{64}$/.test(snapshot.source_artifact_sha256)) {
      throw new Error(`Population surface ${key} has an invalid source checksum`);
    }
    if (snapshot.covered_bin_count <= 0 || snapshot.source_total_people < 0
      || snapshot.unassigned_outside_grid_people < 0
      || Math.abs(snapshot.source_total_people - snapshot.published_bin_total_people
        - snapshot.unassigned_outside_grid_people) > 0.002) {
      throw new Error(`Population surface ${key} fails population-mass accounting`);
    }
  }
  if (!surfaces.snapshots.some((snapshot) => snapshot.source_release_id === surfaces.default_source_release_id)) {
    throw new Error('Default population surface has no snapshot');
  }

  if (manifest.economic_evidence) {
    const economics = manifest.economic_evidence;
    if (economics.selection_policy !== 'exact_source_year_only_no_geographic_or_release_splice') {
      throw new Error('Unknown economic evidence selection policy');
    }
    uniqueIds('economic dataset', economics.datasets.map((dataset) => dataset.id));
    for (const dataset of economics.datasets) {
      if (!sourceReleaseIds.has(dataset.source_release_id)
        || !manifest.artifacts[dataset.data_file] || !manifest.artifacts[dataset.download_file]
        || !/^[a-f0-9]{64}$/.test(dataset.source_artifact_sha256)
        || dataset.temporal_policy !== 'exact_source_year_only'
        || dataset.known_value_count > dataset.source_row_count
        || dataset.available_years.length === 0
        || dataset.available_years.some((year, index) => index > 0 && year <= dataset.available_years[index - 1])) {
        throw new Error(`Invalid economic dataset reference ${dataset.id}`);
      }
    }
  }

  if (manifest.institutional_evidence) {
    const evidence = manifest.institutional_evidence;
    if (evidence.selection_policy !== 'exact_source_year_only_no_geographic_or_release_splice') {
      throw new Error('Unknown institutional evidence selection policy');
    }
    uniqueIds('institutional dataset', evidence.datasets.map((dataset) => dataset.id));
    for (const dataset of evidence.datasets) {
      if (!sourceReleaseIds.has(dataset.source_release_id)
        || !manifest.artifacts[dataset.data_file] || !manifest.artifacts[dataset.download_file]
        || !/^[a-f0-9]{64}$/.test(dataset.source_artifact_sha256)
        || dataset.known_value_count > dataset.source_row_count
        || dataset.available_years.length === 0
        || dataset.available_years.some((year, index) => index > 0 && year <= dataset.available_years[index - 1])) {
        throw new Error(`Invalid institutional dataset reference ${dataset.id}`);
      }
    }
  }

  if (manifest.conflict_evidence) {
    if (manifest.conflict_evidence.selection_policy !== 'source_native_exact_year_no_geographic_join') {
      throw new Error('Unknown conflict evidence selection policy');
    }
    uniqueIds('conflict dataset', manifest.conflict_evidence.datasets.map((item) => item.source_release_id));
    for (const item of manifest.conflict_evidence.datasets) {
      if (!sourceReleaseIds.has(item.source_release_id) || !manifest.artifacts[item.data_file]
        || !manifest.artifacts[item.download_file] || !/^[a-f0-9]{64}$/.test(item.source_artifact_sha256)
        || item.source_row_count <= 0 || item.available_years.length === 0) {
        throw new Error(`Invalid conflict dataset reference ${item.source_release_id}`);
      }
    }
  }

  const requiredArtifacts = [
    manifest.deep_time_population.data_file,
    manifest.deep_time_population.download_file,
    manifest.historical_context.index_file,
    manifest.historical_cities.data_file,
    manifest.historical_cities.download_file,
    ...(manifest.historical_city_companions ?? []).flatMap((item) => [item.data_file, item.download_file]),
    manifest.reconciliation.data_file,
  ];
  for (const file of requiredArtifacts) {
    if (!(file in manifest.artifacts)) throw new Error(`Published layer references missing artifact ${file}`);
  }
  if (
    manifest.historical_context.reconciliation_decision_set_id !== manifest.reconciliation.decision_set_id
    || manifest.historical_cities.reconciliation_decision_set_id !== manifest.reconciliation.decision_set_id
  ) {
    throw new Error('Published layers disagree on the reconciliation decision set');
  }
  if (manifest.historical_city_companions) {
    uniqueIds('historical city companion', manifest.historical_city_companions.map((item) => item.source_release_id));
    for (const companion of manifest.historical_city_companions) {
      if (!/^[a-f0-9]{64}$/.test(companion.source_artifact_sha256)
        || companion.city_count <= 0 || companion.observation_count <= 0
        || companion.quarantined_zero_cells < 0) {
        throw new Error(`Invalid historical city companion ${companion.source_release_id}`);
      }
    }
  }

  for (const [file, artifact] of Object.entries(manifest.artifacts)) {
    if (!Number.isInteger(artifact.bytes) || artifact.bytes <= 0) {
      throw new Error(`Artifact ${file} has an invalid byte count`);
    }
    if (!/^[a-f0-9]{64}$/.test(artifact.sha256)) {
      throw new Error(`Artifact ${file} has an invalid SHA-256`);
    }
  }

  for (const transformation of manifest.transformations) {
    for (const [file, output] of Object.entries(transformation.output_artifacts)) {
      const published = manifest.artifacts[file];
      if (!published) throw new Error(`Transformation ${transformation.id} emits unpublished artifact ${file}`);
      if (published.bytes !== output.bytes || published.sha256 !== output.sha256) {
        throw new Error(`Transformation ${transformation.id} metadata disagrees for ${file}`);
      }
    }
  }
}
