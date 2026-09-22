# Evidence integration without a data-platform detour

This document explains how Atlas adds sources, taxonomies, and measures while
keeping the MVP small. The core rule is simple: **catalogs organize evidence;
they do not make unlike evidence compatible.** Compatibility comes from an
explicit metric contract, statistical support, date policy, population
universe, and recorded transformation.

## The three layers

### 1. Research registry

`data/registry/sources.json` records candidates, known licenses, access state,
and blockers. A registry entry can be useful research without being publishable.
It is not evidence that an artifact was downloaded or that every variable has
the source's advertised overall coverage.

The same file has a small `verticals` view used by the Sources page. It is an
index over source IDs, not a second source registry. Each link states the
source's role for that vertical and the exact immutable release IDs, if any,
that are currently published. The UI derives three deliberately different
signals:

- **Acquired:** the registry says an exact data artifact is locally pinned;
- **In release:** the vertical link names an ID in the active release manifest;
- **Outstanding:** the source registry still has concrete blockers.

A source can therefore be acquired but unpublished (UN WPP 2024), or published
for a bounded role while broader use remains blocked (Cliopatria polygons are
published as context but cannot yet support population allocation). This avoids
one misleading catch-all “ingested” flag.

### 2. Source-native adapters

`pipelines/atlas_etl/sources/` contains one narrow adapter per acquired source.
Each adapter validates native identifiers, dates, units, missing values, and
expected schema before it emits normalized records. It does not silently merge
another source, rename entities by display name, or fill time gaps.

Raw inputs remain immutable. `data/registry/source-lock.json` pins the exact
input URL, retrieval date, byte count, checksum, and license statement used by
the build.

### 3. Immutable published release

The release builder creates small browser-ready artifacts and a manifest. The
manifest connects metrics, taxonomy families, source releases, population
universes, transformations, citations, and output hashes. Every metric names its
source-release IDs directly; taxonomy membership is never an implicit source or
lineage relationship. A new release gets a new release ID; an earlier published
directory is not rewritten.

The browser validates the same reference graph before showing data. Build-time
validation catches broken output; runtime validation catches a damaged or
mismatched deployed manifest.

## Taxonomy is navigation, not a merge key

A metric may belong to several families. Electricity access, for example, can
appear under both material conditions and infrastructure access without being
duplicated or averaged with another metric. Taxonomy membership never changes:

- the unit or definition;
- the statistical population;
- the geography supporting an observation;
- the date-resolution rule;
- the aggregation contract; or
- the source citation.

The catalog in `pipelines/atlas_etl/catalog.py` is deliberately declarative.
It is the one build-side place for taxonomy families and metric presentation
contracts. `validate_release_manifest()` rejects dangling taxonomy, source,
population-universe, transformation-input, and output-artifact references.

## How evidence is combined

Atlas combines records only through a named, versioned transformation. The
transformation lists its input artifact IDs, parameters, validation results,
and checksummed outputs. There are three common patterns:

1. **No merge.** Historical borders and city points are contextual overlays.
   They keep their own identity and never receive the Census world total.
2. **Exact-key join.** Modern World Bank measures join population weights by
   source code and exact year. Display names never serve as keys.
3. **Reviewed crosswalk.** A future source with different entity or territorial
   units needs an explicit dated crosswalk with unresolved and ambiguous states.
   It cannot be admitted by fuzzy name matching.

Multiple sources for the same concept remain distinguishable until a reviewed
harmonization transformation establishes compatible units, geography, time,
and series meaning. Source disagreement is retained as disagreement, not turned
into a confidence interval or averaged away by default.

## One requested date, independent layer dates

The UI has one requested-date control. Each layer resolves that date under its
own published policy:

| Layer | Policy | UI behavior |
|---|---|---|
| Population and condition measures | `exact_only` | No value at an unsupported year; offer a clearly labeled nearest-date action. |
| Historical city estimates | `exact_only` | Show points only at the source date. |
| Political context | latest published snapshot not after the request, within source coverage | Show the effective snapshot date; never extend before the first or after the last snapshot. |
| Future modeled surfaces | `explicit_model` only | Show model/scenario and effective date; never present a model as an observation. |

