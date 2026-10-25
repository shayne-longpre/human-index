# Build report: evidence-aware temporal-map MVP

## Sources indicator roadmap — verified October 24, 2026

The Sources matrix now shows Data vertical, Indicators, Sources, Acquired,
and In release. The registry defines 49 indicators across ten verticals and
maps each selected source through its existing source-level release IDs. Fifteen
indicator source sets are ready in r12; nine indicators explicitly need a
source selected. These are integration-plan statuses, not claims of complete
time/place coverage or composite measures. PIP, PWT, and ILOSTAT source roles
were moved from the Population ledger to Economics. Unresolved blockers remain
inspectable within each source cell.

Checks actually run for this change: `pnpm test` (47 pass), `pnpm build`
(pass; existing large MapView chunk warning), Python unittest discovery
(30 pass), and `pnpm exec playwright test` (11 pass). The new browser test
checks indicator/source grouping, one ready and one incomplete source set,
an unselected-source gap, mobile horizontal scrolling, and serious/critical
accessibility findings. A 1440×900 desktop screenshot of the matrix was
captured and visually inspected; no screenshot benchmark or performance
measurement was claimed.

## Local cross-source research view — verified October 24, 2026

The pinned CCP ZIPs produced a 3,396,553-byte ignored local slice
(`1fb95795818d32f710451da2d81aeb0bd6e14b0d81db5237f55b47beb2728af6`)
with all 21,735 Characteristics source rows and 20,638 Chronology rows,
original row locators, imputation/availability flags, and narrow religion-policy
columns. A separate 465,207-byte ignored decision artifact
(`be932c41f594edde0cf905897dd24fdd6fae2c4614e358f809765349879a514f`)
records 1,960 WRP rows with exact COW-style-code/year CCP candidates. The
candidate disposition explicitly leaves territorial support unreviewed.
No WRP, CCP, or Seshat values were added to the public release or Git.

The development-only `?page=research` view opens the three ignored source
stages and candidate decisions. It keeps estimated affiliations, written
constitutional provisions, and sampled historical polity claims separate.
The four allowlisted local endpoints served over loopback; a direct generic
Vite `@fs` request for ignored derived data returned HTTP 403. The production
build had no WRP/CCP/Seshat source artifacts. This is not a scored or mapped
institutional layer.

Commands actually run this increment: the CCP stage and reconciliation ETL
modules (passed), Python unittest discovery (30 passed), `pnpm test` (44
passed), `pnpm build` (passed with the existing large MapView chunk warning),
and `pnpm exec playwright test` (10 passed, including the local research view
and accessibility scan). The local development server needed approved loopback
binding after the sandbox returned `EPERM` on the first attempt.

## Local religion and constitutional research stages — verified October 24, 2026

The pinned World Religion Project v1.1 national CSV and codebook produced an
ignored local derived artifact with all 84 source columns and 1,995 source
rows. A receipt records both input hashes, transformation ID/version/parameters,
and the 794,808-byte output SHA-256
`93f71f215ede19075f64a7719ee9a16535a0ac2ef2538a895557b7a377e858d0`.
Source row locators, blanks, coded zeros, dual-religion and source-method flags
remain separate. No WRP values were added to r12 or its web bundle. The
user-facing and redistribution decision is recorded in
`INSTITUTIONAL_RELIGION_EVIDENCE.md`.

Official CCP Chronology v6 and Characteristics v5 archives were acquired from
the public download links and SHA-256 pinned. A streaming read of the embedded
CSVs and codebooks found 20,638 chronology rows (6 columns, 1789–2025) and
21,735 characteristics rows (2,030 columns, 1789–2023); 4,054 characteristics
rows have the source `coding_imputed=1` flag. The ZIP files remain ignored
local raw inputs, not browser artifacts. Seshat Equinox's source workbook was
also locally staged for 11,202 relevant CanonDat rows, preserving all twelve
source cells and workbook row locators; the 2,163,261-byte staged artifact has
SHA-256 `705dba3229907632b02975bf11bde1d79bda9b45e89b1cfd656538fde6daa708`.
Neither CCP nor Seshat values were added to r12.

