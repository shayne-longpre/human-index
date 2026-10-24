import { useEffect, useMemo, useState } from 'react';

type Cell = string | number | boolean | null;
type Row = { source_row: number; cells: Cell[] };
type SourceTable = { columns: string[]; rows: Row[] };
type Wrp = SourceTable & { source_id: string; source_release: string };
type Ccp = { source_id: string; sections: { characteristics_v5: SourceTable; chronology_v6: SourceTable } };
type Seshat = SourceTable & { source_id: string };
type Candidate = { cow_code: number; source_year: number; wrp: { source_row: number; source_name: string }; ccp: Array<{ source_row: number; source_name: string }>; disposition: string };
type Decisions = { candidate_count: number; candidates: Candidate[] };
type LocalEvidence = { wrp: Wrp; ccp: Ccp; seshat: Seshat; decisions: Decisions };
type Tab = 'wrp' | 'ccp' | 'seshat';

function record(table: SourceTable, row: Row): Record<string, Cell> {
  return Object.fromEntries(table.columns.map((column, index) => [column, row.cells[index]]));
}

function shown(value: Cell): string {
  return value === null ? '— missing in source' : String(value);
}

function provision(code: Cell, codingAvailable: Cell): string {
  if (codingAvailable !== '1') return `${shown(code)} · source coding not available`;
  if (code === '1') return 'Yes · coded written provision';
  if (code === '2') return 'No · coded written provision';
  if (code === '96') return 'Other · inspect source codebook';
  if (code === '97') return 'Unable to determine · source code';
  return `${shown(code)} · no interpreted category`;
}

async function localJson<T>(name: string): Promise<T> {
  const response = await fetch(`/local-research/${name}.json`);
  if (!response.ok) throw new Error(`${name}: ${response.status}. Run the local stage commands, then reload.`);
  return await response.json() as T;
}

