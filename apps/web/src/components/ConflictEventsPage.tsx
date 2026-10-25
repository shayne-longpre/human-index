import { type AtlasReleaseManifest, type ConflictEventRow } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadConflictEventYear, releaseRoot } from '../data';

const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
const placePrecision: Record<number, string> = {
  1: 'Exact named place', 2: 'Within 25 km', 3: 'Second-order area',
  4: 'First-order area', 5: 'Fuzzy or linear feature', 6: 'Country only',
  7: 'At sea or in air',
};
const datePrecision: Record<number, string> = {
  1: 'Exact day', 2: 'Within 2–6 days', 3: 'Week known',
  4: 'Month or 8–30 days', 5: 'More than a month, at most one year',
};
const violenceType: Record<number, string> = { 1: 'State-based', 2: 'Non-state', 3: 'One-sided' };

export function ConflictEventsPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const reference = manifest.conflict_event_evidence;
  const requestedYear = Number(new URLSearchParams(window.location.search).get('year'));
  const [year, setYear] = useState(
    reference?.year_slices.some((slice) => slice.year === requestedYear)
      ? requestedYear : reference?.year_slices.at(-1)?.year ?? 2025,
  );
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ConflictEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slice = reference?.year_slices.find((item) => item.year === year);

  useEffect(() => {
    if (!reference || !slice) return;
    let active = true;
    setRows(null);
    setError(null);
    void loadConflictEventYear(reference, slice)
      .then((datasetRows) => { if (active) setRows(datasetRows); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Event evidence unavailable'); });
    return () => { active = false; };
  }, [reference, slice]);

  useEffect(() => {
    if (!slice) return;
    window.history.replaceState(null, '', `${window.location.pathname}?${new URLSearchParams({
      page: 'events', release: manifest.release_id, year: String(slice.year),
    })}`);
  }, [manifest.release_id, slice]);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (rows ?? []).filter((row) => !needle ||
      `${row.id} ${row.country} ${row.where_coordinates} ${row.side_a} ${row.side_b}`.toLocaleLowerCase().includes(needle));
  }, [rows, query]);

  if (!reference || !slice) return <main id="main-content"><h1>Event evidence is not published in this release.</h1></main>;
  return <main id="main-content" className="economics-page">
    <header className="economics-hero">
      <span className="eyebrow">Conflict evidence · UCDP GED 26.1</span>
      <h1>Events, not a map of everyone at risk.</h1>
      <p>These are source-defined lethal-violence event records. A coordinate can be an exact place or a representative point for an administrative area, fuzzy feature, or whole country. The precision code travels with every record.</p>
      <p><a href={`?page=conflict&release=${manifest.release_id}`}>View conflict-year and country-year products →</a></p>
    </header>
    <section className="economics-controls" aria-label="Event evidence controls">
      <label>Source event year
        <select value={year} onChange={(event) => { setYear(Number(event.target.value)); setQuery(''); }}>
          {reference.year_slices.map((item) => <option key={item.year} value={item.year}>{item.year}</option>)}
        </select>
      </label>
    </section>
    <section className="economics-context" aria-label="Event evidence scope">
      <div><span className="eyebrow">Selected year</span><h2>{year}</h2><p>{number(slice.source_row_count)} source records · individual dates may be ranges</p></div>
      <div><span className="eyebrow">Matching records</span><strong>{number(matches.length)}</strong><p>Search result count, not a death or exposure total.</p></div>
      <div><span className="eyebrow">Full 26.1 release</span><strong>{number(reference.source_row_count)}</strong><p>1989–2025 · finalized GED events</p></div>
    </section>
    <p className="economics-caution">The low, best, and high death fields are three source estimates, not an Atlas confidence interval; {number(reference.nonmonotonic_low_best_high_rows)} event triplets are not even numerically ordered. Source clarity 2 may combine several activities reported only as an aggregate. A missing event is not proof that no violence occurred. No event has been joined to Atlas borders or population.</p>
    <section className="economics-table-section" aria-labelledby="events-table-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Source-native evidence table</span><h2 id="events-table-title">Events in {year}</h2></div><a href={`${releaseRoot}/${slice.download_file}`} download>Download all {year} records · CSV.gz ↓</a></div>
      <label className="economics-search">Find source place, party, country, or event ID<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this year" /></label>
      {error ? <p role="alert">{error}</p> : !rows ? <p role="status">Loading {year} source events…</p> : <>
        <p>Showing the first {number(Math.min(matches.length, 100))} matching records. The CSV contains the complete year, original row locators, date and location precision, representative coordinates, and separate fatality estimates.</p>
        <div className="economics-table-scroll" role="region" aria-label="UCDP GED event observations" tabIndex={0}>
          <table><thead><tr><th scope="col">Source event</th><th scope="col">Date support</th><th scope="col">Location support</th><th scope="col">Parties / type</th><th scope="col">Best deaths</th><th scope="col">Original record</th></tr></thead>
            <tbody>{matches.slice(0, 100).map((row) => <tr key={row.id}>
              <th scope="row">{row.country} · event {row.id}</th>
              <td>{row.date_start === row.date_end ? row.date_start : `${row.date_start}–${row.date_end}`}<small> {datePrecision[row.date_prec]} · clarity {row.event_clarity}</small></td>
              <td>{row.where_coordinates || 'Unnamed source location'}<small> {placePrecision[row.where_prec]} · representative coordinate {row.latitude}, {row.longitude}</small></td>
              <td>{row.side_a} / {row.side_b}<small> {violenceType[row.type_of_violence]}</small></td>
              <td>{number(row.best)}<small> Source low {number(row.low)} · high {number(row.high)}</small></td>
              <td>{row.original_record_locator}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
    <footer className="economics-footer"><p>Coordinates are not an event footprint. Precision 3–6 points should never be read as exact attack sites.</p><a href="https://ucdp.uu.se/downloads/" target="_blank" rel="noreferrer">Official source and codebook ↗</a></footer>
  </main>;
}