Commands run for this increment: `uv run --offline python -m
pipelines.atlas_etl.stage_world_religion_project`, `acquire_ccp`,
`profile_constitution_candidates`, `stage_seshat_institutions`, and
`profile_vertical_sources` modules; `uv run --offline python -m unittest
discover -s pipelines/tests -q` (29 passed); `pnpm test` (44 passed),
`pnpm build` (passed, existing MapView chunk-size warning), and
`pnpm exec playwright test` (9 passed). The first browser attempt could not
bind 127.0.0.1:4174 in the sandbox; the approved loopback run passed.

## Release r12 institutional first slice — verified October 24, 2026

The pinned V-Dem v16 RData and codebook pass checksum verification. A
source-native adapter published four separate country-year tables with 111,556
known values over 28,092 source rows and 202 coding units. The
Institutions & religion page exposes exact source years, original RData row
locators, coded zeros, and explicit blank values. It does not map V-Dem coding
units onto Cliopatria borders or create an Atlas political score. The
source-wide span does not imply every variable has every country-year.

The official World Religion Project v1.1 national CSV and codebook were
acquired for review, checksummed, and profiled: 1,995 rows, 200 state IDs,
14 five-year dates (1945–2010), no duplicate state-year keys, and 58 rows with
the source's nonzero `dualrelig` flag. These files remain unpublished because
redistribution terms and source-imputation semantics require review.

Commands run for this slice: `npm run data:derive:institutions` equivalent via
`uv run --offline python -m pipelines.atlas_etl.institutional_evidence`,
`uv run --offline python -m pipelines.atlas_etl.publish_institutional_evidence`,
`uv run --offline python -m pipelines.atlas_etl.acquire_religion_candidates`,
`uv run --offline python -m pipelines.atlas_etl.profile_religion_candidates`,
`uv run --offline python -m unittest discover -s pipelines/tests -v`,
`pnpm test`, `pnpm build`, and `pnpm exec playwright test`. Results: 24 Python
tests, 44 Vitest tests, production build, and 9 Playwright tests passed.
Playwright also refreshed and visually inspected the mobile method-strip
snapshot after the release-wide citation list was relabeled and collapsed.
The production build still warns about a large MapView chunk; this is a
delivery-size concern, not a failed test.

## Releases r10–r11 economic expansion — verified October 24, 2026

The official PIP version `20260922_2021_01_02_PROD` CSV was acquired and
SHA-256 pinned (2,588 source rows). Five national-survey measures publish
2,479 values each, keeping 88 additional surveys in duplicate country-years
separate and retaining 109 subnational rows in the CSV. The official PWT 11.0
XLSX was also acquired and pinned after a GET succeeded despite a HEAD 403.
Its seven selected variables publish 63,955 source-native values; the source
`Data` and `Legend` sheets, 185 supports, 13,690 country/year rows, units, and
selected `i_cig`/`i_outlier` flags were checked. Release r11 has 26 economic tables and 196,337
known source values; no spatialization to historical polities, ratio derivation,
or cross-source splice was made. `ECONOMIC_INDICATORS.md` documents coverage,
definitions, and remaining gates.

Checks actually run: `.venv/bin/python -m pipelines.atlas_etl.acquire_pip`,
`pip_evidence`, `publish_pip`, `acquire_pwt`, `pwt_evidence`, and `publish_pwt`;
`pnpm test` (41 pass), `.venv/bin/python -m unittest discover pipelines/tests`
(20 pass), `pnpm build` (pass with pre-existing lazy-map-chunk warning), and
`pnpm test:browser` (8 pass after the source-citation screenshot baseline was
reviewed and updated). An initial PWT browser test selected an unknown source
row and was corrected to select a known USA observation. No economic coverage
benchmark or claim of complete deep-history coverage was produced.

## Release r9 economic evidence — verified October 24, 2026

