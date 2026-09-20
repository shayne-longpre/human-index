export type AggregationKind =
  | 'population_total'
  | 'person_prevalence'
  | 'context_distribution'
  | 'context_fact'
  | 'event_summary';

export type ValueStatus =
  | 'known'
  | 'unknown'
  | 'explicitly_absent'
  | 'not_applicable'
  | 'uncoded'
  | 'disputed';

export interface MetricDefinition {
  id: string;
  label: string;
  taxonomyIds: string[];
  definition: string;
  unit: string;
  aggregationKind: AggregationKind;
  statisticalUniverse: string;
  sourceSupportType: string;
  contextVsIndividual: 'individual_rate' | 'territorial_context' | 'event' | 'population';
  comparabilityGroup: string;
  temporalPolicy: 'exact_only' | 'valid_interval' | 'explicit_model';
  preferredPopulationSource?: string;
  displayScale: {
    transform: 'linear' | 'log1p' | 'categorical';
    fixedDomain?: [number, number];
    bins?: number[];
    scaleVersion: string;
  };
  summarySentenceTemplate: string;
  prohibitedInterpretations: string[];
  globalSummaryEnabled: boolean;
}

export interface ReferencePeriod {
  start: number;
  endExclusive: number;
}

export interface Observation {
  id: string;
  metricId: string;
  sourceReleaseId: string;
  originalRecordLocator: string;
  entityId?: string;
  supportId: string;
  referencePeriod: ReferencePeriod;
  temporalKind: 'point_estimate' | 'period_estimate' | 'valid_interval' | 'event';
  datingBounds?: { earliest: number; latest: number };
  value: number | string | boolean | null;
  status: ValueStatus;
  nativeStatus?: string;
  unit: string;
  denominatorDefinition?: string;
  populationUniverseId?: string;
  sourceMethod: 'observed' | 'reconstructed' | 'modeled' | 'expert_coded' | 'mixed';
  atlasMethod: 'unaltered' | 'harmonized' | 'interpolated' | 'spatially_allocated' | 'derived';
  uncertainty?: {
    kind: 'statistical_interval' | 'scenario_range' | 'source_disagreement' | 'unspecified';
    lower?: number;
    upper?: number;
    confidenceLevel?: number;
    scenarioId?: string;
  };
  spatialPrecision?: string;
  subgroupScope?: string;
  lawOrPractice?: 'law' | 'practice' | 'both' | 'not_applicable';
  citationIds: string[];
  transformationId?: string;
  notes: string[];
}
