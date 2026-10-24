# Vertical source acquisition and integration

This layer keeps “downloaded,” “profiled,” “reconciled,” and “published” as
different states. It is deliberately small: one acquisition catalog, one review
profile, one decision policy, and narrow source adapters.

## Reproducible workflow

1. `npm run data:acquire:verticals` downloads the bounded official candidate
   stack and writes `data/registry/candidate-source-lock.json`. The lock records
   URLs, retrieval date, bytes, SHA-256, license claims, and publication status.
   It is not a release lock and does not grant publication approval.
2. `npm run data:review:verticals` profiles the acquired artifacts into
   `data/review/vertical-source-profiles.json`. Source-native supports and
   anomalies stay visible.
3. `data/decisions/vertical-integration-policy-v1.json` records which products
   may be shown, which must remain separate, and the next publication gate.
4. A metric-specific adapter validates one exact release and emits a separate
   normalized product. `build_mvp_release.py` can publish it only after the
   manifest declares its source, transformation, artifacts, semantics, and
   limitations.

The research catalog at `data/registry/sources.json` drives the Sources page.
Its “Acquired” check means an exact artifact is locally pinned. “In release” is
computed independently from the active release manifest.

## Current vertical decisions

| Vertical | Published now | Acquired candidates | Deterministic rule |
| --- | --- | --- | --- |
| Population | U.S. Census world estimates; World Bank territories; UN WPP estimates/projections | HYDE sample only | Keep world, territorial, projection, and grid products separate. Never allocate a world total without a mass-conserving model. |
| Borders and names | Cliopatria context; Natural Earth display geometry | CShapes; WHG documented but token/dataset selection blocked | Political context, statistical geography, and display geometry are separate. Source hierarchy can annotate overlaps; it does not authorize geometry union. |
| Economics | World Bank GDP per capita on the map; thirteen more WDI tables and Maddison 2023 GDP per capita in r9 | Clio GDP workbooks; WID distribution series not pinned | Do not splice constant-dollar, PPP, or differently based historical series. Show source-native series side by side until an explicit rebase contract exists. |
| Institutions | None yet | V-Dem v16; Seshat Equinox v1; Clio XRCOMP | Start with V-Dem legal suffrage share as a descriptive de-jure fact. Do not create an Atlas democracy score or merge distinct institutional concepts. |
| Conflict | None yet | UCDP GED 26.1; UCDP/PRIO ACD 26.1; Clio internal/international conflict | Events, conflict-years, parties, and binary historical context are distinct supports. Do not infer population exposure. |

## Findings that block naive merges

- Clio files use historical series on a 2012 country-boundary support. The
  acquired workbooks cover GDP (1500–2016), conflict (1500–2000), and executive
  recruitment (1800–2012), but per-artifact reuse terms remain unresolved.
- Seshat Equinox contains polity/NGA/time data and source-native sentinel and
  fractional codes. `-999` cannot be published as a measurement.
- V-Dem `v2x_suffr` is a legal eligibility share, not participation in practice
  and not an overall judgement of government. Its v16 RData support still needs
  a bounded parser and entity audit.
- UCDP GED has 417,968 event rows for 1989–2025. The audit found 5,075 rows where
  `low`, `best`, and `high` are not monotonic, so any fatality measure needs an
  explicit source-field decision. The 2,816-row UCDP/PRIO conflict-year product
  is kept separate.

## First wired economic slice

Release `atlas-mvp-2026-09-23-r7` publishes World Bank indicator
`NY.GDP.PCAP.KD` for exact observed years. The adapter uses the same 217
nonaggregate World Bank support IDs as the population release, validates the
source update, preserves missing values, and emits 14,322 entity-year rows.
The map uses a fixed logarithmic display scale. The summary reports support
coverage only; it does not construct a global GDP-per-capita average.

Release r9 extends this with fourteen independently pinned source-native tables;
see `ECONOMIC_EVIDENCE.md`. Maddison 2023 is now acquired and published in a
table, not spatialized. The new WDI source update is 2026-10-08 and remains
separate from the July 2026 map series. Clio and WID publication gates remain.
