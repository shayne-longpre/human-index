import type { LifeExpectancySummary } from '@atlas/contracts';
import { formatPeople, formatSharePercent } from '../format';

export function LifeExpectancyDistribution({ summary }: { summary: LifeExpectancySummary }) {
  const segments = [
    ...summary.bins.map((bin, index) => ({
      key: `${bin.lower_inclusive}-${bin.upper_exclusive}`,
      label: index === 0 ? `< ${bin.upper_exclusive} years` : `${bin.lower_inclusive}–${bin.upper_exclusive - 1} years`,
      population: bin.population,
      className: `life-bin life-bin-${index + 1}`,
    })),
    { key: 'unknown', label: 'Unknown national mean', population: summary.unknown_condition_population, className: 'bar-unknown' },
  ];

  return (
    <section className="population-panel" aria-labelledby="life-distribution-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Territorial context · {summary.year}</span>
          <h2 id="life-distribution-title">Where the covered population lives</h2>
        </div>
        <div className="population-total">
          <strong>{formatPeople(summary.population).replace(' people', '')}</strong>
          <span>people with population weights</span>
        </div>
      </div>
      <div className="population-bar life-distribution" role="img" aria-label="Population grouped by national or territorial life expectancy mean">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`bar-segment ${segment.className}`}
            style={{ width: `${summary.population === 0 ? 0 : segment.population / summary.population * 100}%` }}
          />
        ))}
      </div>
      <div className="life-bin-details">
        {segments.map((segment) => (
          <div key={segment.key}>
            <span className={`detail-key ${segment.className}`} />
            <span>{segment.label}</span>
            <strong>{formatSharePercent(summary.population === 0 ? 0 : segment.population / summary.population * 100)}</strong>
            <small>{formatPeople(segment.population)}</small>
          </div>
        ))}
      </div>
      <p className="scope-note">
        These are population weights grouped by a territory-level mean—not a distribution of individual lifespans.
        {' '}{summary.missing_population_entities} support{summary.missing_population_entities === 1 ? '' : 's'} lack a population weight and are excluded explicitly.
      </p>
    </section>
  );
}
