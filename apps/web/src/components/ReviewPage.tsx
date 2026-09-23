import { useEffect, useMemo, useState } from 'react';

interface BorderCandidate {
  left_source_feature_index: number;
  left_name: string;
  right_source_feature_index: number;
  right_name: string;
  overlap_km2: number;
  overlap_share_of_smaller_geometry: number;
  classification: string;
  review_status: string;
}

interface CityRecord {
  record_id: string;
  city: string;
  other_name: string | null;
  country_label: string;
  latitude: number;
  longitude: number;
  first_observation_year: number | null;
  last_observation_year: number | null;
  observation_count: number;
}

interface CityCandidate {
  candidate_id: string;
  review_status: string;
  candidate_basis: string;
  temporal_coverage_overlaps: boolean;
  left_record_id: string;
  right_record_id: string;
}

interface ReviewQueue {
  status: string;
  warning: string;
  border_overlaps: {
    pilot: { region_label: string; requested_source_year: number; scope_warning: string };
    summary: Record<string, number>;
    candidates: BorderCandidate[];
  };
  city_identities: {
    method: { warning: string; automatic_merge: boolean };
    records: Record<string, CityRecord>;
    candidates: CityCandidate[];
  };
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

export function ReviewPage() {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'borders' | 'cities'>('borders');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/atlas/review/review-queue.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load review queue (${response.status})`);
        return response.json() as Promise<ReviewQueue>;
      })
      .then((payload) => { if (active) setQueue(payload); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load review queue');
      });
    return () => { active = false; };
  }, []);

  const borderCandidates = useMemo(() => {
    if (!queue) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return queue.border_overlaps.candidates.filter((candidate) =>
      `${candidate.left_name} ${candidate.right_name} ${candidate.classification}`
        .toLocaleLowerCase().includes(normalized),
    );
  }, [query, queue]);

  const cityCandidates = useMemo(() => {
    if (!queue) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return queue.city_identities.candidates.filter((candidate) => {
      const left = queue.city_identities.records[candidate.left_record_id];
      const right = queue.city_identities.records[candidate.right_record_id];
      return `${left?.city ?? ''} ${left?.country_label ?? ''} ${right?.city ?? ''} ${right?.country_label ?? ''} ${candidate.candidate_basis}`
        .toLocaleLowerCase().includes(normalized);
    });
  }, [query, queue]);

  return (
    <main id="main-content" className="review-page">
      <header className="sources-hero review-hero">
        <span className="eyebrow">Human review workspace · read only</span>
        <h1>Candidate edges,<br />before they become claims.</h1>
        <p>
          Automated geometry and identity checks reduce manual work; they do not decide sovereignty,
          historical identity, or whether a source is wrong. This queue exposes the evidence leads.
        </p>
        <div className="sources-actions">
          <a className="secondary-link" href="?metric=population_total&year=2024">Return to atlas</a>
          <a className="secondary-link" href="?page=sources">Open sources</a>
        </div>
      </header>

      {error ? <section className="review-state"><h2>Review queue unavailable</h2><p>{error}</p></section> : null}
      {!queue && !error ? <section className="review-state" aria-live="polite">Loading review candidates…</section> : null}
      {queue ? (
        <section className="review-workspace" aria-labelledby="review-title">
          <div className="review-toolbar">
            <div>
              <span className="eyebrow">Unreviewed candidates</span>
              <h2 id="review-title">Choose a queue</h2>
            </div>
            <div className="review-tabs" role="group" aria-label="Review queue">
              <button type="button" className={view === 'borders' ? 'metric-active' : 'metric-option'} onClick={() => { setView('borders'); setQuery(''); }}>
                Border overlaps <small>{queue.border_overlaps.candidates.length}</small>
              </button>
              <button type="button" className={view === 'cities' ? 'metric-active' : 'metric-option'} onClick={() => { setView('cities'); setQuery(''); }}>
                City identities <small>{queue.city_identities.candidates.length}</small>
              </button>
            </div>
            <label className="review-search">
              <span>Filter candidates</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, place, or candidate type" />
            </label>
          </div>

          <div className="review-warning">
            <strong>No candidate is applied automatically.</strong>
            <p>{view === 'borders' ? queue.border_overlaps.pilot.scope_warning : queue.city_identities.method.warning}</p>
          </div>

          <div className="table-scroll">
            {view === 'borders' ? (
              <table>
                <thead><tr><th>Features</th><th>Candidate type</th><th className="numeric">Overlap</th><th className="numeric">Share of smaller</th><th>Status</th></tr></thead>
                <tbody>{borderCandidates.map((candidate) => (
                  <tr key={`${candidate.left_source_feature_index}-${candidate.right_source_feature_index}`}>
                    <th scope="row">{candidate.left_name}<span className="review-pair"> ↔ {candidate.right_name}</span></th>
                    <td>{humanize(candidate.classification)}</td>
                    <td className="numeric">{candidate.overlap_km2.toLocaleString()} km²</td>
                    <td className="numeric">{(candidate.overlap_share_of_smaller_geometry * 100).toFixed(1)}%</td>
                    <td>{humanize(candidate.review_status)}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : (
              <table>
                <thead><tr><th>Source records</th><th>Candidate basis</th><th>Dates overlap</th><th>Status</th></tr></thead>
                <tbody>{cityCandidates.slice(0, 100).map((candidate) => {
                  const left = queue.city_identities.records[candidate.left_record_id];
                  const right = queue.city_identities.records[candidate.right_record_id];
                  return (
                    <tr key={candidate.candidate_id}>
                      <th scope="row">
                        {left?.city ?? candidate.left_record_id} <small>{left?.country_label}</small>
                        <span className="review-pair"> ↔ {right?.city ?? candidate.right_record_id} <small>{right?.country_label}</small></span>
                      </th>
                      <td>{humanize(candidate.candidate_basis)}</td>
                      <td>{candidate.temporal_coverage_overlaps ? 'Yes' : 'No'}</td>
                      <td>{humanize(candidate.review_status)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </div>
          <p className="scope-note">
            Showing {view === 'borders' ? borderCandidates.length : Math.min(cityCandidates.length, 100)}
            {view === 'cities' && cityCandidates.length > 100 ? ` of ${cityCandidates.length}` : ''} matching candidates.
            {view === 'cities' && cityCandidates.length > 100 ? ' Filter the queue to narrow the remaining records.' : ''}
            {' '}Decisions need citations and a separate reviewed-decision artifact.
          </p>
        </section>
      ) : null}
    </main>
  );
}
