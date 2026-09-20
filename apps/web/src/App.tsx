import {
  aggregatePrevalence,
  formatAstronomicalYear,
  validatePublishedMetrics,
  type MvpMetricId,
  type PublishedMetric,
  type ViewRow,
} from '@atlas/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from './components/DataTable';
import { Inspector } from './components/Inspector';
import { HistoricalInspector } from './components/HistoricalInspector';
import { HistoricalPopulationTable } from './components/HistoricalPopulationTable';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { PopulationBar } from './components/PopulationBar';
import { PopulationTimeline } from './components/PopulationTimeline';
import { SourcesPage } from './components/SourcesPage';
import {
  downloadUrl,
  historicalPopulationDownloadUrl,
  loadHistoricalSnapshot,
  loadMetricData,
  loadReleaseBase,
  manifestUrl,
  resolveHistoricalSnapshot,
  type HistoricalFeatureCollection,
  type HistoricalProperties,
  type MetricDataset,
  type ReleaseBase,
} from './data';
import { metricViews } from './metricViews';

// Keeps the app join independent of map geometry and rendering state.
function buildRows(
  release: ReleaseBase,
  metric: PublishedMetric,
  dataset: MetricDataset | undefined,
  year: number,
): ViewRow[] {
  const populationByCode = new Map(
    release.population.observations
      .filter((observation) => observation.year === year)
      .map((observation) => [observation.code, observation]),
  );
  const metricByCode = new Map<string, { value: number | null; status: 'known' | 'unknown'; locator: string }>();

  if (metric.id === 'population_total') {
    for (const observation of populationByCode.values()) {
      metricByCode.set(observation.code, {
        value: observation.value,
        status: observation.status,
        locator: observation.original_record_locator,
      });
    }
  } else if (dataset?.metric_id === 'access_to_electricity') {
    for (const observation of dataset.observations) {
      if (observation.year === year) {
        metricByCode.set(observation.code, {
          value: observation.value_percent,
          status: observation.status,
          locator: observation.original_record_locator,
        });
      }
    }
  }

  return release.entities.map((entity) => {
    const metricObservation = metricByCode.get(entity.code);
    return {
      entity,
      year,
      population: populationByCode.get(entity.code) ?? null,
      metricValue: metricObservation?.value ?? null,
      metricStatus: metricObservation?.status ?? 'unknown',
      metricRecordLocator: metricObservation?.locator ?? null,
    };
  });
}

