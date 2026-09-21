import type { MetricDefinition } from './types';

export const electricityAccessMetric: MetricDefinition = {
  id: 'access_to_electricity',
  label: 'Access to electricity',
  taxonomyIds: ['material_conditions', 'infrastructure_access'],
  definition: 'Share of the population with access to electricity.',
  unit: 'percent of population',
  aggregationKind: 'person_prevalence',
  statisticalUniverse: 'resident persons represented by nonaggregate World Bank entities',
  sourceSupportType: 'country_or_territory_year',
  contextVsIndividual: 'individual_rate',
  comparabilityGroup: 'world-bank-eg-elc-accs-zs-2026-07-13',
  temporalPolicy: 'exact_only',
  preferredPopulationSource: 'world-bank-sp-pop-totl-2026-07-13',
  displayScale: {
    transform: 'linear',
    fixedDomain: [0, 100],
    bins: [0, 20, 40, 60, 80, 100],
    scaleVersion: 'electricity-sequential-v1',
  },
  summarySentenceTemplate:
    'Estimated population with, without, or unknown access in the covered World Bank universe.',
  prohibitedInterpretations: [
    'local household measurement',
    'electricity reliability',
    'electricity affordability',
    'electricity consumption',
  ],
  globalSummaryEnabled: true,
};

export const populationTotalMetric: MetricDefinition = {
  id: 'population_total',
  label: 'Population',
  taxonomyIds: ['population_and_settlement'],
  definition: 'Resident population total for the statistical territory and year.',
  unit: 'people',
  aggregationKind: 'population_total',
  statisticalUniverse: 'resident persons represented by nonaggregate World Bank entities',
  sourceSupportType: 'country_or_territory_year',
  contextVsIndividual: 'population',
  comparabilityGroup: 'world-bank-sp-pop-totl-2026-07-13',
  temporalPolicy: 'exact_only',
  displayScale: {
    transform: 'log1p',
    fixedDomain: [10_000, 2_000_000_000],
    scaleVersion: 'population-country-total-v1',
  },
  summarySentenceTemplate:
    'Population represented by the declared World Bank statistical universe.',
  prohibitedInterpretations: ['local population density', 'gridded settlement reconstruction'],
  globalSummaryEnabled: true,
};

export const lifeExpectancyMetric: MetricDefinition = {
  id: 'life_expectancy_at_birth',
  label: 'Life expectancy',
  taxonomyIds: ['health_and_survival'],
  definition: 'Period life expectancy at birth for the national or territorial population in the stated year.',
  unit: 'years',
  aggregationKind: 'context_distribution',
  statisticalUniverse: 'resident persons represented by nonaggregate World Bank entities with population weights',
  sourceSupportType: 'country_or_territory_year',
  contextVsIndividual: 'territorial_context',
  comparabilityGroup: 'world-bank-sp-dyn-le00-in-2026-07-13',
  temporalPolicy: 'exact_only',
  preferredPopulationSource: 'world-bank-sp-pop-totl-2026-07-13',
  displayScale: {
    transform: 'linear',
    fixedDomain: [45, 90],
    bins: [0, 50, 60, 70, 80, 90, 130],
    scaleVersion: 'life-expectancy-context-v1',
  },
  summarySentenceTemplate:
    'Population living in territories grouped by their published national mean life expectancy.',
  prohibitedInterpretations: [
    'an individual lifespan prediction',
    'a person-level distribution',
    'a global life-table estimate',
  ],
  globalSummaryEnabled: true,
};

export const metricDefinitions = [populationTotalMetric, electricityAccessMetric, lifeExpectancyMetric] as const;

export const metricTaxonomy = {
  population_and_settlement: [populationTotalMetric.id],
  material_conditions: [electricityAccessMetric.id],
  infrastructure_access: [electricityAccessMetric.id],
  health_and_survival: [lifeExpectancyMetric.id],
} as const;
