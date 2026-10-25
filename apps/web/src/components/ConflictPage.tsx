import { formatAstronomicalYear, type AtlasReleaseManifest, type ConflictAcdRow, type ConflictCountryYearRow, type ConflictEvidenceDataset } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadConflictDataset, releaseRoot } from '../data';

const number = (value: number) => new Intl.NumberFormat('en-US').format(value);

export function ConflictPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const catalog = manifest.conflict_evidence?.datasets ?? [];
  const initial = new URLSearchParams(window.location.search);
  const [kind, setKind] = useState<'acd' | 'cy'>(initial.get('product') === 'cy' ? 'cy' : 'acd');
  const reference = catalog.find((item) => item.kind === kind) ?? catalog[0];
  const requestedYear = Number(initial.get('year'));
  const [year, setYear] = useState(Number.isInteger(requestedYear) && reference?.available_years.includes(requestedYear)
    ? requestedYear : reference?.available_years.at(-1) ?? 2025);
  const [query, setQuery] = useState('');
  const [dataset, setDataset] = useState<ConflictEvidenceDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    let active = true;
    setDataset(null);
    setError(null);
    void loadConflictDataset(reference).then((value) => { if (active) setDataset(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Conflict evidence unavailable'); });
    return () => { active = false; };
  }, [reference]);

  const effectiveYear = reference?.available_years.includes(year) ? year : reference?.available_years.at(-1) ?? 2025;
  useEffect(() => {
    if (!reference) return;
    const search = new URLSearchParams({ page: 'conflict', release: manifest.release_id, product: reference.kind, year: String(effectiveYear) });
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  }, [effectiveYear, manifest.release_id, reference]);

  const rows = useMemo(() => (dataset?.rows ?? []).filter((row) => row.year === effectiveYear && (
    kind === 'acd'
      ? `${(row as ConflictAcdRow).location} ${(row as ConflictAcdRow).side_a} ${(row as ConflictAcdRow).side_b} ${(row as ConflictAcdRow).conflict_id}`
      : `${(row as ConflictCountryYearRow).country} ${(row as ConflictCountryYearRow).country_id}`
  ).toLowerCase().includes(query.toLowerCase())), [dataset, effectiveYear, kind, query]);

  if (!reference) return <main id="main-content"><h1>Conflict evidence is not published in this release.</h1></main>;
  return <main id="main-content" className="economics-page">
    <header className="economics-hero">
      <span className="eyebrow">Organized violence · source-native evidence</span>
      <h1>Conflict records, with their boundaries intact.</h1>
      <p>Two UCDP 26.1 products answer different questions. Armed-conflict rows are conflict-years with source-defined thresholds and parties. Country-year rows summarize GED-coded violence within Gleditsch–Ward state borders. Neither estimates the number of people exposed.</p>
      {manifest.conflict_event_evidence ? <p><a href={`?page=events&release=${manifest.release_id}`}>Explore the separate georeferenced event records →</a></p> : null}
    </header>
    <section className="economics-controls" aria-label="Conflict evidence controls">
      <label>Source product
        <select value={reference.kind} onChange={(event) => { setKind(event.target.value as 'acd' | 'cy'); setQuery(''); }}>
          <option value="acd">UCDP/PRIO armed conflict-years</option>
          <option value="cy">Organized violence within borders</option>
        </select>
      </label>
      <label>Exact source year
        <select value={effectiveYear} onChange={(event) => setYear(Number(event.target.value))}>
          {reference.available_years.map((item) => <option value={item} key={item}>{formatAstronomicalYear(item)}</option>)}
        </select>
      </label>
    </section>
    <section className="economics-context" aria-label="Source interpretation">
      <div><span className="eyebrow">Selected product</span><h2>{reference.kind === 'acd' ? 'Armed conflict-years' : 'Organized violence by country-year'}</h2><p>UCDP 26.1 · {formatAstronomicalYear(effectiveYear)}</p></div>
      <div><span className="eyebrow">Source rows this year</span><strong>{number(rows.length)}</strong><p>Filtered records, not a population count or a global peace score.</p></div>
      <div><span className="eyebrow">Complete source slice</span><strong>{number(reference.source_row_count)}</strong><p>{reference.available_years[0]}–{reference.available_years.at(-1)} · exact years only</p></div>
    </section>
    <p className="economics-caution">{reference.kind === 'acd'
      ? 'ACD intensity 1 means source-defined minor conflict; 2 means war. Locations are source labels/Gleditsch–Ward codes, not Atlas map polygons. No row does not establish that a country was peaceful.'
      : 'Deaths are UCDP best estimates, not a census. The downloadable CSV also preserves source low and high estimates separately: four rows are out of numerical order, so these fields are not rendered as a confidence interval. A source zero can reflect its inclusion rules, not proof of peace.'}</p>
    <section className="economics-table-section" aria-labelledby="conflict-table-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Evidence table</span><h2 id="conflict-table-title">{reference.kind === 'acd' ? 'Conflict-years' : 'Country-years'} in {formatAstronomicalYear(effectiveYear)}</h2></div><a href={`${releaseRoot}/${reference.download_file}`} download>Download all source rows ↓</a></div>
      <label className="economics-search">Find a source name or ID<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source records" /></label>
      {error ? <p role="alert">{error}</p> : !dataset ? <p role="status">Loading source records…</p> : (
        <div className="economics-table-scroll" role="region" aria-label="UCDP source observations" tabIndex={0}>
          {reference.kind === 'acd' ? <table><thead><tr><th scope="col">Conflict / location</th><th scope="col">Parties</th><th scope="col">Intensity</th><th scope="col">Original record</th></tr></thead><tbody>{(rows as ConflictAcdRow[]).map((row) => <tr key={`${row.conflict_id}:${row.year}`}><th scope="row">{row.location} · conflict {row.conflict_id}</th><td>{row.side_a} / {row.side_b}</td><td>{row.intensity_level === 2 ? 'War' : 'Minor'}</td><td>{row.original_record_locator}</td></tr>)}</tbody></table>
            : <table><thead><tr><th scope="col">Source country</th><th scope="col">Violence coded</th><th scope="col">Best estimated deaths</th><th scope="col">Original record</th></tr></thead><tbody>{(rows as ConflictCountryYearRow[]).map((row) => <tr key={`${row.country_id}:${row.year}`}><th scope="row">{row.country} · GW {row.country_id}</th><td>{[row.sb_exist && 'state-based', row.ns_exist && 'non-state', row.os_exist && 'one-sided'].filter(Boolean).join(', ') || 'None coded'}</td><td>{number(row.cumulative_total_deaths_in_orgvio_best)}</td><td>{row.original_record_locator}</td></tr>)}</tbody></table>}
        </div>
      )}
    </section>
    <footer className="economics-footer"><p>No name-only crosswalk, historical-border assignment, interpolation, or person-level exposure inference.</p><a href="https://ucdp.uu.se/downloads/" target="_blank" rel="noreferrer">Official UCDP downloads and citations ↗</a></footer>
  </main>;
}
