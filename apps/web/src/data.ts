import type {
  AtlasEntity,
  AtlasReleaseManifest,
  ElectricityDataset,
  MvpMetricId,
  PopulationDataset,
} from '@atlas/contracts';
import type { FeatureCollection, Geometry } from 'geojson';

export interface CountryProperties {
  code: string;
  name: string;
}

export type CountryFeatureCollection = FeatureCollection<Geometry, CountryProperties>;
export type MetricDataset = PopulationDataset | ElectricityDataset;

export interface ReleaseBase {
  entities: AtlasEntity[];
  geometry: CountryFeatureCollection;
  manifest: AtlasReleaseManifest;
  population: PopulationDataset;
}

export const releaseRoot = '/atlas/releases/world-bank-mvp-2026-09-20-r1';
export const manifestUrl = `${releaseRoot}/manifest.json`;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function loadReleaseBase(): Promise<ReleaseBase> {
  const [entityPayload, geometry, manifest, population] = await Promise.all([
    getJson<{ entities: AtlasEntity[] }>(`${releaseRoot}/entities.json`),
    getJson<CountryFeatureCollection>(`${releaseRoot}/countries.geojson`),
    getJson<AtlasReleaseManifest>(`${releaseRoot}/manifest.json`),
    getJson<PopulationDataset>(`${releaseRoot}/population.json`),
  ]);
  return { entities: entityPayload.entities, geometry, manifest, population };
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
