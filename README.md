# Atlas of Humanity
## Where people lived. What their lives were like. What the evidence can tell us.

Explore humanity through time: where people lived, the material conditions surrounding them, the technologies available, the institutions they encountered, and the evidence that survives.

Population gives the map its physical form. A time control moves between historical snapshots. Selecting a measure changes the map's color and a linked population summary. Sources, uncertainty, and missing evidence remain visible.

This is not a leaderboard of civilizations, a single “progress” score, or a claim that all human experiences can be measured across every era. The purpose is to make documented human conditions explorable without making the past look more certain than it is.

## Status of this package

**A working first genuine-data development release now exists.**

The application now presents two complete genuine-data dimensions across 217
nonaggregate World Bank country/territory series:

- annual population totals for 1960–2025; and
- annual electricity access for every observed source year from 1990–2024,
  summarized with matching annual population weights.

A pinned Natural Earth 1:110m layer places 170 statistical supports on the map;
unplaced population remains in summaries and the table. Time controls use exact
observations only. Source responses, published artifacts, hashes, coverage, and
limitations are recorded in the release manifest and
`data/registry/source-lock.json`.

The population series is the pragmatic modern MVP source because it is licensed
for redistribution and shares the electricity series' statistical geography. UN
World Population Prospects 2024 is documented as the more detailed direct
population expansion source. It is not silently merged into this release. HYDE
3.5 remains blocked for deep-time gridded population pending authorized archive
access and artifact-term verification.

## Run the application

Requires Node.js 20+ and pnpm 11.

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

The tracked, legally redistributable release fixture is sufficient for development, tests, and builds. No source account or bulk download is required. Raw source acquisition is separate and explicit:

```bash
pnpm data:acquire
pnpm data:build
```

See `docs/BUILD_REPORT.md` for verified implementation and test status,
`docs/MVP_SOURCE_SELECTION.md` for the source decision, and `CODEX_PROMPT.md`
plus `AGENTS.md` for the product and scientific contracts.

## Research brief

Reading order:

1. `CODEX_PROMPT.md`: product mission, scope, first tasks, and completion requirements.
2. `docs/RESEARCH_AND_DECISIONS.md` and `docs/SOURCES.md`: corrections to the original proposal and verified source details.
3. `docs/DATA_MODEL.md`, `docs/DESIGN.md`, and `docs/IMPLEMENTATION_PLAN.md`: contracts, experience, and build sequence.
4. `docs/ACCEPTANCE_TESTS.md` and `docs/AI_EVIDENCE_PIPELINE.md`: release gates and the later evidence-extraction workflow.

`data/registry/sources.json` remains a research-stage registry. The acquired artifacts used by the app are pinned in `data/registry/source-lock.json`. `tests/semantic_contract_cases.json` contains explicitly synthetic arithmetic/date test cases, not production observations.

## First release

The first coherent release has two complementary experiences in one interface:

- **Long-run population:** verified historical population snapshots, with an optional historical political-boundary overlay where available.
- **Modern living conditions:** begin with access to electricity and a real population-share chart. Add income and health only with their distinct statistical meanings preserved.

Sparse historical technology/institution observations become labeled case studies later. They are not silently expanded into estimates for all humanity.

## Visual promise

The main view should feel like an explorable atlas, not a business dashboard. Use an expansive map, restrained controls, a strong date display, and one linked population chart. A tilted map with population relief is the baseline; a globe is an enhancement after a compatibility test, not a dependency that can stall the project.

## Research promise

Every displayed number should be traceable to a particular source release, original observation or derived calculation, date, statistical geography, denominator, and transformation. Unknown is not zero. An institution's existence is not universal access to it. National averages are not personal outcomes.

## Licensing

No blanket data license is asserted. Each upstream source keeps its own license and attribution requirements. Code licensing and dataset licensing are separate decisions. An unverified data license blocks redistribution of that source, not independent work on the rest of the application.
