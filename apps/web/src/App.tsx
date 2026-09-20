import {
  aggregatePrevalence,
  validatePublishedMetrics,
  type MvpMetricId,
  type PublishedMetric,
  type ViewRow,
} from '@atlas/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from './components/DataTable';
import { Inspector } from './components/Inspector';
import { Legend } from './components/Legend';
import { MapView } from './components/MapView';
import { PopulationBar } from './components/PopulationBar';
import { PopulationTimeline } from './components/PopulationTimeline';
import {
  downloadUrl,
  loadMetricData,
  loadReleaseBase,
  manifestUrl,
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
  const [release, setRelease] = useState<ReleaseBase | null>(null);
  const [metricDatasets, setMetricDatasets] = useState<Partial<Record<MvpMetricId, MetricDataset>>>({});
  const [metricId, setMetricId] = useState<MvpMetricId>('population_total');
  const [year, setYear] = useState(2024);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricError, setMetricError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadReleaseBase()
      .then((loaded) => {
        if (!active) return;
        validatePublishedMetrics(loaded.manifest.metrics);
        setRelease(loaded);
        setMetricId(loaded.manifest.default_view.metric_id);
        setYear(loaded.manifest.default_view.year);
        setMetricDatasets({ population_total: loaded.population });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'The release could not be loaded');
      });
    return () => { active = false; };
  }, []);

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

  const select = useCallback((code: string) => setSelectedCode(code), []);
  const allYears = release?.population.years ?? [1960, 2025];
  const firstYear = allYears[0];
  const lastYear = allYears[allYears.length - 1];

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
  const download = downloadUrl(metric.id, release.manifest);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#main-content" aria-label="Atlas of Humanity home">
          <span className="wordmark-mark" aria-hidden="true">A</span>
          <span>Atlas of Humanity</span>
        </a>
        <nav aria-label="Release links">
          <a href="#sources">Sources</a>
          <a href={download} download>Download data</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero-copy">
          <div>
            <span className="eyebrow">A measured view of our shared world</span>
            <h1>Where people lived.<br />What the evidence can tell us.</h1>
          </div>
          <p>
            Explore annual population and electricity-access evidence. Missing observations stay
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
                  <small>{candidate.available_years[0]}–{candidate.available_years.at(-1)}</small>
                </button>
              ))}
            </div>
            <div className="release-badge">
              <span className="release-dot" aria-hidden="true" />
              Genuine source data
            </div>
          </div>

          <MapView
            geometry={release.geometry}
            metricId={metric.id}
            metricLabel={metric.label}
            year={year}
            valueByCode={valueByCode}
            caption={view.mapCaption}
            caution={view.mapCaution}
            selectedCode={selectedCode}
            onSelect={select}
          />
          <Legend metric={metric} />

          <div className="date-display" aria-label={`Effective date ${year} CE`}>
            <span>Effective date</span>
            <strong>{year}</strong>
            <em>CE</em>
          </div>

          <Inspector
            row={selectedRow}
            metric={metric}
            manifest={release.manifest}
            onClose={() => setSelectedCode(null)}
          />
        </section>

        <section className="time-panel" aria-labelledby="time-title">
          <div className="time-heading">
            <div>
              <span className="eyebrow">Exact annual observations only</span>
              <h2 id="time-title">Time</h2>
            </div>
            <div className="year-controls">
              <button type="button" onClick={() => setPlaying((current) => !current)}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <label className="year-entry">
                <span>Requested year</span>
                <input
                  type="number"
                  min={firstYear}
                  max={lastYear}
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                />
              </label>
            </div>
          </div>
          <input
            className="timeline-range"
            type="range"
            min={firstYear}
            max={lastYear}
            step="1"
            value={year}
            onChange={(event) => {
              setPlaying(false);
              setYear(Number(event.target.value));
            }}
            aria-label={`Year, ${year}`}
          />
          <div className="timeline-labels" aria-hidden="true">
            <span>{firstYear}</span><strong>{year}</strong><span>{lastYear}</span>
          </div>
          <p>
            {metric.label} publishes {metric.available_years[0]}–{metric.available_years.at(-1)}.
            {' '}No interpolation, extrapolation, or carry-forward is applied.
          </p>
          {!supported ? (
            <div className="unsupported-year" role="status">
              <span>{metric.label} has no published observation series for {year}.</span>
              <button type="button" onClick={() => setYear(nearestYear)}>Show {nearestYear}</button>
            </div>
          ) : null}
        </section>

        {metric.id === 'population_total' ? (
          <PopulationTimeline
            summaries={release.population.summaries}
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
            {metric.definition} Values are shown at their World Bank country or territory support.
            {' '}This view must not be interpreted as {metric.prohibited_interpretations.join(', ')}.
          </p>
          <div className="method-actions">
            <a className="primary-action" href={download} download>Download full series · CSV</a>
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

        {tableOpen ? <DataTable rows={rows} metric={metric} onSelect={select} /> : null}
      </main>

      <footer>
        <span>Atlas release {release.manifest.release_id}</span>
        <span>Evidence retrieved {release.manifest.published_on}</span>
      </footer>
    </div>
  );
}
