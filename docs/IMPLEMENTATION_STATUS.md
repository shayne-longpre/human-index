# Implementation status

Updated: 2026-10-24

## Current release r15 — source-native event evidence

R15 adds all 417,968 finalized UCDP GED 26.1 events across 37 source years
(1989–2025) on a separate Events page. Each year is loaded on demand and its
complete selected-field records are downloadable as compressed CSV. Event IDs,
original CSV row locators, date ranges and precision codes, representative
coordinates and location precision, source violence type/parties, and separate
low/best/high fatality estimates survive. The audit found 122,188 locations
with precision 3–7 and 5,075 nonmonotonic fatality triplets. These are visible
source limitations, not reasons to invent an exact point or a confidence
interval. No GED record is joined to Atlas borders or population. The Sources
ledger now has 50 indicators, 20 source sets ready, and nine indicators still
without a selected source.

Two current official ILOSTAT annual employment-to-population tables and their
matching metadata/dictionaries are acquired and pinned, advancing ILOSTAT to
Acquired: Yes. The 321,631-row long series uses the previous ICLS13 definition;
the separate 7,679-row current-ICLS19 series begins only in 2014. Both mix
source and demographic dimensions, and the older table includes future dates.
Neither series is merged with the other or ILO modelled estimates.
ILOSTAT remains In release: No pending that review.

## Remaining ledger gap after r15

Across 32 distinct planned sources, 27 are acquired and 17 occur in the
selected release. Five remain unacquired: World Historical Gazetteer source
datasets, WID, Pew religious composition, ARDA RCS-Dem, and Religion and State.
Fifteen planned sources are not yet in release; 23 source records still disclose
at least one open issue, including some already-published sources whose
remaining geography or coverage audits are not finished. Nine indicators still
need a source selected. These are not all engineering tasks: Pew, ARDA, and RAS
require account/agreement decisions; HYDE and Seshat have conflicting or
restrictive notices; CShapes, WRP, CCP, Clio, WorldPop, OWID, and WID need
source-specific reuse or underlying-input review. Pleiades temporal termini,
CShapes geometry and precedence, ILOSTAT definitions/support, and historical
population partitioning are independent scientific gates. A checkmark cannot
substitute for those decisions.

## Previous release r14 — source-native conflict evidence

R14 adds two separate, CC BY 4.0 UCDP 26.1 products and a Conflict page:
2,816 UCDP/PRIO conflict-years (1946–2025) and 7,132 OrganizedViolenceCY
country-years (1989–2025). The latter has occurrence flags and separate
best/low/high death estimates; four source triplets are nonmonotonic, so the
page presents best estimates only and the CSV preserves all three fields.
These source supports are not joined to modern display polygons or population.
GED was separately audited and added in r15; ACD and CY remain distinct
products rather than stand-ins for event locations or exposure.

Pleiades v4.1 GIS place/name/point exports are additionally acquired and
content-hashed (33,956,960 bytes total), moving that source to Acquired: Yes.
Its 41,480 places include 12,084 rough locations and 7,509 without a
representative point. Name and location date fields are termini rather than
valid intervals; Pleiades remains out of release pending a truthful temporal
name and location presentation.

The matching OWID long-run life-expectancy CSV and metadata are also acquired
and profiled: 21,565 rows, with only three source rows at 1800. They are not
released because the chart combines HMD, Zijdeman, Riley, and UN WPP inputs
and their exact reuse and per-row source lineage remain unresolved.

## Previous release r13 — historical city companions

R13 publishes the pinned CC BY 4.0 Chandler v2 and Modelski Modern v2 city
tables alongside, not concatenated into, Modelski Ancient. It adds 9,729
positive source estimates (9,436 Chandler; 293 Modelski Modern), their exact
source dates, row/column locators, reviewed place-link IDs, and separate CSVs
to the map, inspector, accessible table, and view download. Two Chandler
literal-zero cells are quarantined and remain visible as unresolved source
codes in JSON/CSV. The two unresolved coordinate-only place identities remain
source-only. Readiness is not full temporal or geographic coverage.

