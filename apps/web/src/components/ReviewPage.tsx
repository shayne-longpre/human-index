import { useEffect, useMemo, useState } from 'react';

type BorderDisposition = 'source_declared_hierarchy' | 'unresolved_overlap';
type CityDisposition = 'accepted_same_place' | 'rejected_distinct_place' | 'unresolved_identity';

interface BorderCandidate {
  left_source_feature_index: number;
  left_name: string;
  right_source_feature_index: number;
  right_name: string;
  overlap_km2: number;
  overlap_share_of_smaller_geometry: number;
  classification: string;
  decision: {
    decision_id: string;
    disposition: BorderDisposition;
    rule_id: string;
    render_policy: string;
    population_allocation: 'prohibited';
  };
}

interface CityRecord {
  record_id: string;
  city: string;
  country_label: string;
  latitude: number;
  longitude: number;
}

interface CityCandidate {
  candidate_id: string;
  candidate_basis: string;
  temporal_coverage_overlaps: boolean;
  left_record_id: string;
  right_record_id: string;
  decision: {
    decision_id: string;
    disposition: CityDisposition;
    rule_id: string;
    distance_km: number;
    canonical_place_id: string | null;
    observation_policy: string;
  };
}

interface SourcePolicy {
  id: string;
  topic: string;
  disposition: string;
  reason: string;
  page_effect: string;
}

