# Acceptance and adversarial tests

All numerical tolerances must be explicit and justified. Tests below are design requirements; this brief does not claim they have passed on real datasets.

## A. Provenance and access

A displayed observation resolves to a real source record, release, citation, method, and applicable date. A derived value resolves to its inputs and transformation. Unknown acquisition/license fields block production publication of that artifact.

The application cannot publish a fixture marked `synthetic` or `test_only`. A public source URL alone is not sufficient provenance. Authentication or consent failures remain blockers, not reasons to scrape restricted data or invent a replacement.

A downloaded view includes the numerical rows used by the chart, original statuses, weights, metadata, citations, licenses, and pinned view manifest. Recomputing from this export produces the displayed values within declared numerical tolerance.

## B. Date behavior

Test 2 BCE, 1 BCE, 1 CE, and a multi-year interval crossing the boundary. Public formatting never displays 0 CE. Source-inclusive intervals map to the documented internal half-open representation. Unexpected source year zero is quarantined until understood.

Point observations are not automatically valid until the next observation. Missing centuries do not become long holds. Unsupported years do not show fabricated values. A requested year beyond a boundary source's end displays unavailable context instead of its last geometry as current.

Source-reported uncertain dating remains distinct from duration. Playback and export use the same effective dates.

## C. Geometry and population

Test antimeridian-crossing polygons, multipolygons, holes, small islands, coastal cells, invalid geometry, and areas near projection limits. Repairs must be logged and compared to originals. A geography that cannot be processed stays unresolved rather than disappearing from totals.

Include a synthetic alliance overlapping two member polities. Exclusive population totals must not count the alliance in addition to members. Also test two `POLITY` records that overlap, because excluding relationships alone is insufficient.

For any source grid, prove total counts before and after conservative coarsening agree within a declared tolerance. Density uses physical cell area. Nodata is not zero. Unit conversion from thousands of people is tested explicitly. A negative population fails validation.

If a modern surface is calibrated, each country's allocated population equals the selected country total within tolerance; total placed plus unplaced equals the declared universe. A zero spatial denominator never triggers division-by-zero, arbitrary placement, or dropped population.

The population summary must not change when the camera, map zoom, resolution, or display simplification changes. Rendering can use approximations; analysis cannot silently inherit them.

## D. Denominators and statistical interpretation

Use a small synthetic prevalence case: populations 100, 200, and 300 with rates 0.5, 0.25, and missing. The resulting counts are 100 with access, 200 without, and 300 unknown, out of 600. Known-data coverage is 50%; access among known is one third; access as a share of the full universe is one sixth. These are distinct quantities.

Missing population weights trigger denominator-coverage warnings rather than being treated as zero. Regional aggregate rows are excluded from sums of member economies. Parent/territory overlap is explicitly tested against the chosen universe.

Rates outside [0,100] fail before conversion to fractions. A value of zero is not missing. A missing token is not a category. Rounding occurs at display time only.

A national GDP mean must invoke a `context_distribution` and an appropriate label; calling it a personal-income distribution fails a semantic snapshot test. Life expectancy must not be labeled as observed lifespan or a computed global life table. An adult-only measure cannot silently use total resident population.

An institutional “present” record does not imply every resident has access. Sparse research samples cannot enable global-share mode by default. Event counts cannot use a prevalence renderer without a separately reviewed exposure definition.

## E. Comparison and uncertainty

Changing the year preserves metric definition, bins, palette domain, and population height transform. A scale change is explicit and stored in the URL/export. A comparison cannot combine incompatible PPP bases or a previous statistical release's values without a reviewed transformation.

Preserve source uncertainty types. A scenario interval cannot be labeled a 95% confidence interval. No source-supplied uncertainty must display “not quantified,” not zero error. Multiple models agreeing is not proof of historical truth.

Unknown categories remain visible in the full denominator bar. “100% of observed population” cannot appear as “100% of humanity.” Unassigned map population and unknown metric values are separate flags; neither can be counted twice in an exclusive bar.

## F. Interaction and visual review

Test timeline keyboard entry, map/relief switching, metric changes outside coverage, legend focusing, linked brushing, inspector opening/closing, reset view, browser back/forward, and pinned share links.

Screenshots at desktop and mobile widths show no overlapping labels, clipped legend, invisible unknown segment, unreadable date, or inspector covering essential controls. Use genuine data in public-view screenshots. Any synthetic stress-test capture is labeled as such.

Reduced motion disables autoplay and unnecessary transitions. Touch users can inspect data without hover. Screen-reader/table access exposes the selected metric, dates, denominator, missingness, and sources. Unsupported WebGL yields a usable fallback.

## G. Reproducibility and performance

A clean fixture build passes without a source account or bulk download. Full ingestion is explicit and records all inputs. A repeated build from the same lockfile/input hashes produces identical data outputs or explains nondeterministic metadata separately.

Run bundle, network, cached scrubbing, frame-rate, and memory tests on a declared environment. Report measurements alongside targets. Failed performance tests should trigger lower display detail or delivery changes, never unreported data loss.

A production manifest cannot contain fake SHA256 values, mutable `latest` dependencies disguised as immutable releases, missing licenses, or a research-only source marked ready.

## Release decision

Release only the modules that pass their relevant tests. A blocked ancient population source does not prevent publishing a truthful modern module, but the landing page must not claim completed deep-time coverage. A polished globe never compensates for failed denominator or provenance checks.

## Implemented fixture gates — 2026-09-23

The current automated browser suite covers pinned view state, JSON bundle
download and parsing, history restoration, representative desktop/mobile visual
baselines, reduced motion, and serious/critical axe findings on Atlas, Sources,
and Review. The contract suite recomputes the downloaded-view electricity result
from exported rows and weights. These implemented checks do not yet cover the
WebGL failure path, a second browser engine, full touch/keyboard interaction, or
performance budgets; those requirements remain open rather than implicitly
passing.
