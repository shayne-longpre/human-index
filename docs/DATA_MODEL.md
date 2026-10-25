# Data model and statistical contracts

Version: proposed 0.1. Scientific contracts are release requirements; implementation details may be simplified where they preserve meaning.

## 1. Independent records

Maintain these logical tables, even if several are initially stored in one small file:

- `sources`: publisher identity, documentation, license, citation policy.
- `source_releases`: exact release, acquisition URL/date, input checksum, saved terms and codebook checksums.
- `entities`: stable internal identity, names/aliases, entity type; never name alone as a primary key.
- `entity_relations`: dated relationships such as membership, dependency, succession, and competing reconstruction.
- `spatial_supports`: geography over which an observation applies, independent of visual map geometry.
- `geometry_versions`: geometry, CRS, dates, simplification level, parent canonical geometry, and source.
- `crosswalks`: reviewed source identifier mappings with dates, rationale, and ambiguity state.
- `reconciliation_decision_sets`: immutable candidate dispositions, input
  hashes, versioned rules, evidence limits, and explicit unresolved states.
- `metric_definitions`: meaning, unit, denominator, aggregation contract, scale, and availability policy.
- `observations`: original or derived values with precise evidence and temporal support.
- `population_surfaces`: cell counts and actual areas, population universe, source release, date, model/scenario.
- `transformations`: input IDs, versioned algorithm, parameters, outputs, and validation report.
- `published_views`: immutable manifests connecting UI state, display artifacts, summaries, and downloadable data.

The Sources-page roadmap adds a deliberately lighter **indicator plan**:
stable indicator ID, label, measurement-scope warning, and required source IDs
within one data vertical. It is not an `Observation` or a published
`MetricDefinition`. Its computed source-set-ready flag means the listed source
releases are present, not that their variables, geography, or dates constitute
complete historical coverage. A plan with no selected source is explicitly
unready. Scientific publication still requires the metric and observation
contracts below.

The r9 `economic_evidence` manifest is a deliberately source-native branch of
this model: each dataset reference pins a source release and artifact checksum,
unit, support type, exact available years, known/source-row counts, and JSON/CSV
checksums. Its compact JSON lists only known values; the full CSV retains
unknown source rows and original record locators. This is not an Atlas metric
aggregation contract or a historical-polity crosswalk. See
`ECONOMIC_EVIDENCE.md`.

Release r10 adds PIP national **survey-record** supports. Duplicate surveys in
one country-year remain separate records; income and consumption welfare are
not silently merged. The cross-domain bounded-evidence contract is documented
in `INFERRED_EVIDENCE.md`. It represents source ranges and reviewed inferred
possibility sets without turning missing support into a guessed value.
Release r11 adds PWT 11.0 country/year source values with workbook cell
locators and the original quality flags in the downloadable CSV.

Do not start with a graph database. These are conceptual distinctions that work in typed records and Parquet.

## 2. Metric contract

```typescript
type AggregationKind =
  | 'population_total'
  | 'person_prevalence'
  | 'context_distribution'
  | 'context_fact'
  | 'event_summary';

type ValueStatus =
  | 'known'
  | 'unknown'
  | 'explicitly_absent'
  | 'not_applicable'
  | 'uncoded'
  | 'disputed';

interface MetricDefinition {
  id: string;
  label: string;
  taxonomyIds: string[];              // one metric may appear in multiple navigation families
  definition: string;
  unit: string;
  aggregationKind: AggregationKind;
  statisticalUniverse: string;       // e.g. resident persons, adults, live births
  sourceSupportType: string;         // country-year, polity-interval, event-point
  contextVsIndividual: 'individual_rate' | 'territorial_context' | 'event' | 'population';
  comparabilityGroup: string;        // versioned meaning/unit/support compatibility
  temporalPolicy: 'exact_only' | 'valid_interval' | 'explicit_model';
  preferredPopulationSource?: string;
  displayScale: {
    transform: 'linear' | 'log1p' | 'categorical';
    fixedDomain?: [number, number];
    bins?: number[];
    scaleVersion: string;
  };
  summarySentenceTemplate: string;
  prohibitedInterpretations: string[];
  globalSummaryEnabled: boolean;
}
```

