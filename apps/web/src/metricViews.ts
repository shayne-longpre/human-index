import type { MvpMetricId, PublishedMetric } from '@atlas/contracts';
import { electricityColor, formatInteger, formatPercent, type Rgba, unknownColor } from './format';

interface MetricView {
  mapCaption: string;
  mapCaution: string;
  legendLabels: string[];
  legendAria: string;
  legendClass: string;
}

export const metricViews: Record<MvpMetricId, MetricView> = {
  population_total: {
    mapCaption: 'Country / territorial total',
    mapCaution: 'Color does not show local density.',
    legendLabels: ['10K', '1M', '100M', '500M', '2B'],
    legendAria: 'Population total color scale from ten thousand to two billion people on a logarithmic scale',
    legendClass: 'legend-ramp-population',
  },
  access_to_electricity: {
    mapCaption: 'National / territorial estimate',
    mapCaution: 'Color does not identify local households.',
    legendLabels: ['0%', '25', '50', '75', '100%'],
    legendAria: 'Electricity access color scale from zero to one hundred percent',
    legendClass: 'legend-ramp-electricity',
  },
};

const populationStops: Array<{ value: number; color: Rgba }> = [
  { value: 10_000, color: [25, 50, 48, 255] },
  { value: 1_000_000, color: [39, 82, 74, 255] },
  { value: 100_000_000, color: [96, 131, 91, 255] },
  { value: 500_000_000, color: [176, 169, 93, 255] },
  { value: 2_000_000_000, color: [245, 211, 127, 255] },
];

function populationColor(value: number | null): Rgba {
  if (value === null) return unknownColor;
  const logged = Math.log1p(Math.max(populationStops[0].value, value));
  const loggedStops = populationStops.map((stop) => Math.log1p(stop.value));
  const upperIndex = Math.min(
    populationStops.length - 1,
    Math.max(1, loggedStops.findIndex((stop) => stop >= logged)),
  );
  const lower = populationStops[upperIndex - 1];
  const upper = populationStops[upperIndex];
  const mix = (logged - loggedStops[upperIndex - 1]) /
    (loggedStops[upperIndex] - loggedStops[upperIndex - 1] || 1);
  return lower.color.map((channel, index) =>
    index === 3 ? channel : Math.round(channel + (upper.color[index] - channel) * mix),
  ) as Rgba;
}

export function metricColor(metricId: MvpMetricId, value: number | null): Rgba {
  return metricId === 'population_total' ? populationColor(value) : electricityColor(value);
}

export function formatMetricValue(metric: PublishedMetric, value: number | null): string {
  if (value === null) return 'Unknown';
  return metric.id === 'population_total' ? `${formatInteger(value)} people` : formatPercent(value);
}
