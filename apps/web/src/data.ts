import type {
  AtlasEntity,
  AtlasReleaseManifest,
  ElectricityDataset,
  HistoricalCityDataset,
  HistoricalContextIndex,
  HistoricalContextSnapshotReference,
  HistoricalSnapshotQuality,
  HistoricalPopulationDataset,
  LifeExpectancyDataset,
  MvpMetricId,
  PopulationOutlookDataset,
  PopulationDataset,
} from '@atlas/contracts';
import type { FeatureCollection, Geometry } from 'geojson';

export interface CountryProperties {
  code: string;
  name: string;
}

export type CountryFeatureCollection = FeatureCollection<Geometry, CountryProperties>;
export interface HistoricalProperties {
  name: string;
  feature_kind: 'polity';
  source_feature_index: number;
  source_feature_id: string;
  source_release_id: string;
  source_from_year: number;
  source_to_year: number;
  area_km2: number;
  wikipedia: string | null;
  wikidata: string | null;
  seshat_id: string | null;
  source_components: string[];
  source_member_of: string | null;
  source_relation_role: 'composite' | 'member' | 'unspecified';
  reconciliation_decision_set_id: string;
  reconciliation_status:
    | 'source_declared_hierarchy'
    | 'unresolved_overlap'
    | 'mixed_source_hierarchy_and_unresolved_overlap'
    | 'not_in_review_pilot';
  reconciliation_decision_ids: string[];
  overlap_decisions: Array<{
    decision_id: string;
    counterpart_source_feature_index: number;
    counterpart_name: string;
    disposition: 'source_declared_hierarchy' | 'unresolved_overlap';
  }>;
  unresolved_overlap_count: number;
  evidence_status: 'published_contestable_reconstruction';
  precision_class: string;
  label_position: [number, number];
  show_label: boolean;
}

export type HistoricalFeatureCollection = FeatureCollection<Geometry, HistoricalProperties> & {
  source_release_id: string;
  source_year: number;
  atlas_year: number;
  feature_count: number;
  excluded_feature_types: string[];
  dating_status: string;
  geometry_method: string;
  reconciliation_decision_set_id: string;
  quality: HistoricalSnapshotQuality;
};
export type MetricDataset =
  | PopulationDataset
  | PopulationOutlookDataset
  | ElectricityDataset
  | LifeExpectancyDataset;

export interface ReleaseBase {
  entities: AtlasEntity[];
  geometry: CountryFeatureCollection;
  manifest: AtlasReleaseManifest;
  population: PopulationDataset;
  historicalPopulation: HistoricalPopulationDataset;
  historicalContext: HistoricalContextIndex;
  historicalCities: HistoricalCityDataset;
}

export interface ReconciliationDecisionArtifact {
  schema_version: string;
  decision_set_id: string;
  status: string;
  summary: Record<string, unknown>;
  source_policies: Array<Record<string, unknown>>;
  place_clusters: Array<Record<string, unknown>>;
  city_identity_decisions: Array<Record<string, unknown>>;
  border_overlap_decisions: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export const releaseRoot = '/atlas/releases/atlas-mvp-2026-09-22-r6';
export const manifestUrl = `${releaseRoot}/manifest.json`;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function loadReleaseBase(): Promise<ReleaseBase> {
  const manifest = await getJson<AtlasReleaseManifest>(`${releaseRoot}/manifest.json`);
  const [entityPayload, geometry, population, historicalPopulation, historicalContext, historicalCities] = await Promise.all([
    getJson<{ entities: AtlasEntity[] }>(`${releaseRoot}/entities.json`),
    getJson<CountryFeatureCollection>(`${releaseRoot}/countries.geojson`),
    getJson<PopulationDataset>(`${releaseRoot}/population.json`),
    getJson<HistoricalPopulationDataset>(`${releaseRoot}/${manifest.deep_time_population.data_file}`),
    getJson<HistoricalContextIndex>(`${releaseRoot}/${manifest.historical_context.index_file}`),
    getJson<HistoricalCityDataset>(`${releaseRoot}/${manifest.historical_cities.data_file}`),
  ]);
  return {
    entities: entityPayload.entities,
    geometry,
    manifest,
    population,
    historicalPopulation,
    historicalContext,
    historicalCities,
  };
}

const metricCache = new Map<MvpMetricId, Promise<MetricDataset>>();

export function loadMetricData(
  metricId: MvpMetricId,
  manifest: AtlasReleaseManifest,
): Promise<MetricDataset> {
  const existing = metricCache.get(metricId);
  if (existing) return existing;
  const metric = manifest.metrics.find((candidate) => candidate.id === metricId);
  if (!metric) return Promise.reject(new Error(`Release does not define ${metricId}`));
  const pending = getJson<MetricDataset>(`${releaseRoot}/${metric.data_file}`).catch((error: unknown) => {
    metricCache.delete(metricId);
    throw error;
  });
  metricCache.set(metricId, pending);
  return pending;
}

export function downloadUrl(metricId: MvpMetricId, manifest: AtlasReleaseManifest): string {
  const metric = manifest.metrics.find((candidate) => candidate.id === metricId);
  if (!metric) throw new Error(`Release does not define ${metricId}`);
  return `${releaseRoot}/${metric.download_file}`;
}

export function historicalPopulationDownloadUrl(manifest: AtlasReleaseManifest): string {
  return `${releaseRoot}/${manifest.deep_time_population.download_file}`;
}

let reconciliationCache: Promise<ReconciliationDecisionArtifact> | null = null;

export function loadReconciliationDecisions(
  manifest: AtlasReleaseManifest,
): Promise<ReconciliationDecisionArtifact> {
  if (reconciliationCache) return reconciliationCache;
  reconciliationCache = getJson<ReconciliationDecisionArtifact>(
    `${releaseRoot}/${manifest.reconciliation.data_file}`,
  ).then((artifact) => {
    if (artifact.decision_set_id !== manifest.reconciliation.decision_set_id) {
      throw new Error('Reconciliation artifact does not match the release manifest');
    }
    return artifact;
  }).catch((error: unknown) => {
    reconciliationCache = null;
    throw error;
  });
  return reconciliationCache;
}

const historicalSnapshotCache = new Map<string, Promise<HistoricalFeatureCollection>>();

export function loadHistoricalSnapshot(
  reference: HistoricalContextSnapshotReference,
): Promise<HistoricalFeatureCollection> {
  const existing = historicalSnapshotCache.get(reference.file);
  if (existing) return existing;
  const pending = getJson<HistoricalFeatureCollection>(`${releaseRoot}/${reference.file}`).catch(
    (error: unknown) => {
      historicalSnapshotCache.delete(reference.file);
      throw error;
    },
  );
  historicalSnapshotCache.set(reference.file, pending);
  return pending;
}

export function prefetchHistoricalSnapshot(reference: HistoricalContextSnapshotReference | undefined): void {
  if (reference) void loadHistoricalSnapshot(reference).catch(() => undefined);
}
