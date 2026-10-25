import { formatAstronomicalYear, type AtlasReleaseManifest } from '@atlas/contracts';
import sourceRegistry from '../../../../data/registry/sources.json';
import candidateSourceLock from '../../../../data/registry/candidate-source-lock.json';
import cityCompanionLock from '../../../../data/registry/city-companion-source-lock.json';
import ucdpCountryYearLock from '../../../../data/registry/ucdp-country-year-lock.json';
import pleiadesSourceLock from '../../../../data/registry/pleiades-source-lock.json';
import owidLifeExpectancyLock from '../../../../data/registry/owid-life-expectancy-lock.json';
import religionSourceLock from '../../../../data/registry/religion-source-lock.json';
import ccpSourceLock from '../../../../data/registry/ccp-source-lock.json';
import { releaseRoot } from '../data';
import { indicatorProgress, sourceInRelease, type RoadmapIndicator, type RoadmapSourceLink } from '../sourceRoadmap';

interface RegistrySource {
  id: string;
  label: string;
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

interface DataVertical {
  id: string;
  label: string;
  description: string;
  sources: RoadmapSourceLink[];
  indicators: RoadmapIndicator[];
}

const registry = sourceRegistry as {
  sources: RegistrySource[];
  verticals: DataVertical[];
};
const catalog = registry.sources;
const verticals = registry.verticals;
const candidateLock = candidateSourceLock as {
  artifacts: Array<{ id: string; source_id: string; sha256: string; publication_status: string }>;
  blocked_sources: Array<{ source_id: string; status: string; reason: string }>;
};
const catalogById = new Map(catalog.map((source) => [source.id, source]));

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

function releaseRole(id: string): string {
  if (id === 'world-bank-wdi-economics-2026-10-08') return 'Thirteen source-native economic indicator tables';
  if (id === 'world-bank-pip-20260922-2021-surveys') return 'Five source-native poverty and survey-distribution tables';
  if (id === 'penn-world-table-11.0') return 'Seven source-native output, labor, productivity, and capital tables';
  if (id === 'vdem-country-year-v16') return 'Four source-native legal, legislative, and religion-policy tables';
  if (id.startsWith('world-bank-wdi-economics')) return 'Published territorial GDP-per-capita context';
  if (id.startsWith('maddison-project')) return 'Historical source-native GDP per capita table';
  if (id.startsWith('world-bank')) return 'Modern population, electricity, and life-expectancy observations';
  if (id.startsWith('us-census')) return 'Deep-time global population estimates and source ranges';
  if (id.startsWith('cliopatria')) return 'Historical political context geometry and names';
  if (id.startsWith('reba-')) return 'Separate exact-date city estimates; no cross-source averaging';
  if (id === 'ucdp-prio-acd-26.1') return 'Source-native armed conflict-year records, 1946–2025';
  if (id === 'ucdp-organized-violence-cy-26.1') return 'Source-native within-border country-year violence evidence, 1989–2025';
  if (id.startsWith('un-wpp')) return 'Separate annual population estimates and Medium projections';
  if (id.startsWith('ghsl-')) return 'Five-year source-native modeled population grid, 1975–2020';
  if (id.startsWith('worldpop-')) return 'Separate modeled population grid; never spliced with GHSL';
  return 'Modern display geometry only';
}

function SourceStatus({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      className={`matrix-status ${complete ? 'matrix-status-complete' : 'matrix-status-open'}`}
      aria-label={`${label}: ${complete ? 'yes' : 'no'}`}
    >
      <span aria-hidden="true">{complete ? '✓' : '—'}</span>
      <small>{complete ? 'Yes' : 'No'}</small>
    </span>
  );
}

export function SourcesPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const publishedReleaseIds = new Set(manifest.source_releases.map((source) => source.id));
  const indicatorCount = verticals.reduce((total, vertical) => total + vertical.indicators.length, 0);
  const sourceSelectionCount = verticals.reduce((total, vertical) => total + vertical.indicators.filter(
    (indicator) => indicator.source_ids.length === 0,
  ).length, 0);
  const readyIndicatorCount = verticals.reduce((total, vertical) => total + vertical.indicators.filter(
    (indicator) => indicatorProgress(indicator, vertical.sources, publishedReleaseIds).ready,
  ).length, 0);
  const economicArtifactCount = manifest.transformations
    .filter((item) => ['economic-source-native-table-v1', 'pip-source-native-survey-table-v1', 'pwt-source-native-table-v1'].includes(item.id))
    .reduce((count, item) => count + item.input_artifact_ids.length, 0);
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
          <a className="secondary-link" href={`?metric=population_total&year=${manifest.default_view.year}`}>Return to atlas</a>
        </div>
      </header>

