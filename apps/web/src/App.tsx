import {
  aggregatePrevalence,
  atlasViewBundleFilename,
  buildEvidenceTimelineYears,
  createAtlasViewBundle,
  formatAstronomicalYear,
  nearestTimelineIndex,
  resolveHistoricalSnapshot,
  validateAtlasViewBundle,
  validateAtlasReleaseManifest,
  type MvpMetricId,
  type LifeExpectancyDataset,
  type GdpPerCapitaDataset,
  type PopulationOutlookDataset,
  type PopulationSurfaceDataset,
} from '@atlas/contracts';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from './components/DataTable';
import { Inspector } from './components/Inspector';
import { HistoricalInspector } from './components/HistoricalInspector';
import { HistoricalPopulationTable } from './components/HistoricalPopulationTable';
import { HistoricalCityInspector } from './components/HistoricalCityInspector';
import { Legend } from './components/Legend';
import type { HistoricalCityPoint } from './components/MapView';
import { LifeExpectancyDistribution } from './components/LifeExpectancyDistribution';
import { PopulationBar } from './components/PopulationBar';
import { PopulationTimeline } from './components/PopulationTimeline';
import { PopulationOutlookSummary } from './components/PopulationOutlookSummary';
import { PopulationSurfacePanel } from './components/PopulationSurfacePanel';
import { TerritorialCoverageSummary } from './components/TerritorialCoverageSummary';
import { SourcesPage } from './components/SourcesPage';
import { ReviewPage } from './components/ReviewPage';
import { EconomicsPage } from './components/EconomicsPage';
import { InstitutionsPage } from './components/InstitutionsPage';
import {
  downloadUrl,
  historicalPopulationDownloadUrl,
  loadHistoricalSnapshot,
  loadMetricData,
  loadPopulationSurface,
  loadReconciliationDecisions,
  loadReleaseBase,
  manifestUrl,
  releaseRoot,
  prefetchHistoricalSnapshot,
  type HistoricalFeatureCollection,
  type HistoricalProperties,
  type MetricDataset,
  type ReleaseBase,
} from './data';
import { metricViews } from './metricViews';
import { buildViewRows } from './viewRows';
import {
  atlasViewSearch,
  DEFAULT_MAP_CAMERA,
  normalizeAtlasMapCamera,
  parseAtlasViewState,
  type AtlasMapCamera,
} from './viewState';

const MapView = lazy(() => import('./components/MapView').then((module) => ({ default: module.MapView })));
const ResearchPage = import.meta.env.DEV
  ? lazy(() => import('./components/ResearchPage').then((module) => ({ default: module.ResearchPage })))
  : null;

