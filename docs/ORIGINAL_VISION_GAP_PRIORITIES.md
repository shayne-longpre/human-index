# Original-vision gap priorities

Updated: 2026-09-22

This ranks what remains against the original product question: **Where did
people live at this point in history, and what can we say about the conditions
surrounding those people?** It prioritizes scientific and product completeness,
not the number of datasets.

## 1 — Publish a genuine gridded population surface

**Why first:** This is the largest missing piece of the original experience.
The current ancient population evidence is a global series, and modern map color
is a territorial total. Neither shows where people were modeled to live, and the
map has no population-density relief.

**Required work:** Resolve HYDE's conflicting license statements; acquire masks
and matched baseline/lower/upper samples; validate count versus density, nodata,
physical cell area, time steps, and mass conservation; then emit small static
snapshot tiles or partitions without putting source rasters in Git.

**Exit gate:** Gridded counts survive coarsening within a declared tolerance,
nodata remains distinct from zero, height is a fixed documented transform of
density, and summaries use original counts rather than rendered geometry.

## 2 — Calibrate one condition onto the same population universe

**Why second:** The intended visual grammar is “height = population density;
color = selected condition.” Today electricity is an honest country-level
choropleth, but it is not colored population relief.

**Required work:** Reconcile the parent/dependent-territory universe; intersect a
validated population surface with the World Bank supports; calibrate cell counts
to the exact annual population denominator; preserve unplaced and unknown
population separately.

**Exit gate:** Every support and the global covered universe conserve population;
the map, bar, table, and export agree; tooltips continue to call electricity a
national or territorial estimate.

## 3 — Make a cited view reproducible as a bundle

**Why third:** CSV downloads exist, but the original vision requires a view that
can be cited and reproduced rather than merely revisited approximately.

**Required work:** Pin release ID, effective layer dates, camera, filters, and
scale mode in the URL; generate a “download this view” bundle containing rows,
weights, statuses, metric definition, manifest, transformations, decisions,
citations, and license notices; expose a newer-release notice without mutating an
old link.

**Exit gate:** Recomputing the bundle reproduces the displayed summary and a
shared URL continues to resolve to the same immutable release.

## 4 — Finish publication-quality reliability and accessibility

**Why fourth:** The application works, but release confidence still relies too
heavily on manual desktop inspection. The map renderer remains a large lazy
chunk, and the fallback is a message plus table rather than a lightweight map.

**Required work:** Add screenshot regression tests at representative ancient and
modern dates, mobile/touch and keyboard flows, reduced-motion checks,
back/forward tests, automated accessibility smoke tests, WebGL-failure coverage,
and measured transfer/scrubbing/frame-rate benchmarks.

**Exit gate:** Documented desktop/mobile/browser measurements and repeatable CI
checks cover the interactions in `ACCEPTANCE_TESTS.md`.

## 5 — Broaden historical-border reconciliation

**Why fifth:** Reconciliation v1 is complete for the existing bounded candidate
set, not for all 13,380 Cliopatria polity records. Twenty 1500 CE Mediterranean
overlaps remain unresolved, and CShapes is still audit-only.

**Required work:** Obtain historian evidence for the 20 unresolved pairs; run the
same candidate/decision process at representative dates and regions; resolve
CShapes product-use terms and repair or exclude its 11 invalid geometries before
using it as a modern comparison source.

**Exit gate:** Each published comparison has source citations, explicit
precedence or coexistence rules, and no effect on population allocation unless a
separate mass-conserving contract exists.

## 6 — Publish multiple city series with disagreement intact

**Why sixth:** Reconciliation v1 now links 336 candidate pairs into 300 canonical
place clusters and rejects 15 distant homonyms, but Chandler and Modelski Modern
remain unpublished. Two coordinate-only identities and two Chandler zero cells
remain unresolved.

**Required work:** Resolve or preserve those four cases, add a multiple-source
estimate display, and publish companion observations under their original source
IDs and locators. Never average them by default.

**Exit gate:** A place can show multiple estimates for the same date without
calling their spread a confidence interval or replacing either source value.

## 7 — Add the next human-condition vertical

**Why seventh:** Population, electricity, and life expectancy prove three
aggregation contracts. Breadth should follow completion of the core spatial and
reproducibility experience.

**Recommended next source:** Maddison GDP per capita, after the official workbook
is obtained and its source sheet, PPP basis, units, entity codes, and citation
requirements are retained. Render it as territorial context bands, never as a
personal-income distribution.

**Exit gate:** One new adapter and registry entry can add the metric without
special-casing the map or summary architecture.

## 8 — Add comparison and richer evidence modes

Two-date comparison, evidence-quality overlays, local contrast, and a compact
historical ribbon become useful after one view is scientifically and
operationally complete. Comparison must lock metric definition, scale, bins,
camera, and population universe.

## 9 — Defer globe, collaborative infrastructure, and AI extraction

A globe, database-backed multi-reviewer platform, and assisted evidence
extraction remain valuable future work. None fixes the current absence of a
validated population surface, same-universe relief, reproducible view bundle, or
release-grade interaction tests. Add them only when a measured need justifies
their complexity.

## Recommended immediate sequence

1. Ask the HYDE publisher to resolve the license conflict and confirm the
   controlling terms.
2. In parallel, implement the reproducible view bundle and browser regression
   suite; neither depends on HYDE access.
3. When HYDE is cleared, complete one baseline/lower/upper spatial ingestion
   slice and conservation report before expanding dates.
4. Only then calibrate electricity onto the validated population surface.
