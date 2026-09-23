import { formatAstronomicalYear, type HistoricalCity, type HistoricalCityObservation } from '@atlas/contracts';
import { formatInteger } from '../format';

interface HistoricalCityInspectorProps {
  city: HistoricalCity | null;
  observation: HistoricalCityObservation | null;
  onClose: () => void;
}

export function HistoricalCityInspector({ city, observation, onClose }: HistoricalCityInspectorProps) {
  if (!city || !observation) return null;
  return (
    <aside className="inspector" aria-labelledby="city-inspector-title">
      <button className="icon-button inspector-close" type="button" onClick={onClose} aria-label="Close city inspector">×</button>
      <span className="eyebrow">Historical city point · source estimate</span>
      <h2 id="city-inspector-title">{city.name}</h2>
      <div className="inspector-value historical-inspector-value">
        <strong>{formatInteger(observation.population)}</strong>
        <span>estimated city population · {formatAstronomicalYear(observation.year)}</span>
      </div>
      <dl className="inspector-list">
        <div><dt>Other name</dt><dd>{city.other_name ?? 'Not supplied'}</dd></div>
        <div><dt>Modern label</dt><dd>{city.modern_country_label} (source metadata only)</dd></div>
        <div><dt>Spatial support</dt><dd>Source geocoded point, not a city extent</dd></div>
        <div><dt>Certainty code</dt><dd>{city.geocode_certainty_code} (preserved source code)</dd></div>
        <div>
          <dt>Cross-source identity</dt>
          <dd>
            {city.canonical_place_id
              ? `${city.canonical_place_id} · ${city.linked_source_record_count} linked source records`
              : 'Source record only; no accepted cross-source link'}
          </dd>
        </div>
        <div><dt>Source identity record</dt><dd>{city.source_record_id}</dd></div>
        <div><dt>Source record</dt><dd>{observation.original_record_locator}</dd></div>
      </dl>
      <div className="inspector-caution">
        <strong>Do not add these points into a world total.</strong>
        <p>Identity links never average or replace estimates. Each source value and locator remains separate.</p>
      </div>
    </aside>
  );
}
