# Implementation status

Updated: 2026-09-20

## MVP release

The runnable MVP publishes World Bank population totals for every year from 1960
through 2025 and electricity access for every observed year from 1990 through
2024. Both use the same 217-entity nonaggregate metadata universe. The UI has a
metric switcher, exact-year timeline and playback, choropleth, metric-specific
population summary, place inspector, accessible table, and full-series CSVs.

The statistical universe is the set of World Bank API entities whose country
metadata does not mark the entity as an aggregate and that have a 2024 population
weight. It is called **covered population**, not world population or humanity,
until parent/territory reconciliation is complete. Annual entity sums are checked
against the separate World Bank `WLD` reference. The nonnegative residual and
population that cannot be placed in the coarse geometry remain explicit.

## Source audit decisions

- World Bank API responses for `EG.ELC.ACCS.ZS`, `SP.POP.TOTL`, and country
  metadata were acquired successfully on 2026-09-20. Each response reports one
  page for the requested page size and a source update date of 2026-07-13 for the
  indicator series.
- Population has exact annual data from 1960–2025. Electricity has actual source
  observations from 1990–2024; the API has no 2025 electricity values in this
  retrieval, and the UI displays that year as unsupported rather than carrying
  2024 forward.
- Natural Earth vector release v5.1.2 is the pinned display geometry. Its
  1:110m country layer is intentionally too coarse to show every small territory.
- Cliopatria v0.2.0 release metadata was acquired successfully from Zenodo. Its
  GeoJSON archive is approximately 44 MB in the pinned Git repository and the
  Zenodo source archive is approximately 297 MB; no small official feature sample
  was identified during this first pass. Full geometry acquisition is deferred to
  an explicit command and will not be part of the default fixture build.
- UN World Population Prospects 2024 is documented as a more detailed direct
  expansion source, but it is not merged pending artifact, scenario, and territory
  audits.
- The HYDE 3.5 archive landing page remains protected by its provider's anti-bot
  access gate. No archive, artifact license, variable schema, or sample was
  acquired. The historical population module therefore remains visibly blocked;
  no substitute or synthetic population surface will be presented as data.

Exact input URLs, hashes, byte counts, output hashes, exclusions, and crosswalks
are recorded by the fixture builder in `data/registry/source-lock.json` and the
published view manifest.

## Implemented architecture

- Narrow source adapters parse source-native artifacts; the World Bank adapter is
  the first implementation.
- The release builder owns statistical-universe validation, summaries, lineage,
  and artifact hashes.
- Display geometry is built separately and contributes no numerical totals.
- Shared TypeScript contracts define metrics, taxonomies, supported years, value
  states, and release shapes.
- The client joins entity, population, and selected metric observations by exact
  code and year. Metric presentation is a small configuration layer rather than
  duplicated application screens.

The next expansion should add a new source adapter and metric definition only
after its source release, universe, temporal policy, and aggregation meaning are
audited. No service or generalized plugin infrastructure is needed yet.

## Renderer spike note

MapLibre GL JS 6.10.0 with deck.gl 9.4.0 was tested in the in-app Chromium
browser. `MapboxOverlay` interleaved mode failed at runtime because deck.gl read
an internal MapLibre viewport field that is absent in this version. The release
therefore uses overlaid mode, which avoids that internal coupling while retaining
GeoJSON rendering, camera synchronization, picking, and selection highlighting.
Interleaved depth ordering and a globe remain out of scope until a compatible
combination passes the same browser test.
