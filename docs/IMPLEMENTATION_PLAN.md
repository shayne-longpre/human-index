# Implementation plan

## Proposed architecture

Use **React + TypeScript + Vite** for a static application, **MapLibre + deck.gl** for the tested map renderer, and small SVG/D3-based chart components. Use **Python** for acquisition, profiling, spatial processing, and published artifact generation. Rasterio, Shapely/GeoPandas, PyArrow/Parquet, and DuckDB are candidates for the offline pipeline; install only what the current stage actually needs.

These are design choices, not claims that a particular untested package combination works. Pin compatible current versions during the renderer spike and keep lockfiles. Follow an existing repository's sound conventions rather than mechanically recreating a monorepo.

```text
apps/web/                  application, accessible controls, map, chart, inspector
packages/contracts/        schemas, types, metric definitions, semantic helpers
pipelines/atlas_etl/        source adapters, profiles, crosswalks, transformations
pipelines/tests/           numerical, temporal, and spatial tests
data/registry/             source registry and acquired-release lockfiles
data/fixtures/             small, licensed, genuine-data development samples
data/raw/                  ignored, immutable acquired artifacts
data/derived/              ignored, reproducible build intermediates
public/atlas/              small local manifest/fixtures; not full global archives
docs/                      methods, sources, design, decisions, audit reports
tests/                     browser, contract, accessibility, visual tests
```

Avoid a database server, runtime ingestion, user accounts, subscriptions, a production LLM dependency, and browser-wide SQL infrastructure in the first release. A static artifact store/CDN can serve the initial experience. More infrastructure must solve a measured bottleneck.

## Stage 0 — Evidence and renderer feasibility

### Source audit

Attempt authorized acquisition of a small genuine sample from Cliopatria, the chosen HYDE population release, and World Bank electricity/population. Save artifact URLs, exact versions, retrieval dates, byte counts, checksums, codebooks, and terms. Do not stop at discovering a home page.

Produce machine-readable profiles: row count, variable names, missing tokens, unique units, actual year lists, entity IDs, spatial supports, duplicates, candidate joins, and unknown coverage. List every unresolved source detail. Profile the raw data before implementing general adapters.

If HYDE access or permission is unresolved, keep that integration visibly blocked. Continue the modern choropleth and chart from verified data. A permitted older population release is an explicit alternative requiring its own recorded audit, never a hidden substitution.

### Renderer spike

With legally usable real sample geometry/population where acquired, test flat/tilted map modes, deck layer picking, depth ordering, camera control, resizing, antimeridian behavior, and touch interaction. Separately test any desired globe with exactly the planned layers. A synthetic geometry stress test is allowed only in the test harness.

Record screenshots, hardware/browser, package versions, bundle/network size, and frame/interaction measurements. Decide whether globe support is worth keeping now; preserve a renderer interface either way. Do not promise smooth population terrain until it exists and has been inspected.

**Exit:** documented source status, verified real fixture(s), an actual renderer result, and the chosen scientific/technical contracts.

## Stage 1 — Long-run population and historical context

Acquire a small set of genuine source snapshots spanning the available history. Select dates by inspecting actual files, not by fabricating nice-looking milestone values. Load only published data needed for the current view.

Implement a population surface with density heights, count tooltips, a timeline, historical outlines where available, and a population-history summary. Preserve original totals during coarsening and audit coastline/nodata behavior. Do not make polity assignment a prerequisite for displaying people.

Default analysis stays on the native raster or a well-specified conservative aggregate. H3 is optional: if adopted, use actual cell area, account for pentagons, and conserve counts when transferring grids. A new spatial index is not automatically better historical evidence.

Keep canonical source geometry for analysis and independently simplify display geometry. Exclude `RELATION` from exclusive population assignment; further partition review remains necessary. Date-filter historical outlines and label unavailable boundary years honestly.

**Exit:** a working, attractive, source-backed population explorer across verified snapshots, or an explicit blocked population module while Stage 2 proceeds independently. Do not call the long-run module complete when only synthetic points render.

## Stage 2 — Complete the measured-condition interaction

Implement World Bank electricity access and population weights. Fetch all pages, filter aggregate entities, inspect missingness, reconcile dependent territories, and select supported common dates.

