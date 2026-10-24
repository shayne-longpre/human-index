# Atlas of Humanity
## Where people lived. What their lives were like. What the evidence can tell us.

Explore humanity through time: where people lived, the material conditions surrounding them, the technologies available, the institutions they encountered, and the evidence that survives.

Population gives the map its physical form. One time control sets a requested
date, while each evidence layer resolves that date under its own explicit
policy. Boundaries, measures, and city points can therefore change at different
cadences. Selecting a measure changes the map's color and a linked population
summary. Sources, uncertainty, and missing evidence remain visible.

This is not a leaderboard of civilizations, a single “progress” score, or a claim that all human experiences can be measured across every era. The purpose is to make documented human conditions explorable without making the past look more certain than it is.

## Status of this package

**A working first genuine-data development release now exists.**

The application presents source-distinct population and condition measures,
plus independent historical context layers, on one timeline:

- U.S. Census Bureau world-population estimate ranges at 39 published dates from
  10,000 BCE through 1950 CE;
- annual World Bank population totals for 217 nonaggregate country/territory
  series from 1960–2025; and
- a separate UN WPP 2024 population outlook for 237 Country/Area series,
  preserving 1950–2023 modeled estimates and 2024–2100 Medium projections as
  different evidence states; and
- annual electricity access for every observed source year from 1990–2024,
  summarized with matching annual population weights; and
- World Bank life expectancy from 1960–2024, shown as a territorial mean and a
  population-weighted context distribution—not an individual lifespan distribution; and
- World Bank GDP per capita in constant 2015 US dollars from 1960–2025, shown as
  territorial economic context without inventing a global average.

A pinned Natural Earth 1:110m layer places 170 modern statistical supports on
the map. A separately pinned Cliopatria v0.2.0 layer supplies 36 display-only
historical political snapshots from 3400 BCE through 2024 CE; the shared time
control changes its effective borders and hover/click names independently of
the selected measure. Historical polygons never receive or
contribute population totals. A pinned Modelski Ancient v2 layer adds 621 sparse,
exact-date city-population estimates for 154 cities from 3700 BCE–1000 CE as
points, never as a complete urban or world total. Deep-time population remains a global source range,
and unplaced modern population remains in summaries and the table. Time controls
use exact observations only. Source responses, published artifacts, hashes,
coverage, and limitations are recorded in the release manifest and
`data/registry/source-lock.json`.

The current r8 release also offers an independent GHSL GHS-POP population-grid
layer at ten exact modeled-estimate dates from 1975–2020, plus clearly marked
2025/2030 projections. The grid uses source-native raster counts conservatively
rebinned to one-degree display markers; its source total, published-bin total,
zero/NODATA distinction, and unassigned residual are visible and downloadable.
It is never assigned to historical borders or spliced into World Bank or UN
totals. Clio Infra and Seshat historical population candidates are acquired for
review but not mapped until their source terms, units, and geographic identity
links pass the documented gates.

The current r9 release adds an **Economics** page with fourteen source-native
tables: Maddison 2023 historical GDP per capita and thirteen additional World Bank
indicators covering GDP, PPP, consumption, poverty, inequality, labor, inflation,
trade, investment, public consumption, and sector composition. It shows
exact-year coverage and unknowns, original record locators, source references,
and full CSV downloads. It does not assign these values to historical borders
or splice the July and October 2026 World Bank updates. See
`docs/ECONOMIC_EVIDENCE.md` for the acquisition, units, provenance, and gaps.

The application also includes a dedicated **Sources** page covering both the
inputs published in the current release and the wider research registry. Atlas
state is shareable through `metric`, `year`, and `place` URL parameters. A
read-only **Review** page exposes the versioned reconciliation decisions for
every current border-overlap and city-identity candidate, including the rule,
evidence boundary, and unresolved cases. Identity links never merge source
observations, and border decisions never allocate population.

Atlas links now also pin the release, context-layer visibility, published scale,
and map camera. “Download this exact view” emits a JSON bundle containing the
date-specific rows and weights, displayed summary, evidence statuses, metric
definition, reconciliation decisions, manifest, transformations, citations,
and source-specific licenses. A mismatched pinned release fails closed rather
than silently showing newer values.

