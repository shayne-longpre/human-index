import type { HistoricalPopulationObservation } from '@atlas/contracts';
import type { HistoricalFeatureCollection } from '../data';
import { formatInteger } from '../format';
import type { HistoricalCityPoint } from './MapView';

interface HistoricalPopulationTableProps {
  observation: HistoricalPopulationObservation | null;
  historicalSnapshot: HistoricalFeatureCollection | null;
  cityPoints: HistoricalCityPoint[];
}

function estimateValue(estimate: { lower: number; upper?: number }): string {
  return estimate.upper === undefined
    ? formatInteger(estimate.lower)
    : `${formatInteger(estimate.lower)}–${formatInteger(estimate.upper)}`;
}

function sourceYearLabel(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year > 0) return `${year} CE`;
  return 'source year 0 (unresolved convention)';
}

export function HistoricalPopulationTable({
  observation,
  historicalSnapshot,
  cityPoints,
}: HistoricalPopulationTableProps) {
  return (
    <section className="table-section" aria-labelledby="historical-evidence-title">
      <div className="table-heading">
        <div>
          <span className="eyebrow">Accessible fallback · independent evidence layers</span>
          <h2 id="historical-evidence-title">Historical evidence table</h2>
        </div>
      </div>

      <div className="table-scroll historical-table-scroll" role="region" aria-label="Scrollable historical population evidence" tabIndex={0}>
        <table>
          <thead>
            <tr><th scope="col">Population source</th><th scope="col">Support</th><th scope="col" className="numeric">People</th></tr>
          </thead>
          <tbody>
            {observation ? Object.entries(observation.estimates).map(([source, estimate]) => (
              <tr key={source}>
                <th scope="row">{source.replaceAll('_', ' ')}</th>
                <td>World · {observation.source_year_label}</td>
                <td className="numeric">{estimateValue(estimate)}</td>
              </tr>
            )) : (
              <tr><td colSpan={3}>No population observation is published for this requested date.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-scroll historical-table-scroll" role="region" aria-label="Scrollable historical polity evidence" tabIndex={0}>
        <table>
          <thead>
            <tr><th scope="col">Historical polity</th><th scope="col">Source interval</th><th scope="col" className="numeric">Source area km²</th></tr>
          </thead>
          <tbody>
            {historicalSnapshot ? historicalSnapshot.features.map((feature) => (
              <tr key={feature.properties.source_feature_id}>
                <th scope="row">{feature.properties.name}</th>
                <td>{sourceYearLabel(feature.properties.source_from_year)} to {sourceYearLabel(feature.properties.source_to_year)} · inclusive source interval</td>
                <td className="numeric">{formatInteger(Math.round(feature.properties.area_km2))}</td>
              </tr>
            )) : (
              <tr><td colSpan={3}>No historical-boundary snapshot covers this requested date.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-scroll historical-table-scroll" role="region" aria-label="Scrollable historical city evidence" tabIndex={0}>
        <table>
          <thead>
            <tr><th scope="col">Historical city point</th><th scope="col">Source metadata</th><th scope="col" className="numeric">Estimated people</th></tr>
          </thead>
          <tbody>
            {cityPoints.length ? [...cityPoints]
              .sort((left, right) => right.observation.population - left.observation.population)
              .map(({ city, observation: cityObservation }) => (
                <tr key={city.id}>
                  <th scope="row">{city.name}</th>
                  <td>{city.modern_country_label} · geocode certainty code {city.geocode_certainty_code}</td>
                  <td className="numeric">{formatInteger(cityObservation.population)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3}>No city estimate is published for this exact requested date.</td></tr>
              )}
          </tbody>
        </table>
      </div>
      <p className="scope-note">
        The global-population, polity, and city rows are intentionally not joined. City rows are sparse source
        estimates, not a complete urban total; no portion of the global estimate is assigned to a city or polity.
      </p>
    </section>
  );
}
