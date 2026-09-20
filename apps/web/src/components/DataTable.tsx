import { useMemo, useState } from 'react';
import type { PublishedMetric, ViewRow } from '@atlas/contracts';
import { formatInteger } from '../format';
import { formatMetricValue } from '../metricViews';

type SortKey = 'name' | 'population' | 'metric';

interface DataTableProps {
  rows: ViewRow[];
  metric: PublishedMetric;
  onSelect: (code: string) => void;
}

export function DataTable({ rows, metric, onSelect }: DataTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [descending, setDescending] = useState(false);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rows
      .filter((row) =>
        [row.entity.name, row.entity.code, row.entity.region].some((value) =>
          value.toLocaleLowerCase().includes(normalized),
        ),
      )
      .sort((left, right) => {
        const a = sortKey === 'name'
          ? left.entity.name
          : sortKey === 'population'
            ? left.population?.value ?? null
            : left.metricValue;
        const b = sortKey === 'name'
          ? right.entity.name
          : sortKey === 'population'
            ? right.population?.value ?? null
            : right.metricValue;
        const direction = descending ? -1 : 1;
        if (a === null) return 1;
        if (b === null) return -1;
        return typeof a === 'string'
          ? a.localeCompare(String(b)) * direction
          : (a - Number(b)) * direction;
      });
  }, [descending, query, rows, sortKey]);

  const chooseSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) setDescending((value) => !value);
    else {
      setSortKey(nextKey);
      setDescending(false);
    }
  };

  return (
    <section className="table-section" aria-labelledby="table-title">
      <div className="table-heading">
        <div>
          <span className="eyebrow">Accessible fallback · all {rows.length} supports</span>
          <h2 id="table-title">Evidence table</h2>
        </div>
        <label>
          <span>Filter places</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Country, code, or region"
          />
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <button type="button" onClick={() => chooseSort('name')}>Place</button>
              </th>
              <th scope="col">Region</th>
              <th scope="col" className="numeric">
                <button type="button" onClick={() => chooseSort('population')}>Population</button>
              </th>
              <th scope="col" className="numeric">
                <button type="button" onClick={() => chooseSort('metric')}>{metric.label}</button>
              </th>
              <th scope="col">Map</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.entity.code}>
                <th scope="row">
                  <button type="button" className="place-button" onClick={() => onSelect(row.entity.code)}>
                    {row.entity.name} <span>{row.entity.code}</span>
                  </button>
                </th>
                <td>{row.entity.region}</td>
                <td className="numeric">
                  {row.population?.value === null || !row.population ? 'Unknown' : formatInteger(row.population.value)}
                </td>
                <td className="numeric">{formatMetricValue(metric, row.metricValue)}</td>
                <td>{row.entity.map_status === 'placed' ? 'Placed' : 'Unplaced'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