A metric can use a categorical legend without ordering political systems or assigning value judgments. Codebook categories should be preserved rather than silently normalized.

## 3. Observation contract

```typescript
interface Observation {
  id: string;
  metricId: string;
  sourceReleaseId: string;
  originalRecordLocator: string;
  entityId?: string;
  supportId: string;
  referencePeriod: { start: number; endExclusive: number };
  temporalKind: 'point_estimate' | 'period_estimate' | 'valid_interval' | 'event';
  datingBounds?: { earliest: number; latest: number };
  value: number | string | boolean | null;
  status: ValueStatus;
  nativeStatus?: string;
  unit: string;
  denominatorDefinition?: string;
  populationUniverseId?: string;
  sourceMethod: 'observed' | 'reconstructed' | 'modeled' | 'expert_coded' | 'mixed';
  atlasMethod: 'unaltered' | 'harmonized' | 'interpolated' | 'spatially_allocated' | 'derived';
  uncertainty?: {
    kind: 'statistical_interval' | 'scenario_range' | 'source_disagreement' | 'unspecified';
    lower?: number;
    upper?: number;
    confidenceLevel?: number;         // only if source actually supplies it
    scenarioId?: string;
  };
  spatialPrecision?: string;
  subgroupScope?: string;
  lawOrPractice?: 'law' | 'practice' | 'both' | 'not_applicable';
  citationIds: string[];
  transformationId?: string;
  notes: string[];
}
```

Original numeric strings, codes, units, and missing-value tokens should also be retained in the immutable raw layer. A source missing code must not accidentally pass as a negative numeric value.

## 4. Dates

Use integer **astronomical years internally**, with year 0 representing 1 BCE. Public labels use BCE/CE and never display a historical “0 CE.” Do not rely on JavaScript Date or ordinary database date types for ancient years.

For a source that explicitly uses signed historical years without year zero:

```text
source -1 -> internal 0  (1 BCE)
source -2 -> internal -1 (2 BCE)
source  1 -> internal 1  (1 CE)
```

Confirm each adapter's convention before applying this conversion. Quarantine a source year 0 until its meaning is established. Convert inclusive source ranges to internal half-open intervals only after year conversion. The inclusive range 1 BCE through 1 CE becomes [0, 2), covering two calendar years.

A reference year does not imply a valid multiyear interval. Store uncertain event dates separately from the duration of an institution or the reference period of a statistic. Keep requested date, effective population date, indicator date, and boundary date in the published view manifest.

Institutional and religion-policy observations now use source-native V-Dem
country IDs and exact years. A legal suffrage fraction, a legislature category,
and two expert-derived ordinal religion-policy categories are separate measure
contracts; an ordinal 0 is not missing and is not a percent of people. The
download retains nulls and original record locators. The tables do not inherit
Cliopatria display geometry, World Bank populations, or another source's
religion taxonomy. See `INSTITUTIONAL_RELIGION_EVIDENCE.md`.

R14 also keeps UCDP/PRIO conflict-year rows and OrganizedViolenceCY
Gleditsch–Ward country-year rows in separate source-native products. ACD
intensity is a source-defined conflict category; OrganizedViolenceCY occurrence
flags and best fatality estimates are within-border summaries, not individual
exposure. Its low, best, and high fields are retained as separate source
estimates, not a confidence interval, including four nonmonotonic triplets.
Neither product is joined to historical polity geometry or current-country
population by name. Missing ACD rows are not converted to zero violence.

