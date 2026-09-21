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

Polygon overlap, containment, disputed alternatives, and whether a source
feature should be treated as an exclusive polity are **not yet topology- or
historian-reviewed**. The manifest says so explicitly. These polygons must not
be used for demographic totals until that review and a mass-conserving
allocation contract exist.

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

- HYDE 3.5 remains blocked until an authorized archive, artifact terms,
  variables, units, masks, dates, and scenarios are verified. The Census world
  series is not a substitute population surface.
- Companion Chandler and Modelski Modern city tables need a dated city-identity
  crosswalk and a source-disagreement display before they are merged with the
  current Modelski Ancient points.
- Maddison Project Database can support a territorial GDP-per-capita context
  distribution, not individual income. Its workbook, source sheet, PPP basis,
  entity codes, and citations must be audited before publication.
- Cliopatria requires a bounded topology and historical-review pilot before its
  polygons can support any population allocation.
