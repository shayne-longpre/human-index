# Core economic indicator set and acquisition state

Checked 2026-10-24. The unit of publication is a **source-native measure**, not an
Atlas economic or human-advancement score. An indicator's global date span does
not mean every support or year is covered. The main questions are material
output, lived consumption, distribution, work, structural change, and exposure
to prices and trade.

| Core indicator | Measurement contract | Best current source and Atlas state |
| --- | --- | --- |
| Real output per person | PPP-adjusted GDP/person, source base year explicit; territorial mean, not personal income | Maddison 2023 historical and WDI 2021-PPP modern, **published separately**; PWT 11 output is an additional source-native total, not automatically divided or spliced |
| Total real output | GDP in source constant dollars or chained PPP units, not income distribution | WDI constant-2015-US$ and PWT 11 expenditure/output-side real GDP **published separately** |
| Household consumption per person | National-accounts household/NPISH consumption; not a household distribution | WDI constant-2015-US$/person **published** |
| Poverty incidence and depth | Share below a named real poverty line and poverty gap, survey welfare basis retained | PIP 20260922, $3/day in 2021 PPP, national survey records **published r10**; WDI headcount remains a separate series |
| Inequality | Gini and bottom/top decile shares for named income or consumption concept; not wealth inequality | PIP national survey Gini and deciles **published r10**; WDI Gini separately **published**; WID wealth/income distribution remains blocked pending exact data reuse terms |
| Wealth levels and concentration | Net personal wealth and percentile shares, adult/person universe and valuation date explicit | WID priority, **not published**; no GDP or income surrogate |
| Labor productivity and productive inputs | Output/hour requires an explicit derived denominator; TFP is a different model-based concept | PWT 11 TFP, persons engaged, annual hours, capital stock, and labor compensation share **published r11** as separate source values; output/hour ratio not yet derived |
| Employment conditions | Unemployment as labor-force fraction; persons engaged and compensation are separate | WDI modeled ILO unemployment and PWT persons engaged/labor share **published separately**; direct ILOSTAT participation/earnings detail remains a candidate pending table and terms review |
| Price change and purchasing power | CPI inflation, source basket and price base explicit; historical real wages require another source | WDI CPI inflation **published**; historical wage/basket sources not yet licensed and reconciled |
| Economic structure | Agriculture, manufacturing, services value added as GDP shares; employment shares are different measures | WDI value-added shares **published**; no inferred ancient sector percentages |
| Investment and public demand | Gross capital formation and government final consumption as GDP shares; neither equals total wealth or state capacity | WDI **published** |
| External integration | Goods and services trade as GDP share; not a value judgment about openness | WDI **published** |

The r10 addition is five PIP tables (headcount, poverty gap, Gini, bottom and
top decile welfare shares), each with 2,479 national survey values from 2,588
raw records, 1963–2025 where available. There are 171 country codes and 88
additional records in country-years with more than one national survey. The 109
urban/rural rows are retained in each downloadable CSV but not shown as national
values. Four national surveys are present in 2025; this is **not** 2025 global
coverage. The 2021-PPP $3 line, PIP version, survey name, welfare type, source
row, and checksum are preserved. PIP's 0–1 Gini is not the WDI 0–100 index.

The r11 addition is seven PWT 11.0 tables from the official workbook: 11,201
known expenditure-side real-GDP values; 11,201 output-side real-GDP values;
10,307 persons-engaged values; 5,015 annual-hours values; 6,988 TFP levels;
11,028 capital-stock values; and 8,215 labor-share values. Its 185 source
country codes span 1950–2023, but variable coverage is sparser; TFP's first
known year is 1954. Each table retains all 13,690 source country-year rows in
CSV with missingness, workbook cell locator, and PWT `i_cig`/`i_outlier`
quality flags. The browser retains source units and does not derive a
labor-productivity ratio, apply PWT country values to old polities, or equate
TFP with output per worker.

PWT's [official 11.0 release](https://www.rug.nl/ggdc/productivity/pwt/?lang=en)
states 185 countries, 1950–2023, and CC BY 4.0. Its linked Dataverse XLSX was
acquired by GET and pinned; a HEAD probe alone misleadingly returned HTTP 403.
The [PIP dataset catalog](https://datacatalog.worldbank.org/search/dataset/0038020/poverty-and-equity-database-poverty-and-inequality-platform)
states CC BY 4.0; its [version page](https://pip.worldbank.org/about) supplies
the release naming and household-survey methodology. The
[WID codebook](https://wid.world/codes-dictionary/) and
[year-level quality grades](https://wid.world/data-quality/) are useful, but
dataset-level redistribution terms and an exact series release are not pinned.
Clio Infra's acquired workbooks remain unpublished pending exact artifact
reuse terms and territorial/citation review. These are explicit remaining
acquisition gates, not hidden substitutes.

Reproduce the new slice with explicit commands (never run on install/startup):

```bash
pnpm data:acquire:pip
pnpm data:derive:pip
pnpm data:publish:pip
pnpm data:acquire:pwt
pnpm data:derive:pwt
pnpm data:publish:pwt
```

The publishers refuse to overwrite r10 or r11. A provider revision requires a
new lock, reviewed definitions, and new release ID. Raw CSV and workbook stay
ignored by Git; static source-native JSON/CSV and hashes are published. Nothing in this
set assigns a modern country statistic to ancient political geometry, fills
missing years, or creates a composite score.
