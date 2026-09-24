# Implementation status

Updated: 2026-09-23

## MVP release

Release r6 publishes four separately defined measures:

- World Bank population totals, 1960–2025;
- UN World Population Prospects 2024 population outlook, 1950–2100;
- World Bank electricity access, 1990–2024; and
- World Bank life expectancy at birth, 1960–2024.

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
- Maddison Project Database 2023 remains unacquired. The official page verifies
  169-country coverage through 2022, CC BY 4.0, and source-sheet attribution;
  the official download currently returns DataverseNL's Anubis page. No bypass
  was attempted.

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

The final r6 verification counts are recorded in `BUILD_REPORT.md`. The browser
gate adds downloadable-bundle inspection, history restoration, reduced-motion,
axe, and desktop/mobile screenshot checks.

## Immediate next work

1. Resolve HYDE licensing and validate one matched baseline/lower/upper gridded
   population slice with masks and mass conservation.
2. Publish companion historical-city series with source disagreement intact.
3. Extend bounded border candidate scans across representative dates/regions
   without auto-resolving claims that lack evidence.
4. Add WebGL-failure coverage and measured performance benchmarks.
5. Calibrate one condition layer onto the validated population universe without
   losing unplaced or unknown population.

The full sequence and acceptance gates are in
`DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md` and `EVIDENCE_INTEGRATION.md`.
The ranked comparison with the original vision is in
`ORIGINAL_VISION_GAP_PRIORITIES.md`.

## Renderer spike note

MapLibre GL JS 6.10.0 with deck.gl 9.4.0 runs in overlaid mode. Interleaved mode
failed because deck.gl relied on a MapLibre internal viewport field absent in
this version. Globe rendering and interleaved depth ordering remain out of scope
until a compatible, tested renderer combination is available.
