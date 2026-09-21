import { formatAstronomicalYear, type HistoricalContextIndex } from '@atlas/contracts';

interface HistoricalTimelineProps {
  index: HistoricalContextIndex;
  year: number;
  enabled: boolean;
  onYearChange: (year: number) => void;
}

export function HistoricalTimeline({ index, year, enabled, onYearChange }: HistoricalTimelineProps) {
  const snapshots = index.snapshots;
  const currentIndex = snapshots.reduce((resolved, snapshot, candidateIndex) =>
    snapshot.atlas_year <= year ? candidateIndex : resolved, -1);
  const sliderIndex = Math.max(0, currentIndex);
  const current = snapshots[sliderIndex];
  const move = (offset: number) => {
    const nextIndex = currentIndex < 0
      ? 0
      : Math.max(0, Math.min(snapshots.length - 1, currentIndex + offset));
    const next = snapshots[nextIndex];
    onYearChange(next.atlas_year);
  };

  return (
    <section className="boundary-timeline" aria-labelledby="boundary-time-title">
      <div className="boundary-heading">
        <div>
          <span className="eyebrow">Independent political context</span>
          <h2 id="boundary-time-title">Borders & names</h2>
        </div>
        <div className="boundary-step-controls">
          <button type="button" disabled={!enabled || currentIndex <= 0} onClick={() => move(-1)}>Previous</button>
          <strong>{currentIndex < 0 ? `No coverage before ${formatAstronomicalYear(current.atlas_year)}` : `${formatAstronomicalYear(current.atlas_year)} · ${current.feature_count} polities`}</strong>
          <button type="button" disabled={!enabled || currentIndex === snapshots.length - 1} onClick={() => move(1)}>Next</button>
        </div>
      </div>
      <input
        className="timeline-range boundary-range"
        type="range"
        min="0"
        max={snapshots.length - 1}
        step="1"
        value={sliderIndex}
        disabled={!enabled}
        onChange={(event) => onYearChange(snapshots[Number(event.target.value)].atlas_year)}
        aria-label={currentIndex < 0 ? `Political boundary coverage starts ${formatAstronomicalYear(current.atlas_year)}` : `Political boundary snapshot, ${formatAstronomicalYear(current.atlas_year)}`}
      />
      <div className="timeline-labels" aria-hidden="true">
        <span>{formatAstronomicalYear(snapshots[0].atlas_year)}</span>
        <strong>{currentIndex < 0 ? 'Outside coverage' : formatAstronomicalYear(current.atlas_year)}</strong>
        <span>{formatAstronomicalYear(snapshots.at(-1)?.atlas_year ?? current.atlas_year)}</span>
      </div>
      <p>
        Drag among {snapshots.length} published Cliopatria snapshots. The requested date follows this control so the
        map geometry and names visibly change; no borders are interpolated between snapshots.
      </p>
    </section>
  );
}
