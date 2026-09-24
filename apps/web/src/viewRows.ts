import type {
  PopulationOutlookDataset,
  PublishedMetric,
  ViewRow,
} from '@atlas/contracts';
import type { MetricDataset, ReleaseBase } from './data';

// This join is intentionally independent of map geometry and camera state.
export function buildViewRows(
  release: ReleaseBase,
  metric: PublishedMetric,
  dataset: MetricDataset | undefined,
  year: number,
): ViewRow[] {
  const outlook = dataset?.metric_id === 'population_outlook'
    ? dataset as PopulationOutlookDataset
    : null;
  const populationObservations = outlook?.observations ?? release.population.observations;
  const populationByCode = new Map(
    populationObservations
      .filter((observation) => observation.year === year)
      .map((observation) => [observation.code, observation]),
  );
  const metricByCode = new Map<string, {
    value: number | null;
    status: 'known' | 'unknown';
    locator: string;
    evidenceState?: 'estimate' | 'medium_projection';
  }>();

  if (metric.id === 'population_total') {
    for (const observation of populationByCode.values()) {
      metricByCode.set(observation.code, {
        value: observation.value,
        status: observation.status,
        locator: observation.original_record_locator,
      });
    }
  } else if (outlook) {
    for (const observation of outlook.observations) {
      if (observation.year !== year) continue;
      metricByCode.set(observation.code, {
        value: observation.value,
        status: observation.status,
        locator: observation.original_record_locator,
        evidenceState: observation.evidence_state,
      });
    }
  } else if (dataset?.metric_id === 'access_to_electricity') {
    for (const observation of dataset.observations) {
      if (observation.year === year) {
        metricByCode.set(observation.code, {
          value: observation.value_percent,
          status: observation.status,
          locator: observation.original_record_locator,
        });
      }
    }
  } else if (dataset?.metric_id === 'life_expectancy_at_birth') {
    for (const observation of dataset.observations) {
      if (observation.year === year) {
        metricByCode.set(observation.code, {
          value: observation.value_years,
          status: observation.status,
          locator: observation.original_record_locator,
        });
      }
    }
  } else if (dataset?.metric_id === 'gdp_per_capita_constant_2015_usd') {
    for (const observation of dataset.observations) {
      if (observation.year === year) {
        metricByCode.set(observation.code, {
          value: observation.value_constant_2015_usd,
          status: observation.status,
          locator: observation.original_record_locator,
        });
      }
    }
  }

  return (outlook?.entities ?? release.entities).map((entity) => {
    const metricObservation = metricByCode.get(entity.code);
    return {
      entity,
      year,
      population: populationByCode.get(entity.code) ?? null,
      metricValue: metricObservation?.value ?? null,
      metricStatus: metricObservation?.status ?? 'unknown',
      metricRecordLocator: metricObservation?.locator ?? null,
      metricEvidenceState: metricObservation?.evidenceState,
    };
  });
}
