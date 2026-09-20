const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const integerNumber = new Intl.NumberFormat('en', {
  maximumFractionDigits: 0,
});

const percentNumber = new Intl.NumberFormat('en', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatPeople(value: number): string {
  return `${compactNumber.format(value)} people`;
}

export function formatInteger(value: number): string {
  return integerNumber.format(Math.round(value));
}

export function formatPercent(value: number): string {
  return `${percentNumber.format(value)}%`;
}

const sharePercentNumber = new Intl.NumberFormat('en', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Keep small nonzero denominator shares visible instead of rounding them to zero. */
export function formatSharePercent(value: number): string {
  return `${sharePercentNumber.format(value)}%`;
}

export type Rgba = [number, number, number, number];

const stops: Array<{ value: number; color: Rgba }> = [
  { value: 0, color: [30, 48, 48, 255] },
  { value: 25, color: [45, 85, 75, 255] },
  { value: 50, color: [88, 128, 95, 255] },
  { value: 75, color: [168, 166, 96, 255] },
  { value: 100, color: [245, 211, 127, 255] },
];

export const unknownColor: Rgba = [104, 112, 108, 255];

export function electricityColor(value: number | null): Rgba {
  if (value === null) return unknownColor;
  const clamped = Math.max(0, Math.min(100, value));
  const upperIndex = Math.min(
    stops.length - 1,
    Math.max(1, stops.findIndex((stop) => stop.value >= clamped)),
  );
  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const mix = (clamped - lower.value) / (upper.value - lower.value || 1);
  return lower.color.map((channel, index) =>
    index === 3 ? channel : Math.round(channel + (upper.color[index] - channel) * mix),
  ) as Rgba;
}
