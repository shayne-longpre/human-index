# Build report: deep-time population and temporal-map MVP

Date: 2026-09-20

## Verified result

The repository contains a static React/TypeScript Atlas with genuine-data
measures and independent historical context layers:

- U.S. Census Bureau historical world-population estimate ranges at 39 source
  dates from 10,000 BCE through 1950 CE;
- World Bank population totals, annually from 1960 through 2025;
- World Bank electricity access, annually from 1990 through 2024, with annual
  matching population accounting;
- World Bank life expectancy, annually from 1960 through 2024, shown as a
  territorial mean and population-conserving context distribution; and
- Modelski Ancient v2 city estimates: 621 sparse exact-date observations for 154
  source-geocoded cities from 3700 BCE through 1000 CE.

The UI supports metric switching, exact-year selection and playback, a MapLibre
and deck.gl choropleth, a place inspector with original record locators, metric-
appropriate summaries, searchable accessible tables, and downloadable
full-series CSV files. A Cliopatria context layer supplies 36 discrete,
lazily-loaded historical border/name snapshots from 3400 BCE through 2024 CE.
A dedicated 36-step border scrubber makes every snapshot directly selectable;
the map changes its polygons and labels as the selected year changes, while the
historical evidence table and inspector expose all features in the effective
snapshot. A dedicated Sources page exposes published inputs and the wider
research registry. Metric, year, and modern place state are shareable in the
URL. Missing observations and unsupported years remain visible.

This remains a development release. Its early population values have global
support only; they are not local density, country totals, household locations,
or population assigned to historical polities. The historical polygons are
contestable political context, not a fully reviewed world partition.

## Acquired sources and release profile

All indicator inputs were retrieved from public World Bank API endpoints on
2026-09-20. Exact URLs, byte counts, retrieval dates, and SHA-256 hashes are in
`data/registry/source-lock.json`.

| Input | Audited result |
|---|---|
| World Bank `SP.POP.TOTL` | 17,490 API rows for 1960–2025; publisher update 2026-07-13 |
| World Bank `EG.ELC.ACCS.ZS` | 9,540 API rows for 1990–2025; actual non-null observation years end in 2024 |
| World Bank `SP.DYN.LE00.IN` | 17,490 API rows for 1960–2025; actual non-null observation years end in 2024 |
| World Bank country metadata | 295 entities; 217 remain after excluding the API's `Aggregates` region |
| Natural Earth admin 0 | v5.1.2, 1:110m, 170 matched supports including explicit `KOS` → `XKX`; modern display only |
| U.S. Census historical world-population table | 39 dates, 10,000 BCE–1950 CE; global source ranges and named estimates |
| Cliopatria | v0.2.0; 13,765 source records (13,380 `POLITY`, 385 `RELATION`); 36 published display snapshots |
| Modelski Ancient Period Data | Figshare v2, CC BY 4.0; 154 city points, 41 sparse dates, 621 estimates |

Population has 216 known entities from 1960–1989 and 217 from 1990 onward.
Electricity coverage grows from 98 known entities in 1990 to 215 in 2024. No
interpolation, extrapolation, rebasing, or carry-forward is used. The historical
population adapter similarly publishes only dates present in the Census table.
The Cliopatria resolver selects the latest snapshot at or before the requested
date; it does not interpolate geometry.

For each population year, the release stores the covered-entity total, the
separate `WLD` reference, their nonnegative unassigned residual, and unplaced-map
population. For every electricity year, automated tests recompute with, without,
and unknown access and prove they sum to the matching covered population.
For every life-expectancy year, tests prove that the fixed-bin populations plus
unknown condition equal the covered population; missing weights remain explicit.

In 2024 the release reports:

- covered population: 8,117,484,624;
- estimated with electricity access: 7,460,609,613.284;
- estimated without electricity access: 655,233,892.716;
- population with unknown electricity condition: 1,641,118; and
- population retained in summaries but unplaced on the 1:110m map: 23,205,807.

## Architecture boundary

The implementation retains three extension seams: source adapters, release
contracts, and metric presentation metadata. Source parsing is isolated in
`pipelines/atlas_etl/sources`; display geometry is independent of numerical
accounting; historical political geometry has a separate typed contract and lazy
loader; and the client performs one code/year join for modern published metrics.
The heavy map renderer is a separate lazy chunk, and neighboring political
snapshots are prefetched after the active snapshot resolves.
The release manifest carries taxonomy membership, population universe, supported
years, display scale, interpretation limits, source releases, transformations,
and output checksums.

Large raw responses remain ignored. The tracked, redistributable release is
sufficient for install, tests, builds, and local development. Acquisition is an
explicit command.

## Checks actually run

```text
npm run typecheck
npm test
npm run build
in-app browser desktop render and interaction checks
```

Results:

- Strict TypeScript: pass.
- Vitest: 2 files, 21 tests, all pass.
- Published release artifact checksums: pass for all 49 artifacts.
- Population summaries: 66/66 recomputed; all reference residuals nonnegative.
- Electricity summaries: 35/35 recomputed; all conserve population mass.
- Life-expectancy summaries: 65/65 recomputed; all conserve the declared
  population denominator across fixed bins plus unknown condition.
- Electricity CSV: all 7,595 observation rows include their exact population
  denominator value and both original record locators.
- Production build: pass. Largest initial application JavaScript chunk 285.85 kB
  uncompressed / 86.80 kB gzip; the 1,961.67 kB map renderer is now a separate
  lazy chunk. CSS is 107.55 kB uncompressed / 16.03 kB gzip.
- Desktop app: population, electricity, and life-expectancy views, deep-time
  global ranges, changing historical borders/names via the dedicated scrubber,
  16 exact-date city estimates at 500 BCE, unsupported-year state, tables, inspectors,
  original record locators, shareable state, and the 16-entry Sources page
  verified. The 2024 electricity map rendered 215 known-entity values with the
  intended gold-to-green scale rather than the gray unknown color.

## Known limits and next source work

The World Bank country API does not encode the parent/dependent-territory
relationships needed to call the covered universe a fully reconciled world
partition. Natural Earth omits small supports at this scale. The renderer is
split from the initial application bundle, but remains large and should be
monitored as map layers expand.

UN World Population Prospects 2024 is the next detailed modern population-source
candidate; it is documented but not ingested until its exact artifact terms,
estimate/projection scenarios, and geography crosswalks are audited. HYDE remains
blocked for gridded deep-time population. The next Cliopatria work is overlap,
nesting, geometry-validity, and disputed-boundary review—not assigning the Census
world total to its polygons. See `MVP_SOURCE_SELECTION.md` and
`DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`.
