# Deep-time population and changing borders

Updated: 2026-09-22

## Implemented through release r6

- All 39 dates in the U.S. Census Bureau historical world-population comparison
  table are published from 10,000 BCE through 1950 CE. Summary bounds are shown
  as source disagreement, and the named estimates are retained.
- Thirty-six Cliopatria v0.2.0 `POLITY` snapshots are published from 3400 BCE
  through 2024 CE. The UI switches real source geometry and valid names at the
  effective snapshot date and exposes the feature metadata in an inspector and
  accessible table. One requested-date slider includes every political snapshot
  and measurement date; the boundary layer independently resolves to its latest
  published snapshot within source coverage.
- Modelski Ancient Period Data v2 supplies 621 sparse, exact-date population
  estimates for 154 source-geocoded city points from 3700 BCE through 1000 CE.
  The Atlas preserves the source certainty code and never treats these points as
  a complete urban or world-population denominator.
- These layers are deliberately independent. The population is world-supported;
  the political polygons are display context. Toggling or selecting a polity
  cannot change a population total.

The unresolved part of the original plan is spatially resolved historical
population. A HYDE 10,000 BCE baseline bundle and README are now acquired, but
the root license and README conflict and the grid has not passed mask/scenario
mass reconciliation. UN WPP's official medium demographic-indicators file is
published separately in r6: its 1950–2023 estimates and 2024–2100 Medium
projections remain visibly distinct and never replace World Bank silently.

## Product outcome

The Atlas timeline should eventually span from the earliest published population
reconstructions to the present. At any selected source-supported date it should
show:

1. a population surface or territorial observation with its method and effective
   date;
2. historically valid polity geometry and names where published evidence exists;
3. cities and places as a separate evidence layer; and
4. visible unknown, disputed, overlapping, and unassigned geography.

The map may change discretely at documented dates. It must not animate invented
intermediate borders or imply that ancient frontiers had modern precision.

## Population source stack

No single source supplies equally authoritative population observations across
12,000 years. The product should expose a source stack rather than silently splice
the series.

| Source | Useful span | What Atlas can publish | What it cannot establish |
|---|---:|---|---|
| U.S. Census historical comparison table | 10,000 BCE–1950 CE | Published global estimate ranges and named source estimates at 39 dates | Spatial distribution, polity totals, annual continuity, or statistical confidence |
| HYDE 3.5 candidate | 10,000 BCE–2025 CE | Five-arc-minute modeled population surface and source-supported global/regional totals at its actual published time steps | Direct local observation, annual continuity, or statistical confidence unless the artifact provides it |
| Seshat | Selected ancient and historical polities | Dated polity-population ranges, polity territory, and largest-settlement ranges with evidence/status tags | A global nonoverlapping population partition |
| Reba, Reitsma & Seto historical urbanization | 3700 BCE–2000 CE | Dated city locations and population estimates as an urban layer | Rural population or total humanity |
| Maddison Project Database | Some economies back to 1 CE | Sparse long-run national/economic-unit population checks and contextual GDP series | A boundary-neutral global surface or uniform early coverage |
| UN WPP 2024 | 1950–2100 | Detailed direct modern estimates and explicitly labeled projections, including age/sex dimensions after audit | Deep history or an automatic continuation of another release |
| World Bank WDI | 1960–2025 | The current annual territorial totals and compatible metric weights | Gridded density or pre-1960 history |

The first deep-time implementation uses the Census comparison table as an honest
global-only bridge while HYDE is inaccessible. One pinned HYDE release should
become the spatial population backbone only if its exact archive and
redistribution terms pass review. Seshat and the historical-city dataset should
appear as independent corroborating layers, not calibration targets. UN WPP
should replace neither HYDE nor World Bank silently; any source transition is
visible in the timeline and export.

## Historical geometry source stack

### Primary baseline: Cliopatria

