# Reproducible views and browser gates

Updated: 2026-10-06

## Pinned view URL

An Atlas URL now records the immutable release ID, metric, requested year,
selected statistical support, border and city visibility, published scale mode,
the selected population-grid source, and map camera. A link that names another release fails closed instead of
silently opening current values.

The keys are deliberately small and explicit:

| Key | Meaning |
|---|---|
| `release` | Immutable Atlas release ID |
| `metric` | Published metric ID |
| `year` | Requested astronomical year |
| `place` | Optional statistical-support code |
| `borders`, `cities` | Independent context-layer visibility |
| `surface` | Source-native population grid release ID or `off`; unsupported years stay unavailable |
| `scale` | `published`; the metric's fixed versioned scale |
| `lng`, `lat`, `z`, `pitch`, `bearing` | Map camera |

Metric and layer changes create a browser-history boundary; camera motion and
timeline scrubbing replace the active entry. Back/forward therefore restores a
meaningful previous view without creating hundreds of slider or pan entries.

## Exact-view JSON bundle

“Download this exact view” creates one deterministic JSON document in the
browser. It contains:

- requested and effective dates, layer state, camera, scale, and pinned query;
- the complete metric definition and applicable population-universe record;
- date-specific rows with metric value/status/locator and population
  weight/status/locator;
- the exact summary shown by the application;
- the applicable deep-time world estimate, political-snapshot reference and
  checksum, exact-date historical city observations, and the selected population-grid snapshot and checksum;
- the full reconciliation decision artifact;
- the immutable release manifest, source releases, transformations, citations,
  and source-specific license notices; and
- safe and prohibited interpretations.

Historical geometry is referenced through the immutable release artifact path
and SHA-256 rather than duplicated in every view bundle. The bundle validator
rejects release, metric, reconciliation, year, status, and camera mismatches.
The fixture test recomputes the 2024 electricity prevalence result solely from
the exported rows and weights and requires exact equality with the displayed
calculation.

## Automated browser gate

Playwright 1.63.0 and axe-core 4.13.0 are pinned development dependencies. The
default test channel is installed Google Chrome; it can be changed with
`PLAYWRIGHT_CHANNEL=msedge`.

```bash
pnpm test:browser
pnpm test:browser:update  # intentional visual-baseline changes only
```

The current suite verifies:

- release/layer/scale/camera URL pinning and browser back restoration;
- an actual browser download whose parsed JSON contains 217 electricity rows,
  the displayed population calculation, and the matching decision set;
- deep-time desktop, electricity-summary desktop, and mobile time/method visual
  baselines;
- reduced-motion playback suppression;
- serious/critical axe violations across Atlas, Sources, and Review; and
- fail-closed behavior for an unavailable pinned release.

The first run found and fixed a nested-interactive map role, 31 low-contrast
text instances, and an unfocusable scroll region. Visual baselines also exposed
and fixed cramped mobile attribution rows. These are recorded results, not a
claim of complete WCAG conformance.

## Still outstanding

- A tested lightweight map fallback when WebGL is unavailable. The evidence
  table already remains usable.
- Touch-map picking and a broader keyboard interaction matrix.
- Automated browser coverage on an additional engine/platform.
- Measured network, cached-scrubbing, frame-rate, and memory benchmarks.
- A hosted immutable-release resolver and newer-release notice. The local app
  currently fails closed when a pinned release is absent.