## Indicator-to-source roadmap

The Sources page groups 50 named indicators under ten verticals and shows
the planned source rows beneath each indicator. Acquired and In release remain
source-level checks. A source set is marked ready only when every planned
source is in the current release; nine indicators explicitly need a source
selected. This status is not a claim of complete temporal or geographic
coverage. PIP, PWT, and ILOSTAT source plans are now correctly grouped under
economics rather than population. The mapping and semantics are documented in
`SOURCES.md` and guarded by registry and browser tests.

## Current release r12 — institutional first slice

Release r12 adds an Institutions & religion page with four pinned V-Dem v16
source-native country-year variables: statutory adult suffrage, legislature
chambers, freedom of religion, and religious-organization repression. The
source has 28,092 country-ID/year rows over 202 coding units, 1789–2025; the
four selected variables contain 111,556 non-null values. The source's ordinal
religion-policy categories are not religious affiliation, individual-rights
percentages, or an Atlas ranking. Raw values, blank cells, original row
locators, and source flags remain in downloadable CSVs. No V-Dem observation
is assigned to Cliopatria borders or population weights.

The official WRP v1.1 national CSV and codebook are acquired. All 84 national
fields and 1,995 rows are now in a checksum-recorded, ignored local research
stage for religion composition; none are in the public web release pending
redistribution, source-imputation, and presentation review. Pew needs the user's account/terms acceptance;
ARDA/RAS have download agreements; Seshat Equinox has contradictory license
notices inside the acquired archive, so its 11,202 locally staged institution
and religion rows are not published. CCP Chronology v6 and Characteristics v5
are acquired and pinned as local-only archives, with a streaming profile; they
are not in r12. Exact gates and source links are in
`INSTITUTIONAL_RELIGION_EVIDENCE.md`.

For local development, the new `?page=research` view reads ignored WRP, CCP,
and Seshat stages and a checksummed WRP↔CCP candidate decision set. It shows
1,960 exact COW-style-code/year candidate overlaps, all still unresolved for
territorial equivalence. The CCP slice keeps all original year rows but only
selected identity/coding/religion fields; the full original stays in its raw
ZIP. This research view and its source artifacts are absent from production.
No Atlas-authored ancient religion or government status is backfilled.

## Current release r11 — economics extension

Release r11 extends r9 with a pinned 2021-PPP World Bank PIP national-survey
response (five poverty/distribution measures, 12,395 source-native values)
and the official Penn World Table 11.0 workbook (seven output, labor, TFP,
capital, and compensation measures, 63,955 source-native values). The current
Economics page has 26 independent tables and 196,337 known values. PIP keeps
multiple national surveys in one country-year separate; PWT preserves workbook
cell locators and quality flags in CSV. See `ECONOMIC_INDICATORS.md` and
`INFERRED_EVIDENCE.md` for the indicator set and bounded historical-claim
contract. Neither source is mapped to an ancient polity, and no cross-source
economic score or labor-productivity ratio is implied.

The current release retains r8's Atlas and GHSL population-grid views and adds
an Economics page with fourteen source-native tables: Maddison Project Database
2023 real GDP per capita and thirteen World Bank WDI indicators spanning GDP,
PPP, consumption, poverty, inequality, labor, inflation, trade, investment,
public consumption, and sector composition. All fourteen original indicator
artifacts plus World Bank country metadata are SHA-256 pinned. The publication
has 119,987 exact-date known source values; downloadable CSVs retain unknown
source rows. Country/economy labels are not joined to historical-polity map
geometry. See `ECONOMIC_EVIDENCE.md` for per-indicator coverage, terms,
original-record references, reproduction, and remaining gaps.

Clio Infra GDP remains blocked by exact workbook reuse terms and underlying
source citation review. WID distributional series remain unpinned pending an
exact release, dataset-level redistribution terms, and concept/percentile/
quality metadata. No source covers economics for every human population back
to 10,000 BCE; Maddison's earliest known GDP-per-capita values are in 1 CE.