export function App() {
  const [page] = useState<'atlas' | 'sources'>(() =>
    new URLSearchParams(window.location.search).get('page') === 'sources' ? 'sources' : 'atlas',
  );
  const [release, setRelease] = useState<ReleaseBase | null>(null);
  const [metricDatasets, setMetricDatasets] = useState<Partial<Record<MvpMetricId, MetricDataset>>>({});
  const [metricId, setMetricId] = useState<MvpMetricId>('population_total');
  const [year, setYear] = useState(2024);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [historicalEnabled, setHistoricalEnabled] = useState(true);
  const [historicalSnapshot, setHistoricalSnapshot] = useState<HistoricalFeatureCollection | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalProperties | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metricError, setMetricError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadReleaseBase()
      .then((loaded) => {
        if (!active) return;
        validatePublishedMetrics(loaded.manifest.metrics);
        const parameters = new URLSearchParams(window.location.search);
        const requestedMetric = loaded.manifest.metrics.find(
          (candidate) => candidate.id === parameters.get('metric'),
        );
        const initialMetric = requestedMetric
          ?? loaded.manifest.metrics.find((candidate) => candidate.id === loaded.manifest.default_view.metric_id)
          ?? loaded.manifest.metrics[0];
        const requestedYearParameter = parameters.get('year');
        const requestedYear = requestedYearParameter === null ? Number.NaN : Number(requestedYearParameter);
        const requestedPlace = parameters.get('place');
        const releaseYears = loaded.manifest.metrics.flatMap((candidate) => candidate.available_years);
        const releaseStartYear = Math.min(...releaseYears);
        const releaseEndYear = Math.max(...releaseYears);
        setRelease(loaded);
        setMetricId(initialMetric.id);
        setYear(
          Number.isInteger(requestedYear)
            && requestedYear >= releaseStartYear
            && requestedYear <= releaseEndYear
            ? requestedYear
            : loaded.manifest.default_view.year,
        );
        setSelectedCode(
          requestedPlace && loaded.entities.some((entity) => entity.code === requestedPlace)
            ? requestedPlace
            : null,
        );
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

  useEffect(() => {
    if (!release || page !== 'atlas') return;
    const parameters = new URLSearchParams();
    parameters.set('metric', metricId);
    parameters.set('year', String(year));
    if (selectedCode) parameters.set('place', selectedCode);
    window.history.replaceState(null, '', `${window.location.pathname}?${parameters.toString()}`);
  }, [metricId, page, release, selectedCode, year]);

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

  useEffect(() => {
    setSelectedHistorical(null);
    if (!historicalEnabled || !historicalReference) {
      setHistoricalSnapshot(null);
      setHistoricalLoading(false);
      return;
    }
    let active = true;
    setHistoricalLoading(true);
    loadHistoricalSnapshot(historicalReference)
      .then((snapshot) => {
        if (active) setHistoricalSnapshot(snapshot);
      })
      .catch((cause: unknown) => {
        if (active) setMetricError(cause instanceof Error ? cause.message : 'Could not load historical context');
      })
      .finally(() => {
        if (active) setHistoricalLoading(false);
      });
    return () => { active = false; };
  }, [historicalEnabled, historicalReference]);

  const metric = useMemo(
    () => release?.manifest.metrics.find((candidate) => candidate.id === metricId) ?? null,
    [metricId, release],
  );
  const currentDataset = metricDatasets[metricId];
  const supported = metric?.available_years.includes(year) ?? false;
  const rows = useMemo(
    () => release && metric ? buildRows(release, metric, currentDataset, year) : [],
    [currentDataset, metric, release, year],
  );
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

  const select = useCallback((code: string) => {
    setSelectedHistorical(null);
    setSelectedCode(code);
  }, []);
  const selectHistorical = useCallback((properties: HistoricalProperties) => {
    setSelectedCode(null);
    setSelectedHistorical(properties);
  }, []);
  const allYears = metric?.available_years ?? [1960, 2025];
  const firstYear = allYears[0];
  const lastYear = allYears[allYears.length - 1];
  const timelineIndex = allYears.reduce((nearestIndex, candidate, index) =>
    Math.abs(candidate - year) < Math.abs(allYears[nearestIndex] - year) ? index : nearestIndex,
  0);

  useEffect(() => {
    if (!playing || !metric) return;
    const timer = window.setInterval(() => {
      setYear((current) => {
        const next = metric.available_years.find((candidate) => candidate > current);
        return next ?? metric.available_years[0];
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [metric, playing]);

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
  const download = deepTimePopulation
    ? historicalPopulationDownloadUrl(release.manifest)
    : downloadUrl(metric.id, release.manifest);
  const atlasUrl = `?metric=${metric.id}&year=${year}${selectedCode ? `&place=${selectedCode}` : ''}`;
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
          <a href="?page=sources" aria-current={page === 'sources' ? 'page' : undefined}>Sources</a>
          {page === 'atlas' ? <a href={download} download>Download data</a> : null}
        </nav>
      </header>

      {page === 'sources' ? <SourcesPage manifest={release.manifest} /> : (
      <main id="main-content">
        <section className="hero-copy">
          <div>
            <span className="eyebrow">A measured view of our shared world</span>
            <h1>Where people lived.<br />What the evidence can tell us.</h1>
          </div>
          <p>
            Explore population through deep time and annual electricity-access evidence. Missing observations stay
            visible, time is never filled silently, and every value keeps its statistical support.
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
                  setHistoricalEnabled((enabled) => !enabled);
                  setSelectedHistorical(null);
                }}
              >
                <span className="release-dot" aria-hidden="true" />
                Historical borders & names
              </button>
              <div className="release-badge">
                <span className="release-dot" aria-hidden="true" />
                Genuine source data
              </div>
            </div>
          </div>

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
            selectedHistoricalId={selectedHistorical?.source_feature_id ?? null}
            caption={deepTimePopulation ? 'Global population estimate only' : view.mapCaption}
            caution={deepTimePopulation ? 'No historical population is assigned to these polities.' : view.mapCaution}
            selectedCode={selectedCode}
            onSelect={select}
            onHistoricalSelect={selectHistorical}
          />
          <Legend metric={metric} unavailable={deepTimePopulation} />

          <div className="date-display" aria-label={`Requested date ${formatAstronomicalYear(year)}`}>
            <span>Requested date</span>
            <strong>{dateMagnitude}</strong>
            <em>{dateEra}</em>
          </div>

          {historicalEnabled ? (
            <div className="historical-status" role="status">
              <span>Political context</span>
              <strong>
                {historicalReference
                  ? `${formatAstronomicalYear(historicalReference.atlas_year)} · ${historicalReference.feature_count} polities`
                  : 'No Cliopatria coverage'}
              </strong>
            </div>
          ) : null}

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
        </section>

        <section className="time-panel" aria-labelledby="time-title">
          <div className="time-heading">
            <div>
              <span className="eyebrow">Exact source-supported dates only</span>
              <h2 id="time-title">Time</h2>
            </div>
            <div className="year-controls">
              <button type="button" onClick={() => setPlaying((current) => !current)}>
                {playing ? 'Pause' : 'Play'}
              </button>
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
            max={allYears.length - 1}
            step="1"
            value={timelineIndex}
            onChange={(event) => {
              setPlaying(false);
              setYear(allYears[Number(event.target.value)]);
            }}
            aria-label={`Date, ${formatAstronomicalYear(year)}`}
          />
          <div className="timeline-labels" aria-hidden="true">
            <span>{formatAstronomicalYear(firstYear)}</span>
            <strong>{formatAstronomicalYear(year)}</strong>
            <span>{formatAstronomicalYear(lastYear)}</span>
          </div>
          <p>
            {metric.label} publishes {metric.available_years.length} exact source-supported dates from{' '}
            {formatAstronomicalYear(metric.available_years[0])} to {formatAstronomicalYear(metric.available_years.at(-1) ?? lastYear)}.
            {' '}The slider moves only among those dates; no interpolation or carry-forward is applied.
          </p>
          {!supported ? (
            <div className="unsupported-year" role="status">
              <span>{metric.label} has no published observation for {formatAstronomicalYear(year)}.</span>
              <button type="button" onClick={() => setYear(nearestYear)}>Show {formatAstronomicalYear(nearestYear)}</button>
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
          />
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
            <h2 id="method-title">{metric.safe_summary}</h2>
          </div>
          <p>
            {metric.definition} {deepTimePopulation
              ? 'Historical values use world support only; political geometry is a separate context layer.'
              : 'Modern values are shown at their World Bank country or territory support.'}
            {' '}This view must not be interpreted as {metric.prohibited_interpretations.join(', ')}.
          </p>
          <div className="method-actions">
            <a className="primary-action" href={download} download>
              Download {deepTimePopulation ? 'historical world estimates' : 'full series'} · CSV
            </a>
            <button type="button" className="secondary-action" onClick={() => setTableOpen((open) => !open)}>
              {tableOpen ? 'Hide evidence table' : 'Open evidence table'}
            </button>
            <a className="manifest-action" href={manifestUrl} target="_blank" rel="noreferrer">
              Open release manifest ↗
            </a>
          </div>
          <div className="source-list">
            {release.manifest.citations.map((citation) => (
              <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">
                <span>{citation.label}</span>
                <small>{citation.license} ↗</small>
              </a>
            ))}
          </div>
        </section>

        {tableOpen ? (
          deepTimePopulation ? (
            <HistoricalPopulationTable
              observation={release.historicalPopulation.observations.find((observation) => observation.year === year) ?? null}
              historicalSnapshot={historicalSnapshot}
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
