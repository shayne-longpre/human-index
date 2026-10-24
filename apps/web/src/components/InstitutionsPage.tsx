import { formatAstronomicalYear, type AtlasReleaseManifest, type InstitutionalEvidenceDataset } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadInstitutionalDataset, releaseRoot } from '../data';

const count = (value: number) => new Intl.NumberFormat('en-US').format(value);

function displayValue(dataset: InstitutionalEvidenceDataset, value: number): string {
  if (dataset.kind === 'fraction') return `${new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value)} of statutory adults`;
  return `${value} · ${dataset.category_labels?.[String(value)] ?? 'Unrecognized category'}`;
}

export function InstitutionsPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const catalog = manifest.institutional_evidence?.datasets ?? [];
  const [choice, setChoice] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const selected = catalog.find((item) => item.id === search.get('indicator')) ?? catalog[0];
    const requested = Number(search.get('year'));
    return { id: selected?.id ?? '', year: selected?.available_years.includes(requested) ? requested : selected?.available_years.at(-1) ?? 2025 };
  });
  const [dataset, setDataset] = useState<InstitutionalEvidenceDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const reference = catalog.find((item) => item.id === choice.id) ?? catalog[0];
  const year = reference?.available_years.includes(choice.year) ? choice.year : reference?.available_years.at(-1) ?? 2025;

  useEffect(() => {
    if (!reference) return;
    let active = true;
    setDataset(null);
    setError(null);
    void loadInstitutionalDataset(reference).then((loaded) => {
      if (active) setDataset(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Institutional evidence could not be opened');
    });
    return () => { active = false; };
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    const search = new URLSearchParams();
    search.set('page', 'institutions');
    search.set('release', manifest.release_id);
    search.set('indicator', reference.id);
    search.set('year', String(year));
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  }, [manifest.release_id, reference, year]);

  const rows = useMemo(() => {
    if (!dataset) return [];
    const supports = new Map(dataset.source_supports.map((item) => [item.code, item]));
    const values = new Map(dataset.observations.filter((item) => item[1] === year).map((item) => [item[0], item]));
    return dataset.source_rows.filter((item) => item[1] === year)
      .map(([code, , sourceRow]) => ({ support: supports.get(code)!, observation: values.get(code) ?? null, sourceRow }))
      .filter(({ support }) => `${support.name} ${support.source_text_id}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.support.name.localeCompare(b.support.name));
  }, [dataset, query, year]);
  const selected = rows.find((row) => row.support.code === selectedCode) ?? null;

  if (!reference) return <main id="main-content"><h1>Institutional evidence is not published in this release.</h1></main>;
  const source = manifest.source_releases.find((item) => item.id === reference.source_release_id);

  return <main id="main-content" className="economics-page">
    <header className="economics-hero">
      <span className="eyebrow">Institutions and religion policy · exact source years</span>
      <h1>What institutions did—and what we can document.</h1>
      <p>Four V-Dem v16 variables are available as separate country-year tables. These do not describe religious affiliation, count a population living under a rule, or rank societies. Historical map borders are not used as a join key.</p>
    </header>
    <section className="economics-controls" aria-label="Institutional evidence controls">
      <label>Source variable
        <select value={reference.id} onChange={(event) => {
          const next = catalog.find((item) => item.id === event.target.value)!;
          setChoice({ id: next.id, year: next.available_years.includes(year) ? year : next.available_years.at(-1)! });
          setSelectedCode(null);
        }}>
          {catalog.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>Exact source year
        <select value={year} onChange={(event) => { setChoice((current) => ({ ...current, year: Number(event.target.value) })); setSelectedCode(null); }}>
          {reference.available_years.map((item) => <option value={item} key={item}>{formatAstronomicalYear(item)} · {dataset?.known_by_year[String(item)] ?? '…'} known</option>)}
        </select>
      </label>
    </section>
    <section className="economics-context" aria-label="Source interpretation">
      <div><span className="eyebrow">Selected source variable</span><h2>{reference.label}</h2><p>{reference.source_variable} · {formatAstronomicalYear(year)} · {reference.unit}</p></div>
      <div><span className="eyebrow">Coded this year</span><strong>{count(dataset?.known_by_year[String(year)] ?? 0)} / {count(dataset?.source_rows.filter((item) => item[1] === year).length ?? 0)}</strong><p>Known values / source rows for this year. Other places are outside this source’s year coverage.</p></div>
      <div><span className="eyebrow">Pinned source</span><strong>{source?.publisher ?? reference.source_release_id}</strong><p>{source?.source_update ?? 'v16'} · source-native coding units</p></div>
    </section>
    <p className="economics-caution">{dataset?.meaning ?? 'Source-native measure.'} A source category of zero is a coded value, not missing evidence. The CSV retains original identifiers, row locators, project and historical-coding flags, and explicit unknown cells.</p>
    <section className="economics-table-section" aria-labelledby="institutions-table-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Evidence table</span><h2 id="institutions-table-title">V-Dem coding units at {formatAstronomicalYear(year)}</h2></div><a href={`${releaseRoot}/${reference.download_file}`} download>Download all source rows ↓</a></div>
      <label className="economics-search">Find a source country or code<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coding units" /></label>
      {error ? <p role="alert">{error}</p> : !dataset ? <p role="status">Loading and checking source rows…</p> : (
        <div className="economics-table-scroll" role="region" aria-label="Institutional source observations" tabIndex={0}>
          <table><thead><tr><th scope="col">Source coding unit</th><th scope="col">Year</th><th scope="col">Source category or value</th><th scope="col">Evidence</th></tr></thead>
            <tbody>{rows.map(({ support, observation }) => <tr key={support.code}>
              <th scope="row"><button type="button" onClick={() => setSelectedCode(support.code)}>{support.name} <small>{support.source_text_id}</small></button></th>
              <td>{year}</td><td>{observation ? displayValue(dataset, observation[2]) : '—'}</td>
              <td>{observation ? 'Published source value' : 'Unknown / not reported'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
    {selected && dataset ? <aside className="economics-inspector" aria-live="polite">
      <button type="button" onClick={() => setSelectedCode(null)} aria-label="Close source detail">×</button>
      <span className="eyebrow">Original V-Dem record · country ID {selected.support.code}</span>
      <h2>{selected.support.name}</h2>
      <p>{selected.observation ? displayValue(dataset, selected.observation[2]) : 'Unknown / not reported in this source row.'}</p>
      <p>Year: {formatAstronomicalYear(year)}. Locator: vdem.RData::vdem[{selected.sourceRow}]::{dataset.source_variable}.</p>
      <p>{dataset.meaning}</p>
      <p>Codebook v16, printed page {dataset.codebook_page}; the source CSV retains its own historical-name and project flags.</p>
    </aside> : null}
    <footer className="economics-footer"><p>{count(reference.known_value_count)} known values from {count(reference.source_row_count)} country-year rows. No interpolation, historical-border join, individual-rights percentage, or Atlas-authored institutional score.</p><a href={dataset?.source_citation_url ?? 'https://v-dem.net/data/the-v-dem-dataset/'} target="_blank" rel="noreferrer">Official V-Dem dataset and citation ↗</a></footer>
  </main>;
}
