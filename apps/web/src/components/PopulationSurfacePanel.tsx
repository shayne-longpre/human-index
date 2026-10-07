import { useMemo, useState } from 'react';
import type { AtlasReleaseManifest, PopulationSurfaceDataset, PopulationSurfaceReference } from '@atlas/contracts';
import { formatInteger, formatPeople } from '../format';
import { releaseRoot } from '../data';
import type { PopulationSurfaceCell } from './MapView';

interface Props {
  manifest: AtlasReleaseManifest;
  year: number;
  sourceId: string | null;
  onSourceChange: (id: string | null) => void;
  reference: PopulationSurfaceReference | null;
  dataset: PopulationSurfaceDataset | null;
  loading: boolean;
  error: string | null;
  selectedCell: PopulationSurfaceCell | null;
}

function sourceName(id: string): string {
  return id.startsWith('ghsl-') ? 'GHSL GHS-POP' : id.startsWith('worldpop-') ? 'WorldPop Global2' : id;
}

export function PopulationSurfacePanel({ manifest, year, sourceId, onSourceChange, reference, dataset, loading, error, selectedCell }: Props) {
  const [page, setPage] = useState(0);
  const sourceIds = [...new Set(manifest.population_surfaces.snapshots.map((snapshot) => snapshot.source_release_id))];
  const years = manifest.population_surfaces.snapshots
    .filter((snapshot) => snapshot.source_release_id === sourceId)
    .map((snapshot) => snapshot.year);
  const sortedCells = useMemo(
    () => dataset ? [...dataset.cells].sort((left, right) => right[2] - left[2]) : [],
    [dataset],
  );
  const pageCount = Math.max(1, Math.ceil(sortedCells.length / 50));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <section className="surface-panel" aria-labelledby="surface-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Separate spatial evidence · exact source dates</span>
          <h2 id="surface-title">Where people were modeled to live</h2>
        </div>
        <label className="surface-source-picker">
          Population map layer
          <select value={sourceId ?? ''} onChange={(event) => { setPage(0); onSourceChange(event.target.value || null); }}>
            <option value="">Country totals / no grid</option>
            {sourceIds.map((id) => <option key={id} value={id}>{sourceName(id)}</option>)}
          </select>
        </label>
      </div>
      <p className="scope-note">
        Grid columns represent modeled people in a 1° geographic bin, aggregated from source pixels by their centres.
        Color shows the bin count; height shows that count divided by its physical WGS84 bin area on a fixed log scale.
        They are not the bin’s exact footprint, a historical border, or an allocation of people to a polity.
        World Bank country totals and this grid are separate reconstructions and must not be added together.
      </p>
      {!sourceId ? <p className="surface-state">Choose a gridded source to see spatial population evidence on the map.</p>
        : !reference ? <p className="surface-state" role="status">
          No {sourceName(sourceId)} grid is published for {year}. Exact published dates: {years.join(', ')}. The country map remains visible; no grid is carried forward.
        </p>
          : loading ? <p className="surface-state" role="status">Loading {sourceName(sourceId)} {year} grid…</p>
            : error ? <p className="surface-state surface-error" role="alert">Grid unavailable: {error}</p>
              : dataset ? <>
                <div className="surface-facts">
                  <div><span>Source raster total</span><strong>{formatPeople(reference.source_total_people)}</strong></div>
                  <div><span>Shown in bins</span><strong>{formatPeople(reference.published_bin_total_people)}</strong></div>
                  <div><span>Outside-grid residual</span><strong>{formatPeople(reference.unassigned_outside_grid_people)}</strong></div>
                  <div><span>Covered bins</span><strong>{formatInteger(reference.covered_bin_count)}</strong></div>
                </div>
                <p className="scope-note">
                  {sourceName(sourceId)} · {reference.evidence_state === 'projection' ? 'projection' : 'modeled estimate'} · {year}.
                  {' '}The {formatInteger(dataset.transformation.known_zero_bin_count)} covered zero-valued bins remain distinct from
                  {' '}{formatInteger(dataset.transformation.no_data_bin_count)} bins with no source coverage.
                  {' '}The {formatInteger(reference.unassigned_outside_grid_people)} people outside the display grid remain in source accounting.
                </p>
                {selectedCell ? <div className="surface-selected" role="status">
                  <strong>Selected 1° bin: {selectedCell[0] - 179.5}° longitude, {89.5 - selectedCell[1]}° latitude</strong>
                  <span>{formatInteger(selectedCell[2])} modeled people · {sourceName(sourceId)} {year}</span>
                  <span>{(selectedCell[2] / dataset.cell_area_km2_by_row[selectedCell[1]]).toFixed(1)} people/km² of the full geographic bin</span>
                </div> : null}
                <div className="surface-actions">
                  <a href={`${releaseRoot}/${reference.download_file}`} download>Download all covered bins · CSV</a>
                  <a href={`${releaseRoot}/${reference.data_file}`} download>Download grid and audit · JSON</a>
                </div>
                <details className="surface-details">
                  <summary>Browse all {formatInteger(reference.covered_bin_count)} covered bins in an accessible table</summary>
                <div className="surface-table-scroll" role="region" aria-label="Population grid evidence table" tabIndex={0}>
                  <table className="source-matrix">
                    <thead><tr><th scope="col">Longitude centre</th><th scope="col">Latitude centre</th><th scope="col">Modeled people</th><th scope="col">People / km² of bin</th></tr></thead>
                    <tbody>{sortedCells.slice(currentPage * 50, (currentPage + 1) * 50).map(([col, row, people]) => (
                      <tr key={`${col}:${row}`}><td>{col - 179.5}°</td><td>{89.5 - row}°</td><td>{formatInteger(people)}</td><td>{(people / dataset.cell_area_km2_by_row[row]).toFixed(1)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="surface-pagination">
                  <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous 50</button>
                  <span>Page {currentPage + 1} of {pageCount}</span>
                  <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Next 50</button>
                </div>
                </details>
              </> : null}
    </section>
  );
}