The early population view preserves the Census table's disagreement range and
underlying named estimates; it is not a confidence interval or a gridded
reconstruction. World Bank population remains the pragmatic modern source because
it shares the electricity series' statistical geography. UN World Population
Prospects 2024 is published as a separate source-native measure rather than
silently spliced into World Bank population. One HYDE 3.5 baseline population
bundle is now acquired and profiled, but the archive license conflicts with its
README and the grid remains unpublished pending clarification and full
mass/mask validation.

## Run the application

Requires Node.js 20+ and pnpm 11.

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:browser
pnpm build
```

The tracked, legally redistributable release fixture is sufficient for development, tests, and builds. No source account or bulk download is required. Raw source acquisition is separate and explicit:

```bash
pnpm data:acquire
pnpm data:acquire:verticals
pnpm data:review:verticals
pnpm data:build
```

The GHSL acquisition and derivation workflow is also explicit:

```bash
pnpm data:acquire:population-grids
pnpm data:derive:population-grids
pnpm data:publish:population-grids
```

Economic source acquisition and publication are similarly explicit (the
publisher refuses to overwrite the tracked r9 fixture):

```bash
pnpm data:acquire:economics
pnpm data:derive:economics
pnpm data:publish:economics
```

The publisher refuses to overwrite the tracked r8 fixture. To reproduce it,
invoke the module with an empty comparison output path; publishing a new release
ID requires an explicit version change. Ordinary development does not run these
large-source commands. See `docs/POPULATION_SURFACES.md` for the exact mapping
method and limits.

See `docs/BUILD_REPORT.md` for verified implementation and test status,
`docs/MVP_SOURCE_SELECTION.md` for the source decision, and `CODEX_PROMPT.md`
plus `AGENTS.md` for the product and scientific contracts.
The proposed deep-time population and historical-boundary sequence is in
`docs/DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md`. The deliberately small source,
taxonomy, transformation, and release architecture is documented in
`docs/EVIDENCE_INTEGRATION.md`.
The exact-view contract and automated browser/accessibility gate are documented
in `docs/VIEW_REPRODUCIBILITY.md`.
The candidate-source acquisition, profiling, and deterministic merge gates are
documented in `docs/VERTICAL_SOURCE_INTEGRATION.md`.
The ranked gap analysis against the original vision is in
`docs/ORIGINAL_VISION_GAP_PRIORITIES.md`.

## Research brief

Reading order:

1. `CODEX_PROMPT.md`: product mission, scope, first tasks, and completion requirements.
2. `docs/RESEARCH_AND_DECISIONS.md` and `docs/SOURCES.md`: corrections to the original proposal and verified source details.
3. `docs/DATA_MODEL.md`, `docs/DESIGN.md`, and `docs/IMPLEMENTATION_PLAN.md`: contracts, experience, and build sequence.
4. `docs/ACCEPTANCE_TESTS.md` and `docs/AI_EVIDENCE_PIPELINE.md`: release gates and the later evidence-extraction workflow.
5. `docs/EVIDENCE_INTEGRATION.md`: how sources and taxonomy are connected without silently merging unlike evidence.

`data/registry/sources.json` remains a research-stage registry. The acquired artifacts used by the app are pinned in `data/registry/source-lock.json`. `tests/semantic_contract_cases.json` contains explicitly synthetic arithmetic/date test cases, not production observations.

## First release

The first coherent release has complementary experiences in one interface:

- **Long-run population:** verified historical population snapshots, with an optional historical political-boundary overlay where available.
- **Modern living conditions:** electricity access and life expectancy, each with
  its distinct aggregation meaning and matching population accounting.
- **Historical context:** discrete changing polity geometry/names and sparse
  exact-date ancient-city estimates, kept independent of global population.

Sparse historical technology/institution observations become labeled case studies later. They are not silently expanded into estimates for all humanity.

## Visual promise

The main view should feel like an explorable atlas, not a business dashboard. Use an expansive map, restrained controls, a strong date display, and one linked population chart. A tilted map with population relief is the baseline; a globe is an enhancement after a compatibility test, not a dependency that can stall the project.

## Research promise

Every displayed number should be traceable to a particular source release, original observation or derived calculation, date, statistical geography, denominator, and transformation. Unknown is not zero. An institution's existence is not universal access to it. National averages are not personal outcomes.

## Licensing

No blanket data license is asserted. Each upstream source keeps its own license and attribution requirements. Code licensing and dataset licensing are separate decisions. An unverified data license blocks redistribution of that source, not independent work on the rest of the application.
