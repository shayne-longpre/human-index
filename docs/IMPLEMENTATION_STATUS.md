# Implementation status

Updated: 2026-10-24

## Current release r9 — economics extension

The current release retains r8's Atlas and GHSL population-grid views and adds
an Economics page with fourteen source-native tables: Maddison Project Database
2023 real GDP per capita and thirteen World Bank WDI indicators spanning GDP,
PPP, consumption, poverty, inequality, labor, inflation, trade, investment,
public consumption, and sector composition. All fourteen original indicator
artifacts plus World Bank country metadata are SHA-256 pinned. The publication
has 119,987 exact-date known source values; downloadable CSVs retain unknown
source rows. Country/economy labels are not joined to historical-polity map
geometry. See `ECONOMIC_EVIDENCE.md` for per-indicator coverage, terms,
original-record references, reproduction, and remaining gaps.

Clio Infra GDP remains blocked by exact workbook reuse terms and underlying
source citation review. WID distributional series remain unpinned pending an
exact release, dataset-level redistribution terms, and concept/percentile/
quality metadata. No source covers economics for every human population back
to 10,000 BCE; Maddison's earliest known GDP-per-capita values are in 1 CE.

Sections below describe the earlier r7 baseline and its prior acquisition
state; this r9 section supersedes its Maddison-access conclusion.

## MVP release

Release r7 publishes five separately defined measures:

- World Bank population totals, 1960–2025;
- UN World Population Prospects 2024 population outlook, 1950–2100;
- World Bank electricity access, 1990–2024; and
- World Bank life expectancy at birth, 1960–2024; and
- World Bank GDP per capita in constant 2015 US dollars, 1960–2025.

It also publishes U.S. Census global historical-population ranges at 39 source
dates from 10,000 BCE through 1950 CE, 36 Cliopatria political-context
snapshots from 3400 BCE through 2024 CE, and 621 exact-date Modelski Ancient
city observations from 3700 BCE through 1000 CE.

The UI has one requested-date timeline. Each statistical, border, and city layer
resolves that date independently and reports its effective source date or
unavailability. The map changes historical polygons and names without using
them as statistical supports. Dense names are available on hover and click. A
Sources page groups the acquisition/publication ledger by data vertical. A
read-only Review page exposes versioned decisions for all 28 border-overlap and
353 city-identity candidates without merging or mutating source observations.
The map applies the allowed display effects and names the relevant counterpart
polities in the click inspector.

Shared Atlas links pin the immutable release, metric, requested year, selected
support, context layers, published scale, and camera. An exact-view JSON bundle
contains the date-specific rows and population weights, displayed calculation,
historical evidence references, decisions, manifest, transformations,
citations, and licenses. Browser back restores meaningful metric/layer changes;
an unavailable release ID fails closed.

## Scientific separation

- World Bank and WPP remain separate metrics because they have distinct
  territorial universes, releases, and temporal meanings.
- WPP rows through 2023 are estimates. Rows from 2024 through 2100 are explicitly
  labeled `medium_projection`; they are neither observations nor confidence
  intervals.
- WPP excludes aggregate regions and 2101 boundary rows. Counts are converted
  exactly from the source's thousands unit, and each annual selected-entity sum
  is compared with the separate World row. The signed rounding residual is
  retained.
- Census deep-time totals have world support only and are never assigned to
  historical polities or treated as a spatial surface.
- Cliopatria polygons and Modelski points are historical context. Neither affects
  metric aggregation or population conservation.
- Missing, unplaced, unsupported, estimated, and projected states stay distinct.
- GDP per capita is territorial economic context. Atlas reports source-support
  coverage but does not construct a global mean or interpret it as individual
  income, household wealth, or a PPP welfare ranking.

## Source audit decisions

- The three World Bank indicator responses and country metadata are pinned with
  URLs, retrieval dates, byte counts, and hashes. Modern published metrics use
  the nonaggregate World Bank metadata universe appropriate to each year.
- The official UN WPP 2024 Medium demographic-indicators CSV is pinned and now
  published as `population_outlook` in its source-native 237-country/area
  universe. The source describes total population on 1 July in thousands and
  makes WPP 2024 available under CC BY 3.0 IGO.
- Natural Earth v5.1.2 remains display geometry only. Its 1:110m layer cannot
  place every small territory.
- Cliopatria v0.2.0 remains a context source. Six year-zero endpoints are
  quarantined. Of 28 bounded Mediterranean overlap candidates, eight are
  source-declared hierarchy relations and twenty remain explicitly unresolved.
  The decision layer only changes styling and disclosure.
