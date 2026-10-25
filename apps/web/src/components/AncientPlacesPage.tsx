import { type AncientPlaceDataset, type AtlasReleaseManifest } from '@atlas/contracts';
import { useEffect, useMemo, useState } from 'react';
import { loadAncientPlaces, releaseRoot } from '../data';

type SourceRow = AncientPlaceDataset['rows'][number];
const field = (row: SourceRow, index: number) => String(row[index] ?? '');
const sourceYear = (raw: string) => raw ? `${raw} (${Number(raw) < 0 ? `${Math.abs(Number(raw))} BCE` : `${raw} CE`})` : 'unspecified';
function sourcePlaceUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'pleiades.stoa.org' ? url.href : undefined;
  } catch { return undefined; }
}

export function AncientPlacesPage({ manifest }: { manifest: AtlasReleaseManifest }) {
  const reference = manifest.ancient_place_evidence;
  const [datasets, setDatasets] = useState<Awaited<ReturnType<typeof loadAncientPlaces>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(new URLSearchParams(window.location.search).get('place') ?? '');
  useEffect(() => {
    if (!reference) return;
    let active = true;
    void loadAncientPlaces(reference).then((value) => { if (active) setDatasets(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Place evidence unavailable'); });
    return () => { active = false; };
  }, [reference]);

  const namesByPlace = useMemo(() => {
    const result = new Map<string, SourceRow[]>();
    for (const row of datasets?.names.rows ?? []) {
      const id = field(row, 0);
      const rows = result.get(id) ?? [];
      rows.push(row);
      result.set(id, rows);
    }
    return result;
  }, [datasets]);
  const pointsByPlace = useMemo(() => {
    const result = new Map<string, SourceRow[]>();
    for (const row of datasets?.location_points.rows ?? []) {
      const id = field(row, 0);
      const rows = result.get(id) ?? [];
      rows.push(row);
      result.set(id, rows);
    }
    return result;
  }, [datasets]);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (datasets?.places.rows ?? []).filter((row) => !needle ||
      `${field(row, 0)} ${field(row, 1)}`.toLocaleLowerCase().includes(needle)
      || (namesByPlace.get(field(row, 0)) ?? []).some((name) => field(name, 2).toLocaleLowerCase().includes(needle)));
  }, [datasets, namesByPlace, query]);
  const selected = datasets?.places.rows.find((row) => field(row, 0) === selectedId);
  const names = namesByPlace.get(selectedId) ?? [];
  const points = pointsByPlace.get(selectedId) ?? [];

  if (!reference) return <main id="main-content"><h1>Ancient-place evidence is not published in this release.</h1></main>;
  return <main id="main-content" className="economics-page">
    <header className="economics-hero"><span className="eyebrow">Historical place evidence · Pleiades v4.1</span>
      <h1>Names and places, not a dated border map.</h1>
      <p>This source-native gazetteer links Pleiades place IDs to their name and point-location records. Date fields are earliest/latest termini, not proof that a name or location held continuously between them. Rough representative points may be bounding-box centroids.</p>
    </header>
    <section className="economics-context" aria-label="Pleiades source scope">
      <div><span className="eyebrow">Place records</span><h2>{reference.row_counts.places.toLocaleString()}</h2><p>{reference.unlocated_places.toLocaleString()} without representative coordinates</p></div>
      <div><span className="eyebrow">Name records</span><strong>{reference.row_counts.names.toLocaleString()}</strong><p>Each retains association certainty and source termini</p></div>
      <div><span className="eyebrow">Point-location records</span><strong>{reference.row_counts.location_points.toLocaleString()}</strong><p>{reference.rough_representative_points.toLocaleString()} place representatives marked rough</p></div>
    </section>
    <p className="economics-caution">No place, name, or location is projected onto the Atlas timeline or used as a polity-border source. Missing coordinates remain unlocated; rough representatives are not exact sites. Pleiades IDs, not matching names, join these three exports.</p>
    <section className="economics-table-section" aria-labelledby="places-table-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Source-native gazetteer</span><h2 id="places-table-title">Pleiades places</h2></div>
        <div><a href={`${releaseRoot}/${reference.files.places.download_file}`} download>Places CSV.gz ↓</a> · <a href={`${releaseRoot}/${reference.files.names.download_file}`} download>Names CSV.gz ↓</a> · <a href={`${releaseRoot}/${reference.files.location_points.download_file}`} download>Points CSV.gz ↓</a></div></div>
      <label className="economics-search">Find place ID, title, or recorded name<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Pleiades records" /></label>
      {error ? <p role="alert">{error}</p> : !datasets ? <p role="status">Loading Pleiades places, names, and locations…</p> : <>
        <p>{matches.length.toLocaleString()} matching places. Showing the first {Math.min(matches.length, 100).toLocaleString()}; downloads contain all rows and the published fields, with original row locators. Full upstream exports remain outside Git.</p>
        <div className="economics-table-scroll" role="region" aria-label="Pleiades place records" tabIndex={0}>
          <table><thead><tr><th scope="col">Place</th><th scope="col">Representative location</th><th scope="col">Linked records</th><th scope="col">Original row</th></tr></thead>
            <tbody>{matches.slice(0, 100).map((row) => {
              const id = field(row, 0);
              return <tr key={id}><th scope="row"><button type="button" onClick={() => {
                setSelectedId(id);
                window.history.replaceState(null, '', `${window.location.pathname}?${new URLSearchParams({
                  page: 'places', release: manifest.release_id, place: id,
                })}`);
              }}>{field(row, 1)}</button><small>Pleiades {id}</small></th>
                <td>{field(row, 3) && field(row, 4) ? `${field(row, 3)}, ${field(row, 4)}` : 'Unlocated'}<small>{field(row, 5)} precision · representative only</small></td>
                <td>{(namesByPlace.get(id) ?? []).length} names · {(pointsByPlace.get(id) ?? []).length} point records</td>
                <td>places.csv:row-{field(row, 6)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </>}
    </section>
    {selected ? <section className="economics-table-section" aria-labelledby="place-detail-title">
      <div className="economics-table-heading"><div><span className="eyebrow">Place-ID join · source evidence</span><h2 id="place-detail-title">{field(selected, 1)} · {selectedId}</h2></div>
        {sourcePlaceUrl(field(selected, 2)) ? <a href={sourcePlaceUrl(field(selected, 2))} target="_blank" rel="noreferrer">Canonical Pleiades entry ↗</a> : null}</div>
      <p>{names.length} name records; {points.length} point locations. A name/location terminus does not establish validity at an arbitrary Atlas year.</p>
      <div className="economics-table-scroll" role="region" aria-label="Pleiades names for selected place" tabIndex={0}><table>
        <thead><tr><th scope="col">Recorded name</th><th scope="col">Association</th><th scope="col">Source termini</th><th scope="col">Original row</th></tr></thead>
        <tbody>{names.slice(0, 100).map((row) => <tr key={field(row, 10)}><th scope="row">{field(row, 2)}<small>{field(row, 6) || 'No attested form recorded'}</small></th>
          <td>{field(row, 4)} · {field(row, 5) || 'type unspecified'}</td>
          <td>After {sourceYear(field(row, 8))}; before {sourceYear(field(row, 9))}</td><td>names.csv:row-{field(row, 10)}</td></tr>)}</tbody>
      </table></div>
      <p>Showing {Math.min(names.length, 100)} of {names.length} names. All are in the selected-field CSV.gz.</p>
      <div className="economics-table-scroll" role="region" aria-label="Pleiades point locations for selected place" tabIndex={0}><table>
        <thead><tr><th scope="col">Source location</th><th scope="col">Precision / certainty</th><th scope="col">Source termini</th><th scope="col">Original row</th></tr></thead>
        <tbody>{points.slice(0, 100).map((row) => <tr key={field(row, 10)}><th scope="row">{field(row, 2)}<small>{field(row, 9)}</small></th>
          <td>{field(row, 5)} · {field(row, 4)}<small>Accuracy radius {field(row, 6) || 'unspecified'} metres</small></td>
          <td>After {sourceYear(field(row, 7))}; before {sourceYear(field(row, 8))}</td><td>location_points.csv:row-{field(row, 10)}</td></tr>)}</tbody>
      </table></div>
      <p>Showing {Math.min(points.length, 100)} of {points.length} point locations. Other location geometry types are outside these selected exports.</p>
    </section> : null}
    <footer className="economics-footer"><p>Source date notation has no year zero. These records are place evidence, not a reconstruction of sovereignty.</p><a href="https://pleiades.stoa.org/downloads" target="_blank" rel="noreferrer">Pleiades data and license ↗</a></footer>
  </main>;
}