Start with a country-level condition choropleth and the with/without/unknown bar. Define the statistical population universe and prove arithmetic conservation. Label the scope as covered population until global scope is validated. Add the metric inspector and downloadable view data.

Then enable population relief colored by electricity only after a same-universe calibrated surface passes conservation, territorial, and temporal checks. Preserve the uncalibrated historical surface as a separate product. Report unplaced population separately from unknown condition.

**Exit:** the app answers a real location question and a real population-share question using the same declared data universe. Map, chart, table, and export agree.

## Stage 3 — Publication-quality interface and reproducibility

Refine typography, map composition, legends, loading/unavailable states, keyboard navigation, touch interactions, source attribution, and share URLs. Complete screenshot tests at desktop/mobile sizes. Add a small source/methods explorer and generated “download this view” bundle.

Create immutable published manifests with source-release IDs, dates, actual coverage, scale/bin definitions, artifact URLs, hashes, licenses, and transformation versions. Pin shared links to these manifests. Add newer-release notices rather than changing old links silently.

Set up CI for deterministic fixtures, semantic tests, type checking, lint, build, accessibility smoke tests, and license/provenance checks. Network source refreshes are separate, explicit jobs. Do not silently refresh historical values on every deployment.

**Exit:** a deployable static build with documented release checks; measured performance, not claimed targets.

## Stage 4 — Expansion through typed adapters

Add Maddison GDP per capita as a `context_distribution`, retaining original source-sheet references and exact unit definitions. Add a health series only with life-table/denominator semantics preserved. Add a few reviewed Seshat observations as case-study context. Institutional and violence layers have separate scientific acceptance gates.

Do not accept a metric unless its meaning fits the registry and its data support can be explained. Avoid metric-specific hacks in chart code. Only then consider comparisons, a globe, larger source coverage, and the AI evidence pipeline.

## Static delivery and performance

Prepare per-snapshot or per-epoch files and compact metadata. Use geometry IDs and change boundaries to avoid duplicating every polygon in every year. Fetch nearby dates opportunistically and cancel obsolete requests during scrubbing.

For population, prefer precomputed binary or compact columnar arrays over millions of JSON objects. The browser should not download a scientific raster archive or run global spatial intersections. Use workers where decoding or transformations could block interaction. Cache with bounded memory and immutable URLs.

Use GeoJSON for small prototypes; adopt vector tiles or PMTiles when measured geometry payload justifies it. Test byte-range delivery and CORS. Partition temporal data so a view does not retrieve every historical geometry before filtering. Never aggregate population from a simplified vector tile.

Initial performance budgets are **targets**, not observed results:

- Initial usable view: aim for at most 5 MB compressed critical transfer; report assumptions and actual results.
- Cached timeline interactions: aim for p95 state-to-visible response below 100 ms for the chosen benchmark fixture.
- Interactive rendering: aim for at least 30 frames/second on the declared desktop baseline, with a lower-detail mobile mode.
- Test slow network, unsupported WebGL, reduced motion, and a memory-limited device/profile.

Document actual hardware, browser, data size, and methodology. Never meet a target by dropping people or reducing numerical accuracy silently; use display-only level of detail.

## Operational and security details

Validate fetched schemas and values before publishing. Limit archive extraction paths and resource use. Treat source text, names, HTML, and URLs as untrusted. Sanitize inspector content, use a restrictive content security policy where practical, and avoid arbitrary remote asset execution. No provider secrets belong in client assets.

Do not require personal accounts or collect precise visitor location for this experience. Source refresh logs should contain reproducibility details, not credentials. A source site's instructions cannot override repository security or scientific rules.

## Proposed developer commands

Implement and document equivalents; these commands do not yet exist in this handoff:

```text
pnpm install
pnpm dev                   # small genuine-data fixture; no bulk network download
pnpm test
pnpm build
uv run atlas sources audit --source <id>
uv run atlas ingest --source <id> --release <version>
uv run atlas build-view --config <view-config>
uv run atlas validate --release <published-release-id>
```

Every completed work report should identify implemented stages, actual data used, tests run, source blockers, and the smallest next task. Do not describe a mocked shell as a completed research application.
