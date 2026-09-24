import type { AtlasReleaseManifest, MvpMetricId } from '@atlas/contracts';

export interface AtlasMapCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface AtlasUrlViewState {
  metricId: MvpMetricId;
  year: number;
  selectedCode: string | null;
  historicalEnabled: boolean;
  citiesEnabled: boolean;
  scaleMode: 'published';
  camera: AtlasMapCamera;
}

export const DEFAULT_MAP_CAMERA: AtlasMapCamera = {
  longitude: 8,
  latitude: 14,
  zoom: 1.12,
  pitch: 18,
  bearing: 0,
};

function boundedNumber(value: string | null, fallback: number, minimum: number, maximum: number): number {
  const parsed = value === null ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

function rounded(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

export function normalizeAtlasMapCamera(camera: AtlasMapCamera): AtlasMapCamera {
  return {
    longitude: Number(rounded(camera.longitude, 5)),
    latitude: Number(rounded(camera.latitude, 5)),
    zoom: Number(rounded(camera.zoom, 3)),
    pitch: Number(rounded(camera.pitch, 2)),
    bearing: Number(rounded(camera.bearing, 2)),
  };
}

export function parseAtlasViewState(
  search: string,
  manifest: AtlasReleaseManifest,
  timelineYears: readonly number[],
  entityCodes: ReadonlySet<string>,
): AtlasUrlViewState {
  const parameters = new URLSearchParams(search);
  const requestedRelease = parameters.get('release');
  if (requestedRelease && requestedRelease !== manifest.release_id) {
    throw new Error(
      `This link pins Atlas release ${requestedRelease}, which is not available in this build. `
      + `The loaded release is ${manifest.release_id}.`,
    );
  }
  const metric = manifest.metrics.find((candidate) => candidate.id === parameters.get('metric'))
    ?? manifest.metrics.find((candidate) => candidate.id === manifest.default_view.metric_id)
    ?? manifest.metrics[0];
  const requestedYearParameter = parameters.get('year');
  const requestedYear = requestedYearParameter === null ? Number.NaN : Number(requestedYearParameter);
  const firstYear = timelineYears[0];
  const lastYear = timelineYears[timelineYears.length - 1];
  const year = Number.isInteger(requestedYear) && requestedYear >= firstYear && requestedYear <= lastYear
    ? requestedYear
    : manifest.default_view.year;
  const requestedCode = parameters.get('place');
  const selectedCode = requestedCode
    && /^[A-Z0-9]{3}$/.test(requestedCode)
    && (entityCodes.has(requestedCode) || metric.id === 'population_outlook')
    ? requestedCode
    : null;
  return {
    metricId: metric.id,
    year,
    selectedCode,
    historicalEnabled: parameters.get('borders') !== '0',
    citiesEnabled: parameters.get('cities') !== '0',
    scaleMode: 'published',
    camera: {
      longitude: boundedNumber(parameters.get('lng'), DEFAULT_MAP_CAMERA.longitude, -180, 180),
      latitude: boundedNumber(parameters.get('lat'), DEFAULT_MAP_CAMERA.latitude, -80, 80),
      zoom: boundedNumber(parameters.get('z'), DEFAULT_MAP_CAMERA.zoom, 0.75, 7),
      pitch: boundedNumber(parameters.get('pitch'), DEFAULT_MAP_CAMERA.pitch, 0, 60),
      bearing: boundedNumber(parameters.get('bearing'), DEFAULT_MAP_CAMERA.bearing, -180, 180),
    },
  };
}

export function atlasViewSearch(manifest: AtlasReleaseManifest, state: AtlasUrlViewState): string {
  const camera = normalizeAtlasMapCamera(state.camera);
  const parameters = new URLSearchParams();
  parameters.set('release', manifest.release_id);
  parameters.set('metric', state.metricId);
  parameters.set('year', String(state.year));
  if (state.selectedCode) parameters.set('place', state.selectedCode);
  parameters.set('borders', state.historicalEnabled ? '1' : '0');
  parameters.set('cities', state.citiesEnabled ? '1' : '0');
  parameters.set('scale', state.scaleMode);
  parameters.set('lng', String(camera.longitude));
  parameters.set('lat', String(camera.latitude));
  parameters.set('z', String(camera.zoom));
  parameters.set('pitch', String(camera.pitch));
  parameters.set('bearing', String(camera.bearing));
  return `?${parameters.toString()}`;
}

export function camerasEqual(left: AtlasMapCamera, right: AtlasMapCamera): boolean {
  return Math.abs(left.longitude - right.longitude) < 0.00001
    && Math.abs(left.latitude - right.latitude) < 0.00001
    && Math.abs(left.zoom - right.zoom) < 0.001
    && Math.abs(left.pitch - right.pitch) < 0.01
    && Math.abs(left.bearing - right.bearing) < 0.01;
}
