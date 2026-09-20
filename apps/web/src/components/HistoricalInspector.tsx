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
          Cliopatria identifies this as one published reconstruction. It may overlap other
          polities and contributes no population to Atlas totals.
        </p>
      </div>
      <div className="inspector-source">
        <span className="eyebrow">Source release</span>
        <p>{feature.source_release_id}</p>
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
