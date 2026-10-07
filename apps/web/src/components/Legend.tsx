import type { PublishedMetric } from '@atlas/contracts';
import { metricViews } from '../metricViews';

interface LegendProps {
  metric: PublishedMetric;
  unavailable?: boolean;
  surface?: boolean;
}

export function Legend({ metric, unavailable = false, surface = false }: LegendProps) {
  const view = metricViews[metric.id];
  if (surface) {
    return (
      <div className="legend" aria-label="Modeled people per one-degree population bin, fixed logarithmic scale">
        <div className="legend-heading"><span>Color: people / 1° bin</span><span>log</span></div>
        <div className="legend-ramp legend-surface" aria-hidden="true" />
        <div className="legend-labels"><span>1</span><span>1k</span><span>1m</span><span>10m+</span></div>
        <div className="legend-unknown">Height: people/km² of full bin · fixed log scale. Zoom in for gray source-covered zero dots. Blank: no source coverage.</div>
      </div>
    );
  }
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
