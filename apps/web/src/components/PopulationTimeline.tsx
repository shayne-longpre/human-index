import type { PopulationSummary } from '@atlas/contracts';
import { formatInteger, formatPeople } from '../format';

interface PopulationTimelineProps {
  summaries: PopulationSummary[];
  year: number;
  entityCount: number;
}

function pathFor(
  summaries: PopulationSummary[],
  value: (summary: PopulationSummary) => number,
): string {
  const minYear = summaries[0].year;
  const maxYear = summaries[summaries.length - 1].year;
  const maxValue = Math.max(...summaries.map((summary) => summary.world_reference_population));
  return summaries.map((summary, index) => {
    const x = ((summary.year - minYear) / (maxYear - minYear)) * 1000;
    const y = 135 - (value(summary) / maxValue) * 115;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export function PopulationTimeline({ summaries, year, entityCount }: PopulationTimelineProps) {
  const current = summaries.find((summary) => summary.year === year) ?? null;
  const minYear = summaries[0].year;
  const maxYear = summaries[summaries.length - 1].year;
  const x = ((year - minYear) / (maxYear - minYear)) * 1000;
  const maxValue = Math.max(...summaries.map((summary) => summary.world_reference_population));
  const y = current ? 135 - (current.covered_population / maxValue) * 115 : 135;

  return (
    <section className="population-panel population-timeline-panel" aria-labelledby="population-history-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Annual observations · {minYear}–{maxYear}</span>
          <h2 id="population-history-title">Population through time</h2>
        </div>
        <div className="population-total">
          <strong>{current ? formatPeople(current.covered_population).replace(' people', '') : 'Unavailable'}</strong>
          <span>covered population · {year}</span>
        </div>
      </div>

      <svg
        className="population-chart"
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Covered population and World Bank world reference from ${minYear} to ${maxYear}`}
      >
        <path className="population-reference-line" d={pathFor(summaries, (summary) => summary.world_reference_population)} />
        <path className="population-covered-line" d={pathFor(summaries, (summary) => summary.covered_population)} />
        {current ? <circle className="population-current-point" cx={x} cy={y} r="5" /> : null}
      </svg>
      <div className="chart-key" aria-hidden="true">
        <span><i className="key-covered" />Covered universe</span>
        <span><i className="key-reference" />WLD reference</span>
      </div>

      {current ? (
        <div className="population-facts">
          <div><span>Known entities</span><strong>{current.known_entities} / {entityCount}</strong></div>
          <div><span>WLD reference</span><strong>{formatPeople(current.world_reference_population)}</strong></div>
          <div><span>Unassigned residual</span><strong>{formatPeople(current.reference_residual)}</strong></div>
          <div><span>Not placed on map</span><strong>{formatPeople(current.unplaced_population)}</strong></div>
        </div>
      ) : null}
      <p className="scope-note">
        The solid line sums published non-aggregate statistical territories. The dotted WLD reference is
        shown for reconciliation only; its residual is preserved and never assigned to an inferred place.
        Totals describe territories, not local population density.
      </p>
    </section>
  );
}
