import type { ReferencePeriod } from './types';

export class UnverifiedYearZeroError extends Error {
  constructor() {
    super('Source year zero is quarantined until the source convention is verified');
    this.name = 'UnverifiedYearZeroError';
  }
}

/** Convert a signed historical year system with no year zero to astronomical years. */
export function historicalYearToAstronomical(sourceYear: number): number {
  if (!Number.isInteger(sourceYear)) {
    throw new TypeError('Historical years must be integers');
  }
  if (sourceYear === 0) {
    throw new UnverifiedYearZeroError();
  }
  return sourceYear < 0 ? sourceYear + 1 : sourceYear;
}

/** Convert an inclusive source range to the Atlas half-open internal convention. */
export function inclusiveHistoricalRange(
  sourceStart: number,
  sourceEnd: number,
): ReferencePeriod {
  const start = historicalYearToAstronomical(sourceStart);
  const end = historicalYearToAstronomical(sourceEnd);
  if (end < start) {
    throw new RangeError('The end year must not precede the start year');
  }
  return { start, endExclusive: end + 1 };
}

export function formatAstronomicalYear(year: number): string {
  if (!Number.isInteger(year)) {
    throw new TypeError('Astronomical years must be integers');
  }
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}