Sections below describe earlier baseline releases and their prior acquisition
state; this r11 section supersedes their Maddison/PWT-access conclusions.

## MVP release

Release r7 publishes five separately defined measures:

- World Bank population totals, 1960–2025;
- UN World Population Prospects 2024 population outlook, 1950–2100;
- World Bank electricity access, 1990–2024; and
- World Bank life expectancy at birth, 1960–2024; and
- World Bank GDP per capita in constant 2015 US dollars, 1960–2025.

It also publishes U.S. Census global historical-population ranges at 39 source
dates from 10,000 BCE through 1950 CE, 36 Cliopatria political-context
snapshots from 3400 BCE through 2024 CE, and 621 exact-date Modelski Ancient
city observations from 3700 BCE through 1000 CE.

The UI has one requested-date timeline. Each statistical, border, and city layer
resolves that date independently and reports its effective source date or
unavailability. The map changes historical polygons and names without using
them as statistical supports. Dense names are available on hover and click. A
Sources page groups the acquisition/publication ledger by data vertical. A
read-only Review page exposes versioned decisions for all 28 border-overlap and
353 city-identity candidates without merging or mutating source observations.
The map applies the allowed display effects and names the relevant counterpart
polities in the click inspector.

Shared Atlas links pin the immutable release, metric, requested year, selected
support, context layers, published scale, and camera. An exact-view JSON bundle
contains the date-specific rows and population weights, displayed calculation,
historical evidence references, decisions, manifest, transformations,
citations, and licenses. Browser back restores meaningful metric/layer changes;
an unavailable release ID fails closed.

## Scientific separation

- World Bank and WPP remain separate metrics because they have distinct
  territorial universes, releases, and temporal meanings.
- WPP rows through 2023 are estimates. Rows from 2024 through 2100 are explicitly
  labeled `medium_projection`; they are neither observations nor confidence
  intervals.
- WPP excludes aggregate regions and 2101 boundary rows. Counts are converted
  exactly from the source's thousands unit, and each annual selected-entity sum
  is compared with the separate World row. The signed rounding residual is
  retained.
- Census deep-time totals have world support only and are never assigned to
  historical polities or treated as a spatial surface.
- Cliopatria polygons and Modelski points are historical context. Neither affects
  metric aggregation or population conservation.
- Missing, unplaced, unsupported, estimated, and projected states stay distinct.
- GDP per capita is territorial economic context. Atlas reports source-support
  coverage but does not construct a global mean or interpret it as individual
  income, household wealth, or a PPP welfare ranking.

## Source audit decisions

- The three World Bank indicator responses and country metadata are pinned with
  URLs, retrieval dates, byte counts, and hashes. Modern published metrics use
  the nonaggregate World Bank metadata universe appropriate to each year.
- The official UN WPP 2024 Medium demographic-indicators CSV is pinned and now
  published as `population_outlook` in its source-native 237-country/area
  universe. The source describes total population on 1 July in thousands and
  makes WPP 2024 available under CC BY 3.0 IGO.
- Natural Earth v5.1.2 remains display geometry only. Its 1:110m layer cannot
  place every small territory.
- Cliopatria v0.2.0 remains a context source. Six year-zero endpoints are
  quarantined. Of 28 bounded Mediterranean overlap candidates, eight are
  source-declared hierarchy relations and twenty remain explicitly unresolved.
  The decision layer only changes styling and disclosure.
- Modelski Ancient, Chandler v2, and Modelski Modern v2 are published as
  separate city series. Across them, 336 candidate pairs are linked as the
  same place, 15 distant homonyms are rejected, and two coordinate-only
  identities remain unresolved. The two Chandler numeric-zero cells are
  quarantined rather than shown as zero residents.
- CShapes 2.0 is acquired and profiled: 710 dated GeoJSON features spanning
  1886–2019, including 11 invalid geometries. It is not published because its
  CC BY-NC-SA terms need a product-use decision, the download omits codebook
  fields required for defensible dependency/border rendering, and geometry
  repair and comparison policy are unresolved.