Release `atlas-mvp-2026-10-24-r9` extends r8 with fourteen source-native economic
tables: one official Maddison Project Database 2023 workbook and thirteen World
Bank WDI indicators from source update 2026-10-08. Acquisition pinned fifteen
original artifacts including World Bank country metadata. Derived publication
contains 119,987 known values; full CSVs preserve unknown source rows. The
Maddison workbook provides 21,366 known GDP-per-capita values, 14 in 1 CE, and
none before 1 CE. No economic value is assigned to Cliopatria polygons. The
source lock, units, citations, transformation, per-indicator coverage, and
unresolved Clio/WID gates are in `ECONOMIC_EVIDENCE.md`.

Checks actually run for r9: explicit acquisition (fifteen artifacts), derivation
(fourteen datasets), immutable publication, `.venv/bin/python -m unittest
discover -s pipelines/tests -v` (16 pass), `pnpm test` (33 pass), `pnpm build`
(pass, with the pre-existing large lazy-map-chunk warning), and
`pnpm test:browser:update` (six pass after updating the mobile evidence-footer
snapshot for two added source citations and adding an Economics controls
visual regression), followed by a normal `pnpm test:browser` run (six pass).
The first ordinary browser-test run
had five pass and one expected snapshot difference; its new Economics table,
exact-year/missingness, and accessibility test passed. No rendering benchmark
or claim of complete economic coverage was made.

## Release r8 population mapping — verified October 6, 2026

Release `atlas-mvp-2026-10-06-r8` adds source-native GHSL GHS-POP R2023A map grids at ten exact estimate dates, 1975–2020, and two separately labeled projection dates, 2025/2030. All twelve official 1 km ZIP archives were acquired with URL, size, and SHA-256 recorded in `data/registry/population-surface-lock.json`. The application publishes only one-degree display bins (25 MB across JSON and CSV files), not the multi-gigabyte source rasters. The 2020 source raster totals 7,840,952,947.014 modeled people; the published bins total 7,840,952,852.707, with 94.307 people recorded outside the display grid. Its 19,284 covered bins include valid zeros distinct from NODATA. The method, CRS, physical-area calculation, source/projection distinction, and conservation tolerance are documented in `POPULATION_SURFACES.md`.

The map, legend, separate GHSL timeline, source selector, accessible table, CSV/JSON downloads, source citations, and exact-view bundle are wired to the release. The requested date slider is still singular: the grid appears only at an exact published date, while historical borders resolve independently. No GHSL cell is assigned to a historical polity or reconciled into a World Bank/UN country total. The visual pass inspected desktop and mobile captures of the 2020 grid and its evidence panel. It caught distracting horizontal bands caused by translucent historical polygon fills over the grid; the grid view now renders borders as outlines only. Covered-zero dots appear after zooming in, avoiding stripes at world scale while preserving zero/NODATA accounting in the panel and table.

The Clio Infra total-population compact workbook was acquired for review and pinned at SHA-256 `fbf1c9349a10dfe115c79e5808b9b6f29631eca9c0741e0ad59d90eef435a329`. It contains 3,221 unique country/year records on modern 2012 geography from 1500–2000, but only 70 in 1500. The read-only spreadsheet audit reset an invalid `A1` worksheet-dimension declaration before counting rows; it did not modify the source. Seshat Equinox v1 was profiled for 395 Polity Population rows, including 178 without `Date.From` and 48 textual `Value.From` entries. Neither is published: Clio terms, units, row-level underlying citations, and historical geometry support need review; Seshat's population PolIDs have no exact matches to published Cliopatria Seshat IDs and must not be joined by name. WorldPop Global2 is a separate modern comparison candidate, not a pre-1975 solution or splice. Its 2020 constrained global raster is acquired and source-pinned; a review-only adapter pass conserves its 7,849,969,310.541 modeled people, but the derived display file remains unpublished until its Microsoft-input derivative terms are resolved.