Cliopatria v0.2.0 is the best first global baseline: documented coverage from
3400 BCE to 2024 CE, roughly 14,000 geometry records and more than 1,600 entities,
with inclusive `FromYear`/`ToYear` ranges and `POLITY` versus `RELATION` types.
It explicitly warns that boundaries and dates are contestable.

Atlas should initially render it as historical context only. `RELATION` features
must never be added to member polities for population accounting. Overlapping
`POLITY` features remain overlapping claims or nested contexts until reviewed.

### Modern validation layer: CShapes 2.0

CShapes provides dated independent-state and dependent-territory geometry from
1886–2019 globally and from 1816 in Europe. Atlas pinned and profiled the
Gleditsch–Ward GeoJSON and codebook. Publication is still blocked by CC
BY-NC-SA terms, 11 invalid geometries, missing codebook fields in the download,
and the need for an explicit precedence comparison with Cliopatria.

### Names and places

Pleiades can provide open ancient place names, locations, bibliographic links,
and explicit unlocated-place states. World Historical Gazetteer can support
temporal names and cross-source reconciliation, but licenses are mixed and must
be checked record/source by record/source. Neither is a substitute for polity
boundaries.

## Minimal temporal contracts

Add these concepts without introducing a database server:

```text
HistoricalFeature
  source_feature_id
  source_release_id
  feature_kind: polity | relation | claim | place | city
  valid_period: [start, end)
  dating_bounds and dating_status
  geometry_version_id
  name_assertions[] with their own valid periods
  evidence_status: published | disputed | inferred | unknown
  citation_ids[]

GeometryVersion
  geometry
  source_geometry_checksum
  method: source_native | georeferenced_trace | reviewed_edit
  precision_class
  disputed_boundary_segments
  reviewer_status
```

Statistical supports, political-context geometry, and display geometry remain
separate. Joining a population cell to a polity is a derived transformation with
input IDs, parameters, overlap handling, unassigned/ambiguous residuals, and an
output checksum.

## Annotation workflow

Annotation should improve gaps; it should not begin with model-generated borders.

1. **Create a work unit:** region, date/interval, target entity, primary map or
   scholarly source, and expected geometry type.
2. **Register evidence:** citation, map edition/sheet/page, rights, scan checksum,
   projection if known, and quoted cartographic caveats.
3. **Georeference:** record control points and transformation residuals. Preserve
   the source image; never overwrite it.
4. **Trace:** store boundary segments with confidence classes. Use `unknown` or a
   fuzzy extent when the evidence does not support a line.
5. **Review independently:** a second reviewer checks dates, names, topology,
   sources, and whether the feature is a polity, dependency, relation, or claim.
6. **Publish immutably:** approved geometry becomes a versioned release; later
   corrections create a new version and retain the old one.
7. **Compare:** show source-native versus annotated geometry and record every
   changed segment. An LLM may help index citations or flag inconsistencies, but
   cannot approve geometry or create uncited borders.

The annotation queue can remain JSON/GeoJSON plus a generated review site for the
first hundred work units. A collaborative database is justified only after that
workflow is genuinely used by multiple editors.

## Delivery sequence

### Phase 0 — current UI reliability

- Make metric loading explicit and prefetch the second MVP metric.
- Publish a dedicated Sources page from the research registry.
- Preserve metric, year, and selected place in the URL.

### Phase 1 — genuine historical-boundary spike

- Acquire and hash Cliopatria v0.2.0 through an explicit command.
- Validate archive terms, schema, year convention, geometry validity, duplicates,
  and `POLITY`/`RELATION` overlap profiles.
- Build a small tracked genuine-data fixture at several actual change dates.
- Add a context-layer toggle and discrete boundary changes to the existing map.
- Show source names only while their validity intervals apply.

Exit gate: changing the year changes real geometry and labels; the UI discloses
coverage and uncertainty; population totals remain unchanged when the context
layer is toggled.

### Phase 2 — deep-time population spike

