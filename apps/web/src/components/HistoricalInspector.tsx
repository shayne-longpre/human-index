import { formatAstronomicalYear } from '@atlas/contracts';
import type { HistoricalProperties } from '../data';
import { formatInteger } from '../format';

function sourceYearLabel(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year > 0) return `${year} CE`;
  return 'source year 0 (unresolved convention)';
}

interface HistoricalInspectorProps {
  feature: HistoricalProperties | null;
  snapshotYear: number | null;
  onClose: () => void;
}

export function HistoricalInspector({ feature, snapshotYear, onClose }: HistoricalInspectorProps) {
  if (!feature) return null;
  return (
    <aside className="inspector historical-inspector" aria-labelledby="historical-inspector-title">
      <button className="icon-button inspector-close" type="button" onClick={onClose} aria-label="Close inspector">
        ×
      </button>
      <span className="eyebrow">Historical context · contestable reconstruction</span>
      <h2 id="historical-inspector-title">{feature.name}</h2>
      <div className="inspector-value historical-inspector-value">
        <strong>{snapshotYear === null ? '—' : formatAstronomicalYear(snapshotYear)}</strong>
        <span>effective boundary snapshot</span>
      </div>
      <dl className="inspector-list">
        <div>
          <dt>Source interval</dt>
          <dd>{sourceYearLabel(feature.source_from_year)}–{sourceYearLabel(feature.source_to_year)}, inclusive</dd>
        </div>
        <div>
          <dt>Source area</dt>
          <dd>{formatInteger(Math.round(feature.area_km2))} km²</dd>
        </div>
        <div>
          <dt>Feature type</dt>
          <dd>Polity context; not a statistical population support</dd>
        </div>
        <div>
          <dt>Source relation</dt>
          <dd>
            {feature.source_relation_role === 'composite'
              ? `Composite of ${feature.source_components.join(', ')}`
              : feature.source_member_of
                ? `Member of ${feature.source_member_of}`
                : 'No hierarchy supplied for this record'}
          </dd>
        </div>
        <div>
          <dt>Reconciliation</dt>
          <dd>{feature.reconciliation_status.replaceAll('_', ' ')}</dd>
        </div>
        {feature.unresolved_overlap_count > 0 ? (
          <div>
            <dt>Unresolved overlaps</dt>
            <dd>{feature.unresolved_overlap_count}; both source geometries remain visible</dd>
          </div>
        ) : null}
        {feature.overlap_decisions.length > 0 ? (
          <div>
            <dt>Overlap decisions</dt>
            <dd>
              {feature.overlap_decisions.map((decision) => (
                <span className="inspector-decision" key={decision.decision_id}>
                  {decision.counterpart_name}: {decision.disposition.replaceAll('_', ' ')}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Geometry</dt>
          <dd>{feature.precision_class.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Source ID</dt>
          <dd>{feature.source_feature_id}</dd>
        </div>
      </dl>
      <div className="inspector-caution">
        <strong>Boundaries are evidence, not ground truth.</strong>
        <p>
          Cliopatria identifies this as one published reconstruction. Source-declared composites
          receive an outline treatment; unexplained overlaps remain visible. No feature contributes
          population to Atlas totals.
        </p>
      </div>
      <div className="inspector-source">
        <span className="eyebrow">Source release</span>
        <p>{feature.source_release_id}</p>
        <span>{feature.reconciliation_decision_set_id}</span>
        <div className="historical-links">
          {feature.wikidata ? (
            <a href={`https://www.wikidata.org/wiki/${feature.wikidata}`} target="_blank" rel="noreferrer">Wikidata ↗</a>
          ) : null}
          {feature.wikipedia ? (
            <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(feature.wikipedia.replaceAll(' ', '_'))}`} target="_blank" rel="noreferrer">Wikipedia ↗</a>
          ) : null}
          {feature.seshat_id ? (
            <a href={`https://seshat-db.com/core/polity/${feature.seshat_id}`} target="_blank" rel="noreferrer">Seshat ↗</a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