Checks actually run for r8: `.venv/bin/python -m unittest discover -s pipelines/tests -v` (13 pass), `pnpm test` (31 pass), `pnpm build` (pass, with Vite's existing >500 kB lazy map-chunk warning), and `pnpm test:browser` (5 pass). The release-fixture suite validates every published artifact checksum; the browser test loads the GHSL grid and checks its exact-view pin. An attempted `pnpm data:review:verticals` could not initialize the sandbox-restricted uv cache; running the equivalent module with `.venv/bin/python` succeeded and refreshed `data/review/vertical-source-profiles.json`. No benchmark or frame-rate measurement was made.

## Release r7 baseline — verified September 23, 2026

## Verified result

The repository contains a static React/TypeScript Atlas with five genuine-data
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
  territorial mean and population-conserving context distribution; and
- World Bank GDP per capita in constant 2015 US dollars, annually from 1960
  through 2025, shown as territorial observations without fabricating a global
  aggregate.

Modelski Ancient v2 contributes 621 sparse exact-date observations for 154
source-geocoded cities from 3700 BCE through 1000 CE. Cliopatria contributes 36
discrete, lazily loaded historical border/name snapshots from 3400 BCE through
2024 CE. Neither context layer contributes to statistical accounting.

The UI supports metric switching, a single requested-date slider and playback,
independently resolved effective dates for measures, cities, and borders, a
MapLibre/deck.gl choropleth, evidence-aware summaries, inspectors with original
record locators, accessible tables, full-series CSVs, and URL-shareable state.
Names appear on hover or click instead of as a dense label field. The Sources
page exposes publication and acquisition status by data vertical. The Review
page exposes the versioned disposition for all 28 border-overlap and 353
cross-source city-identity candidates; it cannot mutate source evidence.

Reconciliation v1 classifies 336 city pairs as same-place links, rejects 15
distant homonyms, and preserves two coordinate-only identity candidates as
unresolved. These links form 300 canonical place clusters for navigation while
every source estimate and locator remains separate. Of the 28 bounded
Cliopatria overlaps, eight are source-declared hierarchy relations and twenty
remain unresolved. Composite features receive outline treatment; unresolved
features remain simultaneously visible in coral, and inspectors name their
counterparts. Every border decision prohibits population allocation.

The application layer now adds reproducible exact views without changing the
underlying r7 data artifacts. Shared URLs pin release, metric, date, selected
support, layers, scale, and camera. The JSON view bundle contains exact rows and
population weights, displayed calculations, statuses and record locators,
historical evidence references, the reconciliation artifact, release manifest,
transformations, citations, and license notices. Unknown pinned releases fail
closed.

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
| World Bank `NY.GDP.PCAP.KD` | 14,322 API rows for 217 non-aggregate economies, 1960–2025; publisher update 2026-07-13 |
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

The explicit candidate acquisition command now tracks 19 artifacts across the
four requested verticals. Each successful artifact has an exact URL, byte
count, retrieval date, and SHA-256 checksum in
`data/registry/candidate-source-lock.json`; three unavailable source families
remain recorded as blockers rather than being silently substituted.

- Clio-Infra candidate workbooks were acquired and schema-profiled for GDP per
  capita, international armed conflict, state antiquity, polity, democracy,
  and executive constraints. They remain outside the release pending semantic,
  entity, and overlap adjudication.
- Seshat Equinox data were acquired and profiled, including 1,494 temporal rows
  spanning source-coded dates from 13,600 BCE through 1900 CE. Source sentinel
  dates and fractional/status values must be interpreted before publication.
- V-Dem v16 and its codebook were acquired. The first proposed institutional
  field is the source's de-jure suffrage share; it is explicitly not a measure
  of participation in practice.
- UCDP GED v26.1 and the UCDP/PRIO Armed Conflict Dataset v26.1 were acquired.
  GED has 417,968 events for 1989–2025, but 5,075 records violate a naive
  low/best/high ordering assumption and therefore require source-semantic review.

- CShapes 2.0's official GeoJSON and codebook are pinned and profiled for
  comparison only: 710 dated features, 1886–2019, and 11 invalid geometries.
  Publication remains blocked by geometry repair/provenance work, omitted
  codebook fields in the download, comparison with Cliopatria, and a product-use
  decision for CC BY-NC-SA 4.0.
- A genuine HYDE 3.5 10,000 BCE baseline archive, README, and license were
  acquired through the provider's normal directory flow. The sample contains
  population-count, density, rural, urban, and urban-other grids. It remains
  unpublished and the full source family is marked blocked because the archive
  license says CC BY-NC 4.0 while the README says CC BY 3.0, the README's
  latest-year descriptions conflict, and the full masks/scenarios and
  conservation checks are not yet acquired.
- The official Maddison Project Database 2023 page and terms were rechecked.
  The workbook remains unavailable because the official Dataverse request
  returns an Anubis challenge page. No bypass was attempted and no income layer
  was published.
- World Historical Gazetteer remains blocked pending selection of a licensed,
  stable bulk/API path and a precise role for names versus political geometry.

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
a generated projection joining immutable audit artifacts to the checksummed
reconciliation decision set. The separate policy declares rules, dispositions,
the semantic boundary, and six cross-source merge policies. The builder fails
on missing candidate coverage or rule/result drift.

Large raw responses remain ignored. The tracked, redistributable release and
small review artifacts are sufficient for install, tests, builds, and local
development. Full acquisition stays an explicit command.

## Checks actually run

```text
npm run typecheck
npm test
python3 -m unittest discover -s pipelines/tests
npm run build
npm run test:browser
in-app browser desktop render and interaction checks
```

Results:

- Strict TypeScript: pass.
- Vitest: 4 files, 29 tests, all pass.
- Python unittest: 9 tests, all pass.
- Published release artifact checksums: pass for all 54 artifacts.
- Production build: pass. Main application JavaScript is 344.10 kB
  uncompressed / 102.16 kB gzip; the 1,962.77 kB map renderer remains a separate
  lazy chunk (540.91 kB gzip).
- Playwright/Chrome: 4 tests pass. They inspect a parsed exact-view download,
  URL/history restoration, desktop and mobile screenshot baselines, reduced
  motion, serious/critical axe findings on all three pages, and fail-closed
  release pinning.
- The exact-view contract test recomputes the 2024 electricity prevalence
  result from its exported rows and weights and matches the displayed result.
- The automated browser pass found and fixed one nested-interactive map role,
  31 contrast failures, an unfocusable scroll area, and cramped mobile source
  attribution. A final in-app browser pass confirmed the pinned URL, reset-view
  control, and successful exact-view download status.
- Existing mass-conservation, missingness, original-locator, boundary-geometry,
  and checksum tests continue to pass.

## Known limits and next source work

The World Bank universe still requires parent/dependent-territory reconciliation.
Natural Earth omits small supports at 1:110m. WPP projections are one source
scenario, not observed history or uncertainty bounds. HYDE cannot enter a release
until its license conflict, full artifact set, grid semantics, and conservation
checks are resolved. CShapes cannot enter the public map until licensing and
geometry/field defects are resolved. Twenty border overlaps and two city
identities still require evidence-based adjudication; deterministic unresolved
rendering does not resolve the historical claim. The candidate economics,
government, and conflict sources are profiled but not yet published: joining
their changing entities and definitions is the next scientific task. Browser work still needs a
tested WebGL fallback, another engine/platform, broader touch/keyboard flows,
and measured network, scrubbing, frame-rate, and memory benchmarks.

See `MVP_SOURCE_SELECTION.md`, `CITY_SOURCE_AUDIT.md`,
`EVIDENCE_INTEGRATION.md`, and `DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`.
The priority-ranked gap analysis against the original vision is in
`ORIGINAL_VISION_GAP_PRIORITIES.md`.
Exact-view and browser-test contracts are in `VIEW_REPRODUCIBILITY.md`.