      <section className="source-section" aria-labelledby="source-matrix-title">
        <div className="section-intro">
          <span className="eyebrow">
            Coverage ledger · {verticals.length} verticals · {indicatorCount} indicators · {readyIndicatorCount} source sets ready · {sourceSelectionCount} need a source · {candidateLock.artifacts.length + cityCompanionLock.artifacts.length + ucdpCountryYearLock.artifacts.length + pleiadesSourceLock.artifacts.length + owidLifeExpectancyLock.artifacts.length + Object.keys(religionSourceLock.files).length + Object.keys(ccpSourceLock.artifacts).length + economicArtifactCount} pinned artifacts
          </span>
          <h2 id="source-matrix-title">What is in—and what is still outstanding</h2>
          <p>
            Each indicator lists its planned sources—or an explicit source-selection gap. Its source set is ready when every listed source
            has its declared release IDs in {manifest.release_id}; the checks remain at the source level.
            This is an integration milestone, not a claim of complete years, places, or variable coverage.
            Acquired means a source artifact is locally pinned. {candidateLock.blocked_sources.length}
            {' '}candidate sources have access or licensing blockers in the acquisition lock.
          </p>
        </div>
        <div className="source-matrix-scroll" role="region" aria-label="Source ingestion status by data vertical" tabIndex={0}>
          <table className="source-matrix">
            <thead>
              <tr>
                <th scope="col">Data vertical</th>
                <th scope="col">Indicators</th>
                <th scope="col">Sources</th>
                <th scope="col">Acquired</th>
                <th scope="col">In release</th>
              </tr>
            </thead>
            {verticals.map((vertical) => (
              <tbody key={vertical.id}>
                {vertical.indicators.flatMap((indicator, indicatorIndex) => {
                  const progress = indicatorProgress(indicator, vertical.sources, publishedReleaseIds);
                  const sourceIds: Array<string | null> = indicator.source_ids.length ? indicator.source_ids : [null];
                  return sourceIds.map((sourceId, sourceIndex) => {
                    const link = sourceId ? vertical.sources.find((item) => item.source_id === sourceId) : null;
                    const source = sourceId ? catalogById.get(sourceId) : null;
                    if (sourceId && (!link || !source)) throw new Error(`Unknown source registry ID: ${sourceId}`);
                    const published = link ? sourceInRelease(link, publishedReleaseIds) : false;
                    return <tr key={`${vertical.id}-${indicator.id}-${sourceId ?? 'unselected'}`}>
                      {indicatorIndex === 0 && sourceIndex === 0 ? <th className="matrix-vertical" scope="rowgroup" rowSpan={vertical.indicators.reduce((total, item) => total + Math.max(1, item.source_ids.length), 0)}>
                        <strong>{vertical.label}</strong><span>{vertical.description}</span>
                      </th> : null}
                      {sourceIndex === 0 ? <th className="matrix-indicator" scope="row" rowSpan={sourceIds.length}>
                        <strong>{indicator.label}</strong>
                        <span>{indicator.scope}</span>
                        <small className={progress.ready ? 'indicator-ready' : 'indicator-open'}>
                          {progress.ready ? '✓ Source set ready' : progress.required === 0 ? 'Source selection needed' : `${progress.inRelease}/${progress.required} sources in release`}
                        </small>
                      </th> : null}
                      <th className="matrix-source" scope="row">
                        {source && link ? <><a href={`#source-${source.id}`}>{source.label}</a>
                        <small>{source.dossier} · {link.role}</small>
                        {source.blockers.length ? <details className="matrix-blockers"><summary>{source.blockers.length} open {source.blockers.length === 1 ? 'issue' : 'issues'}</summary>
                          <ul>{source.blockers.map((blocker) => <li key={blocker}>{humanize(blocker)}</li>)}</ul>
                        </details> : null}</> : <span className="matrix-source-gap">No source selected yet</span>}
                      </th>
                      <td>{source ? <SourceStatus complete={source.downloaded} label={`${source.id} acquired`} /> : <span className="matrix-not-selected">—</span>}</td>
                      <td>{source ? <SourceStatus complete={published} label={`${source.id} in release`} /> : <span className="matrix-not-selected">—</span>}</td>
                    </tr>;
                  });
                })}
              </tbody>
            ))}
          </table>
        </div>
      </section>

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
                <div><dt>Source releases</dt><dd>{metric.source_release_ids.join(', ')}</dd></div>
                <div><dt>Observed years</dt><dd>{formatAstronomicalYear(metric.available_years[0])}–{formatAstronomicalYear(metric.available_years.at(-1) ?? metric.available_years[0])}</dd></div>
                <div><dt>Unit</dt><dd>{metric.unit}</dd></div>
                <div><dt>Temporal policy</dt><dd>{humanize(metric.temporal_policy)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {manifest.economic_evidence ? <section className="source-section" aria-labelledby="economic-datasets-title">
        <div className="section-intro"><span className="eyebrow">Source-native economics</span><h2 id="economic-datasets-title">Published economic tables</h2><p>{manifest.economic_evidence.interpretation}</p></div>
        <div className="metric-source-list">{manifest.economic_evidence.datasets.map((dataset) => <article key={dataset.id}>
          <div><span className="eyebrow">{dataset.source_release_id}</span><h3>{dataset.label}</h3><p>{dataset.support_type}</p></div>
          <dl><div><dt>Known / source rows</dt><dd>{dataset.known_value_count.toLocaleString()} / {dataset.source_row_count.toLocaleString()}</dd></div><div><dt>Years with values</dt><dd>{formatAstronomicalYear(dataset.available_years[0])}–{formatAstronomicalYear(dataset.available_years.at(-1) ?? dataset.available_years[0])}</dd></div><div><dt>Unit</dt><dd>{dataset.unit}</dd></div><div><dt>Open</dt><dd><a href={`?page=economics&indicator=${dataset.id}&year=${dataset.available_years.at(-1)}`}>Explore exact years ↗</a></dd></div></dl>
        </article>)}</div>
      </section> : null}

      <section className="source-section" aria-labelledby="catalog-title">
        <div className="section-intro">
          <span className="eyebrow">Full research registry · {catalog.length} entries</span>
          <h2 id="catalog-title">Published, candidate, and blocked sources</h2>
          <p>These entries are candidates, not claims that every dataset is acquired or compatible.</p>
        </div>
        <div className="source-catalog">
          {catalog.map((source) => {
            const published = verticals.some((vertical) => vertical.sources.some(
              (link) => link.source_id === source.id && sourceInRelease(link, publishedReleaseIds),
            ));
            const status = published
              ? source.blockers.length ? 'Published / limited' : 'Published'
              : source.downloaded ? 'Acquired / reviewing'
                : source.blockers.length ? 'Blocked / reviewing' : 'Documented';
            return (
              <article className="source-card" id={`source-${source.id}`} key={source.id}>
                <div className="source-card-topline">
                  <span className={`status-pill ${published ? 'status-published' : 'status-research'}`}>{status}</span>
                  <span>{source.dossier}</span>
                </div>
                <h3>{source.label}</h3>
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