- A HYDE 3.5 10,000 BCE sample archive, README, and license are acquired. The
  archive exposes count, density, rural, urban, and urban-other grids, but it is
  not published: the license file and README disagree (CC BY-NC 4.0 versus CC
  BY 3.0), latest-year descriptions conflict, and full masks/scenarios plus
  conservation checks are still needed.
- Maddison Project Database 2023 was unavailable in the earlier pass; it was
  subsequently acquired from the official Dataverse endpoint and published
  source-natively in r9. Its original-source references are retained but do
  not establish per-observation paper provenance.
- The bounded vertical acquisition pass pins 19 additional candidate artifacts:
  World Bank economics, eight Clio Infra workbooks, V-Dem v16 data/codebook/
  release metadata, Seshat Equinox v1 data/metadata, and both UCDP 26.1
  products and codebooks. Three provider-level blockers remain recorded for
  HYDE, Maddison, and WHG.
- Candidate profiling keeps the remaining verticals out of the release. UCDP
  GED has 417,968 events and 5,075 non-monotonic low/best/high rows; Seshat uses
  source-native sentinels and polity/NGA/time supports; Clio uses 2012 country
  supports; and V-Dem's large RData object still needs an entity audit.

## Implemented architecture

- Narrow Python adapters parse source-native artifacts and emit validated,
  immutable observations.
- A declarative catalog owns metric, taxonomy, population-universe, and
  aggregation contracts; it does not stand in for provenance.
- The release builder owns transformations, summaries, conservation checks,
  lineage, and output hashes.
- Statistical geography, historical political geography, and display geometry
  use independent contracts and loaders.
- WPP demonstrates source addition without concatenating releases: it has its
  own source release, universe, transformation, summaries, CSV, and presentation
  metadata.
- World Bank economics demonstrates a second narrow adapter on the same modern
  entity universe without reusing population semantics or aggregation. The
  vertical integration decision set separately records all candidate merge and
  geography policies.
- The reconciliation policy and generated decision set are separate, versioned,
  checksummed artifacts. Every candidate has an explicit disposition; rules
  cannot drift from their declared results. Accepted place identity never
  combines population observations, and border decisions prohibit population
  allocation.
- Map dependencies remain in a lazy chunk, and nearby boundary snapshots are
  prefetched after the active snapshot resolves.
- View-row joining is independent of map geometry. The exact-view builder and
  validator form a narrow typed contract and load the decision artifact only
  when requested.

## Verified state

The release builder and unit/contract suites are part of the release gate.
The browser gate adds downloadable-bundle inspection, history restoration,
reduced-motion, axe, and desktop/mobile screenshot checks. Report only the
checks actually run for each subsequent release.

## Immediate next work

1. Decide whether GED event locations merit a separate map overlay, and review
   its 5,075 nonmonotonic low/best/high rows before any event fatality display.
2. Select direct sources for the nine indicator gaps and record variable-level
   reuse terms; do not treat a source-wide date span as variable coverage.
3. Resolve Clio artifact terms and review Maddison's original-paper mapping
   before historical graphical reuse; keep their series source-native.
4. Resolve HYDE licensing and validate one matched baseline/lower/upper gridded
   population slice with masks and mass conservation.
5. Extend bounded border candidate scans without auto-resolving unsupported
   claims, then evaluate licensed temporal-name datasets from WHG.

The full sequence and acceptance gates are in
`DEEP_TIME_POPULATION_AND_BORDERS_PLAN.md` and `EVIDENCE_INTEGRATION.md`.
The ranked comparison with the original vision is in
`ORIGINAL_VISION_GAP_PRIORITIES.md`.
The acquisition, profiling, and merge policy for the new verticals is in
`VERTICAL_SOURCE_INTEGRATION.md`.

## Renderer spike note

MapLibre GL JS 6.10.0 with deck.gl 9.4.0 runs in overlaid mode. Interleaved mode
failed because deck.gl relied on a MapLibre internal viewport field absent in
this version. Globe rendering and interleaved depth ordering remain out of scope
until a compatible, tested renderer combination is available.