R15 adds the separate GED event product, partitioned by source event year.
Each record retains its immutable UCDP `id`, original CSV row locator, exact
`date_start`/`date_end`, `date_prec`, `where_prec`, representative coordinate,
and low/best/high fatality estimates. A year slice is not an assertion that
every event occurred on a known day. Precision 3–6 coordinates stand for an
administrative area, fuzzy feature, or country rather than the event site.
The 5,075 source triplets that are not numerically ordered remain separate
estimates, never a displayed interval. Compact JSON tuples and compressed
CSV are delivery encodings of the same source-native rows; the transformation
manifest pins both outputs and the raw archive/codebook hashes. Neither point
nor source country is matched to Atlas borders or populations, and a missing
event is not coded as peace.

R16 adds two ILOSTAT employment-to-population table references with independent
ICLS13 and ICLS19 source releases. The full original compressed tables,
dictionary files, and exact-year source-native JSON slices are checksummed.
The row locator, source, reference area, sex, age classification, value string,
status, and source notes remain unaltered. Rows after 2025 remain in the
complete source file but not the observed-year browser. No demographic total,
country partition, or definition splice is inferred. The labor-earnings
indicator stays an explicit source-selection gap.

R16 also adds a Pleiades v4.1 selected-export place-ID join. Places, names,
and point locations remain separate source records with original locators and
CSV downloads. Source `year_after_which` and `year_before_which` are signed,
no-year-zero termini, not a period over which a name is known to have been
valid. Representative coordinates are not used as date-specific Atlas points
or sovereignty geometry. The release manifest records each input and output
checksum and this no-temporal-validity selection policy.

Local research additionally records WRP↔CCP same-COW-code/exact-year candidates
as unresolved support decisions, not observations or geography crosswalks.
CCP written-provision categories, WRP estimated affiliation, V-Dem expert
coding, and Seshat sampled polity claims remain independent measurement
families. Their joint presence in an inspector does not create a combined
rights, religion, or institutional score.

## 5. Exclusive population accounting

For each cell j, let p_j be its population. Allocation fractions over mutually exclusive supports must satisfy:

```text
sum_u w[j,u] + unassigned[j] + ambiguous[j] = 1
all fractions >= 0
P_u = sum_j p_j * w[j,u]
```

Do not add a parent polity and its members, an alliance and its participating polities, or an API regional aggregate and its member economies. Do not resolve real political overlap by choosing whichever polygon happens to render last.

For partial boundary cells, area-weighting is an explicit approximation to within-cell population placement. Preserve that method; it is not new measured subcell population. Perform accounting on analysis geometries, not simplified display polygons. A sum of polygons is not a partition unless checked.

## 6. One population universe per summary

Define U as a reviewed, nonoverlapping set of statistical units and P_u as their population for the relevant year. The covered-universe population is P = sum(P_u).

Do not call P “world population” until its scope is reconciled against a documented world reference and coverage gaps are accounted for. Report excluded or unresolved geography and any unquantifiable missing weights. A discrepancy must not be silently normalized away.

### Prevalence

For electricity access r_u expressed as a fraction:

```text
with_access = sum(P_u * r_u) for units with known rates
without_access = sum(P_u * (1-r_u)) for the same units
unknown_condition = sum(P_u) for units without known rates
with_access + without_access + unknown_condition = P
```

The measured share among known observations is different from the share of the full population universe. Show both only with distinct labels. If a population weight itself is unknown, record it as a denominator-coverage problem; do not pretend its contribution is zero.

### Context distributions

For national mean m_u and fixed bins B_k:

```text
context_population[k] = sum(P_u where m_u belongs to B_k)
```

This is not an estimate of person-level variation within units. Chart labels must make that explicit. Do not derive a global life-table estimate by averaging national life expectancies, or treat GDP per capita as each resident's income.

### Context facts and events

Disable global humanity shares by default for sparse sampled facts and event layers. Enable only after an explicit definition, coverage audit, suitable denominator, and reviewed transformation. A percentage of sampled polities is not a percentage of all people.

