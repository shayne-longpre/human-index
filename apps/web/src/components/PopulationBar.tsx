import type { PrevalenceSummary } from '@atlas/contracts';
import { formatPeople, formatSharePercent } from '../format';

interface PopulationBarProps {
  summary: PrevalenceSummary;
  year: number;
  unplacedPopulation: number;
}

export function PopulationBar({ summary, year, unplacedPopulation }: PopulationBarProps) {
  const withPercent = summary.withFractionFullUniverse * 100;
  const withoutPercent = (summary.withoutCondition / summary.population) * 100;
  const unknownPercent = (summary.unknownCondition / summary.population) * 100;

  return (
    <section className="population-panel" aria-labelledby="population-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Covered population · {year}</span>
          <h2 id="population-title">Who is represented?</h2>
        </div>
        <div className="population-total">
          <strong>{formatPeople(summary.population).replace(' people', '')}</strong>
          <span>people in denominator</span>
        </div>
      </div>

      <div
        className="population-bar"
        role="img"
        aria-label={`${formatSharePercent(withPercent)} with access, ${formatSharePercent(withoutPercent)} without access, ${formatSharePercent(unknownPercent)} unknown`}
      >
        <span className="bar-segment bar-with" style={{ width: `${withPercent}%` }} />
        <span className="bar-segment bar-without" style={{ width: `${withoutPercent}%` }} />
        <span className="bar-segment bar-unknown" style={{ width: `${unknownPercent}%` }} />
      </div>

      <div className="bar-details">
        <div>
          <span className="detail-key key-with" />
          <span className="detail-label">With access</span>
          <strong>{formatSharePercent(withPercent)}</strong>
          <small>{formatPeople(summary.withCondition)}</small>
        </div>
        <div>
          <span className="detail-key key-without" />
          <span className="detail-label">Without access</span>
          <strong>{formatSharePercent(withoutPercent)}</strong>
          <small>{formatPeople(summary.withoutCondition)}</small>
        </div>
        <div>
          <span className="detail-key key-unknown" />
          <span className="detail-label">Unknown condition</span>
          <strong>{formatSharePercent(unknownPercent)}</strong>
          <small>{formatPeople(summary.unknownCondition)}</small>
        </div>
      </div>

      <p className="scope-note">
        {formatSharePercent(summary.coverageFraction * 100)} of the denominator has a condition value.
        {' '}{formatPeople(unplacedPopulation)} remain in this summary but are not placed on the coarse map.
      </p>
    </section>
  );
}