export function ResearchPage() {
  const [evidence, setEvidence] = useState<LocalEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('wrp');
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([localJson<Wrp>('wrp'), localJson<Ccp>('ccp'), localJson<Seshat>('seshat'), localJson<Decisions>('candidates')])
      .then(([wrp, ccp, seshat, decisions]) => {
        if (wrp.source_id !== 'world_religion_project' || ccp.source_id !== 'comparative_constitutions_project' || seshat.source_id !== 'seshat') {
          throw new Error('A local research artifact has an unexpected source identity.');
        }
        if (active) setEvidence({ wrp, ccp, seshat, decisions });
      }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { active = false; };
  }, []);

  const table = evidence ? tab === 'wrp' ? evidence.wrp : tab === 'ccp' ? evidence.ccp.sections.characteristics_v5 : evidence.seshat : null;
  const years = useMemo(() => {
    if (!table || tab === 'seshat') return [];
    const index = table.columns.indexOf('year');
    return [...new Set(table.rows.map((row) => Number(row.cells[index])))].sort((a, b) => a - b);
  }, [tab, table]);
  const rows = useMemo(() => {
    if (!table) return [];
    return table.rows.filter((item) => {
      const values = record(table, item);
      if (year !== 'all' && tab !== 'seshat' && String(values.year) !== year) return false;
      const haystack = tab === 'seshat'
        ? `${values.NGA} ${values.Polity} ${values.Variable} ${values.Section}`
        : `${values.name ?? values.country} ${values.state ?? values.cowcode}`;
      return haystack.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [query, tab, table, year]);
  const selectedRow = table?.rows.find((item) => item.source_row === selected) ?? null;
  const selectedValues = table && selectedRow ? record(table, selectedRow) : null;
  const candidate = evidence && tab === 'wrp' && selected !== null
    ? evidence.decisions.candidates.find((item) => item.wrp.source_row === selected) : null;
  const ccpRows = evidence?.ccp.sections.characteristics_v5.rows ?? [];
  const ccpColumns = evidence?.ccp.sections.characteristics_v5.columns ?? [];
  const ccpByRow = useMemo(() => new Map(ccpRows.map((item) => [item.source_row, item])), [ccpRows]);

  return <main id="main-content" className="economics-page research-page">
    <header className="economics-hero">
      <span className="eyebrow">Local research · excluded from the public build</span>
      <h1>Three sources. Different questions.</h1>
      <p>Inspect source-native religion estimates, coded constitutional provisions, and sampled historical polity evidence. Their codes and dates are not automatically one population, one geography, or one indicator.</p>
    </header>
    <p className="economics-caution">These ignored artifacts are served only in local development. Source reuse terms for WRP and CCP, and conflicting Seshat archive license notices, remain unresolved. Do not publish or redistribute the source records from this view.</p>
    {error ? <p role="alert">Local evidence unavailable: {error}</p> : !evidence ? <p role="status">Opening local research artifacts…</p> : <>
      <section className="economics-context" aria-label="Local source coverage">
        <div><span className="eyebrow">WRP national</span><strong>{evidence.wrp.rows.length.toLocaleString()}</strong><p>Source rows · 1945–2010, five-year points · religion estimates, not direct census counts.</p></div>
        <div><span className="eyebrow">CCP characteristics</span><strong>{ccpRows.length.toLocaleString()}</strong><p>Source rows · 1789–2023 · written constitutional provisions, not practice.</p></div>
        <div><span className="eyebrow">Seshat Equinox</span><strong>{evidence.seshat.rows.length.toLocaleString()}</strong><p>Selected canonical source rows · source date ranges and uncertainty retained.</p></div>
      </section>
      <p className="economics-caution">{evidence.decisions.candidate_count.toLocaleString()} WRP records have at least one CCP characteristic record with the same COW-style code and exact year. Every match remains a <em>candidate</em> pending territorial and coding-unit review. No V-Dem or historical-map join is asserted.</p>
      <div className="research-tabs" role="group" aria-label="Research source">
        {([['wrp', 'World Religion Project'], ['ccp', 'Comparative Constitutions'], ['seshat', 'Seshat Equinox']] as const).map(([key, label]) =>
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => { setTab(key); setSelected(null); setYear('all'); setQuery(''); }}>{label}</button>)}
      </div>
      <section className="economics-controls" aria-label="Research source filters">
        <label>Find source place, code, or variable<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Search source records" /></label>
        {tab !== 'seshat' ? <label>Exact source year<select value={year} onChange={(event) => { setYear(event.target.value); setSelected(null); }}><option value="all">All source years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
      </section>
      <section className="economics-table-section" aria-labelledby="research-table-title">
        <div className="economics-table-heading"><div><span className="eyebrow">Source-native rows</span><h2 id="research-table-title">{tab === 'wrp' ? 'Religion estimates' : tab === 'ccp' ? 'Constitution characteristics' : 'Historical polity claims'}</h2></div><p>{rows.length.toLocaleString()} matched · first 80 shown</p></div>
        <div className="economics-table-scroll" role="region" aria-label="Local source records" tabIndex={0}>
          <table><thead><tr><th scope="col">Source row</th><th scope="col">Place / polity</th><th scope="col">Time</th><th scope="col">Source field</th></tr></thead><tbody>
            {rows.slice(0, 80).map((item) => { const values = record(table!, item); return <tr key={item.source_row}>
              <th scope="row"><button type="button" onClick={() => setSelected(item.source_row)}>{item.source_row}</button></th>
              <td>{shown(tab === 'seshat' ? values.Polity : values.name ?? values.country)} <small>{shown(tab === 'seshat' ? values.NGA : values.state ?? values.cowcode)}</small></td>
              <td>{tab === 'seshat' ? `${shown(values['Date.From'])}–${shown(values['Date.To'])}` : shown(values.year)}</td>
              <td>{tab === 'wrp' ? `source sum ${shown(values.sumreligpct)}; dual-religion ${shown(values.dualrelig)}` : tab === 'ccp' ? provision(values.freerel, values.coding_available) : `${shown(values.Variable)}: ${shown(values['Value.From'])}–${shown(values['Value.To'])}`}</td>
            </tr>; })}
          </tbody></table>
        </div>
      </section>
      {selectedValues && table ? <aside className="economics-inspector research-inspector" aria-live="polite">
        <button type="button" onClick={() => setSelected(null)} aria-label="Close source record">×</button>
        <span className="eyebrow">Original source row {selected} · {tab.toUpperCase()}</span>
        <h2>{shown(tab === 'seshat' ? selectedValues.Polity : selectedValues.name ?? selectedValues.country)}</h2>
        {tab === 'ccp' ? <p>Freedom of religion: {provision(selectedValues.freerel, selectedValues.coding_available)}. This codes a written provision, not actual practice. Source imputation flag: {shown(selectedValues.coding_imputed)}.</p> : null}
        {tab === 'wrp' ? <p>Affiliation counts can overlap. Source dual-religion flag: {shown(selectedValues.dualrelig)}. The total is not forced to 100%.</p> : null}
        {tab === 'seshat' ? <p>Source dates, values and notes are shown as recorded. This is a sampled historical claim, not a continuous annual observation or an inferred belief for everyone.</p> : null}
        <dl className="research-fields">{table.columns.map((column) => <div key={column}><dt>{column}</dt><dd>{shown(selectedValues[column])}</dd></div>)}</dl>
        {candidate ? <div className="research-candidates"><h3>Same-code, same-year CCP candidates</h3><p>Candidate support link only; territorial identity is unreviewed.</p>{candidate.ccp.map((match) => { const ccp = ccpByRow.get(match.source_row); const values = ccp ? record({ columns: ccpColumns, rows: [] }, ccp) : null; return <p key={match.source_row}>CCP row {match.source_row} · {match.source_name} · {values ? provision(values.freerel, values.coding_available) : 'source row unavailable'}{values?.coding_imputed === '1' ? ' · source-imputed coding' : ''}</p>; })}</div> : null}
      </aside> : null}
      <footer className="economics-footer"><p>No Atlas religion, governance, or rights score is calculated here. Consult the source codebooks and the published V-Dem page for independent policy measures.</p></footer>
    </>}
  </main>;
}
