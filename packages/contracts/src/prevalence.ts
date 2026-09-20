export interface PrevalenceUnit {
  id: string;
  population: number | null;
  /** A fraction in the closed interval [0, 1]; null means unknown condition. */
  rate: number | null;
}

export interface PrevalenceSummary {
  population: number;
  withCondition: number;
  withoutCondition: number;
  unknownCondition: number;
  coverageFraction: number;
  withFractionFullUniverse: number;
  withFractionKnown: number | null;
  missingPopulationUnitIds: string[];
}

export function aggregatePrevalence(units: readonly PrevalenceUnit[]): PrevalenceSummary {
  let population = 0;
  let withCondition = 0;
  let withoutCondition = 0;
  let unknownCondition = 0;
  const missingPopulationUnitIds: string[] = [];

  for (const unit of units) {
    if (unit.population === null) {
      missingPopulationUnitIds.push(unit.id);
      continue;
    }
    if (!Number.isFinite(unit.population) || unit.population < 0) {
      throw new RangeError(`Population must be a nonnegative finite number for ${unit.id}`);
    }
    population += unit.population;
    if (unit.rate === null) {
      unknownCondition += unit.population;
      continue;
    }
    if (!Number.isFinite(unit.rate) || unit.rate < 0 || unit.rate > 1) {
      throw new RangeError(`Prevalence rate must be within [0,1] for ${unit.id}`);
    }
    withCondition += unit.population * unit.rate;
    withoutCondition += unit.population * (1 - unit.rate);
  }

  const knownPopulation = withCondition + withoutCondition;
  const total = withCondition + withoutCondition + unknownCondition;
  if (Math.abs(total - population) > Math.max(1e-9, population * 1e-12)) {
    throw new Error('Prevalence aggregation failed population conservation');
  }

  return {
    population,
    withCondition,
    withoutCondition,
    unknownCondition,
    coverageFraction: population === 0 ? 0 : knownPopulation / population,
    withFractionFullUniverse: population === 0 ? 0 : withCondition / population,
    withFractionKnown: knownPopulation === 0 ? null : withCondition / knownPopulation,
    missingPopulationUnitIds,
  };
}