- Modelski Ancient remains the only published city series. Across it, Chandler
  v2, and Modelski Modern v2, 336 candidate pairs are linked as the same place,
  15 distant homonyms are rejected, and two coordinate-only identities remain
  unresolved. The two Chandler numeric-zero cells also remain unresolved.
- CShapes 2.0 is acquired and profiled: 710 dated GeoJSON features spanning
  1886–2019, including 11 invalid geometries. It is not published because its
  CC BY-NC-SA terms need a product-use decision, the download omits codebook
  fields required for defensible dependency/border rendering, and geometry
  repair and comparison policy are unresolved.
- A HYDE 3.5 10,000 BCE sample archive, README, and license are acquired. The
  archive exposes count, density, rural, urban, and urban-other grids, but it is
  not published: the license file and README disagree (CC BY-NC 4.0 versus CC
  BY 3.0), latest-year descriptions conflict, and full masks/scenarios plus
  conservation checks are still needed.
- Maddison Project Database 2023 was unavailable in the earlier pass; it was
  subsequently acquired from the official Dataverse endpoint and published
  source-natively in r9. Its original-source references are retained but do
  not establish per-observation paper provenance.
- The bounded vertical acquisition pass pins 19 additional candidate artifacts:
  World Bank economics, eight Clio Infra workbooks, V-Dem v16 data/codebook/
  release metadata, Seshat Equinox v1 data/metadata, and both UCDP 26.1
  products and codebooks. Three provider-level blockers remain recorded for
  HYDE, Maddison, and WHG.
- Candidate profiling keeps the remaining verticals out of the release. UCDP
  GED has 417,968 events and 5,075 non-monotonic low/best/high rows; Seshat uses
  source-native sentinels and polity/NGA/time supports; Clio uses 2012 country
  supports; and V-Dem's large RData object still needs an entity audit.

## Implemented architecture

- Narrow Python adapters parse source-native artifacts and emit validated,
  immutable observations.
- A declarative catalog owns metric, taxonomy, population-universe, and
  aggregation contracts; it does not stand in for provenance.
- The release builder owns transformations, summaries, conservation checks,
  lineage, and output hashes.
- Statistical geography, historical political geography, and display geometry
  use independent contracts and loaders.
- WPP demonstrates source addition without concatenating releases: it has its
  own source release, universe, transformation, summaries, CSV, and presentation
  metadata.
- World Bank economics demonstrates a second narrow adapter on the same modern
  entity universe without reusing population semantics or aggregation. The
  vertical integration decision set separately records all candidate merge and
  geography policies.
- The reconciliation policy and generated decision set are separate, versioned,
  checksummed artifacts. Every candidate has an explicit disposition; rules
  cannot drift from their declared results. Accepted place identity never
  combines population observations, and border decisions prohibit population
  allocation.
- Map dependencies remain in a lazy chunk, and nearby boundary snapshots are
  prefetched after the active snapshot resolves.
- View-row joining is independent of map geometry. The exact-view builder and
  validator form a narrow typed contract and load the decision artifact only
  when requested.

## Verified state

The r7 release builder and unit/contract suites are passing. The browser
gate adds downloadable-bundle inspection, history restoration, reduced-motion,
axe, and desktop/mobile screenshot checks.

## Immediate next work

1. Parse V-Dem v16 reproducibly and audit the country-year support for the
   descriptive de-jure suffrage candidate.
2. Build the UCDP Gleditsch-Ward crosswalk and decide how to handle the 5,075
   non-monotonic fatality-bound rows before publishing a conflict measure.
3. Resolve Clio artifact terms and review Maddison's original-paper mapping
   before historical graphical reuse; keep their series source-native.
4. Resolve HYDE licensing and validate one matched baseline/lower/upper gridded
   population slice with masks and mass conservation.
5. Extend bounded border candidate scans without auto-resolving unsupported
   claims, then evaluate licensed temporal-name datasets from WHG.

The full sequence and acceptance gates are in
`DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md` and `EVIDENCE_INTEGRATION.md`.
The ranked comparison with the original vision is in
`ORIGINAL_VISION_GAP_PRIORITIES.md`.
The acquisition, profiling, and merge policy for the new verticals is in
`VERTICAL_SOURCE_INTEGRATION.md`.

## Renderer spike note

MapLibre GL JS 6.10.0 with deck.gl 9.4.0 runs in overlaid mode. Interleaved mode
failed because deck.gl relied on a MapLibre internal viewport field absent in
this version. Globe rendering and interleaved depth ordering remain out of scope
until a compatible, tested renderer combination is available.
