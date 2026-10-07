import {
  formatAstronomicalYear,
  type HistoricalPopulationDataset,
  type HistoricalPopulationObservation,
  type PopulationSummary,
  type PopulationSurfaceReference,
} from '@atlas/contracts';
import { formatPeople } from '../format';

interface PopulationTimelineProps {
  summaries: PopulationSummary[];
  historical: HistoricalPopulationDataset;
  historicalDownload: string;
  year: number;
  entityCount: number;
  surfaceReferences: PopulationSurfaceReference[];
  selectedSurfaceSourceId: string | null;
}

interface ChartPoint {
  year: number;
  lower: number;
  upper: number;
}

function historicalChartPoints(historical: HistoricalPopulationDataset): ChartPoint[] {
  return historical.observations.map((observation) => ({
    year: observation.year,
    lower: observation.lower,
    upper: observation.upper ?? observation.lower,
  }));
}

function modernChartPoints(summaries: PopulationSummary[]): ChartPoint[] {
  return summaries.map((summary) => ({
    year: summary.year,
    lower: summary.covered_population,
    upper: summary.covered_population,
  }));
}

function pathFor(
  series: ChartPoint[],
  minYear: number,
  maxYear: number,
  maxValue: number,
  value: (point: ChartPoint) => number,
): string {
  const maxLog = Math.log1p(maxValue);
  return series.map((point, index) => {
    const x = ((point.year - minYear) / (maxYear - minYear)) * 1000;
    const y = 135 - (Math.log1p(value(point)) / maxLog) * 115;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function rangeValue(observation: HistoricalPopulationObservation): string {
  const lower = formatPeople(observation.lower).replace(' people', '');
  if (observation.upper === null) return lower;
  return `${lower}–${formatPeople(observation.upper).replace(' people', '')}`;
}

export function PopulationTimeline({
  summaries,
  historical,
  historicalDownload,
  year,
  entityCount,
  surfaceReferences,
  selectedSurfaceSourceId,
}: PopulationTimelineProps) {
  const modern = summaries.find((summary) => summary.year === year) ?? null;
  const ancient = historical.observations.find((observation) => observation.year === year) ?? null;
  const historicalPoints = historicalChartPoints(historical);
  const modernPoints = modernChartPoints(summaries);
  const selectedSurfaceReferences = surfaceReferences
    .filter((reference) => reference.source_release_id === selectedSurfaceSourceId)
    .sort((left, right) => left.year - right.year);
  const surfacePoints = selectedSurfaceReferences.map(
    (reference) => ({ year: reference.year, lower: reference.source_total_people, upper: reference.source_total_people }),
  );
  const lastEstimate = [...selectedSurfaceReferences].reverse().find((reference) => reference.evidence_state !== 'projection');
  const projectionPoints = [
    ...(lastEstimate ? [{ year: lastEstimate.year, lower: lastEstimate.source_total_people, upper: lastEstimate.source_total_people }] : []),
    ...selectedSurfaceReferences.filter((reference) => reference.evidence_state === 'projection').map(
      (reference) => ({ year: reference.year, lower: reference.source_total_people, upper: reference.source_total_people }),
    ),
  ];
  const estimatePoints = surfacePoints.filter((point) => selectedSurfaceReferences.find(
    (reference) => reference.year === point.year,
  )?.evidence_state !== 'projection');
  const surfaceCurrent = surfaceReferences.find(
    (reference) => reference.source_release_id === selectedSurfaceSourceId && reference.year === year,
  ) ?? null;
  const points = [...historicalPoints, ...modernPoints, ...surfacePoints];
  const minYear = Math.min(...points.map((point) => point.year));
  const maxYear = Math.max(...points.map((point) => point.year));
  const maxValue = Math.max(...points.map((point) => point.upper));
  const currentValue = surfaceCurrent?.source_total_people ?? modern?.covered_population ?? ancient?.lower ?? null;
  const x = ((year - minYear) / (maxYear - minYear)) * 1000;
  const y = currentValue === null
    ? 135
    : 135 - (Math.log1p(currentValue) / Math.log1p(maxValue)) * 115;

  return (
    <section className="population-panel population-timeline-panel" aria-labelledby="population-history-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Published dates · 10,000 BCE–2025 CE</span>
          <h2 id="population-history-title">Population through time</h2>
        </div>
        <div className="population-total">
          <strong>
            {surfaceCurrent
              ? formatPeople(surfaceCurrent.source_total_people).replace(' people', '')
              : modern
              ? formatPeople(modern.covered_population).replace(' people', '')
              : ancient
                ? rangeValue(ancient)
                : 'Unavailable'}
          </strong>
          <span>
            {surfaceCurrent ? surfaceCurrent.evidence_state === 'projection' ? 'source-native raster projection' : 'source-native modeled raster total' : modern ? 'covered territorial population' : ancient ? 'global historical estimate' : 'no published value'}
            {' · '}{formatAstronomicalYear(year)}
          </span>
        </div>
      </div>

      <svg
        className="population-chart"
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
        role="img"
        aria-label="Separate published historical world estimates, World Bank covered-population totals, and selected gridded-source totals on a logarithmic scale"
      >
        <path className="population-range-line" d={pathFor(historicalPoints, minYear, maxYear, maxValue, (point) => point.upper)} />
        <path className="population-covered-line" d={pathFor(historicalPoints, minYear, maxYear, maxValue, (point) => point.lower)} />
        <path className="population-modern-line" d={pathFor(modernPoints, minYear, maxYear, maxValue, (point) => point.lower)} />
        {estimatePoints.length > 0 ? <path className="population-surface-line" d={pathFor(estimatePoints, minYear, maxYear, maxValue, (point) => point.lower)} /> : null}
        {projectionPoints.length > 1 ? <path className="population-surface-projection-line" d={pathFor(projectionPoints, minYear, maxYear, maxValue, (point) => point.lower)} /> : null}
        {currentValue !== null ? <circle className="population-current-point" cx={x} cy={y} r="5" /> : null}
      </svg>
      <div className="chart-key">
        <span><i className="key-covered" />Historical lower / point</span>
        <span><i className="key-range" />Historical upper</span>
        <span><i className="key-modern" />Modern covered universe</span>
        {surfacePoints.length > 0 ? <span><i className="key-surface" />Selected gridded reconstruction · separate source</span> : null}
        {projectionPoints.length > 1 ? <span><i className="key-surface-projection" />Gridded projection · dashed</span> : null}
        <span>Log population scale · lines only connect published dates</span>
      </div>

      {surfaceCurrent ? (
        <div className="population-facts">
          <div><span>Raster source total</span><strong>{formatPeople(surfaceCurrent.source_total_people)}</strong></div>
          <div><span>Shown in grid bins</span><strong>{formatPeople(surfaceCurrent.published_bin_total_people)}</strong></div>
          <div><span>Outside-grid residual</span><strong>{formatPeople(surfaceCurrent.unassigned_outside_grid_people)}</strong></div>
          <div><span>WB covered territories · separate</span><strong>{modern ? formatPeople(modern.covered_population) : 'Unavailable'}</strong></div>
        </div>
      ) : modern ? (
        <div className="population-facts">
          <div><span>Known entities</span><strong>{modern.known_entities} / {entityCount}</strong></div>
          <div><span>WLD reference</span><strong>{formatPeople(modern.world_reference_population)}</strong></div>
          <div><span>Unassigned residual</span><strong>{formatPeople(modern.reference_residual)}</strong></div>
          <div><span>Not placed on map</span><strong>{formatPeople(modern.unplaced_population)}</strong></div>
        </div>
      ) : ancient ? (
        <div className="population-facts">
          <div><span>Statistical support</span><strong>World total only</strong></div>
          <div><span>Evidence form</span><strong>{ancient.upper === null ? 'Published point' : 'Cross-source range'}</strong></div>
          <div><span>Spatial allocation</span><strong>None in this release</strong></div>
          <div><span>Map relationship</span><strong>Independent context</strong></div>
        </div>
      ) : null}

      <p className="scope-note">
        {surfaceCurrent
          ? 'The selected raster is a modeled source-native reconstruction. It is never added to or rebased against World Bank territorial population; the two series are separately drawn and labelled.'
          : modern
          ? 'Modern totals use the declared World Bank statistical universe; WLD remains a separate reconciliation reference.'
          : ancient
            ? 'The U.S. Census Bureau comparison table compiles published historical estimates. Ranges represent disagreement between sources, not statistical confidence intervals. No value is assigned to a Cliopatria polity.'
            : 'No historical population value is published for this requested date. Atlas does not interpolate between the surrounding estimates.'}
        {' '}<a href={historicalDownload} download>Download historical population evidence · CSV</a>
      </p>
    </section>
  );
}
