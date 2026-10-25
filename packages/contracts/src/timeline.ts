import type {
  AtlasReleaseManifest,
  HistoricalCityDataset,
  HistoricalContextIndex,
  HistoricalContextSnapshotReference,
} from './release';

/**
 * One requested date drives the Atlas. Each evidence layer still resolves that
 * date under its own temporal policy; this list only supplies useful stops for
 * the shared control.
 */
export function buildEvidenceTimelineYears(
  manifest: AtlasReleaseManifest,
  historicalContext: HistoricalContextIndex,
  historicalCities: HistoricalCityDataset,
  cityCompanions: readonly HistoricalCityDataset[] = [],
): number[] {
  return Array.from(new Set([
    ...manifest.metrics.flatMap((metric) => metric.available_years),
    ...historicalContext.snapshots.map((snapshot) => snapshot.atlas_year),
    ...historicalCities.years,
    ...cityCompanions.flatMap((item) => item.years),
  ])).sort((left, right) => left - right);
}

export function nearestTimelineIndex(years: readonly number[], requestedYear: number): number {
  if (years.length === 0) throw new Error('Evidence timeline needs at least one year');
  return years.reduce((nearestIndex, candidate, index) =>
    Math.abs(candidate - requestedYear) < Math.abs(years[nearestIndex] - requestedYear)
      ? index
      : nearestIndex, 0);
}

/**
 * Boundary snapshots are contextual display evidence, not statistical support.
 * Within the source's published coverage, use the latest sampled reconstruction
 * not after the requested date. Never extend the first or last snapshot beyond
 * the source's stated coverage.
 */
export function resolveHistoricalSnapshot(
  index: HistoricalContextIndex,
  requestedYear: number,
): HistoricalContextSnapshotReference | null {
  const first = index.snapshots[0];
  const last = index.snapshots.at(-1);
  if (!first || !last || requestedYear < first.atlas_year || requestedYear > last.atlas_year) {
    return null;
  }
  let resolved: HistoricalContextSnapshotReference = first;
  for (const snapshot of index.snapshots) {
    if (snapshot.atlas_year > requestedYear) break;
    resolved = snapshot;
  }
  return resolved;
}
