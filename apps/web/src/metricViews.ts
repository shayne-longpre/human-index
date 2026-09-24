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
  population_outlook: {
    mapCaption: 'UN Country / Area total · 1 July',
    mapCaution: '2024 onward is the UN Medium projection.',
    legendLabels: ['10K', '1M', '100M', '500M', '2B'],
    legendAria: 'UN population total color scale from ten thousand to two billion people on a logarithmic scale',
    legendClass: 'legend-ramp-population',
  },
  access_to_electricity: {
    mapCaption: 'National / territorial estimate',
    mapCaution: 'Color does not identify local households.',
    legendLabels: ['0%', '25', '50', '75', '100%'],
    legendAria: 'Electricity access color scale from zero to one hundred percent',
    legendClass: 'legend-ramp-electricity',
  },
  life_expectancy_at_birth: {
    mapCaption: 'National / territorial period mean',
    mapCaution: 'Color is context, not an individual lifespan prediction.',
    legendLabels: ['45', '55', '65', '75', '90 years'],
    legendAria: 'Life expectancy color scale from forty-five to ninety years',
    legendClass: 'legend-ramp-life',
  },
  gdp_per_capita_constant_2015_usd: {
    mapCaption: 'Territorial national-accounts context',
    mapCaution: 'Constant 2015 US$ is not individual income or a PPP welfare ranking.',
    legendLabels: ['$200', '$2K', '$20K', '$80K', '$250K'],
    legendAria: 'GDP per capita color scale from two hundred to two hundred fifty thousand constant 2015 US dollars on a logarithmic scale',
    legendClass: 'legend-ramp-gdp',
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

const gdpStops: Array<{ value: number; color: Rgba }> = [
  { value: 200, color: [30, 48, 48, 255] },
  { value: 2_000, color: [43, 82, 73, 255] },
  { value: 20_000, color: [101, 131, 91, 255] },
  { value: 80_000, color: [182, 168, 91, 255] },
  { value: 250_000, color: [245, 211, 127, 255] },
];

function gdpColor(value: number | null): Rgba {
  if (value === null) return unknownColor;
  const boundedValue = Math.min(
    gdpStops[gdpStops.length - 1].value,
    Math.max(gdpStops[0].value, value),
  );
  const logged = Math.log1p(boundedValue);
  const loggedStops = gdpStops.map((stop) => Math.log1p(stop.value));
  const upperIndex = Math.min(
    gdpStops.length - 1,
    Math.max(1, loggedStops.findIndex((stop) => stop >= logged)),
  );
  const lower = gdpStops[upperIndex - 1];
  const upper = gdpStops[upperIndex];
  const mix = (logged - loggedStops[upperIndex - 1]) /
    (loggedStops[upperIndex] - loggedStops[upperIndex - 1] || 1);
  return lower.color.map((channel, index) =>
    index === 3 ? channel : Math.round(channel + (upper.color[index] - channel) * mix),
  ) as Rgba;
}

export function metricColor(metricId: MvpMetricId, value: number | null): Rgba {
  if (metricId === 'population_total' || metricId === 'population_outlook') return populationColor(value);
  if (metricId === 'access_to_electricity') return electricityColor(value);
  if (metricId === 'gdp_per_capita_constant_2015_usd') return gdpColor(value);
  if (value === null) return unknownColor;
  return electricityColor((Math.max(45, Math.min(90, value)) - 45) / 45 * 100);
}

export function formatMetricValue(metric: PublishedMetric, value: number | null): string {
  if (value === null) return 'Unknown';
  if (metric.id === 'population_total' || metric.id === 'population_outlook') return `${formatInteger(value)} people`;
  if (metric.id === 'access_to_electricity') return formatPercent(value);
  if (metric.id === 'gdp_per_capita_constant_2015_usd') {
    return `$${formatInteger(value)} constant 2015 US$`;
  }
  return `${value.toFixed(1)} years`;
}
