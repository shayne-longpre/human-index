# Build report: two-dimension MVP

Date: 2026-09-20

## Verified result

The repository contains a static React/TypeScript Atlas with two complete,
genuine-data paths:

- World Bank population totals, annually from 1960 through 2025; and
- World Bank electricity access, annually from 1990 through 2024, with annual
  matching population accounting.

The UI supports metric switching, exact-year selection and playback, a MapLibre
and deck.gl choropleth, a place inspector with original record locators, metric-
appropriate summaries, a searchable 217-row table fallback, and downloadable
full-series CSV files. A dedicated Sources page exposes published inputs and the
wider research registry. Metric, year, and place state are shareable in the URL.
Missing observations and unsupported years remain visible.

This remains a development release. It is not a claim of deep historical
population coverage, local population density, household location, or a fully
reviewed world population partition.

## Acquired sources and release profile

All indicator inputs were retrieved from public World Bank API endpoints on
2026-09-20. Exact URLs, byte counts, retrieval dates, and SHA-256 hashes are in
`data/registry/source-lock.json`.

| Input | Audited result |
|---|---|
| World Bank `SP.POP.TOTL` | 17,490 API rows for 1960–2025; publisher update 2026-07-13 |
| World Bank `EG.ELC.ACCS.ZS` | 9,540 API rows for 1990–2025; actual non-null observation years end in 2024 |
| World Bank country metadata | 295 entities; 217 remain after excluding the API's `Aggregates` region |
| Natural Earth admin 0 | v5.1.2, 1:110m, 170 matched supports including explicit `KOS` → `XKX`; display only |

Population has 216 known entities from 1960–1989 and 217 from 1990 onward.
Electricity coverage grows from 98 known entities in 1990 to 215 in 2024. No
interpolation, extrapolation, rebasing, or carry-forward is used.

For each population year, the release stores the covered-entity total, the
separate `WLD` reference, their nonnegative unassigned residual, and unplaced-map
population. For every electricity year, automated tests recompute with, without,
and unknown access and prove they sum to the matching covered population.

In 2024 the release reports:

- covered population: 8,117,484,624;
- estimated with electricity access: 7,460,609,613.284;
- estimated without electricity access: 655,233,892.716;
- population with unknown electricity condition: 1,641,118; and
- population retained in summaries but unplaced on the 1:110m map: 23,205,807.

## Architecture boundary

The implementation adds only three extension seams: source adapters, release
contracts, and metric presentation metadata. Source parsing is isolated in
`pipelines/atlas_etl/sources`; display geometry is independent of numerical
accounting; and the client performs one code/year join for any published metric.
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
in-app browser 390 × 844 responsive check
```

Results:

- Strict TypeScript: pass.
- Vitest: 2 files, 16 tests, all pass.
- Published release artifact checksums: pass for all six artifacts.
- Population summaries: 66/66 recomputed; all reference residuals nonnegative.
- Electricity summaries: 35/35 recomputed; all conserve population mass.
- Electricity CSV: all 7,595 observation rows include their exact population
  denominator value and both original record locators.
- Production build: pass. Main JavaScript chunk 2,228.18 kB uncompressed /
  622.78 kB gzip; CSS 104.01 kB uncompressed / 15.45 kB gzip.
- Desktop app: population and electricity views, unsupported-year state, table,
  inspector, original record locators, shareable state, and the 15-entry Sources
  page verified. The 2024 electricity map rendered 215 known-entity values with
  the intended gold-to-green scale rather than the gray unknown color.
- Mobile 390 × 844: visually inspected; body and document scroll width both 390
  px; no buttons outside the viewport; no console warnings/errors.

One attempted command, `npm test -- --runInBand`, failed because Vitest does not
support that Jest option. The repository's actual `npm test` command then passed.

## Known limits and next source work

The World Bank country API does not encode the parent/dependent-territory
relationships needed to call the covered universe a fully reconciled world
partition. Natural Earth omits small supports at this scale. The 2.2 MB main
bundle is acceptable for this MVP but should be split before adding heavier map
layers.

UN World Population Prospects 2024 is the next detailed population-source
candidate; it is documented but not ingested until its exact artifact terms,
estimate/projection scenarios, and geography crosswalks are audited. HYDE remains
blocked for gridded deep-time population. Cliopatria is the next bounded geometry
spike: a small, audited, display-only temporal context layer. See
`MVP_SOURCE_SELECTION.md` and `DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`.
