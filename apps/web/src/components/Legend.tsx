import type { PublishedMetric } from '@atlas/contracts';
import { metricViews } from '../metricViews';

interface LegendProps {
  metric: PublishedMetric;
  unavailable?: boolean;
}

export function Legend({ metric, unavailable = false }: LegendProps) {
  const view = metricViews[metric.id];
  if (unavailable) {
    return (
      <div className="legend legend-unavailable" aria-label="No spatial population allocation for this date">
        <div className="legend-heading"><span>Population</span><span>global only</span></div>
        <p>No territorial population colors are shown. Historical borders are independent context.</p>
      </div>
    );
  }
  return (
    <div className="legend" aria-label={view.legendAria}>
      <div className="legend-heading">
        <span>{metric.label}</span>
        <span>{metric.aggregation_kind === 'population_total' ? 'log scale' : metric.unit}</span>
      </div>
      <div className={`legend-ramp ${view.legendClass}`} aria-hidden="true" />
      <div className="legend-labels">
        {view.legendLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="legend-unknown">
        <span className="unknown-swatch" aria-hidden="true" />
        Unknown
      </div>
    </div>
  );
}
