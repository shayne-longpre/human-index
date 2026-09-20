import type { AtlasReleaseManifest, PublishedMetric, ViewRow } from '@atlas/contracts';
import { formatInteger, formatPeople } from '../format';
import { formatMetricValue } from '../metricViews';

interface InspectorProps {
  row: ViewRow | null;
  metric: PublishedMetric;
  manifest: AtlasReleaseManifest;
  onClose: () => void;
}

export function Inspector({ row, metric, manifest, onClose }: InspectorProps) {
  if (!row) return null;
  return (
    <aside className="inspector" aria-labelledby="inspector-title">
      <button className="icon-button inspector-close" type="button" onClick={onClose} aria-label="Close inspector">
        ×
      </button>
      <span className="eyebrow">Place inspector · {row.entity.code}</span>
      <h2 id="inspector-title">{row.entity.name}</h2>
      <div className="inspector-value">
        <strong>{formatMetricValue(metric, row.metricValue)}</strong>
        <span>{metric.label} · {metric.unit}</span>
      </div>
      <dl className="inspector-list">
        <div>
          <dt>Effective date</dt>
          <dd>{row.year} CE</dd>
        </div>
        {metric.id !== 'population_total' ? (
          <div>
            <dt>Population weight</dt>
            <dd>{row.population?.value === null || !row.population ? 'Unknown' : formatPeople(row.population.value)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Statistical support</dt>
          <dd>World Bank country or territory estimate</dd>
        </div>
        <div>
          <dt>Map placement</dt>
          <dd>{row.entity.map_status === 'placed' ? 'Natural Earth 1:110m geometry' : 'Unplaced at this map scale'}</dd>
        </div>
        <div>
          <dt>Metric record</dt>
          <dd>{row.metricRecordLocator ?? 'No published observation for this year'}</dd>
        </div>
        {metric.id !== 'population_total' ? (
          <div>
            <dt>Population record</dt>
            <dd>{row.population?.original_record_locator ?? 'No published population observation'}</dd>
          </div>
        ) : null}
      </dl>
      <div className="inspector-caution">
        <strong>Interpret at the published support.</strong>
        <p>Not a measure of {metric.prohibited_interpretations.join(', ')}.</p>
      </div>
      <div className="inspector-source">
        <span className="eyebrow">Source release</span>
        <p>{manifest.release_id}</p>
        <span>{formatInteger(manifest.population_universes[0].entity_count)} statistical supports</span>
      </div>
    </aside>
  );
}
