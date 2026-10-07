import type {
  AtlasEntity,
  AtlasReleaseManifest,
  HistoricalCity,
  HistoricalCityObservation,
  HistoricalContextSnapshotReference,
  HistoricalPopulationObservation,
  PopulationEvidenceState,
  PopulationUniverse,
  PopulationSurfaceReference,
  PublishedMetric,
  ViewRow,
} from './release';

export interface PublishedMapCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface AtlasViewBundleRow {
  entity: AtlasEntity;
  year: number;
  metric: {
    value: number | null;
    status: 'known' | 'unknown';
    original_record_locator: string | null;
    evidence_state?: PopulationEvidenceState;
  };
  population_weight: {
    value: number | null;
    status: 'known' | 'unknown';
    original_record_locator: string | null;
  };
}

export interface AtlasViewBundle {
  schema_version: '0.1.0';
  kind: 'atlas_reproducible_view';
  view: {
    release_id: string;
    metric_id: PublishedMetric['id'];
    requested_year: number;
    metric_supported: boolean;
    selected_support_code: string | null;
    scale_mode: 'published';
    layers: { historical_borders: boolean; historical_cities: boolean; population_grid_source_id: string | null };
    camera: PublishedMapCamera;
    effective_dates: {
      metric: number | null;
      political_context: number | null;
      historical_cities: number | null;
      population_grid: number | null;
    };
    pinned_query: string;
  };
  metric_definition: PublishedMetric;
  population_universe: PopulationUniverse | null;
  rows: AtlasViewBundleRow[];
  displayed_summary: unknown;
  historical_population_observation: HistoricalPopulationObservation | null;
  historical_context: {
    snapshot: HistoricalContextSnapshotReference | null;
    artifact: { bytes: number; sha256: string } | null;
    selected_source_feature_id: string | null;
  };
  population_surface: {
    snapshot: PopulationSurfaceReference | null;
    artifact: { bytes: number; sha256: string } | null;
  };
  historical_cities: Array<{ city: HistoricalCity; observation: HistoricalCityObservation }>;
  selected_historical_city_id: string | null;
  provenance: {
    release_manifest: AtlasReleaseManifest;
    reconciliation_decisions: unknown;
    source_releases: AtlasReleaseManifest['source_releases'];
    transformations: AtlasReleaseManifest['transformations'];
    citations: AtlasReleaseManifest['citations'];
    license_notices: Array<{ source_release_id: string; publisher: string; license: string }>;
  };
  interpretation: {
    safe_summary: string;
    prohibited_interpretations: string[];
    geometry_note: string;
    reproducibility_note: string;
  };
}

export interface CreateAtlasViewBundleInput {
  manifest: AtlasReleaseManifest;
  metric: PublishedMetric;
  requestedYear: number;
  metricSupported: boolean;
  selectedSupportCode: string | null;
  historicalBordersEnabled: boolean;
  historicalCitiesEnabled: boolean;
  populationSurfaceSourceId: string | null;
  populationSurface: PopulationSurfaceReference | null;
  camera: PublishedMapCamera;
  effectiveMetricYear: number | null;
  historicalSnapshot: HistoricalContextSnapshotReference | null;
  historicalCityEffectiveYear: number | null;
  pinnedQuery: string;
  rows: readonly ViewRow[];
  displayedSummary: unknown;
  historicalPopulationObservation: HistoricalPopulationObservation | null;
  historicalCities: Array<{ city: HistoricalCity; observation: HistoricalCityObservation }>;
  selectedHistoricalFeatureId: string | null;
  selectedHistoricalCityId: string | null;
  reconciliationDecisions: unknown;
}

function universeFor(metric: PublishedMetric, year: number, manifest: AtlasReleaseManifest): PopulationUniverse | null {
  const universeId = metric.population_universe_id
    ?? metric.population_universe_periods?.find(
      (period) => year >= period.start_year && year <= period.end_year,
    )?.population_universe_id;
  return manifest.population_universes.find((universe) => universe.id === universeId) ?? null;
}