interface ReviewQueue {
  status: string;
  warning: string;
  decision_set: {
    id: string;
    status: string;
    semantic_boundary: string;
    summary: {
      city_candidates: number;
      city_dispositions: Record<CityDisposition, number>;
      canonical_place_clusters: number;
      border_candidates: number;
      border_dispositions: Record<BorderDisposition, number>;
      source_policies: number;
    };
  };
  source_policies: SourcePolicy[];
  border_overlaps: {
    pilot: { region_label: string; requested_source_year: number; scope_warning: string };
    candidates: BorderCandidate[];
  };
  city_identities: {
    method: { warning: string };
    records: Record<string, CityRecord>;
    candidates: CityCandidate[];
  };
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

function dispositionLabel(disposition: BorderDisposition | CityDisposition): string {
  if (disposition === 'accepted_same_place') return 'Accepted place link';
  if (disposition === 'rejected_distinct_place') return 'Rejected homonym';
  if (disposition === 'source_declared_hierarchy') return 'Source-declared hierarchy';
  if (disposition === 'unresolved_identity') return 'Unresolved identity';
  return 'Unresolved overlap';
}

export function ReviewPage() {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'borders' | 'cities' | 'policies'>('borders');
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
      `${candidate.left_name} ${candidate.right_name} ${candidate.classification} ${candidate.decision.disposition}`
        .toLocaleLowerCase().includes(normalized),
    );
  }, [query, queue]);

  const cityCandidates = useMemo(() => {
    if (!queue) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return queue.city_identities.candidates.filter((candidate) => {
      const left = queue.city_identities.records[candidate.left_record_id];
      const right = queue.city_identities.records[candidate.right_record_id];
      return `${left?.city ?? ''} ${left?.country_label ?? ''} ${right?.city ?? ''} ${right?.country_label ?? ''} ${candidate.candidate_basis} ${candidate.decision.disposition}`
        .toLocaleLowerCase().includes(normalized);
    });
  }, [query, queue]);

  const sourcePolicies = useMemo(() => {
    if (!queue) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return queue.source_policies.filter((policy) =>
      `${policy.topic} ${policy.disposition} ${policy.reason} ${policy.page_effect}`
        .toLocaleLowerCase().includes(normalized),
    );
  }, [query, queue]);

  return (
    <main id="main-content" className="review-page">
      <header className="sources-hero review-hero">
        <span className="eyebrow">Versioned reconciliation · read only</span>
        <h1>Every difference gets<br />an explicit disposition.</h1>
        <p>
          Strong source-record matches become place links. Distant homonyms are rejected.
          Source-declared border hierarchy changes rendering. Claims the evidence cannot settle
          remain visible and unresolved.
        </p>
        <div className="sources-actions">
          <a className="secondary-link" href="?metric=population_total&year=1500">See 1500 on the map</a>
          <a className="secondary-link" href="?page=sources">Open sources</a>
        </div>
      </header>

      {error ? <section className="review-state"><h2>Decision set unavailable</h2><p>{error}</p></section> : null}
      {!queue && !error ? <section className="review-state" aria-live="polite">Loading reconciliation decisions…</section> : null}
      {queue ? (
        <section className="review-workspace" aria-labelledby="review-title">
          <div className="decision-summary" aria-label="Decision summary">
            <article><span>City candidates</span><strong>{queue.decision_set.summary.city_candidates}</strong><small>{queue.decision_set.summary.city_dispositions.accepted_same_place} linked · {queue.decision_set.summary.city_dispositions.rejected_distinct_place} rejected · {queue.decision_set.summary.city_dispositions.unresolved_identity} unresolved</small></article>
            <article><span>Border candidates</span><strong>{queue.decision_set.summary.border_candidates}</strong><small>{queue.decision_set.summary.border_dispositions.source_declared_hierarchy} source hierarchies · {queue.decision_set.summary.border_dispositions.unresolved_overlap} unresolved</small></article>
            <article><span>Decision set</span><strong>v1</strong><small>{queue.decision_set.id}</small></article>
          </div>

          <div className="review-toolbar">
            <div>
              <span className="eyebrow">Recorded decisions</span>
              <h2 id="review-title">Inspect the reconciliation</h2>
            </div>
            <div className="review-tabs" role="group" aria-label="Reconciliation view">
              <button type="button" className={view === 'borders' ? 'metric-active' : 'metric-option'} onClick={() => { setView('borders'); setQuery(''); }}>
                Borders <small>{queue.border_overlaps.candidates.length}</small>
              </button>
              <button type="button" className={view === 'cities' ? 'metric-active' : 'metric-option'} onClick={() => { setView('cities'); setQuery(''); }}>
                Cities <small>{queue.city_identities.candidates.length}</small>
              </button>
              <button type="button" className={view === 'policies' ? 'metric-active' : 'metric-option'} onClick={() => { setView('policies'); setQuery(''); }}>
                Source policies <small>{queue.source_policies.length}</small>
              </button>
            </div>
            <label className="review-search">
              <span>Filter decisions</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, disposition, or source policy" />
            </label>
          </div>

          <div className="review-warning">
            <strong>No source observation is overwritten.</strong>
            <p>{view === 'borders' ? queue.border_overlaps.pilot.scope_warning : view === 'cities' ? queue.city_identities.method.warning : queue.decision_set.semantic_boundary}</p>
          </div>

          <div className="table-scroll">
            {view === 'borders' ? (
              <table>
                <thead><tr><th>Features</th><th>Disposition</th><th className="numeric">Overlap</th><th>Page behavior</th></tr></thead>
                <tbody>{borderCandidates.map((candidate) => (
                  <tr key={candidate.decision.decision_id}>
                    <th scope="row">{candidate.left_name}<span className="review-pair"> ↔ {candidate.right_name}</span></th>
                    <td><span className={`decision-badge decision-${candidate.decision.disposition}`}>{dispositionLabel(candidate.decision.disposition)}</span></td>
                    <td className="numeric">{candidate.overlap_km2.toLocaleString()} km²<br /><small>{(candidate.overlap_share_of_smaller_geometry * 100).toFixed(1)}% of smaller</small></td>
                    <td>{humanize(candidate.decision.render_policy)}<br /><small>Population allocation: prohibited</small></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : view === 'cities' ? (
              <table>
                <thead><tr><th>Source records</th><th>Disposition</th><th className="numeric">Distance</th><th>Identity output</th></tr></thead>
                <tbody>{cityCandidates.slice(0, 100).map((candidate) => {
                  const left = queue.city_identities.records[candidate.left_record_id];
                  const right = queue.city_identities.records[candidate.right_record_id];
                  return (
                    <tr key={candidate.candidate_id}>
                      <th scope="row">
                        {left?.city ?? candidate.left_record_id} <small>{left?.country_label}</small>
                        <span className="review-pair"> ↔ {right?.city ?? candidate.right_record_id} <small>{right?.country_label}</small></span>
                      </th>
                      <td><span className={`decision-badge decision-${candidate.decision.disposition}`}>{dispositionLabel(candidate.decision.disposition)}</span><br /><small>{humanize(candidate.decision.rule_id)}</small></td>
                      <td className="numeric">{candidate.decision.distance_km.toLocaleString()} km</td>
                      <td>{candidate.decision.canonical_place_id ?? 'No canonical link'}<br /><small>Source estimates remain separate</small></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : (
              <table>
                <thead><tr><th>Topic</th><th>Disposition</th><th>Why</th><th>Page behavior</th></tr></thead>
                <tbody>{sourcePolicies.map((policy) => (
                  <tr key={policy.id}>
                    <th scope="row">{policy.topic}<br /><small>{policy.id}</small></th>
                    <td><span className="decision-badge">{humanize(policy.disposition)}</span></td>
                    <td>{policy.reason}</td>
                    <td>{policy.page_effect}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
          <p className="scope-note">
            Showing {view === 'borders' ? borderCandidates.length : view === 'cities' ? Math.min(cityCandidates.length, 100) : sourcePolicies.length}
            {view === 'cities' && cityCandidates.length > 100 ? ` of ${cityCandidates.length}` : ''} matching records.
            {view === 'cities' && cityCandidates.length > 100 ? ' Filter to narrow the remaining decisions.' : ''}
            {' '}Changing a rule creates a new decision-set version and a new release.
          </p>
        </section>
      ) : null}
    </main>
  );
}
