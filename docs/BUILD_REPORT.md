# Build report: evidence-aware temporal-map MVP, release r5

Date: 2026-09-22

## Verified result

The repository contains a static React/TypeScript Atlas with four genuine-data
measures and independent historical context layers:

- U.S. Census Bureau historical world-population estimate ranges at 39 source
  dates from 10,000 BCE through 1950 CE;
- World Bank population totals, annually from 1960 through 2025;
- UN World Population Prospects 2024 population outlook, annually from 1950
  through 2100, kept in its source-native 237-country/area universe and clearly
  separated into estimates through 2023 and the Medium projection from 2024;
- World Bank electricity access, annually from 1990 through 2024, with annual
  matching population accounting; and
- World Bank life expectancy, annually from 1960 through 2024, shown as a
  territorial mean and population-conserving context distribution.

Modelski Ancient v2 contributes 621 sparse exact-date observations for 154
source-geocoded cities from 3700 BCE through 1000 CE. Cliopatria contributes 36
discrete, lazily loaded historical border/name snapshots from 3400 BCE through
2024 CE. Neither context layer contributes to statistical accounting.

The UI supports metric switching, a single requested-date slider and playback,
independently resolved effective dates for measures, cities, and borders, a
MapLibre/deck.gl choropleth, evidence-aware summaries, inspectors with original
record locators, accessible tables, full-series CSVs, and URL-shareable state.
Names appear on hover or click instead of as a dense label field. The Sources
page exposes publication and acquisition status by data vertical. A new Review
page exposes the 28 border-overlap and 353 cross-source city-identity candidates
as read-only queues; it cannot silently merge or approve them.

This remains a development release. Early Census values have global support
only; they are not local density, country totals, household locations, or
population assigned to historical polities. WPP uses modern source geography
and Natural Earth only as display geometry. Historical polygons remain
contestable political context rather than a reviewed, mutually exclusive world
partition.

## Acquired sources and release profile

Exact URLs, byte counts, retrieval dates, SHA-256 hashes, and publication roles
are in `data/registry/source-lock.json`, the source registry, and the release
manifest.

| Input | Audited result |
|---|---|
| World Bank `SP.POP.TOTL` | 17,490 API rows for 1960–2025; publisher update 2026-07-13 |
| World Bank `EG.ELC.ACCS.ZS` | 9,540 API rows for 1990–2025; actual non-null observation years end in 2024 |
| World Bank `SP.DYN.LE00.IN` | 17,490 API rows for 1960–2025; actual non-null observation years end in 2024 |
| UN WPP 2024 Medium demographic indicators | 237 source-native countries/areas; 1950–2023 estimates and 2024–2100 Medium projections; aggregate rows and 2101 boundary rows excluded |
| Natural Earth admin 0 | v5.1.2, 1:110m, 170 matched supports including explicit `KOS` → `XKX`; modern display only |
| U.S. Census historical world-population table | 39 dates, 10,000 BCE–1950 CE; global source ranges and named estimates |
| Cliopatria | v0.2.0; 13,765 source records; 36 published `POLITY`-only context snapshots |
| Modelski Ancient Period Data | Figshare v2, CC BY 4.0; 154 city points, 41 sparse dates, 621 estimates |

No interpolation, extrapolation, rebasing, cross-release concatenation, or
carry-forward is used. The WPP series is deliberately a parallel metric rather
than a continuation of the World Bank series. Each WPP record is marked as an
estimate or Medium projection, and the interface states that the projection is
not an observation or confidence interval.

For every WPP year, tests compare the sum of the 237 selected country/area rows
with the separate source `World` row and preserve the signed rounding residual.
For every electricity year, tests recompute with, without, and unknown access
and prove they sum to the matching covered population. For every life-expectancy
year, tests prove the fixed-bin populations plus unknown condition equal the
covered population. Missing values remain distinct from zero.

The 2024 WPP outlook contains 8,161,972,586 people across the selected
country/area rows. The separate source World row differs by -14 people after
exact conversion from thousands, which is retained as the rounding residual;
approximately 49.1 million people remain unplaced on the coarse modern display
geometry. These are accounting facts, not corrections to the source.

## Candidate-source work

- CShapes 2.0's official GeoJSON and codebook are pinned and profiled for
  comparison only: 710 dated features, 1886–2019, and 11 invalid geometries.
  Publication remains blocked by geometry repair/provenance work, omitted
  codebook fields in the download, comparison with Cliopatria, and a product-use
  decision for CC BY-NC-SA 4.0.
- A genuine HYDE 3.5 10,000 BCE baseline archive, README, and license were
  acquired through the provider's normal directory flow. The sample contains
  population-count, density, rural, urban, and urban-other grids. It remains
  unpublished because the archive license says CC BY-NC 4.0 while the README
  says CC BY 3.0, the README's latest-year descriptions conflict, and the full
  masks/scenarios and conservation checks are not yet acquired.
- The official Maddison Project Database 2023 page and terms were rechecked.
  The workbook remains unavailable because the official Dataverse request
  returns an Anubis challenge page. No bypass was attempted and no income layer
  was published.

## Architecture boundary

The implementation keeps source adapters, release contracts, and presentation
metadata as small separate seams. Source parsing lives in
`pipelines/atlas_etl/sources`; the catalog declares metric taxonomy, universe,
and aggregation contracts; the release builder validates lineage and emits
checksummed artifacts. Statistical geography, historical political geography,
and display geometry are typed and loaded separately.

WPP demonstrates the intended multi-source pattern: a new source release,
population universe, transformation, observation artifact, summary artifact,
and metric definition are added without changing World Bank observations or
pretending their territorial systems are interchangeable. The review queue is
a generated projection of immutable audit artifacts, not a source-of-truth
decision store.

Large raw responses remain ignored. The tracked, redistributable release and
small review artifacts are sufficient for install, tests, builds, and local
development. Full acquisition stays an explicit command.

## Checks actually run

```text
npm run typecheck
npm test
python3 -m unittest discover -s pipelines/tests
npm run build
in-app browser desktop render and interaction checks
```

Results:

- Strict TypeScript: pass.
- Vitest: 2 files, 26 tests, all pass.
- Python unittest: 3 tests, all pass.
- Published release artifact checksums: pass for all 51 artifacts.
- Production build: pass. Main application JavaScript is 311.11 kB
  uncompressed / 93.74 kB gzip; the 1,961.30 kB map renderer remains a separate
  lazy chunk (540.52 kB gzip).
- Browser checks: WPP 2023 renders as an estimate; 2024 renders as a Medium
  projection with the non-observation warning; its map, evidence table, and
  inspector render; Sources reports WPP as published; Review reports 28 border
  and 353 city candidates and filters between queues.
- Existing mass-conservation, missingness, original-locator, boundary-geometry,
  and checksum tests continue to pass.

## Known limits and next source work

The World Bank universe still requires parent/dependent-territory reconciliation.
Natural Earth omits small supports at 1:110m. WPP projections are one source
scenario, not observed history or uncertainty bounds. HYDE cannot enter a release
until its license conflict, full artifact set, grid semantics, and conservation
checks are resolved. CShapes cannot enter the public map until licensing and
geometry/field defects are resolved. Review decisions need their own versioned,
human-authored artifact before they can alter city identities or border display.

See `MVP_SOURCE_SELECTION.md`, `CITY_SOURCE_AUDIT.md`,
`EVIDENCE_INTEGRATION.md`, and `DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`.