export function createAtlasViewBundle(input: CreateAtlasViewBundleInput): AtlasViewBundle {
  const artifact = input.historicalSnapshot
    ? input.manifest.artifacts[input.historicalSnapshot.file] ?? null
    : null;
  const rows = [...input.rows]
    .sort((left, right) => left.entity.code.localeCompare(right.entity.code))
    .map((row): AtlasViewBundleRow => ({
      entity: row.entity,
      year: row.year,
      metric: {
        value: row.metricValue,
        status: row.metricStatus,
        original_record_locator: row.metricRecordLocator,
        ...(row.metricEvidenceState ? { evidence_state: row.metricEvidenceState } : {}),
      },
      population_weight: {
        value: row.population?.value ?? null,
        status: row.population?.status ?? 'unknown',
        original_record_locator: row.population?.original_record_locator ?? null,
      },
    }));
  return {
    schema_version: '0.1.0',
    kind: 'atlas_reproducible_view',
    view: {
      release_id: input.manifest.release_id,
      metric_id: input.metric.id,
      requested_year: input.requestedYear,
      metric_supported: input.metricSupported,
      selected_support_code: input.selectedSupportCode,
      scale_mode: 'published',
      layers: {
        historical_borders: input.historicalBordersEnabled,
        historical_cities: input.historicalCitiesEnabled,
        population_grid_source_id: input.populationSurfaceSourceId,
      },
      camera: input.camera,
      effective_dates: {
        metric: input.effectiveMetricYear,
        political_context: input.historicalSnapshot?.atlas_year ?? null,
        historical_cities: input.historicalCityEffectiveYear,
        population_grid: input.populationSurface?.year ?? null,
      },
      pinned_query: input.pinnedQuery,
    },
    metric_definition: input.metric,
    population_universe: universeFor(input.metric, input.requestedYear, input.manifest),
    rows,
    displayed_summary: input.displayedSummary,
    historical_population_observation: input.historicalPopulationObservation,
    historical_context: {
      snapshot: input.historicalSnapshot,
      artifact,
      selected_source_feature_id: input.selectedHistoricalFeatureId,
    },
    population_surface: {
      snapshot: input.populationSurface,
      artifact: input.populationSurface
        ? input.manifest.artifacts[input.populationSurface.data_file] ?? null
        : null,
    },
    historical_cities: input.historicalCities,
    selected_historical_city_id: input.selectedHistoricalCityId,
    provenance: {
      release_manifest: input.manifest,
      reconciliation_decisions: input.reconciliationDecisions,
      source_releases: input.manifest.source_releases,
      transformations: input.manifest.transformations,
      citations: input.manifest.citations,
      license_notices: input.manifest.source_releases.map((source) => ({
        source_release_id: source.id,
        publisher: source.publisher,
        license: source.license,
      })),
    },
    interpretation: {
      safe_summary: input.metric.safe_summary,
      prohibited_interpretations: input.metric.prohibited_interpretations,
      geometry_note: 'Statistical supports, historical political geography, and display geometry remain separate.',
      reproducibility_note: 'This bundle pins an immutable release and references release artifacts by SHA-256; it does not silently refresh source data.',
    },
  };
}

