# Economic evidence release r9

Release r11 further adds seven separate Penn World Table 11.0 output,
employment, hours, TFP, capital-stock, and labor-share tables from the
publisher-linked workbook. See `ECONOMIC_INDICATORS.md` for coverage and
reproduction. No Atlas labor-productivity ratio has been derived.

Release r10 extends this unchanged r9 base with five World Bank PIP
national-survey tables. See `ECONOMIC_INDICATORS.md` for the core indicator
selection, exact new coverage, reproducible commands, and outstanding gates.
The tables retain duplicate national surveys in a country-year rather than
silently selecting one. They do not form a uniform income series: PIP welfare
may be income or consumption, displayed per survey.

Release `atlas-mvp-2026-10-24-r9` adds a source-native economics explorer to the
r8 atlas. This is a bounded, genuinely acquired first set of major economic
indicator families, **not** a claim to every economic variable or all humanity
at every date. The release has fourteen tables, 119,987 known source values, and a
downloadable complete source-row CSV for each table. Raw provider files are
ignored by Git; the published, transformed tables and checksums are tracked.

| Source-native table | Known values / source rows | Years with any value | Meaning and limits |
| --- | ---: | --- | --- |
| Maddison 2023 real GDP per capita | 21,366 / 131,144 | 1–2022 CE | 2011 international dollars/person; historical country/economy labels, not historical border polygons |
| World Bank GDP, constant 2015 US$ | 11,533 / 14,322 | 1960–2025 | Total territorial output, not household income |
| World Bank GDP per capita, PPP | 6,977 / 14,322 | 1990–2025 | Constant 2021 international dollars/person; not comparable by simple concatenation with Maddison |
| World Bank household and NPISH consumption/person | 7,163 / 14,322 | 1960–2025 | Constant 2015 US dollars/person; territorial account, not a distribution |
| World Bank Gini index | 2,434 / 14,322 | 1963–2025 | Inequality statistic; only four source supports have a 2025 value |
| World Bank modeled ILO unemployment | 6,531 / 14,322 | 1991–2025 | Percent of labor force, not population share |
| World Bank consumer-price inflation | 9,151 / 14,322 | 1960–2025 | Annual percent; negative values are valid |
| World Bank trade | 9,029 / 14,322 | 1960–2025 | Goods and services as percent of GDP |
| World Bank poverty headcount, $3/day | 2,434 / 14,322 | 1963–2025 | Percent of population under the 2021-PPP $3 line; survey-based and sparse |
| World Bank gross capital formation | 8,670 / 14,322 | 1960–2025 | Percent of GDP; negative source values are retained |
| World Bank government final consumption | 8,729 / 14,322 | 1960–2025 | Percent of GDP, not total public spending |
| World Bank agriculture/forestry/fishing value added | 9,088 / 14,322 | 1960–2025 | Percent of GDP, not a workforce share |
| World Bank manufacturing value added | 8,253 / 14,322 | 1960–2025 | Percent of GDP, not all industry |
| World Bank services value added | 8,629 / 14,322 | 1960–2025 | Percent of GDP; may overlap national-account residual concepts |

Year spans describe **some** values, never universal coverage. Maddison has 14
known GDP-per-capita values in 1 CE and 55 in 1820 CE; it has no values before
1 CE. For every table, the browser reports the exact year's known-support count
and explicitly displays unknown supports. It does not extrapolate a country
series back to 10,000 BCE, color historical polities with modern-country GDP,
compute world means from country means, or make an Atlas composite score.

## Reproduce and audit

Run the explicit commands below from the repository root with the pinned Python
environment. Acquisition is not part of install, startup, or tests. The
publisher refuses to overwrite an existing r9 path; use a new output directory
for a byte comparison. A provider changing any input requires a reviewed new
source lock and release ID, not an in-place refresh.

```bash
pnpm data:acquire:economics
pnpm data:derive:economics
pnpm data:publish:economics
```

`data/registry/economic-source-lock.json` records original URLs, retrieval
dates, byte sizes, SHA-256 hashes, and claimed artifact licenses. The official
Maddison workbook is stored at
`data/raw/maddison/2023/mpd2023_web.xlsx`; thirteen World Bank API responses and
country metadata are under `data/raw/world_bank/2026-10-24/`. The adapter
verifies all source checksums, the expected workbook sheets/units, unique
support/year keys, World Bank indicator IDs, a one-page complete API response,
and the same World Bank source-update date across all thirteen responses. API
aggregate regions are excluded via the pinned country metadata, not via names.

`economic-source-native-table-v1` copies only exact, non-null source values to
the compact browser JSON. Its CSV retains every nonaggregate source row,
including `unknown`, original source-row locator, and native unit. The
manifest records the transformation version, input hashes, output hashes, and
parameters. No mathematical derivation or cross-source merge is performed.
The Maddison companion population (source thousands unit) is retained as
metadata and in the CSV, but is not used as a map assignment or denominator.

The Maddison workbook `Full data` sheet contains values; `Notes` supplies its
unit; `Sources` and `Maddison original sources` supply 179 original-source
reference rows retained in the JSON with sheet row locators. Those entries are
country-level *candidate references*, **not** guaranteed per-observation
citations. The explorer displays a table rather than an unsupported historical
chart and links to the [official release and its citation requirement](https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023?lang=en).
Anyone making a graph from a historical subset must review and cite the
applicable original papers first. World Bank indicator-specific official pages
are linked from each table.

## Geography, comparability, and what remains

The r7 map's World Bank GDP-per-capita series uses source update 2026-07-13.
The new World Bank economics tables use 2026-10-08. Both are identifiable in
the r9 manifest and are **not** concatenated. Maddison and World Bank have
different base years, concepts, country histories, and units. The current
economics explorer uses each source's own support labels and exact years.
Reconciliation would require dated territorial identities, overlapping-source
audits, an explicit unit/rebasing policy, and known missingness; no modern code
is silently applied to a historical empire.

Clio Infra GDP workbooks are locally acquired candidates but not published:
the exact workbook reuse terms and underlying-source citations remain
unresolved, and their 2012-boundary support is not a polity support. The
[World Inequality Database](https://wid.world/data/) is a priority for
income/wealth distributions, but no exact series release, dataset-level reuse
terms, percentile population definition, or quality metadata are pinned yet.
Its report licenses must not be assumed to license the database. Those gaps are
recorded in the Sources ledger rather than silently replaced with synthetic
values. No source identified here supports comprehensive economics for every
population from 10,000 BCE to present.
