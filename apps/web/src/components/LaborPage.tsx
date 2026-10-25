import { type AtlasReleaseManifest, type LaborDictionary, type LaborTuple } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadLaborYear, releaseRoot } from '../data';

function sourceLabel(row: LaborTuple, dictionary: LaborDictionary): string {
  return dictionary.source[`${row[0]}:${row[1]}`] ?? row[1];
}

export function LaborPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const tables = manifest.labor_evidence?.tables ?? [];
  const queryParams = new URLSearchParams(window.location.search);
  const requestedTable = queryParams.get('table');
  const [tableId, setTableId] = useState(() =>
    tables.find((item) => item.source_table === requestedTable)?.source_table
      ?? tables.find((item) => item.definition === 'current_ICLS19')?.source_table ?? tables[0]?.source_table ?? '');
  const table = tables.find((item) => item.source_table === tableId);
  const requestedYear = Number(queryParams.get('year'));
  const [year, setYear] = useState(() => table?.year_slices.some((item) => item.year === requestedYear)
    ? requestedYear : table?.year_slices.at(-1)?.year ?? 2025);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof loadLaborYear>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slice = table?.year_slices.find((item) => item.year === year);

  useEffect(() => {
    if (!table || !slice) return;
    let active = true;
    setLoaded(null);
    setError(null);
    void loadLaborYear(table, slice).then((result) => { if (active) setLoaded(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Labor evidence unavailable'); });
    return () => { active = false; };
  }, [table, slice]);

  useEffect(() => {
    if (!table || !slice) return;
    window.history.replaceState(null, '', `${window.location.pathname}?${new URLSearchParams({
      page: 'labor', release: manifest.release_id, table: table.source_table, year: String(year),
    })}`);
  }, [manifest.release_id, table, slice, year]);

  const matches = useMemo(() => {
    if (!loaded) return [];
    const needle = query.trim().toLocaleLowerCase();
    return loaded.dataset.rows.filter((row) => !needle ||
      `${row[0]} ${loaded.dictionary.ref_area[row[0]] ?? ''} ${row[1]} ${sourceLabel(row, loaded.dictionary)}`
        .toLocaleLowerCase().includes(needle));
  }, [loaded, query]);

  if (!table || !slice) return <main id="main-content"><h1>Labor evidence is not published in this release.</h1></main>;
  const withheld = Object.values(table.withheld_year_rows).reduce((sum, count) => sum + count, 0);
  return <main id="main-content" className="economics-page">
    <header className="economics-hero"><span className="eyebrow">Economics · ILOSTAT source records</span>
      <h1>Employment, without a forced global average.</h1>
      <p>The older ICLS13 and current ICLS19 employment-to-population definitions are separate tables. Every record keeps its reference area, source, sex, age group, status, and notes; duplicate area-years are not averaged or silently deduplicated.</p>
    </header>
    <section className="economics-controls" aria-label="Labor evidence controls">
      <label>Source definition<select value={tableId} onChange={(event) => {
        const selected = tables.find((item) => item.source_table === event.target.value);
        setTableId(event.target.value); setYear(selected?.year_slices.at(-1)?.year ?? 2025); setQuery('');
      }}>{tables.map((item) => <option key={item.source_table} value={item.source_table}>
        {item.definition === 'previous_ICLS13' ? 'Previous ICLS13' : 'Current ICLS19'} · {item.source_table}
      </option>)}</select></label>
      <label>Exact source year<select value={year} onChange={(event) => { setYear(Number(event.target.value)); setQuery(''); }}>
        {table.year_slices.map((item) => <option key={item.year} value={item.year}>{item.year}</option>)}
      </select></label>
    </section>
    <section className="economics-context" aria-label="Labor source scope">
      <div><span className="eyebrow">Selected year</span><h2>{year}</h2><p>{slice.source_row_count.toLocaleString()} source rows, not unique territories</p></div>
      <div><span className="eyebrow">Browseable rows</span><strong>{table.published_row_count.toLocaleString()}</strong><p>Exact source years through 2025</p></div>
      <div><span className="eyebrow">Full source table</span><strong>{table.source_row_count.toLocaleString()}</strong><p>{withheld.toLocaleString()} later-dated rows held from the observed-year browser</p></div>
    </section>
    <p className="economics-caution">A percentage applies only to its stated area, sex, age band, source, and ICLS definition. An ILO-labelled source row is not presented as a direct national survey. Blank values remain missing. The complete source CSV includes {withheld.toLocaleString()} rows after 2025 for method review; no future rate is called an observation here. No labor row is joined to Atlas borders or population.</p>
    <section className="economics-table-section" aria-labelledby="labor-table-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Source-native evidence table</span><h2 id="labor-table-title">Employment-to-population ratio · {year}</h2></div>
        <a href={`${releaseRoot}/${table.download_file}`} download>Download complete source table · CSV.gz ↓</a></div>
      <label className="economics-search">Find source area, code, or survey<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this source year" /></label>
      {error ? <p role="alert">{error}</p> : !loaded ? <p role="status">Loading {year} ILOSTAT records…</p> : <>
        <p>{matches.length.toLocaleString()} matching rows. Showing the first {Math.min(matches.length, 100).toLocaleString()}; the source download retains every year and original note field.</p>
        <div className="economics-table-scroll" role="region" aria-label="ILOSTAT employment source observations" tabIndex={0}>
          <table><thead><tr><th scope="col">Source area</th><th scope="col">Source and definition</th><th scope="col">Sex / age support</th><th scope="col">Rate</th><th scope="col">Status / notes</th><th scope="col">Original row</th></tr></thead>
            <tbody>{matches.slice(0, 100).map((row) => <tr key={row[11]}>
              <th scope="row">{loaded.dictionary.ref_area[row[0]] ?? row[0]} <small>{row[0]}</small></th>
              <td>{sourceLabel(row, loaded.dictionary)}<small>{row[1]} · {table.definition}</small></td>
              <td>{loaded.dictionary.sex[row[3]] ?? row[3]} · {loaded.dictionary.classif1[row[4]] ?? row[4]}</td>
              <td>{row[6] === '' ? 'Missing' : `${row[6]}%`}</td>
              <td>{row[7] ? `${row[7]}: ${loaded.dictionary.obs_status[row[7]] ?? 'source status'}` : 'No status code'}<small>{[row[8], row[9], row[10]].filter(Boolean).join(' · ') || 'No source notes'}</small></td>
              <td>{table.source_table}.csv.gz:row-{row[11]}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
    <footer className="economics-footer"><p>Browseable years are not a complete historical labor panel; definitions and source supports differ.</p><a href="https://ilostat.ilo.org/data/bulk/" target="_blank" rel="noreferrer">Official ILOSTAT bulk data ↗</a></footer>
  </main>;
}