## 7. Population height and modern calibration

Use actual count p_j and physical area A_j to define density d_j = p_j / A_j. Display height may be a documented transformation of density; numeric totals always use the original counts.

The published GHSL display bins follow this rule with a deliberately coarse support: source-pixel counts are centre-assigned to 1° WGS84 bins, and `A_j` is the full geodesic bin area, including water. Colour encodes bin count; height encodes full-bin density on a fixed logarithmic scale. Source totals, covered zeros, NODATA, and the tiny outside-grid residual are separate audit fields. This is not a fine local settlement-density estimate; see [population-surface methodology](POPULATION_SURFACES.md).

Population-only mode uses the selected reconstruction without silently changing totals. To show a modern condition on a population surface, optionally create a separate calibrated derivative:

```text
p'[j,u] = p[j,u] * P_u / sum_j p[j,u]
```

This is allowed only for verified support partitions, compatible dates, a positive denominator, and explicitly reconciled territories. Preserve raw and calibrated surfaces independently. Units without a usable spatial allocation remain **known population, not geographically placed** rather than being dropped. The humanity chart can include these people while a map coverage note reports the unplaced amount.

Before calibration is validated, use an honest country-level choropleth for the condition layer. Do not pretend the raw HYDE map and another population denominator are the same counted population.

## 8. Uncertainty and lineage

Do not assume independent cell errors or combine bounds as though they were independent samples. Run named source scenarios consistently when available; show sensitivity rather than fabricated confidence. Missing uncertainty estimates remain “not quantified.”

Every derived artifact records source-release IDs, crosswalk and algorithm versions, input checksums, parameters, output checksum, source licenses, effective dates, and validation results. Every download includes the view manifest, metric definition, data, citation list, and applicable licenses.

Production manifests cannot contain guessed artifact URLs, fake checksums, or placeholder provenance. The research registry intentionally has null acquisition checksums until real files are obtained.

An exported `atlas_reproducible_view` pins the release, metric, requested and
effective dates, selected support, layer state, fixed scale, and camera. It
contains the date-specific metric rows and population weights used by the view,
the displayed calculation, exact statuses and record locators, applicable
historical evidence, the reconciliation decision set, and the complete release
provenance. Large geometry is referenced by immutable artifact path and checksum
rather than copied into every bundle. A pinned release that is not locally
available must fail closed.

## 9. Reconciliation decisions

Reconciliation is a derived, versioned evidence layer between immutable source
records and published presentation. It is not an editable flag on a source row.
Each decision set records:

- checksums for the candidate artifacts, policy, and source evidence it used;
- an ordered rule ID and declared result for every disposition;
- exact source record or feature IDs and their evidence hashes;
- one of an accepted, rejected, source-declared, or unresolved state; and
- the permitted page effect and prohibited statistical effects.

The current city contract may link source records to a stable canonical place
ID for navigation. It does not make their dates, urban extents, definitions, or
population estimates interchangeable. A canonical place cluster therefore
contains source record IDs, not a synthesized population series.

R13 publishes three Reba city series with distinct source-release IDs and
source-row locators. At a shared date the map may show overlapping point
estimates, but each point, table row, inspector, and export retains its own
source value. It does not create a city time series across compilers. Two
Chandler literal-zero cells are represented as quarantined source records with
unknown numeric population rather than zero-valued map points. Unresolved
place identities stay source-only and do not block source-native publication.

The current border contract can distinguish a source-declared composite/member
relationship from an unexplained geometric overlap. Its only allowed effects
are display treatment and disclosure. Every historical polygon remains outside
the population-allocation graph, including polygons with a resolved hierarchy.

Rules may automate a disposition only when their inputs are auditable and their
semantic boundary is declared. A deterministic rule is not relabeled as an
independent historian judgment. Candidates without sufficient evidence remain
explicitly unresolved while still receiving a deterministic render policy.
