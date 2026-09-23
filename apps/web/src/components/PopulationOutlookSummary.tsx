import { formatAstronomicalYear, type PopulationOutlookSummary as Summary } from '@atlas/contracts';
import { formatInteger, formatPeople } from '../format';

interface PopulationOutlookSummaryProps {
  summary: Summary;
}

export function PopulationOutlookSummary({ summary }: PopulationOutlookSummaryProps) {
  const isProjection = summary.evidence_state === 'medium_projection';
  return (
    <section className="population-panel" aria-labelledby="wpp-summary-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">UN WPP 2024 · {isProjection ? 'scenario evidence' : 'modeled estimate'}</span>
          <h2 id="wpp-summary-title">
            {isProjection ? 'Medium population projection' : 'Population estimate'}
          </h2>
        </div>
        <div className="population-total">
          <strong>{formatPeople(summary.total_population).replace(' people', '')}</strong>
          <span>Country/Area total · {formatAstronomicalYear(summary.year)}</span>
        </div>
      </div>
      <div className="population-facts">
        <div><span>Source supports</span><strong>{formatInteger(summary.source_country_area_count)}</strong></div>
        <div><span>World reference</span><strong>{formatPeople(summary.world_reference_population)}</strong></div>
        <div><span>Rounding residual</span><strong>{formatInteger(summary.world_reference_rounding_residual)} people</strong></div>
        <div><span>Not placed on map</span><strong>{formatPeople(summary.unplaced_population)}</strong></div>
      </div>
      <p className="scope-note">
        Values are published for 1 July. {isProjection
          ? 'This is the UN Medium projection—not an observation and not a confidence interval.'
          : 'This is a UN modeled estimate informed by demographic evidence—not a raw census count.'}
        {' '}Country/Area totals and the World row differ by a preserved signed rounding residual.
      </p>
    </section>
  );
}
