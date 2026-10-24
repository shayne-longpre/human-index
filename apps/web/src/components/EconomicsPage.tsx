import { formatAstronomicalYear, type AtlasReleaseManifest, type EconomicEvidenceDataset } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadEconomicDataset, releaseRoot } from '../data';

const count = (value: number) => new Intl.NumberFormat('en-US').format(value);
const formatValue = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const formatSurveyValue = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 }).format(value);

function initialChoice(manifest: AtlasReleaseManifest): { id: string; year: number } {
  const references = manifest.economic_evidence?.datasets ?? [];
  const search = new URLSearchParams(window.location.search);
  const selected = references.find((item) => item.id === search.get('indicator')) ?? references[0];
  const requested = Number(search.get('year'));
  const year = selected.available_years.includes(requested) ? requested : selected.available_years.at(-1) ?? 2022;
  return { id: selected.id, year };
}

export function EconomicsPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const catalog = manifest.economic_evidence?.datasets ?? [];
  const [choice, setChoice] = useState(() => initialChoice(manifest));
  const [dataset, setDataset] = useState<EconomicEvidenceDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const reference = catalog.find((item) => item.id === choice.id) ?? catalog[0];
  const year = reference.available_years.includes(choice.year) ? choice.year : reference.available_years.at(-1)!;

  useEffect(() => {
    let active = true;
    setDataset(null);
    setError(null);
    void loadEconomicDataset(reference).then((loaded) => {
      if (active) setDataset(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Economic evidence could not be opened');
    });
    return () => { active = false; };
  }, [reference]);

  useEffect(() => {
    const search = new URLSearchParams();
    search.set('page', 'economics');
    search.set('release', manifest.release_id);
    search.set('indicator', reference.id);
    search.set('year', String(year));
    window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
  }, [manifest.release_id, reference.id, year]);

  const rows = useMemo(() => {
    if (!dataset) return [];
    const values = new Map(dataset.observations.filter((item) => item[1] === year).map((item) => [item[0], item]));
    return dataset.source_supports
      .filter((support) => dataset.observation_grain !== 'survey_record' || support.reporting_year === year)
      .filter((support) => `${support.name} ${support.code} ${support.country_code ?? ''} ${support.region ?? ''}`.toLowerCase().includes(query.toLowerCase()))
      .map((support) => ({ support, observation: values.get(support.code) ?? null }));
  }, [dataset, query, year]);
  const selected = rows.find((row) => row.support.code === selectedCode) ?? null;
  const source = manifest.source_releases.find((item) => item.id === reference.source_release_id);
  const knownThisYear = dataset?.known_by_year[String(year)] ?? 0;
  const yearIndex = reference.available_years.indexOf(year);
  const survey = reference.observation_grain === 'survey_record';
  const displayValue = survey ? formatSurveyValue : formatValue;
  const sourceReleaseCount = new Set(catalog.map((item) => item.source_release_id)).size;

  return (
    <main id="main-content" className="economics-page">
      <header className="economics-hero">
        <span className="eyebrow">Economic evidence · exact dates · source-native geography</span>
        <h1>What we know about material life.</h1>
        <p>{catalog.length} published indicator tables from {sourceReleaseCount} source releases. Select a measure and an actual source year; no dates, borders, units, or populations are silently merged. A blank value remains unknown.</p>
      </header>
      <section className="economics-controls" aria-label="Economic evidence controls">
        <label>Indicator
          <select value={reference.id} onChange={(event) => { const next = catalog.find((item) => item.id === event.target.value)!; setChoice({ id: next.id, year: next.available_years.includes(year) ? year : next.available_years.at(-1)! }); setSelectedCode(null); }}>
            {catalog.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>Exact source year
          <select value={year} onChange={(event) => { setChoice((current) => ({ ...current, year: Number(event.target.value) })); setSelectedCode(null); }}>
            {reference.available_years.map((item) => <option value={item} key={item}>{formatAstronomicalYear(item)} · {dataset?.known_by_year[String(item)] ?? '…'} known</option>)}
          </select>
        </label>
        <div className="economics-year-buttons">
          <button type="button" disabled={yearIndex === 0} onClick={() => setChoice((current) => ({ ...current, year: reference.available_years[yearIndex - 1] }))}>← Earlier</button>
          <button type="button" disabled={yearIndex >= reference.available_years.length - 1} onClick={() => setChoice((current) => ({ ...current, year: reference.available_years[yearIndex + 1] }))}>Later →</button>
        </div>
      </section>
      <section className="economics-context" aria-label="Measure interpretation">
        <div><span className="eyebrow">Selected measure</span><h2>{reference.label}</h2><p>{reference.unit} · {formatAstronomicalYear(year)}</p></div>
        <div><span className="eyebrow">Exact-date coverage</span><strong>{survey ? count(knownThisYear) : `${count(knownThisYear)} / ${count(dataset?.source_supports.length ?? 0)}`}</strong><p>{survey ? 'national survey records; multiple surveys per country-year remain separate' : 'source supports with a known value; the rest are unknown, not zero'}</p></div>
        <div><span className="eyebrow">Source release</span><strong>{source?.publisher ?? reference.source_release_id}</strong><p>{reference.source_release_id} · updated {source?.source_update ?? 'as published'}</p></div>
      </section>
      <p className="economics-caution">{dataset?.source_note ?? reference.support_type} These source supports do not inherit the historical borders on the Atlas map.</p>
      <section className="economics-table-section" aria-labelledby="economics-table-title">
        <div className="economics-table-heading"><div><span className="eyebrow">Evidence table</span><h2 id="economics-table-title">{survey ? 'National survey records' : 'Source supports'} at {formatAstronomicalYear(year)}</h2></div><a href={`${releaseRoot}/${reference.download_file}`} download>{survey ? 'Download all source rows, including subnational ↓' : 'Download all source rows, including unknowns ↓'}</a></div>
        <label className="economics-search">Find a country, territory, or code<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source supports" /></label>
        {error ? <p role="alert">{error}</p> : !dataset ? <p role="status">Loading and checking source rows…</p> : (
          <div className="economics-table-scroll" role="region" aria-label="Economic source observations" tabIndex={0}>
            <table><thead><tr><th scope="col">{survey ? 'Survey record' : 'Source support'}</th><th scope="col">Region</th><th scope="col">Value</th><th scope="col">Evidence</th></tr></thead>
              <tbody>{rows.map(({ support, observation }) => <tr key={support.code}>
                <th scope="row"><button type="button" onClick={() => setSelectedCode(support.code)}>{support.name} <small>{support.country_code ?? support.code}</small></button></th>
                <td>{support.region ?? '—'}</td><td>{observation ? displayValue(observation[2]) : '—'}</td><td>{observation ? survey ? `Published ${support.welfare_type} survey` : 'Published source value' : 'Unknown / not reported'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      {selected && dataset ? <aside className="economics-inspector" aria-live="polite">
        <button type="button" onClick={() => setSelectedCode(null)} aria-label="Close source detail">×</button>
        <span className="eyebrow">Original record · {selected.support.code}</span>
        <h2>{selected.support.name}</h2>
        <p>{selected.observation ? `${displayValue(selected.observation[2])} ${dataset.unit}` : `No published value for ${formatAstronomicalYear(year)}.`}</p>
        {selected.support.welfare_type ? <p>Welfare basis: {selected.support.welfare_type}. Do not compare it as if income and consumption were the same measure.</p> : null}
        {selected.observation ? <p>Original locator: {survey ? `PIP API CSV row ${selected.observation[3]}` : dataset.source_sheet === 'Full data' ? `Full data!A${selected.observation[3]}:F${selected.observation[3]}` : dataset.source_sheet === 'Data' ? `Data!${dataset.source_column}${selected.observation[3]}` : `API data[${selected.observation[3] - 1}]`}</p> : null}
        {selected.observation?.[4] != null ? <p>Companion source population: {formatValue(selected.observation[4])} thousands. Not used as a denominator or assigned to borders here.</p> : null}
        {dataset.source_references.length ? <details><summary>Workbook original-source references for this code ({dataset.source_references.filter((item) => item.countrycode === selected.support.code).length})</summary>
          <p>Country-level candidates from workbook sheets; not asserted as exact provenance for this observation.</p>
          <ul>{dataset.source_references.filter((item) => item.countrycode === selected.support.code).map((item) => <li key={`${item.source_sheet}-${item.source_row}`}><strong>{item.source_sheet}!{item.source_row}</strong> · {item.period_as_written ?? 'period unspecified'} · {item.citation_as_written}</li>)}</ul>
        </details> : null}
      </aside> : null}
      <footer className="economics-footer"><p>Complete publication: {count(reference.known_value_count)} known values in {count(reference.source_row_count)} source rows. {survey ? 'The CSV also retains subnational surveys excluded from this national view.' : 'Missing rows and original locators are in the CSV.'} No value is interpolated, rebased, or spliced across releases.</p><a href={dataset?.source_citation_url ?? '#'} target="_blank" rel="noreferrer">Official source and citation ↗</a>{dataset?.global_source_note ? <p>{dataset.global_source_note}</p> : null}</footer>
    </main>
  );
}