- Resolve authorized HYDE archive access and exact artifact terms.
- Audit variables, units, nodata, scenarios, time steps, cell areas, and global
  totals before choosing one release/scenario.
- Convert only actual published snapshots into a static pyramided/partitioned
  fixture; keep large rasters out of Git and the application bundle.
- Render population density/count independently of political geometry.

Exit gate: totals survive reprojection/coarsening within a declared tolerance;
nodata is distinct from zero; the UI states that the surface is reconstructed.

### Phase 3 — combined timeline

- Create a union of source-supported change dates without manufacturing annual
  observations.
- Crossfade discrete population snapshots only when explicitly labeled as a
  visual transition; numerical readouts remain tied to the effective source date.
- Switch boundary snapshots at documented validity changes—never interpolate
  borders geometrically.
- Add city points and historical names from separately licensed releases.
  Modelski Ancient v2 points are now implemented; temporal-name reconciliation
  beyond the source's city label remains future work.

### Phase 4 — population by historical polity

- Begin only after overlap/nesting rules are reviewed for a bounded region and
  period.
- Allocate population cells conservatively; preserve ambiguous and unassigned
  mass; prohibit simultaneous counting of empires, vassals, alliances, and member
  polities.
- Publish regional pilots before any global total by polity.

### Phase 5 — annotation pilot

- Select one evidence-rich region and 5–10 change dates.
- Implement the file-based work-unit and two-reviewer workflow above.
- Measure reviewer time, disagreement, geometry error, and licensing friction
  before building broader infrastructure.

## Evidence-quality work completed through r6

- A 1500 CE Mediterranean pilot measured Cliopatria geometry in EPSG:6933 and
  queued 28 overlaps larger than 100 square kilometres. The decision layer
  identifies eight source-declared hierarchy relations and preserves twenty as
  unresolved. This is a bounded display review, not an exclusive partition.
- A conservative three-series historical-city pass records decisions for all
  353 identity candidates: 336 accepted same-place links, 15 rejected distant
  homonyms, and two unresolved coordinate-only pairs. Every observation remains
  source-native and unmerged.
- UN WPP 2024 is now a parallel published metric with a 237-Country/Area universe,
  explicit estimate/projection states, aggregate exclusion, and a preserved
  World-reference rounding residual.
- One HYDE baseline population bundle is profiled; its README establishes grid
  meanings, while the root-license conflict and remaining nodata/scenario/mass
  checks keep it unpublished.
- CShapes 2.0 Gleditsch–Ward is pinned and profiled as a comparison source, not
  silently layered over Cliopatria.
- The generated read-only Review page exposes all 28 topology and 353 city
  identity decisions, their versioned rules, and the remaining uncertainty.

## Immediate next release

Have a historian review the twenty unresolved Cliopatria pairs and replace only
those dispositions supported by citations. Resolve or preserve the two ambiguous
city identities and design the multiple-source disagreement view before
publishing Chandler or Modelski Modern.

For population, ask Utrecht to resolve the HYDE license conflict, then acquire
general masks and matched baseline/lower/upper samples for mass validation.
For modern borders, decide whether CShapes terms are compatible and compare a
small 1886–2019 set against Cliopatria before any layer precedence rule.
Do not build an annotation platform until a 5–10-date, evidence-rich regional
pilot demonstrates that source-native data cannot cover the need.

## Primary references

- HYDE releases: https://landuse.sites.uu.nl/datasets/
- Cliopatria: https://github.com/Seshat-Global-History-Databank/cliopatria
- CShapes 2.0: https://icr.ethz.ch/data/cshapes/
- Seshat variable hierarchy: https://www.seshat-db.com/variable-hierarchy/
- Historical urbanization data descriptor: https://doi.org/10.1038/sdata.2016.34
- Pleiades datasets: https://pleiades.stoa.org/downloads
- World Historical Gazetteer API and source terms: https://docs.whgazetteer.org/content/technical/apis.html
