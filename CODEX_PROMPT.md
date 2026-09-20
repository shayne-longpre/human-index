# Build Atlas of Humanity: first genuine-data release

You are the implementing engineer for **Atlas of Humanity**, an open-source, visually exceptional web atlas of human conditions through time. Treat this as both a public visualization and research software.

This handoff was researched on **September 19, 2026**. It contains verified source-documentation findings, proposed designs, and known blockers—not downloaded datasets or proof that integrations already work. Recheck the exact artifacts and package versions you use. Read the repository first and preserve existing work.

## Product mission

Let someone explore two linked questions:

**Where did people live at this point in history? What can we say about the conditions surrounding those people?**

The central experience is an immersive world map, a prominent time control, a metric selector, and one linked population summary. Population gives the map relief; a selected condition gives it color. A place inspector makes source and uncertainty discoverable. Users can download the underlying view data.

Do not build a conventional KPI dashboard or a leaderboard of civilizations. Do not generate a universal human-progress score, political-system rankings, or LLM-assigned grades. Different measures retain their definitions, units, statistical populations, and limits.

## Read these files

1. `AGENTS.md`: non-negotiable scientific and engineering rules.
2. `docs/RESEARCH_AND_DECISIONS.md`: reasons the original proposal needs refinement.
3. `docs/SOURCES.md` and `data/registry/sources.json`: release candidates, links, licenses, verification status, and blockers.
4. `docs/DATA_MODEL.md`: semantic contracts and population accounting.
5. `docs/DESIGN.md`: visual and interaction requirements.
6. `docs/IMPLEMENTATION_PLAN.md` and `docs/ACCEPTANCE_TESTS.md`: delivery stages and release gates.

Use these as a coherent specification, not a request to build every future feature now. Resolve conflicts in favor of truthful measurement and a small working experience. Document substantive departures.

## First scope

Build two related capabilities:

**A. Population through history.** Show genuine population snapshots across the selected source's verified available years, with a date control and optional historical polity outlines. The desired long-run range reaches approximately 10,000 BCE, but publish only actually acquired, authorized evidence. Display a population-through-time summary in population-only mode.

**B. One modern human-condition layer.** Begin with access to electricity and a with/without/unknown population bar. A country-level choropleth is acceptable initially; enable recolored population relief only when its population universe matches the chart through a validated spatial calibration.

Both capabilities need a usable inspector, clear dates, explicit unknown states, source attribution, a table fallback, and reproducible download of the selected view. A blocked source should disable only its dependent feature. Continue with verified independent data rather than fabricating a demonstration.

## Source-specific instructions

### Cliopatria

Use the pinned candidate release and source links in dossier S1. Parse actual fields rather than assuming the schema from memory. Preserve its signed source years, then explicitly adapt them to the application's tested internal year convention. Source ranges are inclusive; internal ranges are half-open.

Do not treat every feature as an exclusive country. The `RELATION` type represents composite relationships and must not add extra people to demographic totals. Audit `POLITY` overlaps as well. Use names as labels, not durable primary keys. Store original identifiers and reviewed temporal crosswalks.

Historical boundaries are a context overlay. Do not use them to redefine the support of a World Bank or fixed-territory historical statistic. Never extend outlines beyond verified source coverage and call them current.

### HYDE

Start by auditing the lab-listed population release identified in dossier S2. The exact archive license, variables, population units, dates, masks, and scenario artifacts remain unresolved in this handoff. Obtain these through an authorized route and record the result. A protected archive is not permission to bypass access controls.

Distinguish counts from density and zero from nodata. Use physical cell areas. Resample counts conservatively, checking total population before and after every operation. Preserve source scenarios as scenarios, not invented confidence intervals. Do not imply that fine spatial pixels are directly observed ancient settlements.

Use actual snapshots. Do not synthesize a population surface from famous city names, an LLM's historical estimates, or hand-placed bumps. If this source is blocked, clearly record the blocker and proceed with the modern module; an explicitly verified alternate release is a documented choice, not a silent fallback.

### World Bank electricity and population

Use `EG.ELC.ACCS.ZS` and compatible `SP.POP.TOTL` weights; source pages and API patterns are in S3. Fetch all pages and country metadata. Preserve retrieval metadata, original values, nulls, definitions, and citations. Exclude regional and income aggregates, then separately reconcile territories and the intended population universe.

Determine supported dates from acquired observations. Do not assume every economy has data for every year. Compute with/without/unknown using matching population weights. Show the share covered and the denominator scope.

A national access rate is not local household data. A colored population cell must expose its national statistical support. No raw historical population surface may silently use a different total from the chart.

### Later sources

Maddison GDP per capita is a context distribution, not personal income. Its source-sheet citations need to survive graphical publication. Health series require their own life-table and denominator semantics. Seshat is a historical research sample with native missing/coding states, not a ready-made universal ancient rights database. V-Dem and other institutional sources require variable-specific interpretation; identify/link external evaluative indexes rather than making an Atlas political ranking. Conflict records do not directly identify everyone exposed to violence.

Do not implement these later layers until the initial vertical slice works.

## Scientific contracts to implement in code

