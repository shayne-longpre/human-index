import { formatAstronomicalYear, type AtlasReleaseManifest, type PublishedMetric, type ViewRow } from '@atlas/contracts';
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
  const usesPopulationWeight = metric.aggregation_kind === 'person_prevalence'
    || metric.aggregation_kind === 'context_distribution';
  const universeId = metric.population_universe_id
    ?? metric.population_universe_periods?.find(
      (period) => row.year >= period.start_year && row.year <= period.end_year,
    )?.population_universe_id;
  const universe = manifest.population_universes.find((candidate) => candidate.id === universeId);
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
          <dd>{formatAstronomicalYear(row.year)}</dd>
        </div>
        {usesPopulationWeight ? (
          <div>
            <dt>Population weight</dt>
            <dd>{row.population?.value === null || !row.population ? 'Unknown' : formatPeople(row.population.value)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Statistical support</dt>
          <dd>{metric.id === 'population_outlook' ? 'UN WPP Country/Area series' : 'World Bank country or territory estimate'}</dd>
        </div>
        {row.metricEvidenceState ? (
          <div>
            <dt>Evidence state</dt>
            <dd>{row.metricEvidenceState === 'medium_projection' ? 'UN Medium projection' : 'UN population estimate'}</dd>
          </div>
        ) : null}
        <div>
          <dt>Map placement</dt>
          <dd>{row.entity.map_status === 'placed' ? 'Natural Earth 1:110m geometry' : 'Unplaced at this map scale'}</dd>
        </div>
        <div>
          <dt>Metric record</dt>
          <dd>{row.metricRecordLocator ?? 'No published observation for this year'}</dd>
        </div>
        {usesPopulationWeight ? (
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
        <span>{universe ? `${formatInteger(universe.entity_count)} statistical supports` : 'Date-specific statistical support'}</span>
      </div>
    </aside>
  );
}
