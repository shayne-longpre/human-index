import { formatAstronomicalYear, type GdpPerCapitaSummary } from '@atlas/contracts';
import { formatInteger } from '../format';

export function TerritorialCoverageSummary({ summary }: { summary: GdpPerCapitaSummary }) {
  return (
    <section className="population-panel" aria-labelledby="gdp-coverage-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Economic context · {formatAstronomicalYear(summary.year)}</span>
          <h2 id="gdp-coverage-title">Published territorial coverage</h2>
        </div>
        <div className="population-total">
          <strong>{formatInteger(summary.known_entities)}</strong>
          <span>economies with an exact-year value</span>
        </div>
      </div>
      <div className="population-facts">
        <div><span>Known supports</span><strong>{formatInteger(summary.known_entities)}</strong></div>
        <div><span>Unknown supports</span><strong>{formatInteger(summary.unknown_entities)}</strong></div>
        <div><span>Known and mapped</span><strong>{formatInteger(summary.mapped_known_entities)}</strong></div>
        <div><span>Known but unplaced</span><strong>{formatInteger(summary.unplaced_known_entities)}</strong></div>
      </div>
      <p className="scope-note">
        Atlas does not average these territorial GDP-per-capita values into a “global person.”
        Missing economies remain unknown, and constant-price dollars are not a PPP welfare comparison.
      </p>
    </section>
  );
}
