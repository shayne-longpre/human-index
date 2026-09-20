# Adversarial review and product decisions

These are proposed design decisions, not new historical findings. Source-specific facts are documented in `SOURCES.md`.

## 1. The opportunity survives; the original integration story was too easy

The useful product is not merely “history, but on a map.” It is a linked answer to two questions: **Where did people live, and how many lived under a specified, evidenced condition?** Its differentiation should be the measurement-aware interaction, downloadable provenance, and ability to move between population history and modern human conditions.

Do not claim no comparable product exists. Running Reality is a substantial neighboring effort, not just a border animation; HYDE already has a visualization portal, and statistical explorers cover much of the modern domain. A credible launch describes the specific combination Atlas contributes. [SOURCES: S2, S10]

## 2. Maintain a common interface, not a fictitious common measurement scale

Use one timeline and map, but let evidence determine available layers. Deep history can support population reconstructions, land use, and specific sourced observations. Modern periods can support more systematic indicators. This difference should be visible as coverage, not hidden by a universal score.

A common taxonomy is possible; a common cardinal scale across all eras is not a prerequisite. Do not manufacture one by converting incomparable observations into 0–100 grades.

Suggested families:

| Family | Examples of concrete questions | Principal caution |
|---|---|---|
| Population & settlement | Where are people estimated to live? How urban is settlement? | Model resolution is not historical precision. |
| Material conditions | GDP per capita, real wages, consumption where measured | National means are not individual incomes. |
| Health & survival | Period life expectancy, child mortality, nutrition | Denominators and statistical meanings differ. |
| Knowledge & technology | Schooling, measured access, documented writing/infrastructure | Presence, availability, and actual use differ. |
| Institutions & legal entitlements | Legislative arrangements, eligibility rules, specified legal provisions | Law differs from practice; eligibility differs by subgroup. |
| Equality & personal status | Documented status distinctions and subgroup-specific legal treatment | Do not project one elite group's experience to everyone. |
| Violence & insecurity | Defined conflict events, fatalities, homicide where measured | Recording coverage and exposure differ. |
| Environment & resources | Land use, energy, emissions | These are conditions/pressures, not a progress direction. |

No family implies that larger numbers are always better. Do not rank societies or political systems.

## 3. Separate geography from the thing being measured

There are three maps underneath the visual map:

1. The geography in which a source measured a quantity.
2. The historical entities represented by a political reconstruction.
3. The simplified or gridded geometry used to render quickly.

They need independent identifiers and time validity. Source series on fixed modern territories must remain on those supports, even when historical boundary outlines are shown. A historical outline crossing a statistical polygon does not entitle the app to split its indicator into accurate ancient local estimates. Cliopatria's composite relationships make a simple sum-by-polygon particularly unsafe. [SOURCES: S1, S7]

Unmapped or overlapping areas must remain visibly unresolved. “Outside the reconstructed state polygons” does not mean uninhabited, ungoverned, uncivilized, or unknown in all other respects. Polity identity also does not equal a single culture, language, or homogeneous population.

## 4. Make the population chart truthful by construction

The chart component needs an aggregation type, not just a numeric column.

- A prevalence rate with a matching denominator supports an estimated number of people with/without a condition.
- A territorial mean supports population-weighted context bands: people living in places with that mean.
- A historical institutional observation supports a case-study statement, or a bounded context summary only after coverage and assignment have been validated.
- An event record supports event totals or another explicitly modeled exposure definition; it does not automatically support a humanity share.

For GDP, say “population living in economies with GDP per capita in this band.” For life expectancy, say “population living in countries with this period life expectancy.” Do not say either chart reveals individuals' incomes or lifespans. The same distinction applies to legal status and access to technology.

## 5. Preserve visual excitement without visual falsehood

Keep population relief, but distinguish population count from density. Density is population divided by actual cell area. Use stable scales across time and expose any log transform; the volume of a log-height surface does not equal population.

A coarse, smooth-looking reconstruction is preferable to implausibly precise spikes. Use actual source snapshots by default. Camera movement may be continuous while scientific state is discrete. Interpolation is a separate, named transformation, not an animation trick that silently invents annual evidence.

At low density, avoid making land look empty merely because a global scale hides it. Provide a clearly labeled local contrast mode, never silently change scales frame by frame. Supply a flat-map view for comparison and an accessible data table.

## 6. Population sources need an explicit reconciliation contract

HYDE can provide spatial weights. A modern indicator source may use another population series. Two different totals must not silently drive the same apparent population chart.

For the initial condition mode, a territorial choropleth using one audited statistical population universe is acceptable. Enable recolored population relief only after a derived grid has been calibrated to that same universe. Preserve the original HYDE grid separately, document calibration, and retain any population not placed on the map.

A grid can locate a modeled population while country-level electricity data remain country-level. Coloring its cells does not upgrade the condition estimate's spatial resolution.

## 7. Avoid false continuity

A continuous control need not pretend that evidence is continuous. Show actual snapshot ticks and an observation-coverage strip. Let users enter a date, but disclose requested versus effective dates. Never move them to another century or metric silently.

Do not carry a value through hundreds of years because the next observation is missing. Do not interpolate institutional categories, conflict events, or changes of sovereignty. Mark boundaries that end before the requested year as unavailable, not current. Internal year conventions must be tested at the BCE/CE boundary.

## 8. Uncertainty needs several dimensions

Store source-reported statistical bounds, alternative reconstructions, dating uncertainty, location precision, and interpretation disagreement separately. These are not interchangeable. A source's upper/lower scenario is not automatically a 95% interval. A model's self-confidence is not a calibrated probability of historical truth.

Show source support and known coverage prominently. Do not hide uncertainty solely in opacity: faint rendering can be mistaken for fewer people. Use a separate evidence mode, patterns, badges, and readable notes.

## 9. Bound the first build

The first complete experience needs population, a date control, optional historical outlines, one modern prevalence indicator, a linked summary, provenance, and exports. It does not need every source, all institutions, a 3D globe, an LLM backend, a social platform, or a data warehouse.

The best first nonpopulation measure is electricity access: it makes the people-with/without distinction straightforward and has a documented public source. It is a validation vehicle, not the project's entire scope. [SOURCES: S3]

Expand only when another metric can be added through a new adapter and registry entry without patching the core map and chart with special-case logic.

## 10. Evidence extraction is a later research workflow

Use AI to propose tightly scoped claims from identified material, not to assign society-level grades from model memory. Preserve contradictory sources, subgroup qualifications, and uncertainty. A model-generated citation is not verified until the actual passage is retrieved and checked. Independent review remains necessary.

## Decisions to revisit after a working slice

Actual browser performance may justify a globe, vector tiles, H3, more sophisticated raster processing, or a query engine. Actual data audits may change the preferred HYDE release or require different modern support geometries. Record those as architecture decisions rather than treating the initial stack as sacred.

The product's success criterion is not the number of layers. It is whether users can explore an arresting view of humanity and correctly understand what it does—and does not—measure.
