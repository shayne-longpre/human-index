export interface ContextUnit {
  id: string;
  population: number;
  territorialMean: number | null;
}

export interface FixedBin {
  minInclusive: number;
  maxExclusive: number;
}

export function aggregateContextDistribution(
  units: readonly ContextUnit[],
  bins: readonly FixedBin[],
): { binPopulations: number[]; unknown: number } {
  const binPopulations = bins.map(() => 0);
  let unknown = 0;
  for (const unit of units) {
    if (!Number.isFinite(unit.population) || unit.population < 0) {
      throw new RangeError(`Population must be nonnegative for ${unit.id}`);
    }
    if (unit.territorialMean === null) {
      unknown += unit.population;
      continue;
    }
    const index = bins.findIndex(
      (bin) => unit.territorialMean! >= bin.minInclusive && unit.territorialMean! < bin.maxExclusive,
    );
    if (index < 0) {
      throw new RangeError(`Territorial mean for ${unit.id} is outside the fixed bins`);
    }
    binPopulations[index] += unit.population;
  }
  return { binPopulations, unknown };
}
