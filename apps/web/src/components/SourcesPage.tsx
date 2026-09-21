import { formatAstronomicalYear, type AtlasReleaseManifest } from '@atlas/contracts';
import sourceRegistry from '../../../../data/registry/sources.json';
import { releaseRoot } from '../data';

interface RegistrySource {
  id: string;
  dossier: string;
  role: string;
  candidate_release: string;
  coverage_start: string | null;
  coverage_end: string | null;
  license: string | null;
  license_status: string;
  urls: string[];
  blockers: string[];
  notes: string;
  checked_at: string;
  verification_level: string;
  downloaded: boolean;
  release_ready: boolean;
}

const catalog = sourceRegistry.sources as RegistrySource[];

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

function releaseRole(id: string): string {
  if (id.startsWith('world-bank')) return 'Modern population, electricity, and life-expectancy observations';
  if (id.startsWith('us-census')) return 'Deep-time global population estimates and source ranges';
  if (id.startsWith('cliopatria')) return 'Historical political context geometry and names';
  if (id.startsWith('reba-modelski')) return 'Sparse exact-date ancient city population points';
  return 'Modern display geometry only';
}

export function SourcesPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  return (
    <main id="main-content" className="sources-page">
      <header className="sources-hero">
        <span className="eyebrow">Evidence ledger</span>
        <h1>Sources, releases,<br />and unresolved edges.</h1>
        <p>
          Every source is shown here whether it is published, under evaluation, or blocked.
          A promising dataset does not become Atlas evidence until its exact artifact, terms,
          geography, temporal meaning, and transformation have passed review.
        </p>
        <div className="sources-actions">
          <a className="primary-action" href={`${releaseRoot}/manifest.json`} target="_blank" rel="noreferrer">
            Open release manifest ↗
          </a>
          <a className="secondary-link" href="?metric=population_total&year=2024">Return to atlas</a>
        </div>
      </header>

      <section className="source-section" aria-labelledby="published-sources-title">
        <div className="section-intro">
          <span className="eyebrow">In the current release</span>
          <h2 id="published-sources-title">Published inputs</h2>
          <p>{manifest.release_id} · retrieved {manifest.published_on}</p>
        </div>
        <div className="published-source-grid">
          {manifest.source_releases.map((source) => (
            <article className="source-card source-card-published" key={source.id}>
              <div className="source-card-topline">
                <span className="status-pill status-published">Published</span>
                <span>{source.license}</span>
              </div>
              <h3>{source.publisher}</h3>
              <code>{source.id}</code>
              <dl>
                <div><dt>Retrieved</dt><dd>{source.retrieved_on}</dd></div>
                {source.source_update ? <div><dt>Source update</dt><dd>{source.source_update}</dd></div> : null}
                <div><dt>Atlas role</dt><dd>{releaseRole(source.id)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="source-section" aria-labelledby="metrics-title">
        <div className="section-intro">
          <span className="eyebrow">Scientific meaning</span>
          <h2 id="metrics-title">Published measures</h2>
        </div>
        <div className="metric-source-list">
          {manifest.metrics.map((metric) => (
            <article key={metric.id}>
              <div>
                <span className="eyebrow">{metric.taxonomy_ids.join(' · ')}</span>
                <h3>{metric.label}</h3>
                <p>{metric.definition}</p>
              </div>
              <dl>
                <div><dt>Indicator</dt><dd>{metric.indicator}</dd></div>
                <div><dt>Observed years</dt><dd>{formatAstronomicalYear(metric.available_years[0])}–{formatAstronomicalYear(metric.available_years.at(-1) ?? metric.available_years[0])}</dd></div>
                <div><dt>Unit</dt><dd>{metric.unit}</dd></div>
                <div><dt>Temporal policy</dt><dd>{humanize(metric.temporal_policy)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="source-section" aria-labelledby="catalog-title">
        <div className="section-intro">
          <span className="eyebrow">Full research registry · {catalog.length} entries</span>
          <h2 id="catalog-title">Published, candidate, and blocked sources</h2>
          <p>These entries are candidates, not claims that every dataset is acquired or compatible.</p>
        </div>
        <div className="source-catalog">
          {catalog.map((source) => {
            const status = source.release_ready ? 'Ready' : source.downloaded ? 'Acquired / reviewing' : source.blockers.length ? 'Blocked / reviewing' : 'Documented';
            return (
              <article className="source-card" key={source.id}>
                <div className="source-card-topline">
                  <span className={`status-pill ${source.release_ready ? 'status-published' : 'status-research'}`}>{status}</span>
                  <span>{source.dossier}</span>
                </div>
                <h3>{humanize(source.id)}</h3>
                <p className="source-role">{humanize(source.role)}</p>
                <dl>
                  <div><dt>Candidate</dt><dd>{source.candidate_release}</dd></div>
                  <div><dt>Coverage</dt><dd>{source.coverage_start ?? 'Unverified'} → {source.coverage_end ?? 'Unverified'}</dd></div>
                  <div><dt>License</dt><dd>{source.license ?? humanize(source.license_status)}</dd></div>
                  <div><dt>Review</dt><dd>{humanize(source.verification_level)}</dd></div>
                </dl>
                <p>{source.notes}</p>
                {source.blockers.length ? (
                  <details>
                    <summary>{source.blockers.length} unresolved {source.blockers.length === 1 ? 'item' : 'items'}</summary>
                    <ul>{source.blockers.map((blocker) => <li key={blocker}>{humanize(blocker)}</li>)}</ul>
                  </details>
                ) : null}
                <div className="source-links">
                  {source.urls.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">{index === 0 ? 'Primary source' : `Reference ${index + 1}`} ↗</a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="source-section source-method" aria-labelledby="source-method-title">
        <div className="section-intro">
          <span className="eyebrow">Universe and lineage</span>
          <h2 id="source-method-title">What is counted—and what is not.</h2>
        </div>
        <div>
          <h3>Population universes</h3>
          {manifest.population_universes.map((universe) => (
            <div className="universe-summary" key={universe.id}>
              <strong>{universe.label}</strong>
              <p>{universe.entity_count} support{universe.entity_count === 1 ? '' : 's'}. {universe.inclusion_rule}. Scope label: {universe.scope_label}.</p>
              <ul>{universe.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          ))}
        </div>
        <div>
          <h3>Known limitations</h3>
          <ul>{manifest.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
        </div>
      </section>
    </main>
  );
}