export function validateAtlasViewBundle(bundle: AtlasViewBundle): void {
  if (bundle.kind !== 'atlas_reproducible_view' || bundle.schema_version !== '0.1.0') {
    throw new Error('Unknown Atlas view-bundle contract');
  }
  if (bundle.view.release_id !== bundle.provenance.release_manifest.release_id) {
    throw new Error('View bundle release does not match its manifest');
  }
  if (bundle.view.metric_id !== bundle.metric_definition.id) {
    throw new Error('View bundle metric does not match its definition');
  }
  const pinned = new URLSearchParams(bundle.view.pinned_query);
  const expectedPinnedValues: Array<[string, string]> = [
    ['release', bundle.view.release_id],
    ['metric', bundle.view.metric_id],
    ['year', String(bundle.view.requested_year)],
    ['borders', bundle.view.layers.historical_borders ? '1' : '0'],
    ['cities', bundle.view.layers.historical_cities ? '1' : '0'],
    ['surface', bundle.view.layers.population_grid_source_id ?? 'off'],
    ['scale', bundle.view.scale_mode],
  ];
  for (const [key, expected] of expectedPinnedValues) {
    if (pinned.get(key) !== expected) throw new Error(`View bundle query does not pin ${key}`);
  }
  if (pinned.get('place') !== bundle.view.selected_support_code) {
    throw new Error('View bundle query does not pin its selected support');
  }
  const surface = bundle.population_surface.snapshot;
  if (surface) {
    if (surface.source_release_id !== bundle.view.layers.population_grid_source_id
      || surface.year !== bundle.view.requested_year
      || bundle.view.effective_dates.population_grid !== surface.year
      || bundle.population_surface.artifact?.sha256 !== bundle.provenance.release_manifest.artifacts[surface.data_file]?.sha256) {
      throw new Error('View bundle population grid does not match its release artifact');
    }
  } else if (bundle.view.effective_dates.population_grid !== null || bundle.population_surface.artifact !== null) {
    throw new Error('Unavailable population grid cannot have an effective date or artifact');
  }
  const decisionSet = bundle.provenance.reconciliation_decisions as { decision_set_id?: unknown };
  if (decisionSet?.decision_set_id !== bundle.provenance.release_manifest.reconciliation.decision_set_id) {
    throw new Error('View bundle reconciliation artifact does not match the release');
  }
  const rowCodes = bundle.rows.map((row) => row.entity.code);
  if (new Set(rowCodes).size !== rowCodes.length) throw new Error('View bundle repeats a statistical support');
  if (
    bundle.rows.length > 0
    && bundle.view.selected_support_code !== null
    && !rowCodes.includes(bundle.view.selected_support_code)
  ) {
    throw new Error('View bundle selects a support absent from its rows');
  }
  for (const row of bundle.rows) {
    if (row.year !== bundle.view.requested_year) throw new Error('View bundle row uses another year');
    if (row.metric.status === 'unknown' && row.metric.value !== null) {
      throw new Error('Unknown view-bundle metric value must be null');
    }
    if (row.metric.status === 'known' && row.metric.value === null) {
      throw new Error('Known view-bundle metric value must be numeric');
    }
    if (row.population_weight.status === 'unknown' && row.population_weight.value !== null) {
      throw new Error('Unknown view-bundle population weight must be null');
    }
    if (row.population_weight.status === 'known' && row.population_weight.value === null) {
      throw new Error('Known view-bundle population weight must be numeric');
    }
  }
  const camera = bundle.view.camera;
  if (
    camera.longitude < -180 || camera.longitude > 180
    || camera.latitude < -80 || camera.latitude > 80
    || camera.zoom < 0.75 || camera.zoom > 7
    || camera.pitch < 0 || camera.pitch > 60
    || camera.bearing < -180 || camera.bearing > 180
  ) {
    throw new Error('View bundle camera is outside published bounds');
  }
  const pinnedCamera = {
    longitude: Number(pinned.get('lng')),
    latitude: Number(pinned.get('lat')),
    zoom: Number(pinned.get('z')),
    pitch: Number(pinned.get('pitch')),
    bearing: Number(pinned.get('bearing')),
  };
  if (
    !Number.isFinite(pinnedCamera.longitude)
    || !Number.isFinite(pinnedCamera.latitude)
    || !Number.isFinite(pinnedCamera.zoom)
    || !Number.isFinite(pinnedCamera.pitch)
    || !Number.isFinite(pinnedCamera.bearing)
    || pinnedCamera.longitude !== camera.longitude
    || pinnedCamera.latitude !== camera.latitude
    || pinnedCamera.zoom !== camera.zoom
    || pinnedCamera.pitch !== camera.pitch
    || pinnedCamera.bearing !== camera.bearing
  ) {
    throw new Error('View bundle query camera does not match the exported camera');
  }
}

export function atlasViewBundleFilename(bundle: AtlasViewBundle): string {
  return `atlas-view-${bundle.view.release_id}-${bundle.view.metric_id}-${bundle.view.requested_year}.json`;
}