export function App() {
  const [page] = useState<'atlas' | 'sources' | 'review' | 'economics' | 'institutions' | 'research'>(() => {
    const requested = new URLSearchParams(window.location.search).get('page');
    if (requested === 'research' && import.meta.env.DEV) return 'research';
    return requested === 'sources' || requested === 'review' || requested === 'economics' || requested === 'institutions' ? requested : 'atlas';
  });
  const [release, setRelease] = useState<ReleaseBase | null>(null);
  const [metricDatasets, setMetricDatasets] = useState<Partial<Record<MvpMetricId, MetricDataset>>>({});
  const [metricId, setMetricId] = useState<MvpMetricId>('population_total');
  const [year, setYear] = useState(2024);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [historicalEnabled, setHistoricalEnabled] = useState(true);
  const [citiesEnabled, setCitiesEnabled] = useState(true);
  const [surfaceSourceId, setSurfaceSourceId] = useState<string | null>(null);
  const [populationSurface, setPopulationSurface] = useState<PopulationSurfaceDataset | null>(null);
  const [surfaceLoading, setSurfaceLoading] = useState(false);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [selectedSurfaceCell, setSelectedSurfaceCell] = useState<PopulationSurfaceDataset['cells'][number] | null>(null);
  const [camera, setCamera] = useState<AtlasMapCamera>(DEFAULT_MAP_CAMERA);
  const [historicalSnapshot, setHistoricalSnapshot] = useState<HistoricalFeatureCollection | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalProperties | null>(null);
  const [selectedCityPoint, setSelectedCityPoint] = useState<HistoricalCityPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metricError, setMetricError] = useState<string | null>(null);
  const [bundleStatus, setBundleStatus] = useState<'idle' | 'building' | 'downloaded' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    let active = true;
    loadReleaseBase()
      .then((loaded) => {
        if (!active) return;
        validateAtlasReleaseManifest(loaded.manifest);
        const releaseYears = buildEvidenceTimelineYears(
          loaded.manifest,
          loaded.historicalContext,
          loaded.historicalCities,
        );
        const initial = parseAtlasViewState(
          window.location.search,
          loaded.manifest,
          releaseYears,
          new Set(loaded.entities.map((entity) => entity.code)),
        );
        setRelease(loaded);
        setMetricId(initial.metricId);
        setYear(initial.year);
        setSelectedCode(initial.selectedCode);
        setHistoricalEnabled(initial.historicalEnabled);
        setCitiesEnabled(initial.citiesEnabled);
        setSurfaceSourceId(initial.surfaceSourceId);
        setCamera(initial.camera);
        setMetricDatasets({ population_total: loaded.population });
        void loadMetricData('access_to_electricity', loaded.manifest).then((dataset) => {
          if (active) {
            setMetricDatasets((current) => ({ ...current, access_to_electricity: dataset }));
          }
        }).catch(() => undefined);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'The release could not be loaded');
      });
    return () => { active = false; };
  }, []);

  const timelineYears = useMemo(
    () => release
      ? buildEvidenceTimelineYears(release.manifest, release.historicalContext, release.historicalCities)
      : [2024],
    [release],
  );

  useEffect(() => {
    if (!release || page !== 'atlas') return;
    const search = atlasViewSearch(release.manifest, {
      metricId,
      year,
      selectedCode,
      historicalEnabled,
      citiesEnabled,
      surfaceSourceId,
      scaleMode: 'published',
      camera,
    });
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  }, [camera, citiesEnabled, historicalEnabled, metricId, page, release, selectedCode, surfaceSourceId, year]);

  useEffect(() => {
    if (!release || page !== 'atlas') return;
    const restore = () => {
      try {
        const restored = parseAtlasViewState(
          window.location.search,
          release.manifest,
          timelineYears,
          new Set(release.entities.map((entity) => entity.code)),
        );
        setMetricId(restored.metricId);
        setYear(restored.year);
        setSelectedCode(restored.selectedCode);
        setHistoricalEnabled(restored.historicalEnabled);
        setCitiesEnabled(restored.citiesEnabled);
        setSurfaceSourceId(restored.surfaceSourceId);
        setCamera(restored.camera);
        setError(null);
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'The pinned view could not be restored');
      }
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [page, release, timelineYears]);

  const pushViewHistory = useCallback(() => {
    if (release && page === 'atlas') window.history.pushState(null, '', window.location.href);
  }, [page, release]);

  useEffect(() => {
    if (!release || metricDatasets[metricId]) return;
    let active = true;
    setMetricError(null);
    loadMetricData(metricId, release.manifest)
      .then((dataset) => {
        if (active) setMetricDatasets((current) => ({ ...current, [metricId]: dataset }));
      })
      .catch((cause: unknown) => {
        if (active) setMetricError(cause instanceof Error ? cause.message : `Could not load ${metricId}`);
      });
    return () => { active = false; };
  }, [metricDatasets, metricId, release]);

  const historicalReference = useMemo(
    () => release ? resolveHistoricalSnapshot(release.historicalContext, year) : null,
    [release, year],
  );

  const surfaceReference = useMemo(
    () => metricId === 'population_total' && surfaceSourceId && release
      ? release.manifest.population_surfaces.snapshots.find(
        (snapshot) => snapshot.source_release_id === surfaceSourceId && snapshot.year === year,
      ) ?? null
      : null,
    [metricId, release, surfaceSourceId, year],
  );

  useEffect(() => {
    setSelectedSurfaceCell(null);
    setSurfaceError(null);
    setPopulationSurface(null);
    if (!surfaceReference) {
      setSurfaceLoading(false);
      return;
    }
    let active = true;
    setSurfaceLoading(true);
    loadPopulationSurface(surfaceReference)
      .then((dataset) => { if (active) setPopulationSurface(dataset); })
      .catch((cause: unknown) => {
        if (active) setSurfaceError(cause instanceof Error ? cause.message : 'Could not load population grid');
      })
      .finally(() => { if (active) setSurfaceLoading(false); });
    return () => { active = false; };
  }, [surfaceReference]);

  useEffect(() => {
    setSelectedHistorical(null);
    setHistoricalError(null);
    if (!historicalEnabled || !historicalReference) {
      setHistoricalSnapshot(null);
      setHistoricalLoading(false);
      return;
    }
    let active = true;
    setHistoricalSnapshot(null);
    setHistoricalLoading(true);
    loadHistoricalSnapshot(historicalReference)
      .then((snapshot) => {
        if (active) setHistoricalSnapshot(snapshot);
      })
      .catch((cause: unknown) => {
        if (active) {
          setHistoricalError(cause instanceof Error ? cause.message : 'Could not load historical context');
        }
      })
      .finally(() => {
        if (active) setHistoricalLoading(false);
      });
    return () => { active = false; };
  }, [historicalEnabled, historicalReference]);

  useEffect(() => {
    if (!release || !historicalEnabled || !historicalReference) return;
    const index = release.historicalContext.snapshots.findIndex(
      (snapshot) => snapshot.file === historicalReference.file,
    );
    prefetchHistoricalSnapshot(release.historicalContext.snapshots[index - 1]);
    prefetchHistoricalSnapshot(release.historicalContext.snapshots[index + 1]);
  }, [historicalEnabled, historicalReference, release]);

  const metric = useMemo(
    () => release?.manifest.metrics.find((candidate) => candidate.id === metricId) ?? null,
    [metricId, release],
  );
  const currentDataset = metricDatasets[metricId];
  const supported = metric?.available_years.includes(year) ?? false;
  const rows = useMemo(
    () => release && metric ? buildViewRows(release, metric, currentDataset, year) : [],
    [currentDataset, metric, release, year],
  );
  useEffect(() => {
    if (!selectedCode || !metric) return;
    const selectionHasNoStatisticalMeaning = metric.id === 'population_total' && year < 1960;
    const selectionIsAbsentFromLoadedDataset = currentDataset
      ? !rows.some((row) => row.entity.code === selectedCode)
      : false;
    if (selectionHasNoStatisticalMeaning || selectionIsAbsentFromLoadedDataset) {
      setSelectedCode(null);
    }
  }, [currentDataset, metric, rows, selectedCode, year]);
  const valueByCode = useMemo(
    () => new Map(rows.map((row) => [row.entity.code, row.metricValue])),
    [rows],
  );
  const selectedRow = useMemo(
    () => rows.find((row) => row.entity.code === selectedCode) ?? null,
    [rows, selectedCode],
  );
  const populationSummary = useMemo(
    () => release?.population.summaries.find((summary) => summary.year === year) ?? null,
    [release, year],
  );
  const prevalenceSummary = useMemo(() => {
    if (metricId !== 'access_to_electricity' || !supported || !currentDataset) return null;
    return aggregatePrevalence(rows.map((row) => ({
      id: row.entity.code,
      population: row.population?.value ?? null,
      rate: row.metricValue === null ? null : row.metricValue / 100,
    })));
  }, [currentDataset, metricId, rows, supported]);
  const lifeExpectancySummary = useMemo(() => {
    if (metricId !== 'life_expectancy_at_birth' || currentDataset?.metric_id !== 'life_expectancy_at_birth') {
      return null;
    }
    return (currentDataset as LifeExpectancyDataset).summaries.find((summary) => summary.year === year) ?? null;
  }, [currentDataset, metricId, year]);
  const populationOutlookSummary = useMemo(() => {
    if (metricId !== 'population_outlook' || currentDataset?.metric_id !== 'population_outlook') return null;
    return (currentDataset as PopulationOutlookDataset).summaries.find((summary) => summary.year === year) ?? null;
  }, [currentDataset, metricId, year]);
  const gdpPerCapitaSummary = useMemo(() => {
    if (
      metricId !== 'gdp_per_capita_constant_2015_usd'
      || currentDataset?.metric_id !== 'gdp_per_capita_constant_2015_usd'
    ) return null;
    return (currentDataset as GdpPerCapitaDataset).summaries.find((summary) => summary.year === year) ?? null;
  }, [currentDataset, metricId, year]);
  const historicalPopulationObservation = useMemo(
    () => release?.historicalPopulation.observations.find((observation) => observation.year === year) ?? null,
    [release, year],
  );
  const cityPoints = useMemo<HistoricalCityPoint[]>(() => {
    if (!release) return [];
    const cityById = new Map(release.historicalCities.cities.map((city) => [city.id, city]));
    return release.historicalCities.observations
      .filter((observation) => observation.year === year)
      .flatMap((observation) => {
        const city = cityById.get(observation.city_id);
        return city ? [{ city, observation }] : [];
      });
  }, [release, year]);

  const displayedSummary = useMemo(() => {
    if (!metric) return null;
    if (metric.id === 'population_total' && surfaceReference) return {
        selected_population_surface: surfaceReference,
        separate_world_bank_territorial_reference: populationSummary,
    };
    if (!supported) return null;
    if (metric.id === 'population_total') {
      return year < 1960 ? historicalPopulationObservation : populationSummary;
    }
    if (metric.id === 'population_outlook') return populationOutlookSummary;
    if (metric.id === 'life_expectancy_at_birth') return lifeExpectancySummary;
    if (metric.id === 'gdp_per_capita_constant_2015_usd') return gdpPerCapitaSummary;
    return prevalenceSummary && populationSummary
      ? { prevalence: prevalenceSummary, population_accounting: populationSummary }
      : null;
  }, [
    historicalPopulationObservation,
    gdpPerCapitaSummary,
    lifeExpectancySummary,
    metric,
    populationOutlookSummary,
    populationSummary,
    prevalenceSummary,
    supported,
    surfaceReference,
    year,
  ]);

  const select = useCallback((code: string) => {
    pushViewHistory();
    setSelectedHistorical(null);
    setSelectedCityPoint(null);
    setSelectedCode(code);
  }, [pushViewHistory]);
  const selectHistorical = useCallback((properties: HistoricalProperties) => {
    setSelectedCode(null);
    setSelectedCityPoint(null);
    setSelectedHistorical(properties);
  }, []);
  const selectCity = useCallback((point: HistoricalCityPoint) => {
    setSelectedCode(null);
    setSelectedHistorical(null);
    setSelectedCityPoint(point);
  }, []);

  useEffect(() => {
    setSelectedCityPoint(null);
  }, [year]);
  const firstYear = timelineYears[0];
  const lastYear = timelineYears[timelineYears.length - 1];
  const timelineIndex = nearestTimelineIndex(timelineYears, year);

  const pinnedSearch = release ? atlasViewSearch(release.manifest, {
    metricId,
    year,
    selectedCode,
    historicalEnabled,
    citiesEnabled,
    surfaceSourceId,
    scaleMode: 'published',
    camera,
  }) : '';

  useEffect(() => {
    setBundleStatus('idle');
    setShareStatus('idle');
  }, [camera, citiesEnabled, historicalEnabled, metricId, selectedCode, surfaceSourceId, year]);

  const downloadViewBundle = useCallback(async () => {
    if (!release || !metric) return;
    setBundleStatus('building');
    try {
      const decisions = await loadReconciliationDecisions(release.manifest);
      const bundle = createAtlasViewBundle({
        manifest: release.manifest,
        metric,
        requestedYear: year,
        metricSupported: supported,
        selectedSupportCode: selectedCode,
        historicalBordersEnabled: historicalEnabled,
        historicalCitiesEnabled: citiesEnabled,
        populationSurfaceSourceId: metric.id === 'population_total' ? surfaceSourceId : null,
        populationSurface: surfaceReference,
        camera: normalizeAtlasMapCamera(camera),
        effectiveMetricYear: supported ? year : null,
        historicalSnapshot: historicalEnabled ? historicalReference : null,
        historicalCityEffectiveYear: citiesEnabled && cityPoints.length > 0 ? year : null,
        pinnedQuery: pinnedSearch,
        rows: metric.id === 'population_total' && year < 1960 ? [] : rows,
        displayedSummary,
        historicalPopulationObservation: metric.id === 'population_total'
          ? historicalPopulationObservation
          : null,
        historicalCities: citiesEnabled ? cityPoints : [],
        selectedHistoricalFeatureId: selectedHistorical?.source_feature_id ?? null,
        selectedHistoricalCityId: selectedCityPoint?.city.id ?? null,
        reconciliationDecisions: decisions,
      });
      validateAtlasViewBundle(bundle);
      const objectUrl = URL.createObjectURL(new Blob(
        [`${JSON.stringify(bundle, null, 2)}\n`],
        { type: 'application/json' },
      ));
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = atlasViewBundleFilename(bundle);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setBundleStatus('downloaded');
    } catch {
      setBundleStatus('error');
    }
  }, [
    camera,
    citiesEnabled,
    cityPoints,
    displayedSummary,
    historicalEnabled,
    historicalPopulationObservation,
    historicalReference,
    metric,
    pinnedSearch,
    release,
    rows,
    selectedCityPoint,
    selectedCode,
    selectedHistorical,
    surfaceSourceId,
    surfaceReference,
    supported,
    year,
  ]);

  const copyPinnedLink = useCallback(async () => {
    if (!release) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${pinnedSearch}`);
      setShareStatus('copied');
    } catch {
      setShareStatus('error');
    }
  }, [pinnedSearch, release]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setYear((current) => {
        const next = timelineYears.find((candidate) => candidate > current);
        return next ?? timelineYears[0];
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, timelineYears]);

  if (error) {
    return (
      <main className="fatal-state">
        <span className="eyebrow">Atlas unavailable</span>
        <h1>The evidence release could not be opened.</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!release || !metric) {
    return (
      <main className="loading-state" aria-live="polite">
        <div className="loading-mark" aria-hidden="true" />
        <span>Opening the evidence release…</span>
      </main>
    );
  }

  const view = metricViews[metric.id];
  const nearestYear = metric.available_years.reduce((nearest, candidate) =>
    Math.abs(candidate - year) < Math.abs(nearest - year) ? candidate : nearest,
  );
  const deepTimePopulation = metric.id === 'population_total' && year < 1960;
  const download = surfaceReference
    ? `${releaseRoot}/${surfaceReference.download_file}`
    : deepTimePopulation
      ? historicalPopulationDownloadUrl(release.manifest)
      : downloadUrl(metric.id, release.manifest);
  const atlasUrl = pinnedSearch;
  const sourcesUrl = `?page=sources&release=${encodeURIComponent(release.manifest.release_id)}`;
  const economicsUrl = `?page=economics&release=${encodeURIComponent(release.manifest.release_id)}`;
  const institutionsUrl = `?page=institutions&release=${encodeURIComponent(release.manifest.release_id)}`;
  const reviewUrl = `?page=review&release=${encodeURIComponent(release.manifest.release_id)}`;
  const researchUrl = `?page=research&release=${encodeURIComponent(release.manifest.release_id)}`;
  const dateMagnitude = year <= 0 ? 1 - year : year;
  const dateEra = year <= 0 ? 'BCE' : 'CE';

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href={atlasUrl} aria-label="Atlas of Humanity home">
          <span className="wordmark-mark" aria-hidden="true">A</span>
          <span>Atlas of Humanity</span>
        </a>
        <nav className="site-tabs" aria-label="Primary navigation">
          <a href={atlasUrl} aria-current={page === 'atlas' ? 'page' : undefined}>Atlas</a>
          <a href={economicsUrl} aria-current={page === 'economics' ? 'page' : undefined}>Economics</a>
          <a href={institutionsUrl} aria-current={page === 'institutions' ? 'page' : undefined}>Institutions & religion</a>
          <a href={sourcesUrl} aria-current={page === 'sources' ? 'page' : undefined}>Sources</a>
          <a href={reviewUrl} aria-current={page === 'review' ? 'page' : undefined}>Review</a>
          {import.meta.env.DEV ? <a href={researchUrl} aria-current={page === 'research' ? 'page' : undefined}>Local research</a> : null}
          {page === 'atlas' ? <a href={download} download>Download data</a> : null}
        </nav>
      </header>

      {page === 'sources' ? <SourcesPage manifest={release.manifest} /> : page === 'review' ? <ReviewPage /> : page === 'economics' ? <EconomicsPage manifest={release.manifest} /> : page === 'institutions' ? <InstitutionsPage manifest={release.manifest} /> : page === 'research' && ResearchPage ? <Suspense fallback={<main id="main-content"><p role="status">Opening local research view…</p></main>}><ResearchPage /></Suspense> : (
      <main id="main-content">
        <section className="hero-copy">
          <div>
            <span className="eyebrow">A measured view of our shared world</span>
            <h1>Where people lived.<br />What the evidence can tell us.</h1>
          </div>
          <p>
            Explore population through deep time, changing political maps, ancient city estimates, electricity access,
            life expectancy, and GDP per person. Missing observations stay visible and time is never filled silently.
          </p>
        </section>

        <section className="atlas-stage" aria-label="Interactive atlas">
          <div className="stage-toolbar">
            <div className="metric-picker" aria-label="Metric">
              <span className="control-label">Measure</span>
              {release.manifest.metrics.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={candidate.id === metric.id ? 'metric-active' : 'metric-option'}
                  aria-pressed={candidate.id === metric.id}
                  onClick={() => {
                    pushViewHistory();
                    setPlaying(false);
                    setMetricId(candidate.id);
                  }}
                >
                  <span className="metric-dot" aria-hidden="true" />
                  {candidate.label}
                  <small>{formatAstronomicalYear(candidate.available_years[0])}–{formatAstronomicalYear(candidate.available_years.at(-1) ?? candidate.available_years[0])}</small>
                </button>
              ))}
            </div>
            <div className="context-controls">
              <button
                type="button"
                className={historicalEnabled ? 'context-toggle context-toggle-active' : 'context-toggle'}
                aria-pressed={historicalEnabled}
                onClick={() => {
                  pushViewHistory();
                  setHistoricalEnabled((enabled) => !enabled);
                  setSelectedHistorical(null);
                }}
              >
                <span className="release-dot" aria-hidden="true" />
                Historical borders & names
              </button>
              <button
                type="button"
                className={citiesEnabled ? 'context-toggle context-toggle-active' : 'context-toggle'}
                aria-pressed={citiesEnabled}
                onClick={() => {
                  pushViewHistory();
                  setCitiesEnabled((enabled) => !enabled);
                  setSelectedCityPoint(null);
                }}
              >
                <span className="city-dot" aria-hidden="true" />
                Ancient city estimates
              </button>
              <div className="release-badge">
                <span className="release-dot" aria-hidden="true" />
                Genuine source data
              </div>
            </div>
          </div>

          <Suspense fallback={<div className="map-loading" role="status"><span className="loading-mark" aria-hidden="true" />Loading map renderer…</div>}>
            <MapView
              geometry={release.geometry}
              metricId={metric.id}
              metricLabel={metric.label}
              year={year}
              valueByCode={valueByCode}
              loading={!currentDataset}
              historicalSnapshot={historicalSnapshot}
              historicalLoading={historicalLoading}
              historicalEnabled={historicalEnabled}
              cityPoints={cityPoints}
              citiesEnabled={citiesEnabled}
              selectedCityId={selectedCityPoint?.city.id ?? null}
              selectedHistoricalId={selectedHistorical?.source_feature_id ?? null}
              populationSurface={populationSurface}
              populationSurfaceLabel={surfaceSourceId?.startsWith('ghsl-') ? 'GHSL GHS-POP' : surfaceSourceId?.startsWith('worldpop-') ? 'WorldPop Global2' : null}
              selectedSurfaceCell={selectedSurfaceCell}
              onSurfaceSelect={(cell) => setSelectedSurfaceCell(cell)}
              caption={populationSurface ? 'Source-native modeled population grid' : deepTimePopulation ? 'Global population estimate only' : view.mapCaption}
              caution={populationSurface ? 'Columns mark 1° bins; no population is assigned to political borders.' : deepTimePopulation ? 'No historical population is assigned to these polities.' : view.mapCaution}
              selectedCode={selectedCode}
              onSelect={select}
              onHistoricalSelect={selectHistorical}
              onCitySelect={selectCity}
              camera={camera}
              resetCamera={DEFAULT_MAP_CAMERA}
              onCameraChange={(nextCamera) => setCamera(normalizeAtlasMapCamera(nextCamera))}
            />
          </Suspense>
          <Legend metric={metric} unavailable={deepTimePopulation} surface={populationSurface !== null} />

          <div className="date-display" aria-label={`Requested date ${formatAstronomicalYear(year)}`}>
            <span>Requested date</span>
            <strong>{dateMagnitude}</strong>
            <em>{dateEra}</em>
          </div>

          <Inspector
            row={deepTimePopulation ? null : selectedRow}
            metric={metric}
            manifest={release.manifest}
            onClose={() => setSelectedCode(null)}
          />
          <HistoricalInspector
            feature={selectedHistorical}
            snapshotYear={historicalSnapshot?.atlas_year ?? null}
            onClose={() => setSelectedHistorical(null)}
          />
          <HistoricalCityInspector
            city={selectedCityPoint?.city ?? null}
            observation={selectedCityPoint?.observation ?? null}
            onClose={() => setSelectedCityPoint(null)}
          />
        </section>

        {metric.id === 'population_total' ? <PopulationSurfacePanel
          manifest={release.manifest}
          year={year}
          sourceId={surfaceSourceId}
          onSourceChange={(id) => { pushViewHistory(); setSurfaceSourceId(id); }}
          reference={surfaceReference}
          dataset={populationSurface}
          loading={surfaceLoading}
          error={surfaceError}
          selectedCell={selectedSurfaceCell}
        /> : null}

        <section className="time-panel" aria-labelledby="time-title">
          <div className="time-heading">
            <div>
              <span className="eyebrow">One requested date · independent evidence layers</span>
              <h2 id="time-title">Time</h2>
            </div>
            <div className="year-controls">
              <button
                type="button"
                disabled={reducedMotion}
                aria-describedby={reducedMotion ? 'reduced-motion-note' : undefined}
                onClick={() => setPlaying((current) => !current)}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              {reducedMotion ? <span id="reduced-motion-note" className="motion-note">Playback off: reduced motion</span> : null}
              <label className="year-entry">
                <span>Requested date</span>
                <span className="era-entry">
                  <input
                    type="number"
                    min="1"
                    value={dateMagnitude}
                    onChange={(event) => {
                      const magnitude = Math.max(1, Math.round(Number(event.target.value)));
                      setYear(dateEra === 'BCE' ? 1 - magnitude : magnitude);
                    }}
                    aria-label="Requested year number"
                  />
                  <select
                    value={dateEra}
                    onChange={(event) => setYear(event.target.value === 'BCE' ? 1 - dateMagnitude : dateMagnitude)}
                    aria-label="Requested era"
                  >
                    <option>BCE</option>
                    <option>CE</option>
                  </select>
                </span>
              </label>
            </div>
          </div>
          <input
            className="timeline-range"
            type="range"
            min="0"
            max={timelineYears.length - 1}
            step="1"
            value={timelineIndex}
            onChange={(event) => {
              setPlaying(false);
              setYear(timelineYears[Number(event.target.value)]);
            }}
            aria-label={`Date, ${formatAstronomicalYear(year)}`}
          />
          <div className="timeline-labels" aria-hidden="true">
            <span>{formatAstronomicalYear(firstYear)}</span>
            <strong>{formatAstronomicalYear(year)}</strong>
            <span>{formatAstronomicalYear(lastYear)}</span>
          </div>
          <p>
            The slider combines {timelineYears.length} dates where at least one published layer changes. The requested
            date is shared, while each layer applies its own stated policy. Measurements and city estimates are
            exact-date only; political context uses the latest published snapshot within Cliopatria coverage.
          </p>
          <div className={metric.id === 'population_total' ? 'layer-date-grid layer-date-grid-four' : 'layer-date-grid'} aria-label="Effective evidence dates">
            <article className={supported ? 'layer-date-available' : 'layer-date-unavailable'}>
              <span>Selected measure</span>
            <strong>
              {supported
                ? `${populationOutlookSummary?.evidence_state === 'medium_projection'
                    ? 'Medium projection'
                    : populationOutlookSummary ? 'Estimate' : 'Exact'} · ${formatAstronomicalYear(year)}`
                : 'No exact observation'}
            </strong>
              <small>{metric.label} · {metric.available_years.length} published dates</small>
            </article>
            {metric.id === 'population_total' ? <article className={surfaceReference && !surfaceError ? 'layer-date-available' : 'layer-date-unavailable'}>
              <span>Population grid</span>
              <strong>{!surfaceSourceId ? 'Layer hidden' : surfaceError ? 'Grid unavailable' : surfaceReference ? `Exact · ${formatAstronomicalYear(surfaceReference.year)}` : 'No exact grid'}</strong>
              <small>{surfaceSourceId?.startsWith('ghsl-') ? 'GHSL GHS-POP' : surfaceSourceId?.startsWith('worldpop-') ? 'WorldPop Global2' : 'Source-native raster'}</small>
            </article> : null}
            <article className={historicalEnabled && historicalReference && !historicalError ? 'layer-date-available' : 'layer-date-unavailable'}>
              <span>Political context</span>
              <strong>
                {!historicalEnabled
                  ? 'Layer hidden'
                  : historicalError
                    ? 'Boundary unavailable'
                  : historicalReference
                    ? `Effective · ${formatAstronomicalYear(historicalReference.atlas_year)}`
                    : 'Outside source coverage'}
              </strong>
              <small>{historicalError ?? (historicalReference ? `${historicalReference.feature_count} published polity features` : 'Cliopatria · 3400 BCE–2024 CE')}</small>
            </article>
            <article className={citiesEnabled && cityPoints.length ? 'layer-date-available' : 'layer-date-unavailable'}>
              <span>Historical cities</span>
              <strong>
                {!citiesEnabled ? 'Layer hidden' : cityPoints.length ? `Exact · ${formatAstronomicalYear(year)}` : 'No exact observation'}
              </strong>
              <small>{cityPoints.length ? `${cityPoints.length} published city estimates` : 'Modelski Ancient · exact dates only'}</small>
            </article>
          </div>
          {!supported ? (
            <div className="unsupported-year" role="status">
              <span>{surfaceReference
                ? `The territorial ${metric.label.toLowerCase()} series has no observation for ${formatAstronomicalYear(year)}; the selected population grid is a separate ${surfaceReference.evidence_state}.`
                : `${metric.label} has no published observation for ${formatAstronomicalYear(year)}.`}</span>
              <button type="button" onClick={() => { pushViewHistory(); setYear(nearestYear); }}>
                Show {formatAstronomicalYear(nearestYear)}
              </button>
            </div>
          ) : null}
        </section>

        {metric.id === 'population_total' ? (
          <PopulationTimeline
            summaries={release.population.summaries}
            historical={release.historicalPopulation}
            historicalDownload={historicalPopulationDownloadUrl(release.manifest)}
            year={year}
            entityCount={release.entities.length}
            surfaceReferences={release.manifest.population_surfaces.snapshots}
            selectedSurfaceSourceId={surfaceSourceId}
          />
        ) : metric.id === 'population_outlook' && populationOutlookSummary ? (
          <PopulationOutlookSummary summary={populationOutlookSummary} />
        ) : metric.id === 'life_expectancy_at_birth' && lifeExpectancySummary ? (
          <LifeExpectancyDistribution summary={lifeExpectancySummary} />
        ) : metric.id === 'gdp_per_capita_constant_2015_usd' && gdpPerCapitaSummary ? (
          <TerritorialCoverageSummary summary={gdpPerCapitaSummary} />
        ) : prevalenceSummary && populationSummary ? (
          <PopulationBar
            summary={prevalenceSummary}
            year={year}
            unplacedPopulation={populationSummary.unplaced_population}
          />
        ) : (
          <section className="population-panel unavailable-summary" aria-live="polite">
            <span className="eyebrow">Population accounting</span>
            <h2>{metricError ?? (currentDataset ? 'Choose a supported year to calculate this view.' : 'Loading metric observations…')}</h2>
          </section>
        )}

        <section className="method-strip" id="sources" aria-labelledby="method-title">
          <div>
            <span className="eyebrow">What this view means</span>
            <h2 id="method-title">{surfaceReference
              ? `${surfaceSourceId?.startsWith('ghsl-') ? 'GHSL' : 'WorldPop'} ${surfaceReference.year} ${surfaceReference.evidence_state === 'projection' ? 'projected' : 'modeled'} raster population is displayed in one-degree bins.`
              : metric.safe_summary}</h2>
          </div>
          <p>
            {surfaceReference
              ? 'The grid is a separately sourced population reconstruction. Color shows people per 1° bin and height shows people divided by full-bin geodesic area. The country series, historical polities, and grid are not joined or added.'
              : metric.definition} {surfaceReference
              ? 'The physical source total, bin total, outside-grid residual, and original raster checksum are recorded in the release.'
              : deepTimePopulation
              ? 'Historical values use world support only; political geometry is a separate context layer.'
              : metric.id === 'population_outlook'
                ? 'Values remain on the source-native UN Country/Area support; modern display geometry is only a visual placement.'
                : 'Modern values are shown at their World Bank country or territory support.'}
            {' '}This view must not be interpreted as {surfaceReference
              ? 'exact residential locations, population assigned to historical polities, or measured local settlement density'
              : metric.prohibited_interpretations.join(', ')}.
          </p>
          <div className="method-actions">
            <a className="primary-action" href={download} download>
              Download {surfaceReference ? 'selected grid bins' : deepTimePopulation ? 'historical world estimates' : 'full series'} · CSV
            </a>
            <button
              type="button"
              className="secondary-action"
              disabled={bundleStatus === 'building'}
              onClick={() => { void downloadViewBundle(); }}
            >
              {bundleStatus === 'building' ? 'Building exact-view bundle…' : 'Download this exact view · JSON'}
            </button>
            <button type="button" className="secondary-action" onClick={() => { void copyPinnedLink(); }}>
              Copy pinned view link
            </button>
            <button type="button" className="secondary-action" onClick={() => setTableOpen((open) => !open)}>
              {tableOpen ? 'Hide evidence table' : 'Open evidence table'}
            </button>
            <a className="manifest-action" href={manifestUrl} target="_blank" rel="noreferrer">
              Open release manifest ↗
            </a>
            <span className="view-action-status" aria-live="polite">
              {bundleStatus === 'downloaded'
                ? 'Exact-view bundle downloaded.'
                : bundleStatus === 'error'
                  ? 'The exact-view bundle could not be built.'
                  : shareStatus === 'copied'
                    ? 'Pinned link copied.'
                    : shareStatus === 'error'
                      ? 'Clipboard unavailable; copy the pinned browser URL.'
                      : 'Release, dates, layers, scale, camera, evidence, and decisions are pinned.'}
            </span>
          </div>
          <details className="release-citations">
            <summary>All release citations (not all used in this view)</summary>
            <div className="source-list">
              {release.manifest.citations.map((citation) => (
                <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">
                  <span>{citation.label}</span>
                  <small>{citation.license} ↗</small>
                </a>
              ))}
            </div>
          </details>
        </section>

        {tableOpen ? (
          deepTimePopulation ? (
            <HistoricalPopulationTable
              observation={release.historicalPopulation.observations.find((observation) => observation.year === year) ?? null}
              historicalSnapshot={historicalSnapshot}
              cityPoints={cityPoints}
              populationArtifactSha256={release.manifest.artifacts[release.manifest.deep_time_population.data_file].sha256}
            />
          ) : <DataTable rows={rows} metric={metric} onSelect={select} />
        ) : null}
      </main>
      )}

      <footer>
        <span>Atlas release {release.manifest.release_id}</span>
        <span>Evidence retrieved {release.manifest.published_on}</span>
      </footer>
    </div>
  );
}
