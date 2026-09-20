# Implementation status

Updated: 2026-09-20

## MVP release

The runnable MVP publishes U.S. Census Bureau world-population estimate ranges at
39 dates from 10,000 BCE through 1950 CE, World Bank population totals for every
year from 1960 through 2025, and electricity access for every observed year from
1990 through 2024. Modern statistics use the same 217-entity nonaggregate
metadata universe. Deep-time population has world support only and is never
assigned to a historical polity.

The UI has a metric switcher, exact-source-date timeline and playback,
choropleth, metric-specific population summary, modern and historical inspectors,
accessible tables, and full-series CSVs. A toggleable Cliopatria v0.2.0 context
layer switches among 36 genuine source snapshots spanning 3400 BCE–2024 CE, so
political geometry and labels change as the date changes. `RELATION` features are
excluded. Metric, year, and selected modern place are retained in the URL. A
dedicated Sources page separates published release inputs
from candidate and blocked research sources.

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
- The U.S. Census Bureau historical world-population table was acquired and
  parsed at all 39 published dates. Its lower and upper summaries are preserved
  as disagreement among cited estimates, not statistical confidence bounds. A
  missing upper entry denotes a point estimate according to the table note.
- The pinned Cliopatria v0.2.0 archive contains 13,765 features: 13,380 `POLITY`
  and 385 `RELATION` records. The release publishes 36 lazily loaded, simplified
  `POLITY`-only snapshots; no geometry contributes to numerical accounting.
  Source year-zero endpoints are quarantined and no published snapshot samples
  them.
- UN World Population Prospects 2024 is documented as a more detailed direct
  expansion source, but it is not merged pending artifact, scenario, and territory
  audits.
- The HYDE 3.5 archive landing page remains protected by its provider's anti-bot
  access gate. No archive, artifact license, variable schema, or sample was
  acquired. Gridded historical population therefore remains visibly blocked; the
  Census global series is not presented as a substitute population surface.

Exact input URLs, hashes, byte counts, output hashes, exclusions, and crosswalks
are recorded by the fixture builder in `data/registry/source-lock.json` and the
published view manifest.

## Implemented architecture

- Narrow source adapters parse source-native artifacts; World Bank, U.S. Census,
  and Cliopatria each have their own adapter.
- The release builder owns statistical-universe validation, summaries, lineage,
  and artifact hashes.
- Display geometry is built separately and contributes no numerical totals.
- Shared TypeScript contracts define metrics, taxonomies, supported years, value
  states, and release shapes.
- The client joins entity, population, and selected metric observations by exact
  code and year. Metric presentation is a small configuration layer rather than
  duplicated application screens.

The next expansion should add a source only after its release, universe, temporal
policy, and aggregation meaning are audited. The immediate population gap is a
licensed gridded historical reconstruction; the immediate geography gap is
reviewing overlapping or nested Cliopatria features and adding source-specific
precision/dispute metadata. The full source and annotation sequence is specified
in `DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`.

## Renderer spike note

MapLibre GL JS 6.10.0 with deck.gl 9.4.0 was tested in the in-app Chromium
browser. `MapboxOverlay` interleaved mode failed at runtime because deck.gl read
an internal MapLibre viewport field that is absent in this version. The release
therefore uses overlaid mode, which avoids that internal coupling while retaining
GeoJSON rendering, camera synchronization, picking, and selection highlighting.
Interleaved depth ordering and a globe remain out of scope until a compatible
combination passes the same browser test.