Each metric declares whether it represents `population_total`, `person_prevalence`, `context_distribution`, `context_fact`, or `event_summary`. It also declares unit, denominator, geography, temporal policy, comparable-series identity, fixed color/bin definitions, and a safe summary sentence.

Each observation records source release, original record locator, statistical support, date/reference interval, value/status, source method, Atlas transformation, uncertainty type, subgroup scope when relevant, and citations. Keep source data immutable and derived outputs traceable.

Every population calculation uses a declared nonoverlapping universe. Assigned, unassigned, and ambiguous mass must account for the original population. Regional aggregates, alliances, overlapping polities, and parent/member records cannot be added twice. Unlocated population and unknown condition are different problems.

For prevalence, `with + without + unknown = population in the declared universe`. For national means, use a population-weighted distribution of territorial context, with language that explicitly avoids an individual-outcome interpretation. Do not infer global shares from sparse sampled historical facts.

Internal astronomical year zero is 1 BCE; the public UI shows BCE/CE without a historical year zero. Confirm each source convention before conversion. Point estimates, valid intervals, uncertain dates, and events are distinct. Never silently carry, interpolate, or extrapolate observations.

## Design requirements

The map dominates the composition. Use a quiet basemap, a strong year display, a compact metric selector, one linked population panel, and an on-demand inspector. Provide readable typography, restrained color, and intentional loading/missing states. No wall of KPI cards, random decorative charts, or exaggerated glow effects.

Height encodes population **density**, calculated from counts and actual cell areas; the chart uses counts. Height transforms and color domains are fixed across dates and explicitly labeled. A logarithmic view is allowed for legibility, but do not imply its volume equals population.

Unknown must remain visually distinct from low values. Keep uncertainty distinct from population magnitude. A national estimate painted on a detailed surface retains a “national estimate” label. Deep history should not display modern street labels or imply exact local knowledge.

The date control includes snapshot ticks, direct BCE/CE entry, a zoomable time window, and clear requested/effective dates. Unsupported metric-years get an explicit unavailable state. Do not silently switch centuries or sources. Playback uses supported observations and respects reduced motion.

The inspector shows value, unit, denominator, statistical support, historical context separately, source release/citation, population method, date, uncertainty, and transformations. Linked chart interaction highlights the corresponding map support without inventing local observations.

Provide keyboard access, tap equivalents for hover, a data table, and a no-WebGL fallback. Share URLs pin published manifests rather than mutable live data.

## Technical direction

Prefer a static-first React/TypeScript/Vite app and Python offline ETL. Use MapLibre + deck.gl after a version-pinned renderer spike. Build simple SVG-based summaries. Use Parquet and appropriate Python spatial tools offline; do not add a database server or browser query engine without a measured need.

Start with a polished two-dimensional/tilted map. The globe is a desired enhancement, not a prerequisite. Current deck.gl documentation lists important GlobeView layer limitations; test the actual desired relief, picking, and boundary layers rather than assuming compatibility.

Separate canonical analysis data from simplified display data. Native grid aggregation is fine; H3 is optional and is not equal-area. Keep large archives out of Git and the client bundle. Use small, licensed genuine-data development fixtures, compact per-date display artifacts, bounded caches, cancellation during scrubbing, and workers where needed. Adopt PMTiles/vector tiles only when they solve an observed delivery problem.

Create a source registry and, after actual acquisition, a source lockfile with real hashes and saved terms. The supplied registry is explicitly not an ingestion lockfile. Export provenance and source-specific license information; do not apply one blanket license to heterogeneous datasets.

## First execution sequence

1. Inspect the repository and this brief. Write a short implementation plan and record any genuine unresolved authorization issue. Do not stop after producing another general proposal.
2. Attempt authorized acquisition of the first small source samples. Profile actual schema, years, units, identifiers, nulls, licenses, and geography. Save a factual audit report with successes and failures.
3. Implement and run the renderer spike. Choose tested package versions and baseline rendering. Record actual screenshots/measurements.
4. Implement the metric/observation contracts and pure population aggregation helpers. Add date and arithmetic tests before building the full UI around them.
5. Build the initial population module from genuine available snapshots and the electricity module from genuine acquired observations. When one is blocked, keep working on independent functionality and render an honest unavailable state for the blocked portion.
6. Finish one complete path from selecting a date/metric to map, chart, inspector, table, and downloadable data.
7. Run scientific, browser, accessibility, and build checks. Inspect desktop/mobile screenshots. Fix semantic errors before visual polish.
8. Summarize what actually works, sources/versions actually ingested, tests actually run, measured performance, known limitations, and the smallest next implementation task.

## Definition of done for the first coherent release

The app is attractive and usable with real data; date selection works; the map and summary agree on declared population scope; missing evidence is explicit; a selected value can be traced to a real source; downloaded data reproduce the chart; and a clean fixture-based build does not require bulk downloads or account credentials.

It is not done if the interface only contains plausible dummy values, if polygons double-count people, if a national average is mislabeled as personal experience, if an unsupported year is silently filled, if data licenses are guessed, or if the implementation report claims unrun tests passed.

Proceed with the build in small tested increments. Preserve the project's visual ambition while keeping the meaning of every displayed quantity honest.
