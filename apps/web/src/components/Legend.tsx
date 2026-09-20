import type { PublishedMetric } from '@atlas/contracts';
import { metricViews } from '../metricViews';

interface LegendProps {
  metric: PublishedMetric;
}

export function Legend({ metric }: LegendProps) {
  const view = metricViews[metric.id];
  return (
    <div className="legend" aria-label={view.legendAria}>
      <div className="legend-heading">
        <span>{metric.label}</span>
        <span>{metric.id === 'population_total' ? 'log scale' : metric.unit}</span>
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
