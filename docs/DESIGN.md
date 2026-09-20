# Experience and visual specification

## Experience to preserve

The application should feel like a beautifully edited atlas that happens to be interactive—not a reporting dashboard with a map squeezed into a card. The map is the primary content. The second chart answers “how many people?” without requiring a page change.

Use an expansive canvas, quiet land and ocean, controlled color, and generous typography. The year is visually prominent. Data relief can be dramatic, but no gratuitous glow, animated star field, dashboard KPI wall, or 3D effect that compromises reading. Use legally available assets and fonts with a documented license; system fonts are acceptable for the first build.

## Default composition

Desktop: map occupies roughly the upper three quarters of the available content, with the timeline and one distribution panel below. A compact metric selector sits near the top-left. The legend and source-coverage status are always visible. A right-hand inspector appears only on selection. The map can expand when the inspector is closed.

Mobile: map first, followed by a large date control and a collapsible summary/inspector sheet. Controls must not depend on hover, and map gestures must not trap ordinary page scrolling. Include a visible reset-view control.

Initial visible controls: metric, date, play/pause, map/relief, and optional boundaries. Advanced evidence, scale, region, and source options belong in a small expandable panel.

## First-use state

Open on a verified, reasonably recent population snapshot with a useful world overview. The introductory line invites the user to move through time. Do not open on a fabricated 2026 value or a randomly animated globe.

Selecting electricity should retain the date if supported. Otherwise display an explicit choice to move to its available evidence window or keep the requested date and see “no observations.” Never silently jump across centuries. The UI should not imply that a missing ancient electricity observation proves any particular numeric access rate.

## Map semantics

**Height: population density. Color: the selected measure. Counts: the population summary.**

Use fixed, versioned color domains and population height transforms across years. A log transform is acceptable for legibility but must appear in the legend. A local-contrast view is optional and unmistakably labeled; disable it in direct comparisons by default.

Population-only mode may use density color and relief. Condition mode uses its own metric legend. For national data, all colored cells are contextual placement of a national estimate; tooltips must not report a village-level condition estimate. Keep political outlines visually distinct from the statistical geography supporting the color.

Use restrained, color-vision-friendly sequential scales for continuous measures and nonhierarchical category palettes where appropriate. Unknown uses a distinct neutral pattern or texture and an explicit legend entry, not the low end of a scale. Do not use color saturation both for a metric and for uncertainty at the same time.

A coarse ancient surface should not imply exact ancient streets. Cap useful zoom at the source's meaningful scale and explain when users exceed it. Modern coastlines are an approximation in deep-time views; no modern road network or city labels by default in those views.

## Historical boundaries

Off by default when they obscure the population picture. They are context, not an assertion of uniform national identity or a universal system of exclusive territorial sovereignty. Keep uncertain or alternative reconstructions available in the inspector. Do not morph boundaries smoothly between historically distinct states merely to make animation pleasant.

Never equate missing boundary coverage with zero population. Do not carry historical source outlines beyond their verified range to represent the present.

## Time controls

Provide an overview timeline plus a zoomable time window and direct BCE/CE entry. Unequal spacing of snapshots needs visible ticks and clear behavior. A continuous cursor can select a requested date while snapping the data to verified snapshots with an explicit effective-date label.

Prefer a linear scale within the current window; use era presets to make both deep history and recent decades usable. Do not create a hidden nonlinear year slider. Playback advances through available observations or valid historical intervals. Motion stops under reduced-motion settings.

Include an evidence-coverage strip below the timeline. A sparse ancient series should visibly look sparse. “Population: 1000 CE; condition: unavailable” is better than an apparently complete but invented display.

## Linked population panel

For population-only mode: show a population-through-time line with the current date marked; do not invent a condition split.

For prevalence: show a 100% bar for with / without / unknown, plus actual counts and denominator scope. Unknown is part of the full width. If world coverage is not established, say “covered population,” not “humanity.”

For contextual means: show a fixed-bin population histogram, titled as a distribution of people across territorial conditions. It is not an individual outcome distribution. Hovering/focusing a bin highlights associated areas on the map without implying subnational measurements.

For sampled historical facts: replace the global bar with an evidence-coverage or case-study panel until a population aggregation is defensible. For events: use defined event/death totals rather than making up a humanity-share statistic.

Keep one primary summary at a time. A compact historical ribbon or sparkline may supplement it only after the core interaction is readable.

## Inspector

A selected point shows the population cell and all relevant contexts, rather than assuming one polygon answers everything:

- Requested date and each effective observation date.
- Metric value, unit, status, and denominator.
- Statistical support; historical polity context separately.
- Estimated cell population and surface method.
- Source release and original citation(s).
- Evidence type, spatial precision, bounds/scenarios, and missing-data notes.
- Derived transformations and a download-this-view action.

When a polygon overlaps multiple historical entities, show the ambiguity. No silent “topmost polygon wins.”

## Comparison, sharing, and exports

A later two-date comparison locks camera, scales, bins, metric definition, and population universe. Prefer side-by-side maps or a clear swipe mode; do not double the UI before one view is correct.

Encode stable UI state in the URL: metric, requested date, effective release, region/filter, scale mode, and camera. A share link pins a published manifest so future source revisions do not silently change the cited view. Provide a clear newer-release option.

Export data and methodology, not only a pretty image. Downloads should include population weights, missing statuses, the exact view manifest, sources, transformations, and license notices. Any image export has an automatically generated date/source caption.

## Accessibility and resilience

All controls and chart marks must be keyboard reachable; focus must be visible. Provide text alternatives for summaries and a sortable, downloadable data table. Tooltips also open on focus/tap. Respect reduced motion, sufficient contrast, and large touch targets.

A WebGL failure must yield a usable table and, where feasible, a lightweight two-dimensional map. Retain selected state during loading. Make unavailability a designed state, not a broken canvas.

## Renderer choice

Start with a polished tilted MapLibre/deck.gl map. Test population polygons/columns, historical outlines, picking, depth, and mobile performance in a renderer spike. A globe remains a desired enhancement, but only after those actual layers pass the spike. See source S11 for current documented limitations; do not assume a terrain/heatmap layer works on a globe because it works on a flat map.