The slider's stops are the sorted union of dates where any published layer
changes. This makes all evidence reachable without forcing the color measure,
political reconstruction, and point layer to pretend they share one cadence.

## Population accounting remains separate

The manifest's population-universe records define who can enter a summary. A
fixed-support metric names one universe. Population changes support through
time, so its primary universe is `null` and its explicit, non-overlapping period
mappings select either the historical world support or the modern nonaggregate
territorial universe. The two are never added together, and an unsupported gap
inherits neither one.

Historical political polygons are display geometry. Natural Earth polygons are
also display geometry. Neither becomes statistical support merely because it is
visible under a colored layer.

## Boundary quality currently checked

Every published Cliopatria snapshot records checks for duplicate feature IDs,
nonpositive source areas, geometry types, ring closure, and coordinate bounds.
Repeated display names are counted rather than assumed to be errors. `RELATION`
features remain excluded from the polity display layer.

A reproducible 1500 CE Mediterranean pilot now uses an equal-area projection to
measure candidate overlaps larger than 100 square kilometres. It found 28
candidates among 57 active intersecting `POLITY` features: 12 near-containment
candidates and two other material-overlap candidates. The artifact is
`data/review/cliopatria-topology-pilot.json`.

These are **not adjudications**. Overlap can encode hierarchy, disputed
alternatives, composite context, or a genuine geometry problem. Every candidate
is marked as awaiting historian review. The polygons still must not support
demographic totals until source-aware review and a mass-conserving allocation
contract exist.

## Review artifacts are not release artifacts

`data/review/` contains small reproducible findings that move a source toward a
decision without pretending that it has passed publication review:

- the Cliopatria bounded topology candidates;
- 353 unreviewed city-identity candidates across Modelski Ancient, Chandler,
  and Modelski Modern;
- an 84,360-row UN WPP acquisition profile that keeps 1950–2023 estimates,
  2024–2100 medium projections, and the file's 2101 boundary rows separate; and
- the HYDE 3.5 ingestion contract, including its CC BY-NC 4.0 product gate and
  mass-conservation requirements.

Review artifacts can be regenerated from ignored raw files. They do not enter
the browser's evidence release, metric list, or numerical summaries merely by
existing.

## Adding one source or metric

Keep the path short:

1. Add or update the research-registry entry, including unresolved access and
   license facts.
2. Acquire one exact artifact through an authorized route and pin it in the
   source lock.
3. Add one source adapter that preserves native identifiers, status values,
   source-sheet/record locators, and dates.
4. Add a metric contract to the catalog. Reuse taxonomy families where their
   plain-language meaning fits; add a family only when it improves navigation.
5. Declare the statistical support, population universe, temporal policy,
   aggregation kind, fixed scale, safe summary, and prohibited interpretations.
6. Record the transformation and validation results, then publish a new release
   ID.
7. Add adversarial tests for missing values, duplicate keys, unsupported dates,
   denominator conservation, and every new cross-reference.
8. Add a UI renderer only if the aggregation meaning has a truthful visual form.

This is enough for the MVP. It intentionally avoids a database server, generic
workflow engine, plugin framework, universal observation class hierarchy, or
automatic ontology. Those become justified only when real source diversity
creates a measured need.

## Current blockers and next evidence work

- HYDE 3.5's provider directory and CC BY-NC 4.0 license file are now profiled,
  but no population artifact has been acquired. One baseline artifact, its
  README, the product's compatibility with noncommercial terms, variables,
  units, masks, dates, and scenarios remain gates. The Census world series is
  not a substitute population surface.
- Companion Chandler and Modelski Modern city tables now have conservative
  candidate links, but all 353 require evidence-backed review. They also need a
  source-disagreement display and resolution of two Chandler zero cells before
  publication.
- UN WPP 2024's medium demographic-indicators artifact is pinned and profiled.
  Exact bulk-data terms and units, aggregate exclusion, territories, 2101
  boundary rows, and overlap with World Bank remain unresolved.
- Maddison Project Database can support a territorial GDP-per-capita context
  distribution, not individual income. Its workbook, source sheet, PPP basis,
  entity codes, and citations must be audited before publication.
- Cliopatria requires a bounded topology and historical-review pilot before its
  polygons can support any population allocation.
