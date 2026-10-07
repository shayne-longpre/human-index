/** Fixed across dates and sources: color encodes count, height encodes physical density. */
export function surfaceColor(people: number): [number, number, number, number] {
  const intensity = Math.min(1, Math.log10(people + 1) / 7);
  return [
    Math.round(35 + 214 * intensity),
    Math.round(110 + 108 * intensity),
    Math.round(96 - 34 * intensity),
    225,
  ];
}

export function surfaceElevation(people: number, binAreaKm2: number): number {
  return Math.min(120000, Math.log10(people / binAreaKm2 + 1) * 27000);
}
